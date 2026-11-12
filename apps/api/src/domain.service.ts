import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PrismaClient, TransferStatus } from '@prisma/client';
import { createHash, randomUUID } from 'node:crypto';
import { PrismaService } from './prisma.service';
import { CreateIncidentDto, CreateOrderDto, CreateTransferDto, DispatchDto, ReceiveDto, ReserveDto } from './dto';

type Tx = Prisma.TransactionClient;
function ensure(condition: unknown, message: string): asserts condition {
  if (!condition) throw new ConflictException(message);
}
function actorName(value?:string) { return (value || 'operador-demo').slice(0,80); }
function uniqueItems(items:{productId:string}[]) {
  if (new Set(items.map(x=>x.productId)).size !== items.length) throw new BadRequestException('No se permiten SKU duplicados en la misma operación');
}
function fingerprint(value: unknown) { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }

@Injectable()
export class DomainService {
  constructor(private readonly db:PrismaService) {}
  private async auditTx(tx:Tx,type:string,entity:string,entityId:string,actor?:string,data:unknown={}) {
    await tx.auditEvent.create({data:{type,entity,entityId,actor:actorName(actor),data:data as Prisma.InputJsonValue}});
  }
  private async transaction<T>(fn:(tx:Tx)=>Promise<T>):Promise<T> {
    for(let attempt=0; attempt<3;attempt++) {
      try { return await this.db.$transaction(fn,{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:15000}); }
      catch(e:any) {
        if(e.code==='P2034' && attempt<2) continue;
        if(e.code==='P2002') throw new ConflictException('Folio o clave duplicada');
        throw e;
      }
    }
    throw new ConflictException('Conflicto de concurrencia: vuelve a intentar');
  }
  private async idempotent<T>(operation:string,key:string|undefined,payload:unknown,fn:(tx:Tx)=>Promise<T>):Promise<T> {
    if(!key || key.length>120) throw new BadRequestException('Se requiere Idempotency-Key (máximo 120 caracteres)');
    const id=operation+':'+key;
    const hash=fingerprint(payload);
    const cached=await this.db.idempotencyRecord.findUnique({where:{key:id}});
    if(cached) {
      const result=cached.result as any;
      ensure(result.hash===hash,'Idempotency-Key reutilizada con contenido diferente');
      return result.response as T;
    }
    for(let attempt=0;attempt<3;attempt++){
      try {
        return await this.db.$transaction(async tx=>{
          const response=await fn(tx);
          await tx.idempotencyRecord.create({data:{key:id,operation,result:{hash,response} as Prisma.InputJsonValue}});
          return response;
        },{isolationLevel:Prisma.TransactionIsolationLevel.Serializable,timeout:15000});
      }catch(e:any){
        if(e.code==='P2002' || e.code==='P2034') {
          const recorded=await this.db.idempotencyRecord.findUnique({where:{key:id}});
          if(recorded){
            const result=recorded.result as any;
            ensure(result.hash===hash,'Idempotency-Key reutilizada con contenido diferente');
            return result.response as T;
          }
          if(attempt<2)continue;
          throw new ConflictException('Conflicto de concurrencia; reintenta la operación');
        }
        throw e;
      }
    }
    throw new ConflictException('No se pudo confirmar la operación');
  }
  bootstrap() {return Promise.all([
    this.db.product.findMany({orderBy:{name:'asc'}}),
    this.db.location.findMany({orderBy:{name:'asc'}}),
    this.db.stock.findMany({include:{product:true,location:true},orderBy:{location:{name:'asc'}}}),
  ]).then(([products,locations,stocks])=>({products,locations,stocks}));}
  orders() { return this.db.customerOrder.findMany({include:{destination:true,lines:{include:{product:true}}},orderBy:{createdAt:'desc'}}); }
  transfers() { return this.db.transfer.findMany({include:{origin:true,destination:true,lines:{include:{product:true,reservations:true}},dispatches:{include:{lines:true}},receipts:{include:{lines:true}}},orderBy:{createdAt:'desc'}}); }
  incidents() {return this.db.incident.findMany({orderBy:{createdAt:'desc'}});}
  audit() {return this.db.auditEvent.findMany({orderBy:{createdAt:'desc'},take:200});}

