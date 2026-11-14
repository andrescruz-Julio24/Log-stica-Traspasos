import { Module } from '@nestjs/common';
import { ProveedoresController, UnitStockController } from './proveedores.controller';
import { ProveedoresService } from './proveedores.service';

@Module({ controllers: [ProveedoresController, UnitStockController],
  providers: [ProveedoresService] })
export class ProveedoresModule {}
