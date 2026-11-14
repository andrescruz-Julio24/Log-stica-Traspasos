import { Body, Controller, Get, Headers, Param, Post, Req } from '@nestjs/common';
import { TransporteService } from './transporte.service';
import { RegisterDriverDto, DriverAvailabilityDto, CreateTripDto, AssignDriverDto } from './dto/transporte.dto';
import { operator, OperatorRequest } from '../gobierno/identity';

@Controller('drivers')
export class ChoferesController {
  constructor(private readonly service: TransporteService) {}
  @Get() list() { return this.service.drivers(); }
  @Post() register(@Body() body: RegisterDriverDto,
    @Headers('idempotency-key') key: string | undefined, @Req() req: OperatorRequest) {
    return this.service.register(body, key, operator(req, true));
  }
  @Post(':id/availability') availability(@Param('id') id: string, @Body() body: DriverAvailabilityDto,
    @Headers('idempotency-key') key: string | undefined, @Req() req: OperatorRequest) {
    return this.service.availability(id, body, key, operator(req, true));
  }
}
@Controller('trips')
export class ViajesController {
  constructor(private readonly service: TransporteService) {}
  @Get() list() { return this.service.trips(); }
  @Post() create(@Body() body: CreateTripDto,
    @Headers('idempotency-key') key: string | undefined, @Req() req: OperatorRequest) {
    return this.service.createTrip(body, key, operator(req));
  }
  @Post(':id/assign') assign(@Param('id') id: string, @Body() body: AssignDriverDto,
    @Headers('idempotency-key') key: string | undefined, @Req() req: OperatorRequest) {
    return this.service.assign(id, body, key, operator(req, true));
  }
  @Post(':id/start') start(@Param('id') id: string,
    @Headers('idempotency-key') key: string | undefined, @Req() req: OperatorRequest) {
    return this.service.start(id, key, operator(req));
  }
  @Post(':id/finish') finish(@Param('id') id: string,
    @Headers('idempotency-key') key: string | undefined, @Req() req: OperatorRequest) {
    return this.service.finish(id, key, operator(req));
  }
}
