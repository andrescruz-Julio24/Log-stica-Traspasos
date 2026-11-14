import { Body, Controller, Get, Headers, Param, Post, Req } from '@nestjs/common';
import { MedidosService } from './medidos.service';
import { CreateMeasuredTransferDto, MeasuredReservationDto, MeasuredDispatchDto, MeasuredReceiptDto } from './dto/medidos.dto';
import { operator, OperatorRequest } from '../gobierno/identity';

@Controller('measured-transfers')
export class MedidosController {
  constructor(private readonly service: MedidosService) {}
  @Get() list() { return this.service.list(); }
  @Post() create(@Body() body: CreateMeasuredTransferDto,
    @Headers('idempotency-key') key: string | undefined, @Req() req: OperatorRequest) {
    return this.service.create(body, key, operator(req));
  }
  @Post(':id/reserve') reserve(@Param('id') id: string, @Body() body: MeasuredReservationDto,
    @Headers('idempotency-key') key: string | undefined, @Req() req: OperatorRequest) {
    return this.service.reserve(id, body, key, operator(req));
  }
  @Post(':id/dispatch') dispatch(@Param('id') id: string, @Body() body: MeasuredDispatchDto,
    @Headers('idempotency-key') key: string | undefined, @Req() req: OperatorRequest) {
    return this.service.dispatch(id, body, key, operator(req));
  }
  @Post(':id/receive') receive(@Param('id') id: string, @Body() body: MeasuredReceiptDto,
    @Headers('idempotency-key') key: string | undefined, @Req() req: OperatorRequest) {
    return this.service.receive(id, body, key, operator(req));
  }
}
