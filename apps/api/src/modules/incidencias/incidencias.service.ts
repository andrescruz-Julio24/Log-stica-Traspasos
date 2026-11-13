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

  resolve(id: string, reason: string, actor: string) {
    return this.tx.transaction(async (tx) => {
      const i = await tx.incident.findUniqueOrThrow({ where: { id } });
      ensure(i.status === 'OPEN', 'Incidencia ya resuelta');
      const result = await tx.incident.update({
        where: { id },
        data: { status: 'RESOLVED', resolution: reason },
      });
      if (i.transferId) {
        const t = await tx.transfer.findUniqueOrThrow({
          where: { id: i.transferId },
        });
        if (t.status === 'RECEIVING') await reconcileTransfer(tx, t.id);
      }
      await this.tx.auditTx(tx, 'INCIDENT_RESOLVED', 'Incident', id, actor, {
        transferId: i.transferId,
        reason,
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
      if (body.transferId && body.blocking !== false)
        await tx.transfer.updateMany({
          where: {
            id: body.transferId,
            status: 'CLOSED',
            closedWithDifferences: false,
          },
          data: { status: 'RECEIVING' },
        });
      const i = await tx.incident.create({ data: body });
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
