import { Global,Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { TransactionService } from './transaction.service';

// Compartir conexión y transacciones, no estado de presentación.
@Global()
@Module({providers:[PrismaService,TransactionService],exports:[PrismaService,TransactionService]})
export class DatabaseModule{}
