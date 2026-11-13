import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import {
  TransactionService,
  Tx,
} from '../../shared/database/transaction.service';
import { ensure } from '../../shared/domain/assertions';
import { reverseReceipt } from './reverse-receipt';
import { ExceptionDto, DecisionDto, SnapshotDto } from './gobierno.dto';

@Injectable()
export class GobiernoService {
  constructor(
    private db: PrismaService,
    private transactions: TransactionService,
  ) {}
  list() {
    return this.db.exceptionRequest.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }
  request(body: ExceptionDto, actor: string) {
    return this.transactions.transaction(async (tx) => {
      const { kind, targetId, reason, orderLineId } = body;
      ensure(kind !== 'REASSIGN' || orderLineId, 'Indica la línea destino');
      const request = await tx.exceptionRequest.create({
        data: {
          kind,
          targetId,
          reason,
          requester: actor,
          payload: orderLineId ? { orderLineId } : {},
        },
      });
      await this.transactions.auditTx(
        tx,
        'EXCEPTION_REQUESTED',
        'ExceptionRequest',
        request.id,
        actor,
        body,
      );
      return request;
    });
  }
  decide(id: string, body: DecisionDto, actor: string) {
    return this.transactions.transaction(async (tx) => {
      const r = await tx.exceptionRequest.findUniqueOrThrow({ where: { id } });
      ensure(
        r.status === 'PENDING' && r.requester !== actor,
        'Solicitud ya decidida o aprobación propia',
      );
      if (body.approve) {
        if (r.kind === 'CANCEL_ORDER') await this.cancel(tx, r.targetId);
        if (r.kind === 'REASSIGN')
          await this.reassign(
            tx,
            r.targetId,
            (r.payload as { orderLineId: string }).orderLineId,
            actor,
          );
        if (r.kind === 'REVERSE_RECEIPT')
          await reverseReceipt(
            this.transactions,
            tx,
            r.targetId,
            actor,
            r.reason,
          );
        if (r.kind === 'CLOSE_DIFFERENCE') {
          const t = await tx.transfer.findUniqueOrThrow({
            where: { id: r.targetId },
            include: {
              dispatches: true,
              lines: { include: { reservations: true } },
            },
          });
          ensure(
            t.status === 'RECEIVING' &&
              t.dispatches.every((d) => d.inspectedAt) &&
              t.lines.every((l) =>
                l.reservations.every((x) => x.released === x.quantity),
              ),
            'Completa inspecciones y compromisos de origen antes del cierre',
          );
          ensure(
            !(await tx.incident.count({
              where: { transferId: t.id, status: 'OPEN', blocking: true },
            })),
            'Hay incidencias bloqueantes',
          );
          await tx.transfer.update({
            where: { id: t.id },
            data: { status: 'CLOSED', closedWithDifferences: true },
          });
        }
      }
      const result = await tx.exceptionRequest.update({
        where: { id },
        data: {
          approver: actor,
          decidedAt: new Date(),
          status: body.approve ? 'APPROVED' : 'DENIED',
          decision: body.reason,
        },
      });
      await this.transactions.auditTx(
        tx,
        'EXCEPTION_DECIDED',
        'ExceptionRequest',
        id,
        actor,
        { ...body, kind: r.kind, targetId: r.targetId },
      );
      return result;
    });
  }
  private async cancel(tx: Tx, id: string) {
    const o = await tx.customerOrder.findUniqueOrThrow({
      where: { id },
      include: { lines: { include: { reservations: true } } },
    });
    ensure(o.status !== 'CANCELLED', 'Pedido ya cancelado');
    ensure(
      !(await tx.incident.count({
        where: {
          status: 'OPEN',
          allocation: { reservation: { orderLine: { orderId: id } } },
        },
      })),
      'Resolver retenciones antes de cancelar',
    );
    for (const l of o.lines) {
      for (const r of l.reservations) {
        const pending = r.quantity - r.released;
        if (pending) {
          await tx.stock.update({
            where: { id: r.stockId },
            data: {
              reserved: { decrement: pending },
              version: { increment: 1 },
            },
          });
          const line = await tx.transferLine.findUniqueOrThrow({
            where: { id: r.transferLineId },
            include: { reservations: true },
          });
          const active =
            line.reservations.reduce((n, x) => n + x.quantity - x.released, 0) -
            pending;
          await tx.transferLine.update({
            where: { id: line.id },
            data: {
              picked: Math.min(active, line.picked),
              pickVersion: { increment: 1 },
            },
          });
          await tx.reservation.update({
            where: { id: r.id },
            data: { quantity: r.released },
          });
        }
        if (r.released) {
          const { transferId } = await tx.transferLine.findUniqueOrThrow({
            where: { id: r.transferLineId },
          });
          await tx.incident.create({
            data: {
              transferId,
              type: 'CANCELACION_CON_DESPACHO',
              notes: 'Determinar destino de mercancía del pedido ' + o.code,
            },
          });
          await tx.transfer.updateMany({
            where: {
              id: transferId,
              status: 'CLOSED',
              closedWithDifferences: false,
            },
            data: { status: 'RECEIVING' },
          });
        }
      }
      if (l.accepted)
        await tx.stock.update({
          where: {
            productId_locationId: {
              productId: l.productId,
              locationId: o.destinationId,
            },
          },
          data: {
            reserved: { decrement: l.accepted },
            version: { increment: 1 },
          },
        });
    }
    await tx.customerOrder.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }
  private async reassign(tx: Tx, id: string, target: string, actor: string) {
    const r = await tx.reservation.findUniqueOrThrow({
      where: { id },
      include: { transferLine: { include: { transfer: true } } },
    });
    const l = await tx.orderLine.findUniqueOrThrow({
      where: { id: target },
      include: { order: true, reservations: true },
    });
    ensure(
      !r.released &&
        r.quantity > 0 &&
        r.orderLineId !== target &&
        l.order.status !== 'CANCELLED' &&
        l.productId === r.transferLine.productId &&
        l.order.destinationId === r.transferLine.transfer.destinationId,
      'Reasignación incompatible o ya despachada',
    );
    ensure(
      l.reservations.reduce((n, x) => n + x.quantity - x.unfulfilled, 0) +
        r.quantity <=
        l.required,
      'Excede lo requerido',
    );
    await this.transactions.auditTx(
      tx,
      'RESERVATION_REASSIGNED',
      'Reservation',
      id,
      actor,
      {
        from: r.orderLineId,
        to: target,
        quantity: r.quantity,
        transferId: r.transferLine.transferId,
      },
    );
    await tx.reservation.update({
      where: { id },
      data: { orderLineId: target },
    });
  }
  snapshot(id: string, body: SnapshotDto, actor: string) {
    return this.transactions.transaction(async (tx) => {
      const s = await tx.stock.findUniqueOrThrow({ where: { id } });
      const when = new Date(body.observedAt);
      ensure(
        Number.isFinite(+when) &&
          when <= new Date() &&
          (!s.sourceCheckedAt || when > s.sourceCheckedAt),
        'Fecha ERP inválida o anterior',
      );
      if (s.physical !== body.physical) {
        await tx.stock.update({
          where: { id },
          data: { sourceCheckedAt: null },
        });
        await this.transactions.auditTx(
          tx,
          'ERP_DISCREPANCY',
          'Stock',
          id,
          actor,
          body,
        );
        return {
          verified: false,
          reason: 'Saldo divergente: nuevas reservas bloqueadas',
        };
      }
      await tx.stock.update({ where: { id }, data: { sourceCheckedAt: when } });
      await this.transactions.auditTx(
        tx,
        'ERP_VERIFIED',
        'Stock',
        id,
        actor,
        body,
      );
      return { verified: true };
    });
  }
}
