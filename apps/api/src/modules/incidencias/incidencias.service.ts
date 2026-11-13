import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { TransactionService } from '../../shared/database/transaction.service';
import { CreateIncidentDto } from './dto/incidencias.dto';

@Injectable()
export class IncidenciasService{
  constructor(private readonly db:PrismaService,private readonly tx:TransactionService){}

  incidents() {return this.db.incident.findMany({orderBy:{createdAt:'desc'}});}

  async incident(body:CreateIncidentDto,actor?:string){
    return this.tx.transaction(async tx=>{
      const i=await tx.incident.create({data:body});
      await this.tx.auditTx(tx,'INCIDENT_OPENED','Incident',i.id,actor,body);
      return i;
    });
  }
}
