import { Module } from '@nestjs/common';
import { TransporteService } from './transporte.service';
import { ChoferesController, ViajesController } from './transporte.controller';
@Module({ providers: [TransporteService], controllers: [ChoferesController, ViajesController] })
export class TransporteModule {}
