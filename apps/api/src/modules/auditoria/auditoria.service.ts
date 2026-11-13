import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';

@Injectable()
export class AuditoriaService{
  constructor(private readonly db:PrismaService){}

  audit() {return this.db.auditEvent.findMany({orderBy:{createdAt:'desc'},take:200});}
}
