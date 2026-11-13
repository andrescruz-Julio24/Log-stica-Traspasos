import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { PedidosService } from './pedidos.service';
import { PlanOrderDto, CreateOrderDto } from './dto/pedidos.dto';

@Controller('orders')
export class PedidosController {
  constructor(private readonly service: PedidosService) {}
  @Post(':id/plan') plan(
    @Param('id') id: string,
    @Body() body: PlanOrderDto,
    @Headers('x-demo-actor') actor?: string,
  ) {
    return this.service.plan(id, body, actor);
  }
  @Get(':id/history') history(@Param('id') id: string) {
    return this.service.history(id);
  }
  @Get() orders() {
    return this.service.orders();
  }
  @Post() createOrder(
    @Body() body: CreateOrderDto,
    @Headers('x-demo-actor') actor?: string,
  ) {
    return this.service.createOrder(body, actor);
  }
}
