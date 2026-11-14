import { Body, Controller, Get, Headers, Param, Post, Req } from '@nestjs/common';
import { operator, OperatorRequest } from '../gobierno/identity';
import { PedidosPesoService } from './pedidos-peso.service';
import { CreateWeightOrderDto, ReserveWeightOrderDto, DispatchWeightOrderDto, ConfirmWeightClientDto } from './dto/pedidos-peso.dto';
@Controller('weight-orders')
export class PedidosPesoController {
  constructor(private readonly service: PedidosPesoService) {}
  @Get() list() { return this.service.list(); }
  @Post() create(@Body() body: CreateWeightOrderDto,
    @Headers('idempotency-key') key: string | undefined, @Req() req: OperatorRequest) {
    return this.service.create(body, key, operator(req));
  }
  @Post('shipments/:id/confirm') confirm(@Param('id') id: string, @Body() body: ConfirmWeightClientDto,
    @Headers('idempotency-key') key: string | undefined, @Req() req: OperatorRequest) {
    return this.service.confirmCustomer(id, body, key, operator(req));
  }
  @Post(':id/reserve') reserve(@Param('id') id: string, @Body() body: ReserveWeightOrderDto,
    @Headers('idempotency-key') key: string | undefined, @Req() req: OperatorRequest) {
    return this.service.reserve(id, body, key, operator(req));
  }
  @Post(':id/dispatch') dispatch(@Param('id') id: string, @Body() body: DispatchWeightOrderDto,
    @Headers('idempotency-key') key: string | undefined, @Req() req: OperatorRequest) {
    return this.service.dispatch(id, body, key, operator(req));
  }
}
