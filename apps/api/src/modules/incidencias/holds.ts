import { Tx } from '../../shared/database/transaction.service';
import { ensure } from '../../shared/domain/assertions';
import { CreateIncidentDto } from './dto/incidencias.dto';

export async function holdDetails(tx: Tx, body: CreateIncidentDto) {
  const allocation = await tx.dispatchAllocation.findUniqueOrThrow({
    where: { id: body.allocationId },
    include: {
      dispatchLine: { include: { dispatch: true } },
      reservation: {
        include: { orderLine: { include: { order: true, product: true } } },
      },
    },
  });
  const line = allocation.reservation.orderLine;
  ensure(
    line && line.order.status !== 'CANCELLED',
    'La asignación requiere un pedido activo',
  );
  ensure(
    allocation.dispatchLine.dispatch.transferId === body.transferId &&
      allocation.dispatchLine.dispatchId === body.dispatchId,
    'Asignación ajena al despacho',
  );
  ensure(
    body.quantity && body.assignedTo?.trim() && body.location?.trim(),
    'Indica unidades, responsable y ubicación física',
  );
  const pending = await tx.incident.aggregate({
    where: {
      allocationId: allocation.id,
      OR: [{ status: 'OPEN' }, { disposition: 'QUARANTINE' }],
    },
    _sum: { quantity: true },
  });
  ensure(
    body.quantity + (pending._sum.quantity || 0) <= allocation.accepted,
    'La retención excede las unidades aceptadas libres de esta asignación',
  );
  ensure(body.blocking !== false, 'La retención debe ser bloqueante');
  return { line, sku: line.product.sku };
}
export async function quarantine(tx: Tx, id: string, quantity: number) {
  const a = await tx.dispatchAllocation.findUniqueOrThrow({
    where: { id },
    include: {
      reservation: { include: { orderLine: { include: { order: true } } } },
    },
  });
  const line = a.reservation.orderLine!;
  ensure(line.accepted >= quantity, 'Saldo aceptado insuficiente');
  const stock = await tx.stock.updateMany({
    where: {
      productId: line.productId,
      locationId: line.order.destinationId,
      reserved: { gte: quantity },
    },
    data: {
      reserved: { decrement: quantity },
      blocked: { increment: quantity },
      version: { increment: 1 },
    },
  });
  ensure(stock.count === 1, 'Stock reservado insuficiente');
  await tx.orderLine.update({
    where: { id: line.id },
    data: { accepted: { decrement: quantity } },
  });
  await tx.reservation.update({
    where: { id: a.reservationId },
    data: { unfulfilled: { increment: quantity } },
  });
  // La recepción física permanece en el historial; la disponibilidad comercial se recalcula.
}
