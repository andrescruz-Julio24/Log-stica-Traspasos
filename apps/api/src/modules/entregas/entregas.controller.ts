import { Body, Controller, Get, Headers, Param, Post, Req } from '@nestjs/common';
import { EntregasService } from './entregas.service';
import { CreateClientReceptionDto, CreateClientShipmentDto } from './dto/entregas.dto';
import { operator, OperatorRequest } from '../gobierno/identity';

@Controller('client-deliveries')
export class EntregasController {
  constructor(private readonly service: EntregasService) {}
  @Get() list() { return this.service.list(); }
  @Post('dispatch') dispatch(
    @Body() body: CreateClientShipmentDto,
    @Headers('idempotency-key') key: string | undefined,
    @Req() req: OperatorRequest,
  ) { return this.service.dispatch(body, key, operator(req)); }
  @Post(':id/confirm') confirm(
    @Param('id') id: string,
    @Body() body: CreateClientReceptionDto,
    @Headers('idempotency-key') key: string | undefined,
    @Req() req: OperatorRequest,
  ) { return this.service.confirm(id, body, key, operator(req)); }
}
