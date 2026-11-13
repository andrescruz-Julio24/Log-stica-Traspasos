import { GobiernoService } from './modules/gobierno/gobierno.service';
import { GobiernoController } from './modules/gobierno/gobierno.controller';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { DatabaseModule } from './shared/database/database.module';
import { PedidosModule } from './modules/pedidos/pedidos.module';
import { TraspasosModule } from './modules/traspasos/traspasos.module';
import { IncidenciasModule } from './modules/incidencias/incidencias.module';
import { CatalogosModule } from './modules/catalogos/catalogos.module';
import { AuditoriaModule } from './modules/auditoria/auditoria.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['apps/api/.env', '.env'],
    }),
    DatabaseModule,
    PedidosModule,
    TraspasosModule,
    IncidenciasModule,
    CatalogosModule,
    AuditoriaModule,
  ],
  providers: [GobiernoService],
  controllers: [AppController, GobiernoController],
})
export class AppModule {}
