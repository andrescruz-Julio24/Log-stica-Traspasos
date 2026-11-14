import { Body, Controller, Get, Headers, Param, Post, Req } from '@nestjs/common';
import { ConteosService } from './conteos.service';
import { CreateInventoryObservationDto, ApplyInventoryCountDto } from './dto/conteos.dto';
import { operator, OperatorRequest } from '../gobierno/identity';

@Controller('inventory-observations')
export class ConteosController {
  constructor(private readonly service: ConteosService) {}
  @Get() list() { return this.service.list(); }
  @Post() create(@Body() body: CreateInventoryObservationDto, @Req() req: OperatorRequest, @Headers('idempotency-key') key?: string) {
    return this.service.create(body, operator(req), key);
  }
  @Post(':id/verify') verify(@Param('id') id: string, @Req() req: OperatorRequest, @Headers('idempotency-key') key?: string) {
    return this.service.verify(id, operator(req, true), key);
  }
  @Post(':id/apply') apply(@Param('id') id: string, @Body() body: ApplyInventoryCountDto,
    @Req() req: OperatorRequest, @Headers('idempotency-key') key?: string) {
    return this.service.apply(id, body, operator(req, true), key);
  }
}
