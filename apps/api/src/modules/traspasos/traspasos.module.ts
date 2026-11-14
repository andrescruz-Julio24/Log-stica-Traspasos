import { Module } from '@nestjs/common';
import { MedidosController } from './medidos.controller';
import { MedidosService } from './medidos.service';
import { TraspasosController } from './traspasos.controller';
import { TraspasosService } from './traspasos.service';
@Module({controllers:[TraspasosController,MedidosController],providers:[TraspasosService,MedidosService]})
export class TraspasosModule{}
