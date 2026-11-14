import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../shared/database/prisma.service';
import { TransactionService } from '../../shared/database/transaction.service';
import { ensure } from '../../shared/domain/assertions';
import { measuredAmount } from '../proveedores/utils/measuredAmount';
import { WeightReturnDto, ReturnIntakeDto, ResolveReturnDto } from './dto/devoluciones.dto';

@Injectable()
export class DevolucionesService {
  constructor(private readonly db: PrismaService, private readonly transaction: TransactionService) {}
  list(orderId?: string) {
    return this.db.commercialReturn.findMany({
      where: orderId ? { orderId } : {},
      include: { product: true, order: { select: { code: true, customer: true } },
        intake: true, accountingNotice: true, incidents: true },
      orderBy: { createdAt: 'desc' }, take: orderId ? undefined : 200,
    });
  }
  createWeightReturn(body: WeightReturnDto, key: string | undefined, actor: string) {
    return this.transaction.idempotent('weight-return:' + actor, key, body, async tx => {
      const shipment = await tx.weightShipment.findUniqueOrThrow({
        where: { id: body.weightShipmentId },
        include: { weightLine: { include: { order: true } }, returnCase: true },
      });
      ensure(!shipment.returnCase, 'Ya se abrió una devolución para este despacho pesado');
      const entry = await tx.commercialReturn.create({ data: {
        weightShipmentId: shipment.id, orderId: shipment.weightLine.orderId,
        productId: shipment.weightLine.productId,
        returnLocationId: shipment.weightLine.order.destinationId,
        unit: 'KG', expected: shipment.actualKg,
        reason: body.reason.trim(), registeredBy: actor,
      } });
      const incident = await tx.incident.create({ data: {
        commercialReturnId: entry.id, type: 'DEVOLUCION_PEDIDO_CARGADO',
        notes: 'Mercancía cargada regresada: ' + body.reason.trim(),
        location: entry.returnLocationId, blocking: true,
      } });
      await this.transaction.auditTx(tx, 'WEIGHT_RETURN_OPENED', 'CommercialReturn', entry.id, actor, {
        shipmentId: shipment.id, orderId: entry.orderId,
        expectedKg: shipment.actualKg.toString(), incidentId: incident.id,
        stockNotRestored: true,
      });
      return entry;
    });
  }
  intake(returnId: string, body: ReturnIntakeDto, key: string | undefined, actor: string) {
    const when = new Date(body.observedAt);
    if (!Number.isFinite(when.getTime()) || when.getTime() > Date.now() + 300000)
      throw new BadRequestException('Fecha de inspección inválida');
    return this.transaction.idempotent('return-intake:' + returnId, key, body, async tx => {
      const entry = await tx.commercialReturn.findUniqueOrThrow({
        where: { id: returnId }, include: { intake: true },
      });
      ensure(entry.status === 'AWAITING_RETURN' && !entry.intake,
        'La devolución ya tiene llegada documentada');
      const observed = measuredAmount(body.observed, entry.unit, true);
      const mismatch = !observed.equals(entry.expected);
      const intake = await tx.returnIntake.create({ data: {
        returnId, observed, conditionNote: body.conditionNote.trim(),
        evidenceRef: body.evidenceRef?.trim() || null, observedAt: when, receivedBy: actor,
      } });
      const accountingNotice = await tx.accountingNotice.create({ data: {
        returnId, reference: 'DEV-CONT-' + randomUUID().slice(0, 12).toUpperCase(),
        reason: entry.reason, requiresReconciliation: mismatch, createdBy: actor,
      } });
      if (mismatch) {
        const incident = await tx.incident.create({ data: {
          commercialReturnId: entry.id, blocking: true, type: 'DIFERENCIA_PESAJE_DEVOLUCION',
          notes: 'Se esperaba ' + entry.expected.toString() + ' ' + entry.unit +
            ', regresó ' + observed.toString() + '. ' + body.conditionNote.trim(),
          location: entry.returnLocationId,
        } });
        await this.transaction.auditTx(tx, 'RETURN_WEIGHT_MISMATCH', 'Incident', incident.id, actor, {
          returnId, expected: entry.expected.toString(), measured: observed.toString(),
          delta: observed.minus(entry.expected).toString(), unit: entry.unit,
          accountingReference: accountingNotice.reference, noStockEffect: true,
        });
      }
      await tx.commercialReturn.update({ where: { id: returnId },
        data: { status: 'INSPECTION_REQUIRED' } });
      await this.transaction.auditTx(tx, 'RETURN_PHYSICALLY_RECEIVED', 'CommercialReturn', returnId, actor, {
        expected: entry.expected.toString(), observed: observed.toString(), unit: entry.unit,
        evidenceRef: intake.evidenceRef, accountingReference: accountingNotice.reference,
        mismatch, stockNotRestored: true,
      });
      return { intake, accountingNotice, mismatch };
    });
  }
  resolve(returnId: string, body: ResolveReturnDto, key: string | undefined, actor: string) {
    return this.transaction.idempotent('return-resolve:' + returnId, key, body, async tx => {
      const entry = await tx.commercialReturn.findUniqueOrThrow({
        where: { id: returnId }, include: { intake: true, accountingNotice: true, incidents: true },
      });
      ensure(entry.status === 'INSPECTION_REQUIRED' && entry.intake && entry.accountingNotice,
        'Se requiere recepción física y papeleta antes de reintegrar mercancía');
      const usable = measuredAmount(body.usable, entry.unit, true);
      const blocked = measuredAmount(body.blocked, entry.unit, true);
      ensure(usable.plus(blocked).equals(entry.intake.observed),
        'La resolución debe explicar el total físicamente devuelto');
      const mismatch = !entry.intake.observed.equals(entry.expected);
      ensure(!mismatch || body.reconciliationRef?.trim(),
        'La diferencia de peso/cantidad necesita referencia de conciliación autorizada');
      const physical = usable.plus(blocked);
      if (entry.unit === 'PIEZA') {
        await tx.stock.upsert({
          where: { productId_locationId: { productId: entry.productId, locationId: entry.returnLocationId } },
          create: { productId: entry.productId, locationId: entry.returnLocationId,
            physical: physical.toNumber(), blocked: blocked.toNumber(), version: 1 },
          update: { physical: { increment: physical.toNumber() },
            blocked: { increment: blocked.toNumber() }, version: { increment: 1 } },
        });
      } else {
        await tx.unitStock.upsert({
          where: { productId_locationId: { productId: entry.productId, locationId: entry.returnLocationId } },
          create: { productId: entry.productId, locationId: entry.returnLocationId,
            unit: entry.unit, physical, blocked, version: 1 },
          update: { physical: { increment: physical }, blocked: { increment: blocked },
            version: { increment: 1 } },
        });
      }
      const resolved = await tx.commercialReturn.update({ where: { id: returnId },
        data: { status: 'RESOLVED', resolvedAt: new Date(), resolvedBy: actor } });
      await tx.incident.updateMany({ where: { commercialReturnId: returnId, status: 'OPEN' },
        data: { status: 'RESOLVED', resolution: body.reason.trim() +
          (body.reconciliationRef ? ' · Conciliación ' + body.reconciliationRef.trim() : '') } });
      await this.transaction.auditTx(tx, 'RETURN_INSPECTION_RESOLVED', 'CommercialReturn', returnId, actor, {
        expected: entry.expected.toString(), returned: entry.intake.observed.toString(),
        usable: usable.toString(), blocked: blocked.toString(), unit: entry.unit,
        reason: body.reason.trim(), reconciliationRef: body.reconciliationRef?.trim() ?? null,
        accountingReference: entry.accountingNotice.reference, stockRestoredOnlyAfterReview: true,
      });
      return resolved;
    });
  }
}
