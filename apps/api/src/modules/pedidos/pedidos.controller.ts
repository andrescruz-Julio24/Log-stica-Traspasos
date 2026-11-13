import { Body,Controller,Get,Headers,Post } from '@nestjs/common';
import { PedidosService } from './pedidos.service';
import { CreateOrderDto } from './dto/pedidos.dto';

@Controller('orders')
export class PedidosController{
  constructor(private readonly service:PedidosService){}
  @Get() orders(){return this.service.orders();}
  @Post() createOrder(@Body() body:CreateOrderDto,@Headers('x-demo-actor') actor?:string){
    return this.service.createOrder(body,actor);
  }
}
