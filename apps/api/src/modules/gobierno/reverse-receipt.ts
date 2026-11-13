import {
  TransactionService,
  Tx,
} from '../../shared/database/transaction.service';
import { ensure } from '../../shared/domain/assertions';
import { reconcileTransfer } from '../traspasos/allocation';
export async function reverseReceipt(
  transactions: TransactionService,
  tx: Tx,
  id: string,
  actor: string,
  reason: string,
) {
  const line = await tx.receiptLine.findUniqueOrThrow({
    where: { id },
    include: { receipt: { include: { transfer: true } } },
  });
  const t = line.receipt.transfer;
  if (line.receipt.dispatchId) {
    const shipment = await tx.dispatch.findUniqueOrThrow({
      where: { id: line.receipt.dispatchId },
    });
    if (shipment.inspectedAt) {
      const allocations = await tx.dispatchAllocation.findMany({
        where: { dispatchLine: { dispatchId: shipment.id } },
        include: {
          reservation: {
            include: { orderLine: { include: { reservations: true } } },
          },
        },
      });
      for (const a of allocations) {
        const releasedClaim = a.quantity - a.accepted;
        const ol = a.reservation.orderLine;
        if (ol && ol.orderId && releasedClaim) {
          const committed = ol.reservations.reduce(
            (n, r) => n + r.quantity - r.unfulfilled,
            0,
          );
          const restore = allocations
            .filter((x) => x.reservation.orderLineId === ol.id)
            .reduce((n, x) => n + x.quantity - x.accepted, 0);
          ensure(
            committed + restore <= ol.required,
            'Faltante ya reasignado: conciliar reposición antes de compensar',
          );
        }
        if (releasedClaim)
          await tx.reservation.update({
            where: { id: a.reservationId },
            data: { unfulfilled: { decrement: releasedClaim } },
          });
      }
      await tx.incident.updateMany({
        where: { dispatchId: shipment.id, type: 'FALTANTE', status: 'OPEN' },
        data: {
          status: 'RESOLVED',
          resolution: 'Inspección reabierta por compensación: ' + reason,
        },
      });
    }
  }
  ensure(
    !line.reversed && Array.isArray(line.applied) && !t.closedWithDifferences,
    'Recepción histórica, compensada o cerrada excepcionalmente',
  );
  const entries = line.applied as unknown as {
    allocationId: string;
    orderLineId: string | null;
    quantity: number;
  }[];
  let reserved = 0;
  for (const a of entries) {
    await tx.dispatchAllocation.update({
      where: { id: a.allocationId },
      data: { accepted: { decrement: a.quantity } },
    });
    if (a.orderLineId) {
      const ol = await tx.orderLine.findUniqueOrThrow({
        where: { id: a.orderLineId },
        include: { order: true },
      });
      ensure(ol.accepted >= a.quantity, 'Asignación insuficiente');
      await tx.orderLine.update({
        where: { id: ol.id },
        data: { accepted: { decrement: a.quantity } },
      });
      if (ol.order.status !== 'CANCELLED') {
        reserved += a.quantity;
        const partial = await tx.orderLine.count({
          where: { orderId: ol.orderId, accepted: { gt: 0 } },
        });
        await tx.customerOrder.update({
          where: { id: ol.orderId },
          data: { status: partial ? 'PARTIAL' : 'PENDING' },
        });
      }
    }
  }
  if (line.accepted) {
    const stock = await tx.stock.findUniqueOrThrow({
      where: {
        productId_locationId: {
          productId: line.productId,
          locationId: t.destinationId,
        },
      },
    });
    ensure(
      stock.physical - stock.blocked - stock.reserved >=
        line.accepted - reserved && stock.reserved >= reserved,
      'Stock ya comprometido en otro movimiento',
    );
    await tx.stock.update({
      where: { id: stock.id },
      data: {
        physical: { decrement: line.accepted },
        reserved: { decrement: reserved },
        version: { increment: 1 },
      },
    });
    await tx.transferLine.update({
      where: {
        transferId_productId: { transferId: t.id, productId: line.productId },
      },
      data: { accepted: { decrement: line.accepted } },
    });
  }
  await tx.receiptLine.update({ where: { id }, data: { reversed: true } });
  if (line.receipt.dispatchId)
    await tx.dispatch.update({
      where: { id: line.receipt.dispatchId },
      data: { inspectedAt: null },
    });
  await reconcileTransfer(tx, t.id);
  await transactions.auditTx(tx, 'RECEIPT_REVERSED', 'ReceiptLine', id, actor, {
    reason,
    transferId: t.id,
    quantity: line.accepted,
  });
}
