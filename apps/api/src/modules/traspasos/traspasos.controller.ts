import { FinishInspectionDto } from './dto/traspasos.dto';
import { Body, Controller, Get, Headers, Param, Post } from '@nestjs/common';
import { TraspasosService } from './traspasos.service';
import {
  CreateTransferDto,
  ReserveDto,
  DispatchDto,
  PickDto,
  ReceiveDto,
} from './dto/traspasos.dto';

@Controller('transfers')
export class TraspasosController {
  constructor(private readonly service: TraspasosService) {}
  @Get() transfers() {
    return this.service.transfers();
  }
  @Post() createTransfer(
    @Body() body: CreateTransferDto,
    @Headers('x-demo-actor') actor?: string,
  ) {
    return this.service.createTransfer(body, actor);
  }
  @Post(':id/reservations') reserve(
    @Param('id') id: string,
    @Body() body: ReserveDto,
    @Headers('idempotency-key') key?:string,
    @Headers('x-demo-actor') actor?: string,
  ) {
    return this.service.reserve(id, body, actor,key??'');
  }
  @Post(':id/picking') pick(
    @Param('id') id: string,
    @Body() body: PickDto,
    @Headers('x-demo-actor') actor?: string,
  ) {
    return this.service.pick(id, body, actor);
  }
  @Post(':id/dispatches') dispatch(
    @Param('id') id: string,
    @Body() body: DispatchDto,
    @Headers('idempotency-key') key?: string,
    @Headers('x-demo-actor') actor?: string,
  ) {
    return this.service.dispatch(id, body, key, actor);
  }
  @Post(':id/dispatches/:dispatchId/finish') finish(
    @Param('id') id: string,
    @Param('dispatchId') d: string,
    @Body() body: FinishInspectionDto,
    @Headers('x-demo-actor') actor?: string,
  ) {
    return this.service.finishInspection(id, d, body.reason, actor,body.assignedTo);
  }
  @Post(':id/receipts') receive(
    @Param('id') id: string,
    @Body() body: ReceiveDto,
    @Headers('idempotency-key') key?: string,
    @Headers('x-demo-actor') actor?: string,
  ) {
    return this.service.receive(id, body, key, actor);
  }
}
