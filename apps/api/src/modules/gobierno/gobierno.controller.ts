import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { GobiernoService } from './gobierno.service';
import { ExceptionDto, DecisionDto, SnapshotDto } from './gobierno.dto';
import { operator, OperatorRequest } from './identity';
@Controller()
export class GobiernoController {
  constructor(private service: GobiernoService) {}
  @Get('authorizations') list() {
    return this.service.list();
  }
  @Post('authorizations') request(
    @Body() body: ExceptionDto,
    @Req() req: OperatorRequest,
  ) {
    return this.service.request(body, operator(req));
  }
  @Post('authorizations/:id/decision') decide(
    @Param('id') id: string,
    @Body() body: DecisionDto,
    @Req() req: OperatorRequest,
  ) {
    return this.service.decide(id, body, operator(req, true));
  }
  @Post('stock/:id/verify') snapshot(
    @Param('id') id: string,
    @Body() body: SnapshotDto,
    @Req() req: OperatorRequest,
  ) {
    return this.service.snapshot(id, body, operator(req, true));
  }
}
