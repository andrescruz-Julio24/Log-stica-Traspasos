import { Controller,Get } from '@nestjs/common';
import { AuditoriaService } from './auditoria.service';
@Controller('audit')
export class AuditoriaController{
  constructor(private readonly service:AuditoriaService){}
  @Get() audit(){return this.service.audit();}
}
