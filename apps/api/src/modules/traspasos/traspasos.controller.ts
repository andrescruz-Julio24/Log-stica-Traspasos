import { Body,Controller,Get,Headers,Param,Post } from '@nestjs/common';
import { TraspasosService } from './traspasos.service';
import { CreateTransferDto,ReserveDto,DispatchDto,ReceiveDto } from './dto/traspasos.dto';

@Controller('transfers')
export class TraspasosController{
  constructor(private readonly service:TraspasosService){}
  @Get() transfers(){return this.service.transfers();}
  @Post() createTransfer(@Body() body:CreateTransferDto,@Headers('x-demo-actor') actor?:string){
    return this.service.createTransfer(body,actor);
  }
  @Post(':id/reservations') reserve(@Param('id') id:string,@Body() body:ReserveDto,@Headers('x-demo-actor') actor?:string){
    return this.service.reserve(id,body,actor);
  }
  @Post(':id/dispatches') dispatch(@Param('id') id:string,@Body() body:DispatchDto,@Headers('idempotency-key') key?:string,@Headers('x-demo-actor') actor?:string){
    return this.service.dispatch(id,body,key,actor);
  }
  @Post(':id/receipts') receive(@Param('id') id:string,@Body() body:ReceiveDto,@Headers('idempotency-key') key?:string,@Headers('x-demo-actor') actor?:string){
    return this.service.receive(id,body,key,actor);
  }
}
