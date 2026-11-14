import { Module } from '@nestjs/common';
import { ProgramacionService } from './programacion.service';
import { MedidosController } from './medidos.controller';
import { MedidosService } from './medidos.service';
import { ProgramacionController } from './programacion.controller';
import { TraspasosController } from './traspasos.controller';
import { TraspasosService } from './traspasos.service';
@Module({controllers:[TraspasosController,MedidosController,ProgramacionController],providers:[TraspasosService,MedidosService,ProgramacionService]})
export class TraspasosModule{}
