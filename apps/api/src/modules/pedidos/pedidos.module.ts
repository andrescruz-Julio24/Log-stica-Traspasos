import { Module } from '@nestjs/common';
import { PedidosPesoService } from './pedidos-peso.service';
import { PedidosPesoController } from './pedidos-peso.controller';
import { PedidosController } from './pedidos.controller';
import { PedidosService } from './pedidos.service';
@Module({controllers:[PedidosController,PedidosPesoController],providers:[PedidosService,PedidosPesoService]})
export class PedidosModule{}
