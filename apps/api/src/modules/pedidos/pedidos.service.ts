import { Injectable,NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../shared/database/prisma.service';
import { TransactionService } from '../../shared/database/transaction.service';
import { uniqueItems } from '../../shared/domain/assertions';
import { CreateOrderDto } from './dto/pedidos.dto';

@Injectable()
export class PedidosService{
  constructor(private readonly db:PrismaService,private readonly tx:TransactionService){}

  orders() { return this.db.customerOrder.findMany({include:{destination:true,lines:{include:{product:true}}},orderBy:{createdAt:'desc'}}); }

  async createOrder(body:CreateOrderDto,actor?:string) {
    uniqueItems(body.items);
    return this.tx.transaction(async tx=>{
      const place=await tx.location.findUnique({where:{id:body.destinationId}});
      if(!place)throw new NotFoundException('Destino no encontrado');
      const order=await tx.customerOrder.create({data:{code:'CL-'+randomUUID().slice(0,8).toUpperCase(),customer:body.customer,destinationId:body.destinationId,lines:{create:body.items.map(i=>({productId:i.productId,required:i.required}))}},include:{lines:true}});
      await this.tx.auditTx(tx,'ORDER_CREATED','CustomerOrder',order.id,actor,body);
      return order;
    });
  }
}
