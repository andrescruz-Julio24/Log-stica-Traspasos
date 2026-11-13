import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';

@Injectable()
export class CatalogosService{
  constructor(private readonly db:PrismaService){}

  bootstrap() {return Promise.all([
    this.db.product.findMany({orderBy:{name:'asc'}}),
    this.db.location.findMany({orderBy:{name:'asc'}}),
    this.db.stock.findMany({include:{product:true,location:true},orderBy:{location:{name:'asc'}}}),
  ]).then(([products,locations,stocks])=>({products,locations,stocks}));}
}
