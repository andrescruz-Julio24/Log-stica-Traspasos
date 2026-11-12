import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { DomainService } from './domain.service';
import { PrismaService } from './prisma.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Funciona tanto al ejecutar npm desde la raíz como desde apps/api.
      envFilePath: ['apps/api/.env', '.env'],
    }),
  ],
  controllers: [AppController],
  providers: [PrismaService, DomainService],
})
export class AppModule {}
