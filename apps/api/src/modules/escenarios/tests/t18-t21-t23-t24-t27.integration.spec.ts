import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { PrismaService } from '../../../shared/database/prisma.service';
import { TransactionService } from '../../../shared/database/transaction.service';
import { PedidosPesoService } from '../../pedidos/pedidos-peso.service';
import { PedidosService } from '../../pedidos/pedidos.service';
import { TraspasosService } from '../../traspasos/traspasos.service';
import { ProgramacionService } from '../../traspasos/programacion.service';
import { TransporteService } from '../../transporte/transporte.service';
import { validTripForDispatch } from '../../transporte/trip-validation';
import { DevolucionesService } from '../../devoluciones/devoluciones.service';
import { EntregasService } from '../../entregas/entregas.service';

if (process.env.SGTL_INTEGRATION_TEST_DB !== '1') throw Error('Se requiere PostgreSQL de pruebas');
const db = new PrismaService();
const transactions = new TransactionService(db);
const weight = new PedidosPesoService(db, transactions);
const orders = new PedidosService(db, transactions);
const transfers = new TraspasosService(db, transactions);
const schedules = new ProgramacionService(db, transactions);
const drivers = new TransporteService(db, transactions);
const returns = new DevolucionesService(db, transactions);
const deliveries = new EntregasService(db, transactions);
beforeAll(async () => db.$connect());
afterAll(async () => db.$disconnect());

