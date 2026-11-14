import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { PrismaService } from '../../../shared/database/prisma.service';
import { TransactionService } from '../../../shared/database/transaction.service';
import { ProveedoresService } from '../proveedores.service';
import { CatalogosService } from '../../catalogos/catalogos.service';
import { PedidosService } from '../../pedidos/pedidos.service';
import { TraspasosService } from '../../traspasos/traspasos.service';

if (process.env.SGTL_INTEGRATION_TEST_DB !== '1') throw Error('Solo base de datos de pruebas');
const db = new PrismaService();
const tx = new TransactionService(db);
const service = new ProveedoresService(db, tx);
beforeAll(async () => { await db.$connect(); });
afterAll(async () => { await db.$disconnect(); });

async function fixture() {
  const tag = randomUUID();
  const location = await db.location.create({ data: { name: 'Proveedor QA ' + tag } });
  const piece = await db.product.create({ data: { sku: 'P-' + tag, name: 'Tornillos', baseUnit: 'PIEZA' } });
  const kg = await db.product.create({ data: { sku: 'K-' + tag, name: 'Material a granel', baseUnit: 'KG' } });
  return { location, piece, kg };
}

describe('LOG-04 / LOG-06: recepción de proveedores y stock multunidad', () => {
  it('conserva cantidades decimales, recepciones parciales, cuarentena y salida de devolución sin doble registro', async () => {
    const { location, piece, kg } = await fixture();
    const key = randomUUID();
    const payload = { destinationId: location.id, supplier: 'Fábrica QA', reference: 'RM-01',
      items: [{ productId: kg.id, expected: '30.000' }, { productId: piece.id, expected: '10' }] };
    const receipt = await service.create(payload, key, 'almacenista');
    expect((await service.create(payload, key, 'almacenista')).id).toBe(receipt.id);
    const kgLine = receipt.lines.find(l => l.productId === kg.id)!;
    const pieceLine = receipt.lines.find(l => l.productId === piece.id)!;
    const first = { observedAt: new Date().toISOString(), notes: '1.100 kg y una pieza dañados',
      evidenceRef: 'BITACORA-44', items: [
        { receiptLineId: kgLine.id, presented: '26.500', accepted: '25.400', blocked: '1.100' },
        { receiptLineId: pieceLine.id, presented: '6', accepted: '5', blocked: '1' },
      ] };
    const inspectKey = randomUUID();
    const inspection = await service.inspect(receipt.id, first, inspectKey, 'receptor');
    expect((await service.inspect(receipt.id, first, inspectKey, 'receptor')).id).toBe(inspection.id);
    let stockKg = await db.unitStock.findUniqueOrThrow({ where: { productId_locationId: {
      productId: kg.id, locationId: location.id,
    } } });
    expect([stockKg.physical.toString(), stockKg.blocked.toString()]).toEqual(['26.5','1.1']);
    let stockP = await db.stock.findUniqueOrThrow({ where: { productId_locationId: {
      productId: piece.id, locationId: location.id,
    } } });
    expect([stockP.physical, stockP.blocked, stockP.reserved]).toEqual([6,1,0]);
    expect((await db.supplierReceipt.findUniqueOrThrow({ where: { id: receipt.id } })).status).toBe('PARTIAL');

    const second = { observedAt: new Date().toISOString(), items: [
      { receiptLineId: kgLine.id, presented: '3.500', accepted: '3.500', blocked: '0' },
      { receiptLineId: pieceLine.id, presented: '4', accepted: '4', blocked: '0' },
    ] };
    await service.inspect(receipt.id, second, randomUUID(), 'receptor');
    expect((await db.supplierReceipt.findUniqueOrThrow({ where: { id: receipt.id } })).status).toBe('INSPECTED');
    stockKg = await db.unitStock.findUniqueOrThrow({ where: { id: stockKg.id } });
    stockP = await db.stock.findUniqueOrThrow({ where: { id: stockP.id } });
    expect([stockKg.physical.toString(),stockKg.blocked.toString()]).toEqual(['30','1.1']);
    expect([stockP.physical,stockP.blocked,stockP.reserved]).toEqual([10,1,0]);
    await expect(service.inspect(receipt.id, second, randomUUID(), 'receptor')).rejects.toThrow();

    const ret = { quantity: '0.600', reason: 'Devolución al fabricante, remisión RET-42' };
    const retKey = randomUUID();
    const returned = await service.returnBlocked(kgLine.id, ret, retKey, 'supervisor');
    expect((await service.returnBlocked(kgLine.id, ret, retKey, 'supervisor')).id).toBe(returned.id);
    await expect(service.returnBlocked(kgLine.id, { quantity: '1.000', reason: 'Exceso' },
      randomUUID(), 'supervisor')).rejects.toThrow();
    stockKg = await db.unitStock.findUniqueOrThrow({ where: { id: stockKg.id } });
    expect([stockKg.physical.toString(),stockKg.blocked.toString()]).toEqual(['29.4','0.5']);
    const supplierIncidents = await db.incident.findMany({ where: { supplierReceiptId: receipt.id } });
    expect(supplierIncidents).toHaveLength(2);
    expect(supplierIncidents.every(i => i.status === 'OPEN')).toBe(true);
    const audit = await db.auditEvent.findMany({ where: { entityId: receipt.id } });
    expect(audit.map(a=>a.type)).toContain('SUPPLIER_RECEIPT_OPENED');
    const retEvents = await db.auditEvent.findMany({ where: { entityId: returned.id } });
    expect(retEvents.map(a=>a.type)).toContain('SUPPLIER_BLOCKED_RETURNED');
    expect(await db.supplierInspection.count({ where: { receiptId: receipt.id } })).toBe(2);
  });

  it('rechaza exceso, fracciones de piezas y bloqueos sin causa; nunca incrementa inventario', async () => {
    const { location, piece, kg } = await fixture();
    const receipt = await service.create({ supplier: 'Proveedor', destinationId: location.id,
      items: [{productId:piece.id,expected:'4'}, {productId:kg.id,expected:'2.400'}] },
      randomUUID(), 'operador');
    const pieceLine = receipt.lines.find(l=>l.productId===piece.id)!;
    const kgLine = receipt.lines.find(l=>l.productId===kg.id)!;
    const moment = new Date().toISOString();
    await expect(service.inspect(receipt.id, { observedAt: moment,
      items: [{ receiptLineId: pieceLine.id, presented:'4.2', accepted:'4.2',blocked:'0' }] },
      randomUUID(), 'operador')).rejects.toThrow('enteras');
    await expect(service.inspect(receipt.id, { observedAt: moment,
      items: [{ receiptLineId: kgLine.id, presented:'2.500', accepted:'2.500',blocked:'0' }] },
      randomUUID(), 'operador')).rejects.toThrow('superior');
    await expect(service.inspect(receipt.id, { observedAt: moment,
      items: [{ receiptLineId: kgLine.id, presented:'2.000', accepted:'1.000',blocked:'1.000' }] },
      randomUUID(), 'operador')).rejects.toThrow('Explica');
    expect(await db.stock.count({ where: { productId: piece.id, locationId: location.id } })).toBe(0);
    expect(await db.unitStock.count({ where: { productId: kg.id, locationId: location.id } })).toBe(0);
  });
});

