import { Tx } from '../../shared/database/transaction.service';
export async function refreshOrderState(tx: Tx, id: string) {
  const order = await tx.customerOrder.findUniqueOrThrow({
    where: { id },
    include: { lines: true },
  });
  if (order.status === 'CANCELLED') return;
  const holds = await tx.incident.count({
    where: {
      status: 'OPEN',
      allocation: { reservation: { orderLine: { orderId: id } } },
    },
  });
  const status = holds
    ? 'BLOCKED'
    : order.lines.every((l) => l.accepted === l.required)
      ? 'READY'
      : order.lines.some((l) => l.accepted > 0)
        ? 'PARTIAL'
        : 'PENDING';
  await tx.customerOrder.update({ where: { id }, data: { status } });
}
