import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { DomainService } from './domain.service';
import { PrismaService } from './prisma.service';

@Module({
  controllers: [AppController],
  providers: [PrismaService, DomainService],
})
export class AppModule {}
