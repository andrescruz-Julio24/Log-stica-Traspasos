import { refreshOrderState } from '../pedidos/readiness';
import { Priority } from '@prisma/client';
import { Tx } from '../../shared/database/transaction.service';

const rank: Record<Priority, number> = {
  LOW: 0,
  NORMAL: 1,
  HIGH: 2,
  URGENT: 3,
};
type PlannedReservation = {
  id: string;
  createdAt: Date;
  orderLine: { order: { priority: Priority; dueAt: Date | null } } | null;
};
export function compareReservations(
  a: PlannedReservation,
  b: PlannedReservation,
) {
  const x = a.orderLine?.order,
    y = b.orderLine?.order;
  return (
    rank[y?.priority ?? 'NORMAL'] - rank[x?.priority ?? 'NORMAL'] ||
    (x?.dueAt?.getTime() ?? Infinity) - (y?.dueAt?.getTime() ?? Infinity) ||
    a.createdAt.getTime() - b.createdAt.getTime() ||
    a.id.localeCompare(b.id)
  );
}
export async function applyAllocation(
  tx: Tx,
  allocation: { id: string; reservation: { orderLineId: string | null } },
  units: number,
  stockId: string,
) {
  await tx.dispatchAllocation.update({
    where: { id: allocation.id },
    data: { accepted: { increment: units } },
  });
  const id = allocation.reservation.orderLineId;
  if (!id) return;
  const line = await tx.orderLine.findUniqueOrThrow({
    where: { id },
    include: { order: true },
  });
  if (line.order.status === 'CANCELLED') return;
  await tx.orderLine.update({
    where: { id },
    data: { accepted: { increment: units } },
  });
  await tx.stock.update({
    where: { id: stockId },
    data: { reserved: { increment: units }, version: { increment: 1 } },
  });
  await refreshOrderState(tx, line.orderId);
  return id;
}
export async function reconcileTransfer(tx: Tx, transferId: string) {
  const lines = await tx.transferLine.findMany({ where: { transferId } });
  const open = await tx.incident.count({
    where: {
      transferId,
      blocking: true,
      OR: [{ status: 'OPEN' }, { disposition: 'QUARANTINE' }],
    },
  });
  const closed =
    !open &&
    lines.length > 0 &&
    lines.every(
      (l) => l.accepted === l.requested && l.dispatched === l.requested,
    );
  await tx.transfer.update({
    where: { id: transferId },
    data: { status: closed ? 'CLOSED' : 'RECEIVING' },
  });
  return closed;
}
