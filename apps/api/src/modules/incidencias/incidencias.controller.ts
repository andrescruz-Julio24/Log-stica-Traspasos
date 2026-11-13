import { ReasonDto } from '../gobierno/gobierno.dto';
import { operator, OperatorRequest } from '../gobierno/identity';
import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Req,
  Post,
} from '@nestjs/common';
import { IncidenciasService } from './incidencias.service';
import { CreateIncidentDto } from './dto/incidencias.dto';

@Controller('incidents')
export class IncidenciasController {
  constructor(private readonly service: IncidenciasService) {}
  @Post(':id/resolve') resolve(
    @Param('id') id: string,
    @Body() body: ReasonDto,
    @Req() req: OperatorRequest,
  ) {
    return this.service.resolve(id, body.reason, operator(req, true));
  }
  @Get() incidents() {
    return this.service.incidents();
  }
  @Post() create(
    @Body() body: CreateIncidentDto,
    @Headers('x-demo-actor') actor?: string,
  ) {
    return this.service.incident(body, actor);
  }
}
