import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { PrismaService } from '../../../shared/database/prisma.service';
import { TransactionService } from '../../../shared/database/transaction.service';
import { MedidosService } from '../medidos.service';

if (process.env.SGTL_INTEGRATION_TEST_DB !== '1') throw Error('Requiere PostgreSQL aislado de pruebas');
const db = new PrismaService();
const svc = new MedidosService(db, new TransactionService(db));
beforeAll(async()=>{ await db.$connect(); });
afterAll(async()=>{ await db.$disconnect(); });

async function fixture(qty='30.000') {
  const tag=randomUUID();
  const product=await db.product.create({data:{sku:'W-'+tag,name:'Materia prima por KG',baseUnit:'KG'}});
  const origin=await db.location.create({data:{name:'PVT origen peso '+tag}});
  const destination=await db.location.create({data:{name:'Distribuidora destino peso '+tag}});
  const stock=await db.unitStock.create({data:{
    productId:product.id,locationId:origin.id,unit:'KG',physical:qty,
  }});
  return {product,origin,destination,stock};
}

describe('T-19/T-20: tránsito y recepción de kg reales entre sedes',()=>{
  it('despacha 20 kg sin doble inventario; recibe 18 aceptados + 2 bloqueados y genera incidencia',async()=>{
    const s=await fixture();
    const payload={originId:s.origin.id,destinationId:s.destination.id,
      items:[{productId:s.product.id,requested:'20.000',estimatedPackages:2,averageWeightKg:'10.000'}]};
    const k=randomUUID();
    const tr=await svc.create(payload,k,'solicitante');
    expect((await svc.create(payload,k,'solicitante')).id).toBe(tr.id);
    const line=tr.measuredLines[0];
    await svc.reserve(tr.id,{lineId:line.id,quantity:'20.000'},randomUUID(),'gerente');
    let stock=await db.unitStock.findUniqueOrThrow({where:{id:s.stock.id}});
    expect([stock.physical.toString(),stock.reserved.toString()]).toEqual(['30','20']);
    const dKey=randomUUID();
    const dispatch=await svc.dispatch(tr.id,{lineId:line.id,quantity:'20.000',custodian:'Chofer 4'},dKey,'conductor');
    expect((await svc.dispatch(tr.id,{lineId:line.id,quantity:'20.000',custodian:'Chofer 4'},dKey,'conductor')).id)
      .toBe(dispatch.id);
    stock=await db.unitStock.findUniqueOrThrow({where:{id:s.stock.id}});
    expect([stock.physical.toString(),stock.reserved.toString()]).toEqual(['10','0']);
    expect(await db.unitStock.count({where:{productId:s.product.id,locationId:s.destination.id}})).toBe(0);
    const body={dispatchId:dispatch.id,presented:'20.000',accepted:'18.000',blocked:'2.000',
      observedAt:new Date().toISOString(),notes:'Dos kilogramos dañados',evidenceRef:'FIRMA-11'};
    const rKey=randomUUID();
    const receipt=await svc.receive(tr.id,body,rKey,'receptor');
    expect((await svc.receive(tr.id,body,rKey,'receptor')).id).toBe(receipt.id);
    const destination=await db.unitStock.findUniqueOrThrow({where:{productId_locationId:{
      productId:s.product.id,locationId:s.destination.id,
    }}});
    expect([destination.physical.toString(),destination.blocked.toString(),destination.reserved.toString()])
      .toEqual(['20','2','0']);
    expect(destination.physical.minus(destination.blocked).toString()).toBe('18');
    const record=await db.transfer.findUniqueOrThrow({where:{id:tr.id},include:{measuredLines:true}});
    expect(record.status).toBe('RECEIVING');
    expect(record.measuredLines[0].accepted.toString()).toBe('18');
    expect(record.measuredLines[0].blocked.toString()).toBe('2');
    expect(await db.incident.count({where:{transferId:tr.id,type:'PESO_RECIBIDO_EN_REVISION',status:'OPEN'}}))
      .toBe(1);
    await expect(svc.receive(tr.id,body,randomUUID(),'receptor')).rejects.toThrow('excede');
  });

  it('permite entrega parcial y cierra solo después de recepcionar todo conforme',async()=>{
    const s=await fixture('25.000');
    const tr=await svc.create({originId:s.origin.id,destinationId:s.destination.id,
      items:[{productId:s.product.id,requested:'20.000'}]},randomUUID(),'operador');
    const line=tr.measuredLines[0];
    await svc.reserve(tr.id,{lineId:line.id,quantity:'20.000'},randomUUID(),'operador');
    const first=await svc.dispatch(tr.id,{lineId:line.id,quantity:'15.000',custodian:'Chofer'},randomUUID(),'operador');
    await svc.receive(tr.id,{dispatchId:first.id,presented:'14.000',accepted:'14.000',blocked:'0',
      observedAt:new Date().toISOString()},randomUUID(),'receptor');
    expect((await db.transfer.findUniqueOrThrow({where:{id:tr.id}})).status).toBe('RECEIVING');
    await svc.receive(tr.id,{dispatchId:first.id,presented:'1.000',accepted:'1.000',blocked:'0',
      observedAt:new Date().toISOString()},randomUUID(),'receptor');
    expect((await db.transfer.findUniqueOrThrow({where:{id:tr.id}})).status).toBe('RECEIVING');
    const last=await svc.dispatch(tr.id,{lineId:line.id,quantity:'5.000',custodian:'Chofer'},randomUUID(),'operador');
    await svc.receive(tr.id,{dispatchId:last.id,presented:'5.000',accepted:'5.000',blocked:'0',
      observedAt:new Date().toISOString()},randomUUID(),'receptor');
    expect((await db.transfer.findUniqueOrThrow({where:{id:tr.id}})).status).toBe('CLOSED');
    const a=await db.unitStock.findUniqueOrThrow({where:{id:s.stock.id}});
    const b=await db.unitStock.findUniqueOrThrow({where:{productId_locationId:{
      productId:s.product.id,locationId:s.destination.id,
    }}});
    expect([a.physical.toString(),a.reserved.toString(),b.physical.toString(),b.blocked.toString()])
      .toEqual(['5','0','20','0']);
  });

  it('bloquea reservas superiores a disponible y recepción fuera de despacho',async()=>{
    const s=await fixture('5.000');
    const tr=await svc.create({originId:s.origin.id,destinationId:s.destination.id,
      items:[{productId:s.product.id,requested:'20.000'}]},randomUUID(),'operador');
    const line=tr.measuredLines[0];
    await expect(svc.reserve(tr.id,{lineId:line.id,quantity:'6.000'},randomUUID(),'operador')).rejects.toThrow('libre');
    await svc.reserve(tr.id,{lineId:line.id,quantity:'4.000'},randomUUID(),'operador');
    await expect(svc.dispatch(tr.id,{lineId:line.id,quantity:'5.000',custodian:'Chofer'},randomUUID(),'operador'))
      .rejects.toThrow('reserva');
    const dispatch=await svc.dispatch(tr.id,{lineId:line.id,quantity:'4.000',custodian:'Chofer'},randomUUID(),'operador');
    await expect(svc.receive(tr.id,{dispatchId:dispatch.id,presented:'4.100',accepted:'4.100',blocked:'0',
      observedAt:new Date().toISOString()},randomUUID(),'receptor')).rejects.toThrow('excede');
    expect(await db.unitStock.count({where:{productId:s.product.id,locationId:s.destination.id}})).toBe(0);
  });
});
