import { validTripForDispatch } from '../transporte/trip-validation';
import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../shared/database/prisma.service';
import { TransactionService } from '../../shared/database/transaction.service';
import { ensure } from '../../shared/domain/assertions';
import { measuredAmount } from '../proveedores/utils/measuredAmount';
import { CreateMeasuredTransferDto, MeasuredReservationDto, MeasuredDispatchDto, MeasuredReceiptDto } from './dto/medidos.dto';

@Injectable()
export class MedidosService {
  constructor(private readonly db: PrismaService, private readonly tx: TransactionService) {}

  list() {
    return this.db.transfer.findMany({
      where: { measuredLines: { some: {} } },
      include: { origin: true, destination: true,
        measuredLines: { include: { product: true } },
        measuredDispatches: { include: { receipts: { orderBy: { receivedAt: 'asc' } } },
          orderBy: { dispatchedAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' }, take: 200,
    });
  }

  create(body: CreateMeasuredTransferDto, key: string | undefined, actor: string) {
    if (body.originId === body.destinationId)
      throw new BadRequestException('Origen y destino deben ser distintos');
    if (new Set(body.items.map(i => i.productId)).size !== body.items.length)
      throw new BadRequestException('Producto duplicado en una misma solicitud');
    return this.tx.idempotent('measured-transfer:' + actor, key, body, async tx => {
      const locations = await tx.location.count({ where: { id: { in: [body.originId, body.destinationId] } } });
      ensure(locations === 2, 'Ubicación inexistente');
      const products = await tx.product.findMany({ where: { id: { in: body.items.map(i => i.productId) } } });
      ensure(products.length === body.items.length && products.every(p => p.baseUnit !== 'PIEZA'),
        'Este flujo admite KG y CAJA; usa el traspaso existente para piezas');
      const items = body.items.map(i => {
        const product = products.find(p => p.id === i.productId)!;
        if (i.averageWeightKg && product.baseUnit !== 'KG')
          throw new BadRequestException('El peso promedio solo aplica a mercancía por KG');
        return { productId: i.productId, unit: product.baseUnit,
          requested: measuredAmount(i.requested, product.baseUnit),
          estimatedPackages: i.estimatedPackages ?? null,
          averageWeightKg: i.averageWeightKg ? measuredAmount(i.averageWeightKg, 'KG') : null };
      });
      const transfer = await tx.transfer.create({
        data: { code: 'TR-KG-' + randomUUID().slice(0, 8).toUpperCase(),
          originId: body.originId, destinationId: body.destinationId,
          measuredLines: { create: items } },
        include: { measuredLines: true },
      });
      await this.tx.auditTx(tx, 'MEASURED_TRANSFER_CREATED', 'Transfer', transfer.id, actor, {
        originId: body.originId, destinationId: body.destinationId,
        products: items.map(i=>({ productId:i.productId, unit:i.unit,
          requested:i.requested.toString(), estimatedPackages:i.estimatedPackages,
          averageWeightKg:i.averageWeightKg?.toString() || null })),
      });
      return transfer;
    });
  }

  reserve(transferId: string, body: MeasuredReservationDto, key: string | undefined, actor: string) {
    return this.tx.idempotent('measured-reserve:' + transferId + ':' + actor, key, body, async tx => {
      const line = await tx.measuredTransferLine.findUniqueOrThrow({
        where: { id: body.lineId }, include: { transfer: true },
      });
      ensure(line.transferId === transferId &&
        ['REQUESTED','PREPARING','IN_TRANSIT','RECEIVING'].includes(line.transfer.status),
        'Línea de traspaso no disponible');
      const qty = measuredAmount(body.quantity, line.unit);
      ensure(line.reserved.plus(qty).lte(line.requested), 'Reserva mayor que lo solicitado');
      const stock = await tx.unitStock.findUniqueOrThrow({ where: {
        productId_locationId: { productId: line.productId, locationId: line.transfer.originId },
      } });
      ensure(stock.unit === line.unit && stock.physical.minus(stock.reserved).minus(stock.blocked).gte(qty),
        'No existe inventario libre para la unidad solicitada');
      const updated = await tx.unitStock.updateMany({ where: { id: stock.id, version: stock.version },
        data: { reserved: { increment: qty }, version: { increment: 1 } } });
      ensure(updated.count === 1, 'Inventario modificado durante la reserva');
      const updatedLine = await tx.measuredTransferLine.updateMany({
        where: { id: line.id, reserved: line.reserved },
        data: { reserved: { increment: qty } },
      });
      ensure(updatedLine.count === 1, 'Traspaso modificado durante la reserva');
      if (line.transfer.status === 'REQUESTED')
        await tx.transfer.update({ where: { id: transferId }, data: { status: 'PREPARING' } });
      await this.tx.auditTx(tx, 'MEASURED_STOCK_RESERVED', 'MeasuredTransferLine', line.id, actor, {
        transferId, originId: line.transfer.originId, unit: line.unit, quantity: qty.toString(),
      });
      return { lineId: line.id, reserved: line.reserved.plus(qty).toString(), unit: line.unit };
    });
  }

  dispatch(transferId: string, body: MeasuredDispatchDto, key: string | undefined, actor: string) {
    return this.tx.idempotent('measured-dispatch:' + transferId, key, body, async tx => {
      const line = await tx.measuredTransferLine.findUniqueOrThrow({
        where: { id: body.lineId }, include: { transfer: true },
      });
      ensure(line.transferId === transferId && ['PREPARING','IN_TRANSIT','RECEIVING'].includes(line.transfer.status),
        'Traspaso no disponible para despacho');
      await validTripForDispatch(tx, body.tripId, { transferId });
      const qty = measuredAmount(body.quantity, line.unit);
      ensure(line.dispatched.plus(qty).lte(line.reserved),
        'Se requiere reserva suficiente antes de cargar la mercancía');
      const stock = await tx.unitStock.findUniqueOrThrow({ where: {
        productId_locationId: { productId: line.productId, locationId: line.transfer.originId },
      } });
      ensure(stock.physical.gte(qty) && stock.reserved.gte(qty),
        'No existe cantidad física reservada suficiente');
      const updated = await tx.unitStock.updateMany({ where: { id: stock.id, version: stock.version },
        data: { physical: { decrement: qty }, reserved: { decrement: qty },
          version: { increment: 1 } } });
      ensure(updated.count === 1, 'Stock cambió durante el despacho');
      const updatedLine = await tx.measuredTransferLine.updateMany({
        where: { id: line.id, dispatched: line.dispatched }, data: { dispatched: { increment: qty } },
      });
      ensure(updatedLine.count === 1, 'El despacho ya fue modificado');
      const dispatch = await tx.measuredDispatch.create({ data: {
        transferId, lineId: line.id, quantity: qty, tripId: body.tripId ?? null,
        custodian: body.custodian.trim(), dispatchedBy: actor,
      } });
      await tx.transfer.update({ where: { id: transferId }, data: { status: 'IN_TRANSIT' } });
      await this.tx.auditTx(tx, 'MEASURED_TRANSFER_DISPATCHED', 'MeasuredDispatch', dispatch.id, actor, {
        transferId, productId: line.productId, unit: line.unit,
        quantity: qty.toString(), custodian: body.custodian, inTransit: true,
      });
      return dispatch;
    });
  }

  receive(transferId: string, body: MeasuredReceiptDto, key: string | undefined, actor: string) {
    const observedAt = new Date(body.observedAt);
    if (!Number.isFinite(observedAt.getTime()) || observedAt.getTime() > Date.now()+5*60_000)
      throw new BadRequestException('Fecha u hora de recepción inválida');
    return this.tx.idempotent('measured-receipt:' + body.dispatchId, key, body, async tx => {
      const dispatch = await tx.measuredDispatch.findUniqueOrThrow({
        where: { id: body.dispatchId },
        include: { line: { include: { transfer: true, product: true } },
          receipts: true },
      });
      ensure(dispatch.transferId === transferId, 'Despacho no pertenece al traspaso');
      ensure(dispatch.line.transfer.status !== 'CLOSED', 'Traspaso ya cerrado');
      const qty = measuredAmount(body.presented, dispatch.line.unit);
      const accepted = measuredAmount(body.accepted, dispatch.line.unit, true);
      const blocked = measuredAmount(body.blocked, dispatch.line.unit, true);
      ensure(accepted.plus(blocked).equals(qty),
        'La aceptación y el bloqueo deben sumar lo físicamente presentado');
      const prior = dispatch.receipts.reduce((sum, r) => sum.plus(r.presented), new Prisma.Decimal(0));
      ensure(prior.plus(qty).lte(dispatch.quantity), 'Recepción excede lo despachado');
      if (blocked.gt(0) && !body.notes?.trim())
        throw new BadRequestException('Describe la diferencia o producto dañado');
      const destId = dispatch.line.transfer.destinationId;
      await tx.unitStock.upsert({
        where: { productId_locationId: { productId: dispatch.line.productId, locationId: destId } },
        create: { productId: dispatch.line.productId, locationId: destId,
          unit: dispatch.line.unit, physical: qty, blocked, version: 1 },
        update: { physical: { increment: qty }, blocked: { increment: blocked },
          version: { increment: 1 } },
      });
      const updatedLine = await tx.measuredTransferLine.updateMany({
        where: { id: dispatch.line.id, accepted: dispatch.line.accepted, blocked: dispatch.line.blocked },
        data: { accepted: { increment: accepted }, blocked: { increment: blocked } },
      });
      ensure(updatedLine.count === 1, 'La línea cambió durante la recepción');
      const receipt = await tx.measuredReceipt.create({ data: {
        dispatchId: dispatch.id, presented: qty, accepted, blocked, observedAt,
        receivedBy: actor, notes: body.notes?.trim() || null,
        evidenceRef: body.evidenceRef?.trim() || null,
      } });
      if (blocked.gt(0)) {
        const incident = await tx.incident.create({ data: {
          transferId, type: 'PESO_RECIBIDO_EN_REVISION', status: 'OPEN',
          notes: blocked.toString() + ' ' + dispatch.line.unit + ' bloqueados. ' + (body.notes || ''),
          sku: dispatch.line.product.sku, location: destId, custodian: actor,
          evidence: body.evidenceRef || null, blocking: true,
        } });
        await this.tx.auditTx(tx, 'MEASURED_TRANSFER_INCIDENT', 'Incident', incident.id, actor, {
          transferId, dispatchId: dispatch.id, receiptId: receipt.id,
          blocked: blocked.toString(), unit: dispatch.line.unit,
        });
      }
      const allLines = await tx.measuredTransferLine.findMany({ where: { transferId } });
      const complete = allLines.every(l =>
        l.dispatched.gte(l.requested) && l.accepted.plus(l.blocked).gte(l.dispatched));
      const hasIssues = allLines.some(l => l.blocked.gt(0));
      await tx.transfer.update({
        where: { id: transferId },
        data: { status: complete && !hasIssues ? 'CLOSED' : 'RECEIVING' },
      });
      await this.tx.auditTx(tx, 'MEASURED_TRANSFER_RECEIVED', 'MeasuredReceipt', receipt.id, actor, {
        transferId, dispatchId: dispatch.id, productId: dispatch.line.productId,
        originId: dispatch.line.transfer.originId, destinationId: destId,
        unit: dispatch.line.unit, presented: qty.toString(), accepted: accepted.toString(),
        blocked: blocked.toString(), observedAt: body.observedAt,
        evidenceRef: body.evidenceRef || null, deliveryNotAutomaticallyConforming: hasIssues,
      });
      return receipt;
    });
  }
}
