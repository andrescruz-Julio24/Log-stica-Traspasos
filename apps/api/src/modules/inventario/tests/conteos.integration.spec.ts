import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { PrismaService } from '../../../shared/database/prisma.service';
import { TransactionService } from '../../../shared/database/transaction.service';
import { ConteosService } from '../conteos.service';

if (process.env.SGTL_INTEGRATION_TEST_DB !== '1') throw Error('Se requiere PostgreSQL de pruebas');
const db = new PrismaService();
const svc = new ConteosService(db, new TransactionService(db));
beforeAll(async () => { await db.$connect(); });
afterAll(async () => { await db.$disconnect(); });

describe('T-17: Excel estimado y conteo físico', () => {
  it('no altera el inventario al registrar ni al validar mediciones', async () => {
    const tag = randomUUID();
    const product = await db.product.create({data:{sku:'C-'+tag,name:'Conteo QA'}});
    const location = await db.location.create({data:{name:'Loc C '+tag}});
    const stock = await db.stock.create({data:{productId:product.id,locationId:location.id,physical:12,reserved:2,blocked:1}});
    const common = {productId:product.id,locationId:location.id,observedAt:new Date().toISOString()};
    const estimated = await svc.create({...common,quantity:'29.400',unit:'KG',source:'EXCEL',method:'ESTIMATE'},'capturista',randomUUID());
    expect(estimated.status).toBe('REFERENCE');
    await expect(svc.verify(estimated.id,'supervisor',randomUUID())).rejects.toThrow();
    const paper = await svc.create({...common,quantity:'10',unit:'PIEZA',source:'PAPER',method:'COUNT'},'capturista',randomUUID());
    expect(paper.stockPhysicalSnapshot).toBe(12);
    const verified = await svc.verify(paper.id,'supervisor',randomUUID());
    expect(verified.status).toBe('VERIFIED');
    await expect(svc.verify(paper.id,'supervisor',randomUUID())).rejects.toThrow();
    const after = await db.stock.findUniqueOrThrow({where:{id:stock.id}});
    expect([after.physical,after.reserved,after.blocked]).toEqual([12,2,1]);
    const events = await db.auditEvent.findMany({where:{entityId:paper.id}});
    expect(events.map(e=>e.type)).toContain('INVENTORY_OBSERVATION_VERIFIED');
  });
});
