import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { TransactionService } from '../../shared/database/transaction.service';
import { ensure } from '../../shared/domain/assertions';
import { ScheduleTransferDto } from './dto/programacion.dto';

@Injectable()
export class ProgramacionService {
  constructor(private readonly db: PrismaService, private readonly transactions: TransactionService) {}
  history(transferId: string) {
    return this.db.transferSchedule.findMany({
      where: { transferId },
      include: { order: { select: { code: true, dueAt: true, customer: true } } },
      orderBy: [{ recordedAt: 'asc' }, { id: 'asc' }],
    });
  }
  schedule(transferId: string, body: ScheduleTransferDto, key: string | undefined, actor: string) {
    const departureAt = new Date(body.departureAt);
    const arrivalAt = new Date(body.expectedArrivalAt);
    ensure(departureAt.getTime() <= arrivalAt.getTime(), 'La llegada debe ser posterior a la salida programada');
    return this.transactions.idempotent('transfer-schedule:' + transferId, key, body, async tx => {
      const transfer = await tx.transfer.findUniqueOrThrow({
        where: { id: transferId },
        include: { lines: { include: { reservations: { include: { orderLine: true } } } } },
      });
      ensure(!['CLOSED', 'CANCELLED'].includes(transfer.status), 'No se puede programar un traspaso cerrado');
      const order = await tx.customerOrder.findUniqueOrThrow({ where: { id: body.orderId } });
      ensure(order.status !== 'CANCELLED' && order.dueAt, 'El pedido necesita un compromiso de entrega vigente');
      ensure(order.destinationId === transfer.destinationId,
        'El traspaso debe llegar al área donde se atenderá al cliente');
      ensure(transfer.lines.some(line => line.reservations.some(res =>
        res.orderLine?.orderId === order.id && res.quantity > res.unfulfilled)),
        'Primero vincula una reserva exclusiva del traspaso a una línea del pedido');
      ensure(arrivalAt.getTime() <= order.dueAt.getTime(),
        'El traslado previsto llega después del compromiso con el cliente');
      const event = await tx.transferSchedule.create({
        data: { transferId, orderId: order.id, departureAt, expectedArrivalAt: arrivalAt,
          reason: body.reason.trim(), recordedBy: actor },
      });
      await this.transactions.auditTx(tx, 'TRANSFER_EARLY_SCHEDULED', 'TransferSchedule', event.id, actor, {
        transferId, orderId: order.id, orderDueAt: order.dueAt.toISOString(),
        scheduledDeparture: departureAt.toISOString(), expectedArrival: arrivalAt.toISOString(),
        reason: body.reason.trim(), advancePreparation: true,
      });
      return event;
    });
  }
}
