import { Injectable,NotFoundException,BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../shared/database/prisma.service';
import { TransactionService } from '../../shared/database/transaction.service';
import { ensure, uniqueItems } from '../../shared/domain/assertions';
import { CreateTransferDto, ReserveDto, DispatchDto, ReceiveDto } from './dto/traspasos.dto';

@Injectable()
export class TraspasosService{
  constructor(private readonly db:PrismaService,private readonly tx:TransactionService){}

  transfers() { return this.db.transfer.findMany({include:{origin:true,destination:true,lines:{include:{product:true,reservations:true}},dispatches:{include:{lines:true}},receipts:{include:{lines:true}}},orderBy:{createdAt:'desc'}}); }

  async createTransfer(body:CreateTransferDto,actor?:string) {
    uniqueItems(body.items);
    ensure(body.originId!==body.destinationId,'Origen y destino deben ser distintos');
    return this.tx.transaction(async tx=>{
      const transfer=await tx.transfer.create({data:{code:'TR-'+randomUUID().slice(0,8).toUpperCase(),originId:body.originId,destinationId:body.destinationId,lines:{create:body.items.map(i=>({productId:i.productId,requested:i.requested}))}},include:{lines:true}});
      await this.tx.auditTx(tx,'TRANSFER_CREATED','Transfer',transfer.id,actor,body);
      return transfer;
    });
  }

  async reserve(transferId:string,body:ReserveDto,actor?:string) {
    return this.tx.transaction(async tx=>{
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
      await this.tx.auditTx(tx,'STOCK_RESERVED','Reservation',reservation.id,actor,{transferId,...body});
      return reservation;
    });
  }

  async dispatch(transferId:string,body:DispatchDto,key?:string,actor?:string) {
    uniqueItems(body.items);
    return this.tx.idempotent('dispatch:'+transferId,key,body,async tx=>{
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
      await this.tx.auditTx(tx,'DISPATCH_CREATED','Dispatch',dispatch.id,actor,{transferId,items:body.items});
      return dispatch;
    });
  }

  async receive(transferId:string,body:ReceiveDto,key?:string,actor?:string) {
    uniqueItems(body.items);
    for(const item of body.items){
      if(item.accepted+item.rejected!==item.presented)throw new BadRequestException('Aceptado + rechazado debe ser igual a presentado');
    }
    return this.tx.idempotent('receipt:'+transferId,key,body,async tx=>{
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
      await this.tx.auditTx(tx,'RECEIPT_VERIFIED','Receipt',receipt.id,actor,{transferId,items:body.items,administrativelyClosed:reconciled});
      return receipt;
    });
  }
}
