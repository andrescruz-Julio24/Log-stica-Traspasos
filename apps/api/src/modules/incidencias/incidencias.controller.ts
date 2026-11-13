import { Body,Controller,Get,Headers,Post } from '@nestjs/common';
import { IncidenciasService } from './incidencias.service';
import { CreateIncidentDto } from './dto/incidencias.dto';

@Controller('incidents')
export class IncidenciasController{
  constructor(private readonly service:IncidenciasService){}
  @Get() incidents(){return this.service.incidents();}
  @Post() create(@Body() body:CreateIncidentDto,@Headers('x-demo-actor') actor?:string){
    return this.service.incident(body,actor);
  }
}
