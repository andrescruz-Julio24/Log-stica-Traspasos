import test from 'node:test';
import assert from 'node:assert/strict';
import { searchEntries } from '../src/modulos/supervision/utils/searchEntries.js';
import { reportMetrics } from '../src/modulos/supervision/utils/reportMetrics.js';
import { movementEvents } from '../src/modulos/inventario/utils/movementEvents.js';
import { reservationSummary } from '../src/modulos/inventario/utils/reservationSummary.js';

const transfer = {
  id: 't1', code: 'TR-001',
  origin: { name: 'Almacén' }, destination: { name: 'Sucursal' },
  lines: [{ productId: 'p1', product: { sku: 'SKU-001' }, requested: 6, dispatched: 2, accepted: 1,
    reservations: [{ id: 'r1', quantity: 4, released: 1, createdAt: '2026-11-13T08:00:00Z', orderLineId: 'ol1' }] }],
  dispatches: [{ id: 'd1', createdAt: '2026-11-13T09:00:00Z', lines: [{ productId: 'p1', quantity: 2 }] }],
  receipts: [{ id: 'rc1', createdAt: '2026-11-13T10:00:00Z', lines: [{ productId: 'p1', accepted: 1, reversed: false }] }],
};
const order = { id: 'o1', code: 'CL-001', customer: 'Cliente A', status: 'READY', destination: { name: 'Sucursal' } };

test('búsqueda global respeta filtros y límite de fuentes consultadas', () => {
  const data = { orders: [order], transfers: [transfer], products: [{ id: 'p1', sku: 'SKU-001', name: 'Producto' }], incidents: [] };
  assert.deepEqual(searchEntries(data, 'SKU-001').map((r) => r.key), ['product:p1']);
  assert.deepEqual(searchEntries(data, 'cliente a').map((r) => r.key), ['order:o1']);
  assert.deepEqual(searchEntries(data, ''), []);
});

test('movimientos separa reserva, despacho y recepción y filtra por SKU', () => {
  const events = movementEvents([transfer], 'SKU-001');
  assert.deepEqual(events.map((e) => e.type), ['Recepción aceptada', 'Despacho', 'Reserva']);
  assert.deepEqual(movementEvents([transfer], 'no-coincide'), []);
});

test('resumen de reservas conserva unidades activas y vínculos comerciales', () => {
  const rows = reservationSummary({ transfers: [transfer], stocks: [{ locationId: 'l1' }] }, 'TR-001');
  assert.equal(rows.rows.length, 1);
  assert.equal(rows.active, 3);
  assert.equal(rows.linked, 1);
  assert.equal(rows.locations, 1);
});

test('métricas de supervisión usan operaciones y estados reales', () => {
  const summary = reportMetrics([order, { ...order, id: 'o2', status: 'PARTIAL' }], [transfer]);
  assert.equal(summary.requested, 6);
  assert.equal(summary.dispatched, 2);
  assert.equal(summary.accepted, 1);
  assert.equal(summary.totalOrders, 2);
  assert.equal(summary.statusCounts.READY, 1);
  assert.equal(summary.statusCounts.PARTIAL, 1);
});