  async createOrder(body:CreateOrderDto,actor?:string) {
    uniqueItems(body.items);
    return this.transaction(async tx=>{
      const place=await tx.location.findUnique({where:{id:body.destinationId}});
      if(!place)throw new NotFoundException('Destino no encontrado');
      const order=await tx.customerOrder.create({data:{code:'CL-'+randomUUID().slice(0,8).toUpperCase(),customer:body.customer,destinationId:body.destinationId,lines:{create:body.items.map(i=>({productId:i.productId,required:i.required}))}},include:{lines:true}});
      await this.auditTx(tx,'ORDER_CREATED','CustomerOrder',order.id,actor,body);
      return order;
    });
  }
  async createTransfer(body:CreateTransferDto,actor?:string) {
    uniqueItems(body.items);
    ensure(body.originId!==body.destinationId,'Origen y destino deben ser distintos');
    return this.transaction(async tx=>{
      const transfer=await tx.transfer.create({data:{code:'TR-'+randomUUID().slice(0,8).toUpperCase(),originId:body.originId,destinationId:body.destinationId,lines:{create:body.items.map(i=>({productId:i.productId,requested:i.requested}))}},include:{lines:true}});
      await this.auditTx(tx,'TRANSFER_CREATED','Transfer',transfer.id,actor,body);
      return transfer;
    });
  }
  async reserve(transferId:string,body:ReserveDto,actor?:string) {
    return this.transaction(async tx=>{
      const transfer=await tx.transfer.findUnique({where:{id:transferId}});
      if(!transfer)throw new NotFoundException('Traspaso no encontrado');
      ensure(transfer.status==='REQUESTED'||transfer.status==='PREPARING','El traspaso no admite nuevas reservas');
      const line=await tx.transferLine.findUnique({where:{id:body.transferLineId}});
      ensure(line?.transferId===transferId,'La línea no pertenece al traspaso');
      const already=await tx.reservation.aggregate({where:{transferLineId:line.id},_sum:{quantity:true}});
      ensure((already._sum.quantity||0)+body.quantity<=line.requested,'Reserva excede la cantidad solicitada');
      if(body.orderLineId){
        const orderLine=await tx.orderLine.findUnique({where:{id:body.orderLineId},include:{order:true}});
        ensure(orderLine?.productId===line.productId && orderLine.order.destinationId===transfer.destinationId,'El pedido de cliente y destino deben coincidir');
        ensure(orderLine.order.status!=='CANCELLED','Pedido cancelado');
        const committed=await tx.reservation.aggregate({where:{orderLineId:body.orderLineId},_sum:{quantity:true}});
        ensure((committed._sum.quantity||0)+body.quantity<=orderLine.required-orderLine.accepted,'Asignación prevista supera el faltante del cliente');
      }
      const stock=await tx.stock.findUnique({where:{productId_locationId:{productId:line.productId,locationId:transfer.originId}}});
      ensure(stock,'No existe inventario de origen');
      ensure(stock.physical-stock.blocked-stock.reserved>=body.quantity,'Inventario insuficiente para reservar');
      const changed=await tx.stock.updateMany({where:{id:stock.id,version:stock.version},data:{reserved:{increment:body.quantity},version:{increment:1}}});
      ensure(changed.count===1,'Inventario modificado por otro usuario');
      const reservation=await tx.reservation.create({data:{stockId:stock.id,transferLineId:line.id,orderLineId:body.orderLineId,quantity:body.quantity}});
      await tx.transfer.update({where:{id:transferId},data:{status:'PREPARING'}});
      await this.auditTx(tx,'STOCK_RESERVED','Reservation',reservation.id,actor,{transferId,...body});
      return reservation;
    });
  }
  async dispatch(transferId:string,body:DispatchDto,key?:string,actor?:string) {
    uniqueItems(body.items);
    return this.idempotent('dispatch:'+transferId,key,body,async tx=>{
      const transfer=await tx.transfer.findUnique({where:{id:transferId},include:{lines:{include:{reservations:true}}}});
      if(!transfer)throw new NotFoundException('Traspaso no encontrado');
      ensure(['PREPARING','DISPATCHED','IN_TRANSIT'].includes(transfer.status),'Traspaso no disponible para despacho');
      for(const item of body.items) {
        const line=transfer.lines.find(x=>x.productId===item.productId);
        ensure(line,'Producto ajeno al traspaso');
        ensure(line.dispatched+item.quantity<=line.requested,'Cantidad despachada supera lo solicitado');
        const active=line.reservations.reduce((n,r)=>n+r.quantity-r.released,0);
        ensure(active>=item.quantity,'Se requiere una reserva de origen antes del despacho');
        const stock=await tx.stock.findUnique({where:{productId_locationId:{productId:item.productId,locationId:transfer.originId}}});
        ensure(stock && stock.reserved>=item.quantity && stock.physical>=item.quantity,'Stock reservado insuficiente');
        const changed=await tx.stock.updateMany({where:{id:stock.id,version:stock.version},data:{physical:{decrement:item.quantity},reserved:{decrement:item.quantity},version:{increment:1}}});
        ensure(changed.count===1,'Inventario modificado durante despacho');
        let remaining=item.quantity;
        for(const r of line.reservations){
          const take=Math.min(remaining,r.quantity-r.released);
          if(take>0)await tx.reservation.update({where:{id:r.id},data:{released:{increment:take}}});
          remaining-=take;
          if(!remaining)break;
        }
        await tx.transferLine.update({where:{id:line.id},data:{dispatched:{increment:item.quantity}}});
      }
      const dispatch=await tx.dispatch.create({data:{transferId,lines:{create:body.items.map(i=>({productId:i.productId,quantity:i.quantity}))}},include:{lines:true}});
      await tx.transfer.update({where:{id:transferId},data:{status:'IN_TRANSIT'}});
      await this.auditTx(tx,'DISPATCH_CREATED','Dispatch',dispatch.id,actor,{transferId,items:body.items});
      return dispatch;
    });
  }
  async receive(transferId:string,body:ReceiveDto,key?:string,actor?:string) {
    uniqueItems(body.items);
    for(const item of body.items){
      if(item.accepted+item.rejected!==item.presented)throw new BadRequestException('Aceptado + rechazado debe ser igual a presentado');
    }
    return this.idempotent('receipt:'+transferId,key,body,async tx=>{
      const transfer=await tx.transfer.findUnique({where:{id:transferId},include:{lines:{include:{reservations:{include:{orderLine:{include:{order:true}}}}}}}});
      if(!transfer)throw new NotFoundException('Traspaso no encontrado');
      ensure(['IN_TRANSIT','RECEIVING'].includes(transfer.status),'No se puede recibir un traspaso sin despachar');
      for(const item of body.items){
        const line=transfer.lines.find(x=>x.productId===item.productId);
        ensure(line,'Producto ajeno al traspaso');
        const prevPresented=await tx.receiptLine.aggregate({where:{productId:item.productId,receipt:{transferId}},_sum:{presented:true}});
        ensure((prevPresented._sum.presented||0)+item.presented<=line.dispatched,'Recepción excede lo despachado');
        await tx.transferLine.update({where:{id:line.id},data:{accepted:{increment:item.accepted}}});
        if(item.accepted>0){
          const stock=await tx.stock.upsert({where:{productId_locationId:{productId:item.productId,locationId:transfer.destinationId}},create:{productId:item.productId,locationId:transfer.destinationId,physical:item.accepted},update:{physical:{increment:item.accepted},version:{increment:1}}});
          let remaining=item.accepted;
          for(const reservation of line.reservations){
            if(!reservation.orderLineId || !reservation.orderLine || reservation.orderLine.order.status==='CANCELLED')continue;
            const ol=await tx.orderLine.findUnique({where:{id:reservation.orderLineId}});
            if(!ol)continue;
            const alreadyAtDest=ol.accepted;
            const allow=Math.max(0,Math.min(remaining,reservation.quantity-alreadyAtDest,ol.required-alreadyAtDest));
            if(allow>0){
              await tx.orderLine.update({where:{id:ol.id},data:{accepted:{increment:allow}}});
              await tx.stock.update({where:{id:stock.id},data:{reserved:{increment:allow},version:{increment:1}}});
              remaining-=allow;
              const orderLines=await tx.orderLine.findMany({where:{orderId:ol.orderId}});
              const complete=orderLines.every(x=>x.accepted>=x.required);
              await tx.customerOrder.update({where:{id:ol.orderId},data:{status:complete?'READY':'PARTIAL'}});
            }
            if(remaining===0)break;
          }
        }
        if(item.rejected>0)await tx.incident.create({data:{transferId,type:'RECHAZO_RECEPCION',notes:'Producto '+item.productId+': '+item.rejected+' unidad(es) rechazadas; requiere conciliación'}});
      }
      const receipt=await tx.receipt.create({data:{transferId,lines:{create:body.items.map(i=>({productId:i.productId,presented:i.presented,accepted:i.accepted,rejected:i.rejected}))}},include:{lines:true}});
      const allLines=await tx.transferLine.findMany({where:{transferId}});
      const reconciled=allLines.every(x=>x.accepted===x.dispatched);
      await tx.transfer.update({where:{id:transferId},data:{status:reconciled?'CLOSED':'RECEIVING'}});
      await this.auditTx(tx,'RECEIPT_VERIFIED','Receipt',receipt.id,actor,{transferId,items:body.items,administrativelyClosed:reconciled});
      return receipt;
    });
  }
  async incident(body:CreateIncidentDto,actor?:string){
    return this.transaction(async tx=>{
      const i=await tx.incident.create({data:body});
      await this.auditTx(tx,'INCIDENT_OPENED','Incident',i.id,actor,body);
      return i;
    });
  }
}
