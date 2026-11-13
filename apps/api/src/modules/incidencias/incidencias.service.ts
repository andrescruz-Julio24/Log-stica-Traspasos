import { holdDetails, quarantine } from './holds';
import { refreshOrderState } from '../pedidos/readiness';
import { ensure } from '../../shared/domain/assertions';
import { reconcileTransfer } from '../traspasos/allocation';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { TransactionService } from '../../shared/database/transaction.service';
import { CreateIncidentDto } from './dto/incidencias.dto';

@Injectable()
export class IncidenciasService {
  constructor(
    private readonly db: PrismaService,
    private readonly tx: TransactionService,
  ) {}

  resolve(id: string, reason: string, actor: string, disposition?: string) {
    return this.tx.transaction(async (tx) => {
      const i = await tx.incident.findUniqueOrThrow({ where: { id } });
      ensure(i.status === 'OPEN', 'Incidencia ya resuelta');
      if (i.allocationId) {
        ensure(
          disposition === 'RELEASE' || disposition === 'QUARANTINE',
          'Indica el destino de la retención',
        );
        if (disposition === 'QUARANTINE')
          await quarantine(tx, i.allocationId, i.quantity!);
      } else
        ensure(
          !disposition,
          'El destino de retención solo aplica a mercancía asignada',
        );
      const result = await tx.incident.update({
        where: { id },
        data: { status: 'RESOLVED', resolution: reason, disposition },
      });
      if (i.allocationId) {
        const a = await tx.dispatchAllocation.findUniqueOrThrow({
          where: { id: i.allocationId },
          include: { reservation: { include: { orderLine: true } } },
        });
        await refreshOrderState(tx, a.reservation.orderLine!.orderId);
      }
      if (i.transferId) {
        const t = await tx.transfer.findUniqueOrThrow({
          where: { id: i.transferId },
        });
        if (t.status === 'RECEIVING') await reconcileTransfer(tx, t.id);
      }
      await this.tx.auditTx(tx, 'INCIDENT_RESOLVED', 'Incident', id, actor, {
        transferId: i.transferId,
        reason,
        disposition: disposition ?? null,
      });
      return result;
    });
  }
  returnQuarantine(id: string, reason: string, actor: string) {
    return this.tx.transaction(async (tx) => {
      const i = await tx.incident.findUniqueOrThrow({
        where: { id },
        include: {
          allocation: {
            include: {
              reservation: {
                include: { orderLine: { include: { order: true } } },
              },
            },
          },
        },
      });
      const line = i.allocation?.reservation.orderLine;
      ensure(
        i.disposition === 'QUARANTINE' && i.quantity && line && !i.returnedAt,
        'No existe cuarentena pendiente de devolución',
      );
      const stock = await tx.stock.updateMany({
        where: {
          productId: line.productId,
          locationId: line.order.destinationId,
          blocked: { gte: i.quantity },
          physical: { gte: i.quantity },
        },
        data: {
          blocked: { decrement: i.quantity },
          physical: { decrement: i.quantity },
          version: { increment: 1 },
        },
      });
      ensure(stock.count === 1, 'Saldo de cuarentena insuficiente');
      const result = await tx.incident.update({
        where: { id },
        data: { returnedAt: new Date() },
      });
      await this.tx.auditTx(tx, 'QUARANTINE_RETURNED', 'Incident', id, actor, {
        transferId: i.transferId,
        quantity: i.quantity,
        handover: reason,
      });
      return result;
    });
  }
  incidents() {
    return this.db.incident.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async incident(body: CreateIncidentDto, actor?: string) {
    return this.tx.transaction(async (tx) => {
      if (
        body.transferId &&
        !(await tx.transfer.findUnique({
          where: { id: body.transferId },
          select: { id: true },
        }))
      ) {
        throw new NotFoundException('Traspaso no encontrado');
      }
      if (body.dispatchId)
        ensure(
          body.transferId &&
            (await tx.dispatch.count({
              where: { id: body.dispatchId, transferId: body.transferId },
            })),
          'Despacho ajeno al traspaso',
        );
      if (
        [
          'EXCEDENTE',
          'PRODUCTO_INCORRECTO',
          'DAÑO',
          'VARIANTE_INCORRECTA',
        ].includes(body.type)
      )
        ensure(
          body.dispatchId &&
            body.sku &&
            body.quantity &&
            body.location &&
            body.custodian,
          'Indica despacho, SKU observado, cantidad, ubicación y custodio',
        );
      ensure(
        (body.type === 'RETENCION') === Boolean(body.allocationId),
        'Vincula la retención a una asignación aceptada',
      );
      const hold = body.allocationId ? await holdDetails(tx, body) : null;
      if (body.transferId && body.blocking !== false)
        await tx.transfer.updateMany({
          where: {
            id: body.transferId,
            status: 'CLOSED',
            closedWithDifferences: false,
          },
          data: { status: 'RECEIVING' },
        });
      const i = await tx.incident.create({
        data: { ...body, ...(hold ? { sku: hold.sku } : {}) },
      });
      if (hold) await refreshOrderState(tx, hold.line.orderId);
      await this.tx.auditTx(
        tx,
        'INCIDENT_OPENED',
        'Incident',
        i.id,
        actor,
        body,
      );
      return i;
    });
  }
}
