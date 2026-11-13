import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import { PrismaService } from '../../../shared/database/prisma.service';
import { TransactionService } from '../../../shared/database/transaction.service';
import { TraspasosService } from '../traspasos.service';
import { PedidosService } from '../../pedidos/pedidos.service';
import { GobiernoService } from '../../gobierno/gobierno.service';
import { IncidenciasService } from '../../incidencias/incidencias.service';

if (process.env.SGTL_INTEGRATION_TEST_DB !== '1') {
  throw new Error(
    'La integración requiere SGTL_INTEGRATION_TEST_DB=1 y PostgreSQL de pruebas.',
  );
}

const db = new PrismaService();
const transactions = new TransactionService(db);
const service = new TraspasosService(db, transactions);
beforeAll(async () => {
  await db.$connect();
});
afterAll(async () => {
  await db.$disconnect();
});

async function scenario() {
  const tag = randomUUID().slice(0, 12);
  const product = await db.product.create({
    data: { sku: 'QA-' + tag, name: 'Prueba ' + tag },
  });
  const origin = await db.location.create({
    data: { name: 'QA Origen ' + tag },
  });
  const destination = await db.location.create({
    data: { name: 'QA Destino ' + tag },
  });
  const stock = await db.stock.create({
    data: {
      productId: product.id,
      locationId: origin.id,
      physical: 10,
      reserved: 0,
      blocked: 0,
    },
  });
  const create = () =>
    service.createTransfer(
      {
        originId: origin.id,
        destinationId: destination.id,
        items: [{ productId: product.id, requested: 10 }],
      },
      'qa-integration',
    );
  return { product, origin, destination, stock, create };
}
describe('PostgreSQL — integridad transaccional de traspasos', () => {
  it('conserva origen y destino durante reserva, despacho y recepción parcial; reintentos sin duplicar', async () => {
    const s = await scenario();
    const transfer = await s.create();
    const line = transfer.lines[0];
    await service.reserve(
      transfer.id,
      { transferLineId: line.id, quantity: 8 },
      'qa-integration',
    );
    let stock = await db.stock.findUniqueOrThrow({ where: { id: s.stock.id } });
    expect(stock.physical).toBe(10);
    expect(stock.reserved).toBe(8);
    const dispatchBody = { items: [{ productId: s.product.id, quantity: 8 }] };
    const key = randomUUID();
    const dispatch = await service.dispatch(
      transfer.id,
      dispatchBody,
      key,
      'qa-integration',
    );
    const retry = await service.dispatch(
      transfer.id,
      dispatchBody,
      key,
      'qa-integration',
    );
    expect(retry.id).toBe(dispatch.id);
    stock = await db.stock.findUniqueOrThrow({ where: { id: s.stock.id } });
    expect(stock.physical).toBe(2);
    expect(stock.reserved).toBe(0);
    const receiptBody = {
      items: [
        { productId: s.product.id, presented: 8, accepted: 6, rejected: 2 },
      ],
    };
    const receiptKey = randomUUID();
    const receipt = await service.receive(
      transfer.id,
      receiptBody,
      receiptKey,
      'qa-integration',
    );
    const receiptRetry = await service.receive(
      transfer.id,
      receiptBody,
      receiptKey,
      'qa-integration',
    );
    expect(receiptRetry.id).toBe(receipt.id);
    const dest = await db.stock.findUniqueOrThrow({
      where: {
        productId_locationId: {
          productId: s.product.id,
          locationId: s.destination.id,
        },
      },
    });
    expect(dest.physical).toBe(6);
    const incidents = await db.incident.findMany({
      where: { transferId: transfer.id },
    });
    expect(incidents.length).toBe(1);
    const audit = await db.auditEvent.findMany({
      where: { entityId: transfer.id },
    });
    expect(audit.map((a) => a.type)).toContain('TRANSFER_CREATED');
    expect(
      await db.dispatch.count({ where: { transferId: transfer.id } }),
    ).toBe(1);
    expect(await db.receipt.count({ where: { transferId: transfer.id } })).toBe(
      1,
    );
  });

  it('dos reservas simultáneas no comprometen más del inventario físico', async () => {
    const s = await scenario();
    const [a, b] = await Promise.all([s.create(), s.create()]);
    const result = await Promise.allSettled([
      service.reserve(
        a.id,
        { transferLineId: a.lines[0].id, quantity: 7 },
        'qa-1',
      ),
      service.reserve(
        b.id,
        { transferLineId: b.lines[0].id, quantity: 7 },
        'qa-2',
      ),
    ]);
    expect(result.filter((x) => x.status === 'fulfilled').length).toBe(1);
    const stock = await db.stock.findUniqueOrThrow({
      where: { id: s.stock.id },
    });
    expect(stock.reserved).toBe(7);
    expect(stock.physical - stock.reserved - stock.blocked).toBe(3);
  });

  it('acredita dos entregas del mismo pedido y mantiene disponible el despacho pendiente', async () => {
    const s = await scenario();
    const transfer = await s.create();
    const order = await db.customerOrder.create({
      data: {
        code: randomUUID(),
        customer: 'QA',
        destinationId: s.destination.id,
        lines: { create: { productId: s.product.id, required: 10 } },
      },
      include: { lines: true },
    });
    const reservation = {
      transferLineId: transfer.lines[0].id,
      orderLineId: order.lines[0].id,
      quantity: 5,
    };
    for (const expected of [5, 10]) {
      await service.reserve(transfer.id, reservation);
      const body = { items: [{ productId: s.product.id, quantity: 5 }] };
      const key = randomUUID();
      const [first, replay] = await Promise.all([
        service.dispatch(transfer.id, body, key),
        service.dispatch(transfer.id, body, key),
      ]);
      expect(replay.id).toBe(first.id);
      await service.receive(
        transfer.id,
        {
          items: [
            { productId: s.product.id, presented: 5, accepted: 5, rejected: 0 },
          ],
        },
        randomUUID(),
      );
      const line = await db.orderLine.findUniqueOrThrow({
        where: { id: order.lines[0].id },
        include: { order: true },
      });
      expect(line.accepted).toBe(expected);
      expect(line.order.status).toBe(expected === 10 ? 'READY' : 'PARTIAL');
      const actual = await db.transfer.findUniqueOrThrow({
        where: { id: transfer.id },
      });
      expect(actual.status).toBe(expected === 10 ? 'CLOSED' : 'RECEIVING');
    }
    const dest = await db.stock.findUniqueOrThrow({
      where: {
        productId_locationId: {
          productId: s.product.id,
          locationId: s.destination.id,
        },
      },
    });
    expect([dest.physical, dest.reserved]).toEqual([10, 10]);
  });

  it('respeta la reserva sin cliente anterior al asignar una recepción parcial', async () => {
    const s = await scenario();
    const transfer = await s.create();
    const transferLineId = transfer.lines[0].id;
    const productId = s.product.id;
    const order = await db.customerOrder.create({
      data: {
        code: randomUUID(),
        customer: 'Segundo tramo',
        destinationId: s.destination.id,
        lines: { create: { productId, required: 4 } },
      },
      include: { lines: true },
    });
    await service.reserve(transfer.id, { transferLineId, quantity: 6 });
    await service.reserve(transfer.id, {
      transferLineId,
      quantity: 4,
      orderLineId: order.lines[0].id,
    });
    await service.dispatch(
      transfer.id,
      { items: [{ productId, quantity: 10 }] },
      randomUUID(),
    );
    for (const [quantity, expected] of [
      [5, 0],
      [3, 2],
      [2, 4],
    ]) {
      await service.receive(
        transfer.id,
        {
          items: [
            { productId, presented: quantity, accepted: quantity, rejected: 0 },
          ],
        },
        randomUUID(),
      );
      const line = await db.orderLine.findUniqueOrThrow({
        where: { id: order.lines[0].id },
      });
      expect(line.accepted).toBe(expected);
    }
  });
});
const orders = new PedidosService(db, transactions);
const gov = new GobiernoService(db, transactions);
const incidents = new IncidenciasService(db, transactions);
describe('Aceptación de operación y prioridades', () => {
  it('33 despachadas, 28 aceptadas: prioridad, faltante confirmado y cierre autorizado', async () => {
    const s = await scenario();
    await db.stock.update({
      where: { id: s.stock.id },
      data: { physical: 33 },
    });
    const t = await service.createTransfer({
      originId: s.origin.id,
      destinationId: s.destination.id,
      items: [{ productId: s.product.id, requested: 33 }],
    });
    const clients = [];
    for (const priority of ['LOW', 'NORMAL', 'URGENT'] as const) {
      const order = await orders.createOrder({
        customer: priority,
        priority,
        destinationId: s.destination.id,
        items: [{ productId: s.product.id, required: 11 }],
      });
      clients.push(order);
      await service.reserve(t.id, {
        transferLineId: t.lines[0].id,
        quantity: 11,
        orderLineId: order.lines[0].id,
      });
    }
    const d = await service.dispatch(
      t.id,
      {
        custodian: 'Chofer',
        items: [{ productId: s.product.id, quantity: 33 }],
      },
      randomUUID(),
    );
    await orders.plan(clients[0].id, {
      priority: 'URGENT',
      reason: 'Después del despacho',
    });
    for (const n of [10, 18])
      await service.receive(
        t.id,
        {
          dispatchId: d.id,
          items: [
            { productId: s.product.id, presented: n, accepted: n, rejected: 0 },
          ],
        },
        randomUUID(),
      );
    const counts = await Promise.all(
      clients.map((o) =>
        db.orderLine.findUniqueOrThrow({ where: { id: o.lines[0].id } }),
      ),
    );
    expect(counts.map((l) => l.accepted)).toEqual([6, 11, 11]);
    await service.finishInspection(
      t.id,
      d.id,
      'Conteo definitivo',
      'recepcion',
    );
    await service.finishInspection(t.id, d.id, 'Mismo cierre', 'recepcion');
    const issues = await db.incident.findMany({ where: { transferId: t.id } });
    expect(issues).toHaveLength(1);
    expect(issues[0].quantity).toBe(5);
    const req = await gov.request(
      { kind: 'CLOSE_DIFFERENCE', targetId: t.id, reason: 'Merma' },
      'almacen',
    );
    await expect(
      gov.decide(req.id, { approve: true, reason: 'Ok' }, 'almacen'),
    ).rejects.toThrow();
    await expect(
      gov.decide(req.id, { approve: true, reason: 'Ok' }, 'supervisor'),
    ).rejects.toThrow('bloqueantes');
    await incidents.resolve(issues[0].id, 'Merma verificada', 'supervisor');
    await gov.decide(
      req.id,
      { approve: true, reason: 'Diferencia documentada' },
      'supervisor',
    );
    expect(
      (await db.transfer.findUniqueOrThrow({ where: { id: t.id } }))
        .closedWithDifferences,
    ).toBe(true);
    expect(
      (
        await db.customerOrder.findUniqueOrThrow({
          where: { id: clients[0].id },
        })
      ).status,
    ).toBe('PARTIAL');
  });
  it('reprograma tres veces, reasigna y compensa una recepción sin borrar el conteo', async () => {
    const s = await scenario(),
      t = await s.create();
    const create = (customer: string) =>
      orders.createOrder({
        customer,
        dueAt: '2026-11-01T12:00:00Z',
        destinationId: s.destination.id,
        items: [{ productId: s.product.id, required: 10 }],
      });
    const a = await create('A'),
      b = await create('B');
    for (const day of ['02', '03', '04'])
      await orders.plan(
        b.id,
        { dueAt: '2026-11-' + day + 'T12:00:00Z', reason: 'Reprogramado' },
        'operador',
      );
    expect(await orders.history(b.id)).toHaveLength(4);
    const r = await service.reserve(t.id, {
      transferLineId: t.lines[0].id,
      quantity: 10,
      orderLineId: a.lines[0].id,
    });
    const change = await gov.request(
      {
        kind: 'REASSIGN',
        targetId: r.id,
        orderLineId: b.lines[0].id,
        reason: 'Cambio',
      },
      'op',
    );
    await gov.decide(change.id, { approve: true, reason: 'Autorizado' }, 'sup');
    const d = await service.dispatch(
      t.id,
      { items: [{ productId: s.product.id, quantity: 10 }] },
      randomUUID(),
    );
    const receipt = await service.receive(
      t.id,
      {
        dispatchId: d.id,
        items: [
          { productId: s.product.id, presented: 10, accepted: 10, rejected: 0 },
        ],
      },
      randomUUID(),
    );
    const rev = await gov.request(
      {
        kind: 'REVERSE_RECEIPT',
        targetId: receipt.lines[0].id,
        reason: 'Error de conteo',
      },
      'op',
    );
    await gov.decide(rev.id, { approve: true, reason: 'Verificado' }, 'sup');
    expect(
      (
        await db.receiptLine.findUniqueOrThrow({
          where: { id: receipt.lines[0].id },
        })
      ).reversed,
    ).toBe(true);
    expect(
      (await db.orderLine.findUniqueOrThrow({ where: { id: b.lines[0].id } }))
        .accepted,
    ).toBe(0);
    expect(
      (
        await db.stock.findUniqueOrThrow({
          where: {
            productId_locationId: {
              productId: s.product.id,
              locationId: s.destination.id,
            },
          },
        })
      ).physical,
    ).toBe(0);
    const cancel = await gov.request(
      {
        kind: 'CANCEL_ORDER',
        targetId: b.id,
        reason: 'Cliente cancela en tránsito',
      },
      'op',
    );
    await gov.decide(cancel.id, { approve: true, reason: 'Confirmado' }, 'sup');
    await service.receive(
      t.id,
      {
        dispatchId: d.id,
        items: [
          { productId: s.product.id, presented: 10, accepted: 10, rejected: 0 },
        ],
      },
      randomUUID(),
    );
    expect(
      (await db.transfer.findUniqueOrThrow({ where: { id: t.id } })).status,
    ).toBe('RECEIVING');
    expect(
      (
        await db.stock.findUniqueOrThrow({
          where: {
            productId_locationId: {
              productId: s.product.id,
              locationId: s.destination.id,
            },
          },
        })
      ).reserved,
    ).toBe(0);
  });
  it('bloquea reservas ERP caducadas y exige saldo concordante', async () => {
    const s = await scenario(),
      t = await s.create();
    const old = process.env.SGTL_INVENTORY_SOURCE;
    process.env.SGTL_INVENTORY_SOURCE = 'ERP';
    try {
      await expect(
        service.reserve(t.id, { transferLineId: t.lines[0].id, quantity: 1 }),
      ).rejects.toThrow('ERP');
      expect(
        (
          await gov.snapshot(
            s.stock.id,
            { physical: 99, observedAt: new Date().toISOString() },
            'sup',
          )
        ).verified,
      ).toBe(false);
      await gov.snapshot(
        s.stock.id,
        { physical: 10, observedAt: new Date().toISOString() },
        'sup',
      );
      await service.reserve(t.id, {
        transferLineId: t.lines[0].id,
        quantity: 1,
      });
    } finally {
      if (old === undefined) delete process.env.SGTL_INVENTORY_SOURCE;
      else process.env.SGTL_INVENTORY_SOURCE = old;
    }
  });
});

