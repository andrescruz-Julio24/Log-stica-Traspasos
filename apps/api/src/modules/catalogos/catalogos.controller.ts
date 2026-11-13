import { Controller,Get } from '@nestjs/common';
import { CatalogosService } from './catalogos.service';
@Controller('bootstrap')
export class CatalogosController{
  constructor(private readonly service:CatalogosService){}
  @Get() bootstrap(){return this.service.bootstrap();}
}
