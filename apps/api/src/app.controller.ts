import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { DomainService } from './domain.service';
import { CreateIncidentDto, CreateOrderDto, CreateTransferDto, DispatchDto, ReceiveDto, ReserveDto } from './dto';

@Controller()
export class AppController {
  constructor(private readonly domain: DomainService) {}
  @Get('health') health() { return { ok:true, mode:'demo', auth:false }; }
  @Get('bootstrap') bootstrap() { return this.domain.bootstrap(); }
  @Get('orders') orders() { return this.domain.orders(); }
  @Post('orders') createOrder(@Body() body:CreateOrderDto, @Headers('x-demo-actor') actor?:string) { return this.domain.createOrder(body,actor); }
  @Get('transfers') transfers() { return this.domain.transfers(); }
  @Post('transfers') createTransfer(@Body() body:CreateTransferDto, @Headers('x-demo-actor') actor?:string) { return this.domain.createTransfer(body,actor); }
  @Post('transfers/:id/reservations') reserve(@Param('id') id:string,@Body() body:ReserveDto,@Headers('x-demo-actor') actor?:string) { return this.domain.reserve(id,body,actor); }
  @Post('transfers/:id/dispatches') dispatch(@Param('id') id:string,@Body() body:DispatchDto,@Headers('idempotency-key') key?:string,@Headers('x-demo-actor') actor?:string) { return this.domain.dispatch(id,body,key,actor); }
  @Post('transfers/:id/receipts') receive(@Param('id') id:string,@Body() body:ReceiveDto,@Headers('idempotency-key') key?:string,@Headers('x-demo-actor') actor?:string) { return this.domain.receive(id,body,key,actor); }
  @Post('incidents') incident(@Body() body:CreateIncidentDto,@Headers('x-demo-actor') actor?:string) { return this.domain.incident(body,actor); }
  @Get('incidents') incidents() { return this.domain.incidents(); }
  @Get('audit') audit() { return this.domain.audit(); }
}