it('respeta el cliente identificado, no declara listo al faltar otro SKU y registra un excedente separado', async () => {
  const s = await scenario(),
    t = await s.create();
  const second = await db.product.create({
    data: { sku: randomUUID(), name: 'Otra presentación' },
  });
  const urgent = await orders.createOrder({
    customer: 'Urgente',
    priority: 'URGENT',
    destinationId: s.destination.id,
    items: [{ productId: s.product.id, required: 5 }],
  });
  const tagged = await orders.createOrder({
    customer: 'Etiquetado',
    destinationId: s.destination.id,
    items: [
      { productId: s.product.id, required: 5 },
      { productId: second.id, required: 1 },
    ],
  });
  for (const o of [urgent, tagged])
    await service.reserve(t.id, {
      transferLineId: t.lines[0].id,
      quantity: 5,
      orderLineId: o.lines.find((l) => l.productId === s.product.id)!.id,
    });
  const d = await service.dispatch(
    t.id,
    { items: [{ productId: s.product.id, quantity: 10 }] },
    randomUUID(),
  );
  const allocation = await db.dispatchAllocation.findFirstOrThrow({
    where: {
      dispatchLine: { dispatchId: d.id },
      reservation: { orderLine: { orderId: tagged.id } },
    },
  });
  await service.receive(
    t.id,
    {
      dispatchId: d.id,
      items: [
        {
          productId: s.product.id,
          allocationId: allocation.id,
          presented: 5,
          accepted: 5,
          rejected: 0,
        },
      ],
    },
    randomUUID(),
  );
  expect(
    (await db.customerOrder.findUniqueOrThrow({ where: { id: tagged.id } }))
      .status,
  ).toBe('PARTIAL');
  expect(
    (await db.customerOrder.findUniqueOrThrow({ where: { id: urgent.id } }))
      .status,
  ).toBe('PENDING');
  await incidents.incident({
    type: 'EXCEDENTE',
    transferId: t.id,
    dispatchId: d.id,
    sku: second.sku,
    quantity: 2,
    location: 'Zona Q',
    custodian: 'Recepción',
    notes: 'Caja adicional',
  });
  expect(
    await db.stock.count({
      where: { productId: second.id, locationId: s.destination.id },
    }),
  ).toBe(0);
  await expect(
    service.receive(
      t.id,
      {
        dispatchId: d.id,
        items: [
          { productId: second.id, presented: 1, accepted: 1, rejected: 0 },
        ],
      },
      randomUUID(),
    ),
  ).rejects.toThrow();
});
