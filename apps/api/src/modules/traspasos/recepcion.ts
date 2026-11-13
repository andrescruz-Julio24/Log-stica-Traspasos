import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TransactionService } from '../../shared/database/transaction.service';
import { ensure, uniqueItems } from '../../shared/domain/assertions';
import { ReceiveDto } from './dto/traspasos.dto';
import { applyAllocation, reconcileTransfer } from './allocation';
export function finishInspection(
  transactions: TransactionService,
  transferId: string,
  dispatchId: string,
  reason: string,
  actor?: string,
) {
  return transactions.transaction(async (tx) => {
    const d = await tx.dispatch.findFirstOrThrow({
      where: { id: dispatchId, transferId },
      include: {
        lines: { include: { allocations: true } },
        receipts: { include: { lines: true } },
        transfer: true,
      },
    });
    if (d.inspectedAt) return d;
    ensure(
      !(await tx.receipt.count({ where: { transferId, dispatchId: null } })),
      'Conciliar recepciones históricas antes del cierre',
    );
    for (const line of d.lines) {
      const presented = d.receipts
        .flatMap((r) => r.lines)
        .filter((l) => !l.reversed && l.productId === line.productId)
        .reduce((sum, l) => sum + l.presented, 0);
      for (const a of line.allocations) {
        const missing = a.quantity - a.accepted;
        if (missing)
          await tx.reservation.update({
            where: { id: a.reservationId },
            data: { unfulfilled: { increment: missing } },
          });
      }
      if (presented < line.quantity)
        await tx.incident.create({
          data: {
            transferId,
            dispatchId,
            type: 'FALTANTE',
            sku: (
              await tx.product.findUniqueOrThrow({
                where: { id: line.productId },
              })
            ).sku,
            quantity: line.quantity - presented,
            notes: reason,
            custodian: d.custodian,
            location:
              'Sin localizar; último custodio: ' +
              (d.custodian || 'desconocido'),
          },
        });
    }
    const result = await tx.dispatch.update({
      where: { id: dispatchId },
      data: { inspectedAt: new Date() },
    });
    await reconcileTransfer(tx, transferId);
    await transactions.auditTx(
      tx,
      'INSPECTION_FINISHED',
      'Dispatch',
      dispatchId,
      actor,
      { transferId, reason },
    );
    return result;
  });
}
export async function receive(
  transactions: TransactionService,
  transferId: string,
  body: ReceiveDto,
  key?: string,
  actor?: string,
) {
  uniqueItems(body.items);
  for (const item of body.items) {
    if (item.accepted + item.rejected !== item.presented)
      throw new BadRequestException(
        'Aceptado + rechazado debe ser igual a presentado',
      );
  }
  return transactions.idempotent(
    'receipt:' + transferId,
    key,
    body,
    async (tx) => {
      const transfer = await tx.transfer.findUnique({
        where: { id: transferId },
        include: {
          lines: {
            include: {
              reservations: {
                select: { orderLineId: true },
              },
            },
          },
        },
      });
      if (!transfer) throw new NotFoundException('Traspaso no encontrado');
      ensure(
        ['IN_TRANSIT', 'RECEIVING'].includes(transfer.status),
        'No se puede recibir un traspaso sin despachar',
      );
      const shipments = await tx.dispatch.findMany({
        where: {
          transferId,
          inspectedAt: null,
          ...(body.dispatchId ? { id: body.dispatchId } : {}),
        },
        include: {
          lines: {
            include: {
              allocations: {
                orderBy: { sequence: 'asc' },
                include: { reservation: true },
              },
            },
          },
          receipts: { include: { lines: true } },
        },
      });
      const eligible = shipments.filter((d) =>
        body.items.every((i) =>
          d.lines.some(
            (l) =>
              l.productId === i.productId &&
              l.quantity -
                d.receipts
                  .flatMap((r) => r.lines)
                  .filter((r) => !r.reversed && r.productId === i.productId)
                  .reduce((n, r) => n + r.presented, 0) >=
                i.presented,
          ),
        ),
      );
      ensure(
        eligible.length === 1,
        'Selecciona un despacho abierto con saldo suficiente',
      );
      const shipment = eligible[0];
      const applications = new Map<
        string,
        {
          allocationId: string;
          orderLineId: string | null;
          quantity: number;
        }[]
      >();
      for (const item of body.items) {
        const line = transfer.lines.find((x) => x.productId === item.productId);
        ensure(line, 'Producto ajeno al traspaso');
        const prevPresented = await tx.receiptLine.aggregate({
          where: {
            productId: item.productId,
            reversed: false,
            receipt: { transferId },
          },
          _sum: { presented: true },
        });
        ensure(
          (prevPresented._sum.presented || 0) + item.presented <=
            line.dispatched,
          'Recepción excede lo despachado',
        );
        await tx.transferLine.update({
          where: { id: line.id },
          data: { accepted: { increment: item.accepted } },
        });
        if (item.accepted > 0) {
          const stock = await tx.stock.upsert({
            where: {
              productId_locationId: {
                productId: item.productId,
                locationId: transfer.destinationId,
              },
            },
            create: {
              productId: item.productId,
              locationId: transfer.destinationId,
              physical: item.accepted,
            },
            update: {
              physical: { increment: item.accepted },
              version: { increment: 1 },
            },
          });
          const dispatchedLine = shipment.lines.find(
            (l) => l.productId === item.productId,
          )!;
          let remaining = item.accepted;
          if (
            !dispatchedLine.allocations.length &&
            line.reservations.some((r) => r.orderLineId)
          ) {
            throw new BadRequestException(
              'Despacho histórico sin distribución individual: requiere conciliación previa',
            );
          }
          const selected = item.allocationId
            ? dispatchedLine.allocations.filter(
                (a) => a.id === item.allocationId,
              )
            : dispatchedLine.allocations;
          if (item.allocationId)
            ensure(
              selected.length === 1 &&
                selected[0].quantity - selected[0].accepted >= item.accepted,
              'La asignación identificada no cubre las unidades aceptadas',
            );
          for (const allocation of selected) {
            const units = Math.min(
              remaining,
              allocation.quantity - allocation.accepted,
            );
            if (!units) continue;
            const orderLineId = await applyAllocation(
              tx,
              allocation,
              units,
              stock.id,
            );
            const entries = applications.get(item.productId) ?? [];
            entries.push({
              allocationId: allocation.id,
              orderLineId: orderLineId ?? null,
              quantity: units,
            });
            applications.set(item.productId, entries);
            remaining -= units;
            if (!remaining) break;
          }
        }
        if (item.rejected > 0)
          await tx.incident.create({
            data: {
              transferId,
              dispatchId: shipment.id,
              custodian: actor || 'operador-demo',
              location: transfer.destinationId,
              quantity: item.rejected,
              sku: (
                await tx.product.findUniqueOrThrow({
                  where: { id: item.productId },
                })
              ).sku,
              type: 'RECHAZO_RECEPCION',
              notes:
                'Producto ' +
                item.productId +
                ': ' +
                item.rejected +
                ' unidad(es) rechazadas; requiere conciliación',
            },
          });
      }
      const receipt = await tx.receipt.create({
        data: {
          transferId,
          dispatchId: shipment.id,
          lines: {
            create: body.items.map((i) => ({
              productId: i.productId,
              applied: applications.get(i.productId) ?? [],
              presented: i.presented,
              accepted: i.accepted,
              rejected: i.rejected,
            })),
          },
        },
        include: { lines: true },
      });
      const reconciled = await reconcileTransfer(tx, transferId);
      await transactions.auditTx(
        tx,
        'RECEIPT_VERIFIED',
        'Receipt',
        receipt.id,
        actor,
        {
          transferId,
          items: body.items,
          fullyReceived: reconciled,
          administrativelyClosed: false,
        },
      );
      return receipt;
    },
  );
}