describe('D-02: catálogo interno y protección del flujo entero anterior', () => {
  it('crea un producto con código interno estable y no mezcla KG con traspasos y pedidos enteros', async () => {
    const catalog = new CatalogosService(db, tx);
    const payload = { name:'Bobina por peso', baseUnit:'KG' as const, externalLabel:'Bobina sin SKU',
      presentation:'Rollos', variant:'Aluminio' };
    const key = randomUUID();
    const product = await catalog.createProduct(payload, key, 'supervisor');
    expect(product.sku).toMatch(/^INT-/);
    expect((await catalog.createProduct(payload, key, 'supervisor')).id).toBe(product.id);
    expect(product.externalLabel).toBe('Bobina sin SKU');
    const location = await db.location.create({ data: { name: 'Origen QA ' + randomUUID() } });
    const dest = await db.location.create({ data: { name: 'Destino QA ' + randomUUID() } });
    const traspasos = new TraspasosService(db, tx);
    await expect(traspasos.createTransfer({ originId: location.id, destinationId: dest.id,
      items: [{ productId: product.id, requested: 2 }] }, 'operador')).rejects.toThrow('piezas');
    const orders = new PedidosService(db, tx);
    await expect(orders.createOrder({customer:'Prueba', destinationId: dest.id,
      items: [{productId:product.id,required:2}]},'operador',randomUUID())).rejects.toThrow('piezas');
    expect(await db.customerOrder.count({where:{customer:'Prueba'}})).toBe(0);
  });
});