async function kgFixture() {
  const tag=randomUUID();
  const product=await db.product.create({data:{sku:'T18-'+tag,name:'Mercancía por kg',baseUnit:'KG'}});
  const location=await db.location.create({data:{name:'Almacén KG '+tag}});
  const stock=await db.unitStock.create({data:{
    productId:product.id,locationId:location.id,unit:'KG',physical:'50.000',
  }});
  return {product,location,stock};
}
async function plannedKgShipment() {
  const s=await kgFixture();
  const payload={customer:'Cliente peso',destinationId:s.location.id,productId:s.product.id,
    plannedKg:'30.000',estimatedBoxes:2,averageBoxKg:'15.000'};
  const key=randomUUID();
  const order=await weight.create(payload,key,'vendedor');
  expect((await weight.create(payload,key,'vendedor')).id).toBe(order.id);
  const line=order.weightLines[0];
  await weight.reserve(line.id,{quantityKg:'30.000'},randomUUID(),'responsable');
  const dKey=randomUUID();
  const dispatchPayload={actualKg:'29.400',custodian:'Chofer QA',documentRef:'RM-30KG'};
  const shipment=await weight.dispatch(line.id,dispatchPayload,dKey,'chofer');
  expect((await weight.dispatch(line.id,dispatchPayload,dKey,'chofer')).id).toBe(shipment.id);
  return {...s,order,line,shipment};
}
describe('T-18: peso teórico y peso comercial efectivamente cargado',()=>{
  it('registra 30 kg, estima 2 cajas, despacha 29.4 y conserva referencia contable sin importe',async()=>{
    const s=await plannedKgShipment();
    expect([s.shipment.nominalKg.toString(),s.shipment.actualKg.toString(),
      s.shipment.differenceKg.toString()]).toEqual(['30','29.4','-0.6']);
    const line=await db.weightOrderLine.findUniqueOrThrow({where:{id:s.line.id}});
    expect([line.plannedKg.toString(),line.dispatchedKg.toString(),line.reservedKg.toString(),
      line.estimatedBoxes,line.averageBoxKg?.toString()]).toEqual(['30','29.4','0',2,'15']);
    expect(s.shipment.accountingRef).toMatch(/^REV-PESO-/);
    const stock=await db.unitStock.findUniqueOrThrow({where:{id:s.stock.id}});
    expect([stock.physical.toString(),stock.reserved.toString()]).toEqual(['20.6','0']);
    await expect(weight.dispatch(s.line.id,{actualKg:'29.400',custodian:'Chofer QA'},
      randomUUID(),'chofer')).rejects.toThrow('ya fue despachado');
    const events=await db.auditEvent.findMany({where:{entityId:s.shipment.id}});
    expect(events.map(e=>e.type)).toContain('COMMERCIAL_WEIGHT_DISPATCHED');
  });
});
describe('T-21: reserva de hoy vinculada al compromiso de mañana',()=>{
  it('conserva cada programación y no duplica reserva o salida por reintento',async()=>{
    const tag=randomUUID();
    const product=await db.product.create({data:{sku:'T21-'+tag,name:'Pieza programada'}});
    const a=await db.location.create({data:{name:'Almacén origen '+tag}});
    const b=await db.location.create({data:{name:'Distribuidora destino '+tag}});
    await db.stock.create({data:{productId:product.id,locationId:a.id,physical:20}});
    const due=new Date(Date.now()+30*3600000);
    const order=await orders.createOrder({customer:'Cliente mañana',destinationId:b.id,
      dueAt:due.toISOString(),items:[{productId:product.id,required:3}]},'vendedor',randomUUID());
    const transfer=await transfers.createTransfer({originId:a.id,destinationId:b.id,
      items:[{productId:product.id,requested:3}]},'gerente');
    const reservationKey=randomUUID();
    const reservation=await transfers.reserve(transfer.id,{
      transferLineId:transfer.lines[0].id,orderLineId:order.lines[0].id,quantity:3,
    },'responsable',reservationKey);
    expect((await transfers.reserve(transfer.id,{
      transferLineId:transfer.lines[0].id,orderLineId:order.lines[0].id,quantity:3,
    },'responsable',reservationKey)).id).toBe(reservation.id);
    const body={orderId:order.id,departureAt:new Date(Date.now()+3600000).toISOString(),
      expectedArrivalAt:new Date(Date.now()+10*3600000).toISOString(),
      reason:'Surtir hoy antes del compromiso de mañana'};
    const key=randomUUID(),event=await schedules.schedule(transfer.id,body,key,'responsable');
    expect((await schedules.schedule(transfer.id,body,key,'responsable')).id).toBe(event.id);
    expect((await schedules.history(transfer.id)).length).toBe(1);
    await expect(schedules.schedule(transfer.id,{...body,
      expectedArrivalAt:new Date(Date.now()+40*3600000).toISOString()},randomUUID(),'responsable'))
      .rejects.toThrow('después del compromiso');
    expect((await db.stock.findFirstOrThrow({where:{productId:product.id,locationId:a.id}})).reserved).toBe(3);
    expect(await db.dispatch.count({where:{transferId:transfer.id}})).toBe(0);
    await transfers.pick(transfer.id, {
      transferLineId: transfer.lines[0].id, quantity: 3, version: 0, location: 'RACK QA',
    }, 'preparador');
    const payload={items:[{productId:product.id,quantity:3}],custodian:'Chofer programado'};
    const shippingKey=randomUUID();
    const sent=await transfers.dispatch(transfer.id,payload,shippingKey,'preparador');
    expect((await transfers.dispatch(transfer.id,payload,shippingKey,'preparador')).id).toBe(sent.id);
    expect(await db.dispatch.count({where:{transferId:transfer.id}})).toBe(1);
  });
});
describe('T-23: registro y sustitución de chofer por falta del habitual',()=>{
  it('mantiene el historial, exige autorizador y vigencia, bloquea doble asignación',async()=>{
    const tag=randomUUID();
    const a=await db.location.create({data:{name:'PVT viaje '+tag}});
    const b=await db.location.create({data:{name:'Distri viaje '+tag}});
    const product=await db.product.create({data:{sku:'TRIP-'+tag,name:'Producto en ruta'}});
    await db.stock.create({data:{productId:product.id,locationId:a.id,physical:10}});
    const transfer=await transfers.createTransfer({
      originId:a.id,destinationId:b.id,items:[{productId:product.id,requested:2}],
    },'responsable');
    await transfers.reserve(transfer.id,{transferLineId:transfer.lines[0].id,quantity:2},
      'responsable',randomUUID());
    await transfers.pick(transfer.id,{transferLineId:transfer.lines[0].id,
      quantity:2,version:0,location:'RACK QA'},'preparador');
    const regular=await drivers.register({fullName:'Chofer habitual QA',category:'REGULAR'},
      randomUUID(),'supervisor');
    const support=await drivers.register({fullName:'Operario de apoyo QA',category:'SUPPORT'},
      randomUUID(),'supervisor');
    const tripBody={transferId:transfer.id,plannedDepartureAt:new Date(Date.now()+3600000).toISOString(),
      plannedArrivalAt:new Date(Date.now()+5*3600000).toISOString()};
    const trip=await drivers.createTrip(tripBody,randomUUID(),'logística');
    await drivers.assign(trip.id,{driverId:regular.id,provisional:false,
      reason:'Ruta habitual'},randomUUID(),'supervisor');
    await drivers.availability(regular.id,{available:false,
      reason:'No llegó al turno'},randomUUID(),'supervisor');
    const alternate={driverId:support.id,provisional:true,
      reason:'Chofer habitual ausente; autorización temporal',
      validUntil:new Date(Date.now()+10*3600000).toISOString()};
    const assignKey=randomUUID(),newAssignment=await drivers.assign(
      trip.id,alternate,assignKey,'supervisor');
    expect((await drivers.assign(trip.id,alternate,assignKey,'supervisor')).id).toBe(newAssignment.id);
    const updated=await drivers.trips();
    const actual=updated.find(t=>t.id===trip.id)!;
    expect(actual.assignments).toHaveLength(2);
    expect(actual.assignments.at(-1)?.driverId).toBe(support.id);
    await drivers.start(trip.id,randomUUID(),'logística');
    const valid=await db.$transaction(tx=>validTripForDispatch(tx,trip.id,{transferId:transfer.id}));
    expect(valid?.id).toBe(trip.id);
    const loaded={items:[{productId:product.id,quantity:2}],custodian:'Relevo provisional QA',tripId:trip.id};
    const loadKey=randomUUID();
    const shipment=await transfers.dispatch(transfer.id,loaded,loadKey,'preparador');
    expect(shipment.tripId).toBe(trip.id);
    expect((await transfers.dispatch(transfer.id,loaded,loadKey,'preparador')).id).toBe(shipment.id);
    expect(await db.dispatch.count({where:{transferId:transfer.id}})).toBe(1);
    const t2=await drivers.createTrip({...tripBody,plannedDepartureAt:new Date(Date.now()+2*3600000).toISOString()},
      randomUUID(),'logística');
    await expect(drivers.assign(t2.id,alternate,randomUUID(),'supervisor')).rejects.toThrow('otro viaje');
    await drivers.finish(trip.id,randomUUID(),'logística');
    const events=await db.auditEvent.findMany({where:{entity:'Trip',entityId:trip.id}});
    expect(events.map(e=>e.type)).toContain('DRIVER_REPLACED');
  });
});
describe('T-24: devolución de pedido cargado con diferencia de pesaje',()=>{
  it('no reintegra sin inspección; abre incidencia, papeleta y exige conciliación',async()=>{
    const s=await plannedKgShipment();
    const opened=await returns.createWeightReturn({weightShipmentId:s.shipment.id,
      reason:'El pedido cargado fue cancelado en ruta'},randomUUID(),'operador');
    expect(opened.expected.toString()).toBe('29.4');
    const stockBefore=await db.unitStock.findUniqueOrThrow({where:{id:s.stock.id}});
    const body={observed:'28.900',observedAt:new Date().toISOString(),
      conditionNote:'El pesaje al regresar detectó 0.5 kg menos'};
    const key=randomUUID(),review=await returns.intake(opened.id,body,key,'receptor');
    expect((await returns.intake(opened.id,body,key,'receptor')).intake.id).toBe(review.intake.id);
    expect(review.mismatch).toBe(true);
    expect(review.accountingNotice.requiresReconciliation).toBe(true);
    expect((await db.unitStock.findUniqueOrThrow({where:{id:s.stock.id}})).physical.toString())
      .toBe(stockBefore.physical.toString());
    expect(await db.incident.count({where:{commercialReturnId:opened.id,status:'OPEN'}})).toBe(2);
    await expect(returns.resolve(opened.id,{usable:'28.000',blocked:'0.900',
      reason:'Inspección física confirmada'},randomUUID(),'supervisor'))
      .rejects.toThrow('referencia de conciliación');
    await returns.resolve(opened.id,{usable:'28.000',blocked:'0.900',
      reason:'Inspección física confirmada',reconciliationRef:'ACTA-PE-15'},randomUUID(),'supervisor');
    const stock=await db.unitStock.findUniqueOrThrow({where:{id:s.stock.id}});
    expect([stock.physical.toString(),stock.blocked.toString()]).toEqual(['49.5','0.9']);
    expect(await db.incident.count({where:{commercialReturnId:opened.id,status:'OPEN'}})).toBe(0);
    expect((await db.commercialReturn.findUniqueOrThrow({where:{id:opened.id}})).status).toBe('RESOLVED');
  });
});
describe('T-27: rechazo parcial del cliente y retorno protegido',()=>{
  it('conserva 4 recibidas y 2 rechazadas, sin disponibilidad hasta revisión supervisada',async()=>{
    const tag=randomUUID();
    const product=await db.product.create({data:{sku:'T27-'+tag,name:'Producto cliente QA'}});
    const loc=await db.location.create({data:{name:'PVT retorno '+tag}});
    const stock=await db.stock.create({data:{productId:product.id,locationId:loc.id,physical:6,reserved:6}});
    const order=await db.customerOrder.create({data:{
      code:'CLIENT-T27-'+tag,customer:'Cliente rechazo parcial',destinationId:loc.id,status:'READY',
      lines:{create:{productId:product.id,required:6,accepted:6}},
    },include:{lines:true}});
    const ship=await deliveries.dispatch({orderId:order.id,custodian:'Chofer',
      items:[{orderLineId:order.lines[0].id,quantity:6}]},randomUUID(),'operador');
    const receipt={receiverName:'Cliente recibió 4',observedAt:new Date().toISOString(),
      notes:'Rechazó dos piezas dañadas',
      items:[{shipmentLineId:ship.lines[0].id,accepted:4,rejected:2}]};
    const key=randomUUID(),confirmed=await deliveries.confirm(ship.id,receipt,key,'repartidor');
    expect((await deliveries.confirm(ship.id,receipt,key,'repartidor')).id).toBe(confirmed.id);
    const caseFile=await db.commercialReturn.findFirstOrThrow({
      where:{orderId:order.id},include:{incidents:true}});
    expect([caseFile.expected.toString(),caseFile.status]).toEqual(['2','AWAITING_RETURN']);
    expect(caseFile.incidents.some(i=>i.status==='OPEN')).toBe(true);
    expect((await db.stock.findUniqueOrThrow({where:{id:stock.id}})).physical).toBe(0);
    expect((await deliveries.deliveryStatus(order.id)).commercialStatus).toBe('CON_INCIDENCIAS');
    await returns.intake(caseFile.id,{observed:'2',observedAt:new Date().toISOString(),
      conditionNote:'Dos piezas en cuarentena'},randomUUID(),'almacenista');
    expect((await db.stock.findUniqueOrThrow({where:{id:stock.id}})).physical).toBe(0);
    await returns.resolve(caseFile.id,{usable:'0',blocked:'2',
      reason:'Se aislaron ambas piezas dañadas'},randomUUID(),'supervisor');
    const after=await db.stock.findUniqueOrThrow({where:{id:stock.id}});
    expect([after.physical,after.blocked,after.reserved]).toEqual([2,2,0]);
    const receiving=await db.clientReceptionLine.findMany({where:{receptionId:confirmed.id}});
    expect(receiving.map(x=>[x.accepted,x.rejected])).toEqual([[4,2]]);
    expect(await db.commercialReturn.count({where:{orderId:order.id}})).toBe(1);
    const state = await deliveries.deliveryStatus(order.id);
    expect(state.commercialStatus).toBe('CON_INCIDENCIAS');
    expect([state.accepted,state.rejected,state.openReturns]).toEqual([4,2,0]);
  });
});

