import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { PrismaService } from '../../../shared/database/prisma.service';
import { TransactionService } from '../../../shared/database/transaction.service';
import { EntregasService } from '../entregas.service';
import { ConteosService } from '../../inventario/conteos.service';

if (process.env.SGTL_INTEGRATION_TEST_DB !== '1') throw Error('Se requiere PostgreSQL de pruebas');
const db = new PrismaService();
const svc = new EntregasService(db,new TransactionService(db));
beforeAll(async () => { await db.$connect(); });
afterAll(async () => { await db.$disconnect(); });

async function fixture() {
  const tag=randomUUID();
  const product=await db.product.create({data:{sku:'D-'+tag,name:'Entrega QA'}});
  const location=await db.location.create({data:{name:'Loc D '+tag}});
  const stock=await db.stock.create({data:{productId:product.id,locationId:location.id,physical:6,reserved:6}});
  // Condición fixture después de aceptar y asignar 6 unidades al cliente.
  const order=await db.customerOrder.create({data:{
    code:'O-'+tag,customer:'Cliente QA',destinationId:location.id,status:'READY',
    lines:{create:{productId:product.id,required:6,accepted:6}}
  },include:{lines:true}});
  return {order,line:order.lines[0],stock};
}

describe('T-26 y T-27: entrega real al cliente', () => {
  it('idempotencia; salida no implica aceptación; rechazo no reintegra stock',async()=>{
    const {order,line,stock}=await fixture();
    const payload={orderId:order.id,custodian:'Chofer QA',items:[{orderLineId:line.id,quantity:6}]};
    const key=randomUUID();
    const shipment=await svc.dispatch(payload,key,'operador');
    expect((await svc.dispatch(payload,key,'operador')).id).toBe(shipment.id);
    expect((await svc.list()).find(s=>s.id===shipment.id)?.receptions).toHaveLength(0);
    const before=await db.stock.findUniqueOrThrow({where:{id:stock.id}});
    expect([before.physical,before.reserved]).toEqual([0,0]);
    await expect(svc.dispatch(payload,randomUUID(),'operador')).rejects.toThrow();
    const receipt={receiverName:'Cliente',observedAt:new Date().toISOString(),notes:'2 dañadas',
      items:[{shipmentLineId:shipment.lines[0].id,accepted:4,rejected:2}]};
    const ckey=randomUUID();
    const confirmed=await svc.confirm(shipment.id,receipt,ckey,'repartidor');
    expect((await svc.confirm(shipment.id,receipt,ckey,'repartidor')).id).toBe(confirmed.id);
    await expect(svc.confirm(shipment.id,receipt,randomUUID(),'repartidor')).rejects.toThrow();
    expect((await db.stock.findUniqueOrThrow({where:{id:stock.id}})).physical).toBe(0);
    expect(await db.clientReception.count({where:{shipmentId:shipment.id}})).toBe(1);
    const events=await db.auditEvent.findMany({where:{entityId:confirmed.id}});
    expect(events.map(e=>e.type)).toContain('CLIENT_RECEIPT_CONFIRMED');
  });
  it('rechazo obliga a describir el motivo',async()=>{
    const {order,line}=await fixture();
    const shipment=await svc.dispatch({orderId:order.id,custodian:'Chofer QA',
      items:[{orderLineId:line.id,quantity:3}]},randomUUID(),'operador');
    expect(() => svc.confirm(shipment.id,{receiverName:'Cliente',observedAt:new Date().toISOString(),
      items:[{shipmentLineId:shipment.lines[0].id,accepted:2,rejected:1}]},randomUUID(),'repartidor')).toThrow();
    expect(await db.clientReception.count({where:{shipmentId:shipment.id}})).toBe(0);
  });
});

describe('T-30: entrega desde stock local, sin inventar traspaso',()=>{
  it('requiere conteo físico y reserva directa antes de salida comercial',async()=>{
    const tag=randomUUID();
    const product=await db.product.create({data:{sku:'DIRECT-'+tag,name:'Stock local'}});
    const location=await db.location.create({data:{name:'Almacen directo '+tag}});
    const stock=await db.stock.create({data:{productId:product.id,locationId:location.id,physical:5}});
    const order=await db.customerOrder.create({data:{
      code:'DIRECT-ORD-'+tag,customer:'Cliente directo',destinationId:location.id,
      lines:{create:{productId:product.id,required:3}},
    },include:{lines:true}});
    const payload={orderLineId:order.lines[0].id,quantity:3};
    await expect(svc.allocateLocal(payload,randomUUID(),'operador')).rejects.toThrow();
    const countService=new ConteosService(db,new TransactionService(db));
    const record=await countService.create({productId:product.id,locationId:location.id,
      quantity:'5',unit:'PIEZA',source:'PAPER',method:'COUNT',
      observedAt:new Date().toISOString()},'almacenista');
    await countService.verify(record.id,'supervisor');
    const key=randomUUID();
    const commitment=await svc.allocateLocal(payload,key,'operador');
    expect((await svc.allocateLocal(payload,key,'operador')).id).toBe(commitment.id);
    const prepared=await db.customerOrder.findUniqueOrThrow({where:{id:order.id},include:{lines:true}});
    expect(prepared.status).toBe('READY');
    expect(prepared.lines[0].accepted).toBe(3);
    expect((await db.stock.findUniqueOrThrow({where:{id:stock.id}})).reserved).toBe(3);
    expect(await db.transfer.count({where:{destinationId:location.id}})).toBe(0);
    const sent=await svc.dispatch({orderId:order.id,custodian:'Chofer directo',
      items:[{orderLineId:order.lines[0].id,quantity:3}]},randomUUID(),'operador');
    expect(sent.originId).toBe(location.id);
    const after=await db.stock.findUniqueOrThrow({where:{id:stock.id}});
    expect([after.physical,after.reserved]).toEqual([2,0]);
  });
});
