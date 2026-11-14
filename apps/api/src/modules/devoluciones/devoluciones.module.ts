import { Module } from '@nestjs/common';
import { DevolucionesService } from './devoluciones.service';
import { DevolucionesController } from './devoluciones.controller';
@Module({ providers: [DevolucionesService], controllers: [DevolucionesController] })
export class DevolucionesModule {}
