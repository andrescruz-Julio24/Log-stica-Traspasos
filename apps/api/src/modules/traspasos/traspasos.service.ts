import { finishInspection, receive } from './recepcion';
import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { compareReservations } from './allocation';
import { PrismaService } from '../../shared/database/prisma.service';
import { TransactionService } from '../../shared/database/transaction.service';
import { ensure, uniqueItems } from '../../shared/domain/assertions';
import {
  CreateTransferDto,
  ReserveDto,
  DispatchDto,
  ReceiveDto,
} from './dto/traspasos.dto';

// Desempate estable para reservas con igual prioridad y compromiso.
const reservationOrder = [{ createdAt: 'asc' }, { id: 'asc' }] as const;
@Injectable()
export class TraspasosService {
  constructor(
    private readonly db: PrismaService,
    private readonly tx: TransactionService,
  ) {}

  transfers() {
    return this.db.transfer.findMany({
      include: {
        origin: true,
        destination: true,
        lines: { include: { product: true, reservations: true } },
        dispatches: {
          include: {
            lines: {
              include: {
                allocations: {
                  orderBy: { sequence: 'asc' },
                  include: { reservation: { select: { orderLineId: true } } },
                },
              },
            },
          },
        },
        receipts: { include: { lines: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createTransfer(body: CreateTransferDto, actor?: string) {
    uniqueItems(body.items);
    ensure(
      body.originId !== body.destinationId,
      'Origen y destino deben ser distintos',
    );
    return this.tx.transaction(async (tx) => {
      const transfer = await tx.transfer.create({
        data: {
          code: 'TR-' + randomUUID().slice(0, 8).toUpperCase(),
          originId: body.originId,
          destinationId: body.destinationId,
          lines: {
            create: body.items.map((i) => ({
              productId: i.productId,
              requested: i.requested,
            })),
          },
        },
        include: { lines: true },
      });
      await this.tx.auditTx(
        tx,
        'TRANSFER_CREATED',
        'Transfer',
        transfer.id,
        actor,
        body,
      );
      return transfer;
    });
  }

  async reserve(transferId: string, body: ReserveDto, actor?: string) {
    return this.tx.transaction(async (tx) => {
      const transfer = await tx.transfer.findUnique({
        where: { id: transferId },
      });
      if (!transfer) throw new NotFoundException('Traspaso no encontrado');
      ensure(
        !['CLOSED', 'CANCELLED'].includes(transfer.status),
        'El traspaso no admite nuevas reservas',
      );
      const line = await tx.transferLine.findUnique({
        where: { id: body.transferLineId },
      });
      ensure(
        line?.transferId === transferId,
        'La línea no pertenece al traspaso',
      );
      const already = await tx.reservation.aggregate({
        where: { transferLineId: line.id },
        _sum: { quantity: true },
      });
      ensure(
        (already._sum.quantity || 0) + body.quantity <= line.requested,
        'Reserva excede la cantidad solicitada',
      );
      if (body.orderLineId) {
        const orderLine = await tx.orderLine.findUnique({
          where: { id: body.orderLineId },
          include: { order: true },
        });
        ensure(
          orderLine?.productId === line.productId &&
            orderLine.order.destinationId === transfer.destinationId,
          'El pedido de cliente y destino deben coincidir',
        );
        ensure(orderLine.order.status !== 'CANCELLED', 'Pedido cancelado');
        const committed = await tx.reservation.aggregate({
          where: { orderLineId: body.orderLineId },
          _sum: { quantity: true, unfulfilled: true },
        });
        ensure(
          (committed._sum.quantity || 0) -
            (committed._sum.unfulfilled || 0) +
            body.quantity <=
            orderLine.required,
          'Asignación prevista supera el faltante del cliente',
        );
      }
      const stock = await tx.stock.findUnique({
        where: {
          productId_locationId: {
            productId: line.productId,
            locationId: transfer.originId,
          },
        },
      });
      ensure(stock, 'No existe inventario de origen');
      if (process.env.SGTL_INVENTORY_SOURCE === 'ERP') {
        const maxAge =
          Number(process.env.SGTL_ERP_MAX_AGE_MINUTES || 15) * 60000;
        ensure(
          stock.sourceCheckedAt &&
            Date.now() - stock.sourceCheckedAt.getTime() <= maxAge,
          'Existencia ERP pendiente de verificación o desactualizada',
        );
      }
      ensure(
        stock.physical - stock.blocked - stock.reserved >= body.quantity,
        'Inventario insuficiente para reservar',
      );
      const changed = await tx.stock.updateMany({
        where: { id: stock.id, version: stock.version },
        data: {
          reserved: { increment: body.quantity },
          version: { increment: 1 },
        },
      });
      ensure(changed.count === 1, 'Inventario modificado por otro usuario');
      const reservation = await tx.reservation.create({
        data: {
          stockId: stock.id,
          transferLineId: line.id,
          orderLineId: body.orderLineId,
          quantity: body.quantity,
        },
      });
      if (transfer.status === 'REQUESTED')
        await tx.transfer.update({
          where: { id: transferId },
          data: { status: 'PREPARING' },
        });
      await this.tx.auditTx(
        tx,
        'STOCK_RESERVED',
        'Reservation',
        reservation.id,
        actor,
        { transferId, ...body },
      );
      return reservation;
    });
  }

  async dispatch(
    transferId: string,
    body: DispatchDto,
    key?: string,
    actor?: string,
  ) {
    uniqueItems(body.items);
    return this.tx.idempotent(
      'dispatch:' + transferId,
      key,
      body,
      async (tx) => {
        const transfer = await tx.transfer.findUnique({
          where: { id: transferId },
          include: {
            lines: {
              include: {
                reservations: {
                  orderBy: [...reservationOrder],
                  include: { orderLine: { include: { order: true } } },
                },
              },
            },
          },
        });
        if (!transfer) throw new NotFoundException('Traspaso no encontrado');
        ensure(
          ['PREPARING', 'DISPATCHED', 'IN_TRANSIT', 'RECEIVING'].includes(
            transfer.status,
          ),
          'Traspaso no disponible para despacho',
        );
        const allocations: {
          productId: string;
          reservationId: string;
          quantity: number;
          sequence: number;
        }[] = [];
        for (const item of body.items) {
          const line = transfer.lines.find(
            (x) => x.productId === item.productId,
          );
          ensure(line, 'Producto ajeno al traspaso');
          ensure(
            line.dispatched + item.quantity <= line.requested,
            'Cantidad despachada supera lo solicitado',
          );
          const active = line.reservations.reduce(
            (n, r) => n + r.quantity - r.released,
            0,
          );
          ensure(
            active >= item.quantity,
            'Se requiere una reserva de origen antes del despacho',
          );
          const stock = await tx.stock.findUnique({
            where: {
              productId_locationId: {
                productId: item.productId,
                locationId: transfer.originId,
              },
            },
          });
          ensure(
            stock &&
              stock.reserved >= item.quantity &&
              stock.physical >= item.quantity,
            'Stock reservado insuficiente',
          );
          const changed = await tx.stock.updateMany({
            where: { id: stock.id, version: stock.version },
            data: {
              physical: { decrement: item.quantity },
              reserved: { decrement: item.quantity },
              version: { increment: 1 },
            },
          });
          ensure(changed.count === 1, 'Inventario modificado durante despacho');
          let remaining = item.quantity;
          let sequence = 0;
          for (const r of line.reservations.sort(compareReservations)) {
            const take = Math.min(remaining, r.quantity - r.released);
            if (take > 0) {
              await tx.reservation.update({
                where: { id: r.id },
                data: { released: { increment: take } },
              });
              allocations.push({
                productId: item.productId,
                reservationId: r.id,
                quantity: take,
                sequence: sequence++,
              });
            }
            remaining -= take;
            if (!remaining) break;
          }
          await tx.transferLine.update({
            where: { id: line.id },
            data: { dispatched: { increment: item.quantity } },
          });
        }

        const dispatch = await tx.dispatch.create({
          data: {
            transferId,
            custodian: body.custodian || actor || 'operador-demo',
            lines: {
              create: body.items.map((i) => ({
                productId: i.productId,
                quantity: i.quantity,
                allocations: {
                  create: allocations
                    .filter((a) => a.productId === i.productId)
                    .map(({ productId, ...allocation }) => allocation),
                },
              })),
            },
          },
          include: { lines: true },
        });
        await tx.transfer.update({
          where: { id: transferId },
          data: { status: 'IN_TRANSIT' },
        });
        await this.tx.auditTx(
          tx,
          'DISPATCH_CREATED',
          'Dispatch',
          dispatch.id,
          actor,
          { transferId, items: body.items },
        );
        return dispatch;
      },
    );
  }

  finishInspection(
    transferId: string,
    dispatchId: string,
    reason: string,
    actor?: string,
  ) {
    return finishInspection(this.tx, transferId, dispatchId, reason, actor);
  }
  receive(transferId: string, body: ReceiveDto, key?: string, actor?: string) {
    return receive(this.tx, transferId, body, key, actor);
  }
}
