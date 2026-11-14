import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { PrismaService } from '../../../shared/database/prisma.service';
import { TransactionService } from '../../../shared/database/transaction.service';
import { EntregasService } from '../entregas.service';

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
    await expect(svc.confirm(shipment.id,{receiverName:'Cliente',observedAt:new Date().toISOString(),
      items:[{shipmentLineId:shipment.lines[0].id,accepted:2,rejected:1}]},randomUUID(),'repartidor')).rejects.toThrow();
    expect(await db.clientReception.count({where:{shipmentId:shipment.id}})).toBe(0);
  });
});
