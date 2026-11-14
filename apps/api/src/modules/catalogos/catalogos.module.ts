import { Module } from '@nestjs/common';
import { ProductosController } from './productos.controller';
import { CatalogosController } from './catalogos.controller';
import { CatalogosService } from './catalogos.service';
@Module({controllers:[CatalogosController,ProductosController],providers:[CatalogosService]})
export class CatalogosModule{}
