import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { ConteosService } from './conteos.service';
import { CreateInventoryObservationDto } from './dto/conteos.dto';
import { operator, OperatorRequest } from '../gobierno/identity';

@Controller('inventory-observations')
export class ConteosController {
  constructor(private readonly service: ConteosService) {}
  @Get() list() { return this.service.list(); }
  @Post() create(@Body() body: CreateInventoryObservationDto, @Req() req: OperatorRequest) {
    return this.service.create(body, operator(req));
  }
  @Post(':id/verify') verify(@Param('id') id: string, @Req() req: OperatorRequest) {
    return this.service.verify(id, operator(req, true));
  }
}
