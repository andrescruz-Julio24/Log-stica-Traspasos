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
    const paper = await svc.create({...common,quantity:'10',unit:'PIEZA',source:'DIGITAL',method:'COUNT'},'capturista',randomUUID());
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

describe('D-01 — SGTL sustituye el registro en papel', () => {
  async function fixture(physical = 12, reserved = 2, blocked = 1) {
    const tag = randomUUID();
    const product = await db.product.create({ data: { sku: 'AUD-' + tag, name: 'Ajuste digital QA' } });
    const location = await db.location.create({ data: { name: 'Ubicación digital ' + tag } });
    const stock = await db.stock.create({
      data: { productId: product.id, locationId: location.id, physical, reserved, blocked },
    });
    return { product, location, stock, common: {
      productId: product.id, locationId: location.id, observedAt: new Date().toISOString(),
    } };
  }
  it('aplica conteo validado con causa, conserva reservas, crea auditoría y resiste reintentos', async () => {
    const s = await fixture();
    const count = await svc.create({ ...s.common, quantity: '10', unit: 'PIEZA',
      source: 'DIGITAL', method: 'COUNT' }, 'almacenista', randomUUID());
    expect(count.stockPhysicalSnapshot).toBe(12);
    expect(count.stockVersionSnapshot).toBe(0);
    await expect(svc.apply(count.id, { reason: 'Conteo de corrección' }, 'supervisor', randomUUID())).rejects.toThrow();
    await svc.verify(count.id, 'supervisor', randomUUID());
    const key = randomUUID(), reason = { reason: 'Diferencia constatada en conteo físico digital' };
    const applied = await svc.apply(count.id, reason, 'supervisor', key);
    expect(applied.difference).toBe(-2);
    const repeated = await svc.apply(count.id, reason, 'supervisor', key);
    expect(repeated.current).toBe(10);
    await expect(svc.apply(count.id, reason, 'supervisor', randomUUID())).rejects.toThrow();
    const after = await db.stock.findUniqueOrThrow({ where: { id: s.stock.id } });
    expect([after.physical, after.reserved, after.blocked, after.version]).toEqual([10, 2, 1, 1]);
    const o = await db.inventoryObservation.findUniqueOrThrow({ where: { id: count.id } });
    expect(o.appliedBy).toBe('supervisor');
    expect(o.appliedReason).toBe(reason.reason);
    const events = await db.auditEvent.findMany({ where: { entityId: s.stock.id } });
    expect(events.some(e => e.type === 'INVENTORY_STOCK_ADJUSTED')).toBe(true);
  });
  it('no permite disminuir stock debajo de reservas y bloqueos', async () => {
    const s = await fixture(10, 6, 3);
    const o = await svc.create({ ...s.common, quantity: '8', unit: 'PIEZA',
      source: 'DIGITAL', method: 'COUNT' }, 'capturista', randomUUID());
    await svc.verify(o.id, 'supervisor', randomUUID());
    await expect(svc.apply(o.id, { reason: 'Faltante físico detectado' }, 'supervisor', randomUUID()))
      .rejects.toThrow('reservadas y bloqueadas');
    expect((await db.stock.findUniqueOrThrow({ where: { id: s.stock.id } })).physical).toBe(10);
  });
  it('rechaza aplicar un conteo obsoleto si otra operación cambió la versión del saldo', async () => {
    const s = await fixture();
    const o = await svc.create({ ...s.common, quantity: '11', unit: 'PIEZA',
      source: 'DIGITAL', method: 'COUNT' }, 'capturista', randomUUID());
    await svc.verify(o.id, 'supervisor', randomUUID());
    await db.stock.update({ where: { id: s.stock.id }, data: { physical: { increment: 1 }, version: { increment: 1 } } });
    await expect(svc.apply(o.id, { reason: 'Conteo ya antiguo' }, 'supervisor', randomUUID()))
      .rejects.toThrow('cambió desde el conteo');
    expect((await db.stock.findUniqueOrThrow({ where: { id: s.stock.id } })).physical).toBe(13);
  });
  it('Excel y papel dejan de ser medios de captura oficial; kg no se convierte silenciosamente en piezas', async () => {
    const s = await fixture();
    await expect(svc.create({ ...s.common, quantity: '10', unit: 'PIEZA',
      source: 'PAPER', method: 'COUNT' }, 'capturista', randomUUID())).rejects.toThrow('papel');
    const excel = await svc.create({ ...s.common, quantity: '10', unit: 'PIEZA',
      source: 'EXCEL', method: 'ESTIMATE' }, 'capturista', randomUUID());
    await expect(svc.verify(excel.id, 'supervisor', randomUUID())).rejects.toThrow();
    const kg = await svc.create({ ...s.common, quantity: '29.400', unit: 'KG',
      source: 'DIGITAL', method: 'WEIGHT' }, 'capturista', randomUUID());
    await svc.verify(kg.id, 'supervisor', randomUUID());
    await expect(svc.apply(kg.id, { reason: 'Pesaje' }, 'supervisor', randomUUID()))
      .rejects.toThrow('piezas enteras');
  });
  it('inicializa en SGTL una existencia todavía no registrada, sin crear stock ficticio', async () => {
    const tag = randomUUID();
    const product = await db.product.create({ data: { sku: 'INIT-' + tag, name: 'Alta inicial' } });
    const location = await db.location.create({ data: { name: 'Almacén sin stock ' + tag } });
    const o = await svc.create({ productId: product.id, locationId: location.id,
      quantity: '7', unit: 'PIEZA', source: 'DIGITAL', method: 'COUNT',
      observedAt: new Date().toISOString() }, 'capturista', randomUUID());
    expect(o.stockPhysicalSnapshot).toBeNull();
    await svc.verify(o.id, 'supervisor', randomUUID());
    const applied = await svc.apply(o.id, { reason: 'Alta inicial con medición física digital' }, 'supervisor', randomUUID());
    expect(applied.current).toBe(7);
    const stock = await db.stock.findUniqueOrThrow({ where: { productId_locationId: {
      productId: product.id, locationId: location.id,
    } } });
    expect(stock.physical).toBe(7);
    expect(stock.version).toBe(1);
  });
});
