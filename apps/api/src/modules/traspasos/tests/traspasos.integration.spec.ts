import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { beforeAll,afterAll,describe,it,expect } from 'vitest';
import { PrismaService } from '../../../shared/database/prisma.service';
import { TransactionService } from '../../../shared/database/transaction.service';
import { TraspasosService } from '../traspasos.service';

if(process.env.SGTL_INTEGRATION_TEST_DB!=='1'){
  throw new Error('La integración requiere SGTL_INTEGRATION_TEST_DB=1 y PostgreSQL de pruebas.');
}

const db=new PrismaService();
const transactions=new TransactionService(db);
const service=new TraspasosService(db,transactions);
beforeAll(async()=>{await db.$connect();});
afterAll(async()=>{await db.$disconnect();});

async function scenario(){
  const tag=randomUUID().slice(0,12);
  const product=await db.product.create({data:{sku:'QA-'+tag,name:'Prueba '+tag}});
  const origin=await db.location.create({data:{name:'QA Origen '+tag}});
  const destination=await db.location.create({data:{name:'QA Destino '+tag}});
  const stock=await db.stock.create({data:{productId:product.id,locationId:origin.id,physical:10,reserved:0,blocked:0}});
  const create=()=>service.createTransfer({
    originId:origin.id,destinationId:destination.id,items:[{productId:product.id,requested:10}]
  },'qa-integration');
  return {product,origin,destination,stock,create};
}
describe('PostgreSQL — integridad transaccional de traspasos',()=>{
  it('conserva origen y destino durante reserva, despacho y recepción parcial; reintentos sin duplicar',async()=>{
    const s=await scenario();
    const transfer=await s.create();
    const line=transfer.lines[0];
    await service.reserve(transfer.id,{transferLineId:line.id,quantity:8},'qa-integration');
    let stock=await db.stock.findUniqueOrThrow({where:{id:s.stock.id}});
    expect(stock.physical).toBe(10);
    expect(stock.reserved).toBe(8);
    const dispatchBody={items:[{productId:s.product.id,quantity:8}]};
    const key=randomUUID();
    const dispatch=await service.dispatch(transfer.id,dispatchBody,key,'qa-integration');
    const retry=await service.dispatch(transfer.id,dispatchBody,key,'qa-integration');
    expect(retry.id).toBe(dispatch.id);
    stock=await db.stock.findUniqueOrThrow({where:{id:s.stock.id}});
    expect(stock.physical).toBe(2);
    expect(stock.reserved).toBe(0);
    const receiptBody={items:[{productId:s.product.id,presented:8,accepted:6,rejected:2}]};
    const receiptKey=randomUUID();
    const receipt=await service.receive(transfer.id,receiptBody,receiptKey,'qa-integration');
    const receiptRetry=await service.receive(transfer.id,receiptBody,receiptKey,'qa-integration');
    expect(receiptRetry.id).toBe(receipt.id);
    const dest=await db.stock.findUniqueOrThrow({where:{productId_locationId:{productId:s.product.id,locationId:s.destination.id}}});
    expect(dest.physical).toBe(6);
    const incidents=await db.incident.findMany({where:{transferId:transfer.id}});
    expect(incidents.length).toBe(1);
    const audit=await db.auditEvent.findMany({where:{entityId:transfer.id}});
    expect(audit.map(a=>a.type)).toContain('TRANSFER_CREATED');
    expect(await db.dispatch.count({where:{transferId:transfer.id}})).toBe(1);
    expect(await db.receipt.count({where:{transferId:transfer.id}})).toBe(1);
  });

  it('dos reservas simultáneas no comprometen más del inventario físico',async()=>{
    const s=await scenario();
    const [a,b]=await Promise.all([s.create(),s.create()]);
    const result=await Promise.allSettled([
      service.reserve(a.id,{transferLineId:a.lines[0].id,quantity:7},'qa-1'),
      service.reserve(b.id,{transferLineId:b.lines[0].id,quantity:7},'qa-2')
    ]);
    expect(result.filter(x=>x.status==='fulfilled').length).toBe(1);
    const stock=await db.stock.findUniqueOrThrow({where:{id:s.stock.id}});
    expect(stock.reserved).toBe(7);
    expect(stock.physical-stock.reserved-stock.blocked).toBe(3);
  });
});
