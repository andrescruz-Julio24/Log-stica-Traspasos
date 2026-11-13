import 'reflect-metadata';
import { describe,expect,it,vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { TraspasosService } from '../traspasos.service';
import { TransactionService } from '../../../shared/database/transaction.service';
import { PrismaService } from '../../../shared/database/prisma.service';

const makeService=(tx:any)=>{
  const transaction={transaction:vi.fn(async(fn:any)=>fn(tx)),idempotent:vi.fn(async(_op:any,_key:any,_payload:any,fn:any)=>fn(tx))};
  return {service:new TraspasosService({} as PrismaService,transaction as unknown as TransactionService),transaction};
};

describe('TraspasosService — controles de operación',()=>{
  it('rechaza el mismo origen y destino antes de escribir en BD',async()=>{
    const {service,transaction}=makeService({});
    await expect(service.createTransfer({originId:'A',destinationId:'A',items:[{productId:'SKU',requested:1}]})).rejects.toThrow('Origen y destino deben ser distintos');
    expect(transaction.transaction).not.toHaveBeenCalled();
  });

  it('rechaza reservas superiores al stock libre',async()=>{
    const tx={
      transfer:{findUnique:vi.fn().mockResolvedValue({id:'T',status:'REQUESTED',originId:'ORIGIN'})},
      transferLine:{findUnique:vi.fn().mockResolvedValue({id:'L',transferId:'T',productId:'P',requested:20})},
      reservation:{aggregate:vi.fn().mockResolvedValue({_sum:{quantity:0}})},
      stock:{findUnique:vi.fn().mockResolvedValue({id:'S',physical:5,reserved:3,blocked:1,version:0})},
    };
    const {service}=makeService(tx);
    await expect(service.reserve('T',{transferLineId:'L',quantity:2})).rejects.toThrow('Inventario insuficiente para reservar');
    expect(tx.stock.findUnique).toHaveBeenCalledOnce();
  });

  it('rechaza líneas de pedido con destino distinto al traspaso',async()=>{
    const tx={
      transfer:{findUnique:vi.fn().mockResolvedValue({id:'T',status:'REQUESTED',originId:'A',destinationId:'B'})},
      transferLine:{findUnique:vi.fn().mockResolvedValue({id:'L',transferId:'T',productId:'P',requested:20})},
      reservation:{aggregate:vi.fn().mockResolvedValue({_sum:{quantity:0}})},
      orderLine:{findUnique:vi.fn().mockResolvedValue({id:'O',productId:'P',order:{destinationId:'C',status:'PENDING'}})},
    };
    const {service}=makeService(tx);
    await expect(service.reserve('T',{transferLineId:'L',quantity:2,orderLineId:'O'})).rejects.toThrow('El pedido de cliente y destino deben coincidir');
  });

  it('requiere reserva vigente para autorizar un despacho',async()=>{
    const tx={
      transfer:{findUnique:vi.fn().mockResolvedValue({id:'T',status:'PREPARING',lines:[{productId:'P',requested:10,dispatched:0,reservations:[]}]})},
    };
    const {service}=makeService(tx);
    await expect(service.dispatch('T',{items:[{productId:'P',quantity:5}]},'uuid-test')).rejects.toThrow('Se requiere una reserva de origen antes del despacho');
  });

  it('rechaza recibir una cantidad presentada diferente de aceptada + rechazada',async()=>{
    const {service,transaction}=makeService({});
    await expect(service.receive('T',{items:[{productId:'P',presented:7,accepted:3,rejected:2}]},'key')).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction.idempotent).not.toHaveBeenCalled();
  });
});