describe('T-27 + T-18: conformidad comercial por kg y rechazo parcial pesado',()=>{
  it('conserva recepción del cliente, impide doble confirmación y abre devolución de kg sin reponer stock',async()=>{
    const s=await plannedKgShipment();
    expect((await deliveries.deliveryStatus(s.order.id)).commercialStatus).toBe('EN_REPARTO');
    const body={receiverName:'Cliente de báscula',
      acceptedKg:'24.000',rejectedKg:'5.400',
      observedAt:new Date().toISOString(),notes:'Mercancía dañada al recibir',
      evidenceRef:'ACUSE-KG-49'};
    const k=randomUUID();
    const receipt=await weight.confirmCustomer(s.shipment.id,body,k,'repartidor');
    expect((await weight.confirmCustomer(s.shipment.id,body,k,'repartidor')).id).toBe(receipt.id);
    await expect(weight.confirmCustomer(s.shipment.id,body,randomUUID(),'repartidor')).rejects.toThrow('conformidad');
    const state=await deliveries.deliveryStatus(s.order.id);
    expect(state.commercialStatus).toBe('CON_INCIDENCIAS');
    expect([state.weightAcceptedKg,state.weightRejectedKg,state.openReturns]).toEqual([24,5.4,1]);
    const returnCase=await db.commercialReturn.findFirstOrThrow({where:{
      orderId:s.order.id,weightShipmentId:s.shipment.id,
    }});
    expect([returnCase.expected.toString(),returnCase.unit,returnCase.status])
      .toEqual(['5.4','KG','AWAITING_RETURN']);
    expect(await db.incident.count({where:{commercialReturnId:returnCase.id,status:'OPEN'}})).toBe(1);
    const physical=await db.unitStock.findUniqueOrThrow({where:{id:s.stock.id}});
    expect([physical.physical.toString(),physical.reserved.toString()]).toEqual(['20.6','0']);
    await returns.intake(returnCase.id,{observed:'5.400',observedAt:new Date().toISOString(),
      conditionNote:'Rechazo pesado: cinco kilos y cuatrocientos gramos'},randomUUID(),'almacenista');
    await returns.resolve(returnCase.id,{usable:'0',blocked:'5.400',
      reason:'Rechazo en revisión; no permitir venta'},randomUUID(),'supervisor');
    const final=await db.unitStock.findUniqueOrThrow({where:{id:s.stock.id}});
    expect([final.physical.toString(),final.blocked.toString()]).toEqual(['26','5.4']);
    expect((await deliveries.deliveryStatus(s.order.id)).commercialStatus).toBe('CON_INCIDENCIAS');
    expect(await db.weightClientReception.count({where:{shipmentId:s.shipment.id}})).toBe(1);
  });
  it('no permite que un peso por debajo del despacho desaparezca sin explicar su custodia',async()=>{
    const s=await plannedKgShipment();
    await expect(weight.confirmCustomer(s.shipment.id,{
      receiverName:'Cliente',acceptedKg:'20.000',rejectedKg:'3.000',
      observedAt:new Date().toISOString(),notes:'Sin explicación de restantes',
    },randomUUID(),'repartidor')).rejects.toThrow('totalidad');
    expect(await db.weightClientReception.count({where:{shipmentId:s.shipment.id}})).toBe(0);
  });
});
