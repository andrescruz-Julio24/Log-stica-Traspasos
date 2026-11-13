import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveAlerts } from '../src/modulos/incidencias/utils/alerts.js';
import { replenishmentImpact } from '../src/modulos/pedidos/utils/impact.js';
import { formatDate } from '../src/shared/utils/formatDate.js';
const order = {
  id: '1',
  code: 'CL1',
  customer: 'Cliente',
  status: 'PARTIAL',
  priority: 'URGENT',
  destinationId: 'd',
  destination: { name: 'Centro' },
  lines: [
    { productId: 'p', required: 5, accepted: 3, product: { sku: 'SKU' } },
  ],
};
test('alertas de pedidos con las demás colecciones vacías y filtro de cliente', () => {
  const data = { orders: [order], transfers: [], incidents: [] };
  assert.deepEqual(
    deriveAlerts(data, 'cliente').map((a) => a.detail),
    ['Faltantes: 2 unidades'],
  );
  assert.deepEqual(deriveAlerts(data, 'otro'), []);
});
test('impacto comercial excluye pedidos retenidos y agrupa faltantes por destino', () => {
  const rows = replenishmentImpact([
    order,
    { ...order, code: 'CL2' },
    { ...order, status: 'BLOCKED' },
  ]);
  assert.deepEqual(
    rows.map((r) => [r.units, r.urgent, r.orders]),
    [[4, 2, ['CL1', 'CL2']]],
  );
});
test('fechas ausentes e inválidas', () => {
  assert.equal(formatDate(null), '—');
  assert.equal(formatDate('x'), '—');
});
