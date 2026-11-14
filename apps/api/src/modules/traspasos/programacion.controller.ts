import { Body, Controller, Get, Headers, Param, Post, Req } from '@nestjs/common';
import { ProgramacionService } from './programacion.service';
import { ScheduleTransferDto } from './dto/programacion.dto';
import { operator, OperatorRequest } from '../gobierno/identity';
@Controller('transfers')
export class ProgramacionController {
  constructor(private readonly service: ProgramacionService) {}
  @Get(':id/schedules') list(@Param('id') id: string) { return this.service.history(id); }
  @Post(':id/schedules') schedule(@Param('id') id: string,
    @Body() body: ScheduleTransferDto, @Headers('idempotency-key') key: string | undefined,
    @Req() req: OperatorRequest) { return this.service.schedule(id, body, key, operator(req)); }
}
