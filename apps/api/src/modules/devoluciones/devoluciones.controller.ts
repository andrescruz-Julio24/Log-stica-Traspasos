import { Body, Controller, Get, Headers, Param, Post, Query, Req } from '@nestjs/common';
import { DevolucionesService } from './devoluciones.service';
import { WeightReturnDto, ReturnIntakeDto, ResolveReturnDto } from './dto/devoluciones.dto';
import { operator, OperatorRequest } from '../gobierno/identity';

@Controller('commercial-returns')
export class DevolucionesController {
  constructor(private readonly service: DevolucionesService) {}
  @Get() list(@Query('orderId') orderId?: string) { return this.service.list(orderId); }
  @Post('from-weight-shipment') openWeight(@Body() body: WeightReturnDto,
    @Headers('idempotency-key') key: string | undefined, @Req() req: OperatorRequest) {
    return this.service.createWeightReturn(body, key, operator(req));
  }
  @Post(':id/intake') intake(@Param('id') id: string, @Body() body: ReturnIntakeDto,
    @Headers('idempotency-key') key: string | undefined, @Req() req: OperatorRequest) {
    return this.service.intake(id, body, key, operator(req));
  }
  @Post(':id/resolve') resolve(@Param('id') id: string, @Body() body: ResolveReturnDto,
    @Headers('idempotency-key') key: string | undefined, @Req() req: OperatorRequest) {
    return this.service.resolve(id, body, key, operator(req, true));
  }
}
