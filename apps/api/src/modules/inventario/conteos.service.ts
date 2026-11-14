import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, InventoryObservationStatus } from '@prisma/client';
import { PrismaService } from '../../shared/database/prisma.service';
import { TransactionService } from '../../shared/database/transaction.service';
import { ensure } from '../../shared/domain/assertions';
import { ApplyInventoryCountDto, CreateInventoryObservationDto } from './dto/conteos.dto';

@Injectable()
export class ConteosService {
  constructor(private readonly db: PrismaService, private readonly transactions: TransactionService) {}

  list() {
    return this.db.inventoryObservation.findMany({
      include: { product: { select: { sku: true, name: true } }, location: { select: { name: true } } },
      orderBy: [{ recordedAt: 'desc' }, { id: 'desc' }],
      take: 200,
    });
  }

  create(body: CreateInventoryObservationDto, actor: string, key?: string) {
    if (body.source === 'PAPER') throw new BadRequestException('El papel dejó de ser un medio de captura; registra el conteo directamente en SGTL');
    const observedAt = new Date(body.observedAt);
    ensure(observedAt.getTime() <= Date.now() + 5 * 60_000, 'No se admiten conteos fechados en el futuro');
    return this.transactions.idempotent('inventory-observation:' + actor, key, body, async (tx) => {
      await tx.product.findUniqueOrThrow({ where: { id: body.productId } });
      await tx.location.findUniqueOrThrow({ where: { id: body.locationId } });
      const snapshot = body.unit === 'PIEZA'
        ? await tx.stock.findUnique({
            where: { productId_locationId: { productId: body.productId, locationId: body.locationId } },
          })
        : null;
      const observation = await tx.inventoryObservation.create({
        data: {
          productId: body.productId,
          locationId: body.locationId,
          quantity: new Prisma.Decimal(body.quantity),
          unit: body.unit,
          source: body.source,
          method: body.method,
          observedAt,
          reference: body.reference || null,
          recordedBy: actor,
          stockPhysicalSnapshot: snapshot?.physical ?? null,
          stockVersionSnapshot: snapshot?.version ?? null,
        },
      });
      await this.transactions.auditTx(tx, 'INVENTORY_OBSERVATION_RECORDED', 'InventoryObservation', observation.id, actor, {
        ...body, stockPhysicalSnapshot: observation.stockPhysicalSnapshot, sourceStatus: 'REFERENCE',
      });
      return observation;
    });
  }

  verify(id: string, actor: string, key?: string) {
    return this.transactions.idempotent('inventory-verify:' + id + ':' + actor, key, { id }, async (tx) => {
      const observation = await tx.inventoryObservation.findUniqueOrThrow({ where: { id } });
      ensure(observation.status === InventoryObservationStatus.REFERENCE, 'Observación ya validada');
      if (observation.source !== 'DIGITAL' || observation.method === 'ESTIMATE')
        throw new BadRequestException('Solo los conteos físicos capturados digitalmente en SGTL pueden validarse');
      const updated = await tx.inventoryObservation.update({
        where: { id }, data: { status: 'VERIFIED', verifiedBy: actor, verifiedAt: new Date() },
      });
      await this.transactions.auditTx(tx, 'INVENTORY_OBSERVATION_VERIFIED', 'InventoryObservation', id, actor, {
        source: observation.source, method: observation.method, observedAt: observation.observedAt,
        quantity: observation.quantity.toString(), unit: observation.unit,
        stockPhysicalSnapshot: observation.stockPhysicalSnapshot,
        // Validar el conteo NO ajusta existencias ni libera una reserva.
        stockChanged: false,
      });
      return updated;
    });
  }
  // D-01: SGTL es el libro oficial. Ajustar solo desde una medición digital
  // verificada, con autorización, causa, versión de saldo y auditoría atómica.
  apply(id: string, body: ApplyInventoryCountDto, actor: string, key?: string) {
    return this.transactions.idempotent('inventory-apply:' + id + ':' + actor, key, body, async (tx) => {
      const observation = await tx.inventoryObservation.findUniqueOrThrow({ where: { id } });
      ensure(observation.status === 'VERIFIED' && !observation.appliedAt,
        'El conteo debe estar validado y no haber sido aplicado');
      if (observation.source !== 'DIGITAL' || observation.method !== 'COUNT' || observation.unit !== 'PIEZA')
        throw new BadRequestException('Por ahora solo pueden aplicarse conteos digitales de piezas enteras');
      const counted = observation.quantity.toNumber();
      if (!Number.isSafeInteger(counted) || counted < 0 || counted > 2147483647)
        throw new BadRequestException('Cantidad inválida para el inventario de piezas');
      const stock = await tx.stock.findUnique({
        where: { productId_locationId: {
          productId: observation.productId, locationId: observation.locationId,
        } },
      });
      let originalPhysical = 0;
      let updatedStockId: string;
      if (!stock) {
        ensure(observation.stockPhysicalSnapshot === null && observation.stockVersionSnapshot === null,
          'La ubicación cambió desde el conteo. Vuelve a contar');
        const created = await tx.stock.create({
          data: { productId: observation.productId, locationId: observation.locationId,
            physical: counted, version: 1 },
        });
        updatedStockId = created.id;
      } else {
        originalPhysical = stock.physical;
        ensure(observation.stockVersionSnapshot === stock.version &&
          observation.stockPhysicalSnapshot === stock.physical,
          'El inventario cambió desde el conteo. Registra una medición nueva');
        ensure(counted >= stock.reserved + stock.blocked,
          'El conteo no cubre las unidades reservadas y bloqueadas; requiere resolver la diferencia antes de ajustar');
        const result = await tx.stock.updateMany({
          where: { id: stock.id, version: stock.version, physical: stock.physical },
          data: { physical: counted, version: { increment: 1 } },
        });
        ensure(result.count === 1, 'El inventario cambió durante la conciliación');
        updatedStockId = stock.id;
      }
      const applied = await tx.inventoryObservation.update({
        where: { id }, data: {
          appliedAt: new Date(), appliedBy: actor, appliedReason: body.reason.trim(),
          appliedPhysical: counted,
        },
      });
      await this.transactions.auditTx(tx, 'INVENTORY_STOCK_ADJUSTED', 'Stock', updatedStockId, actor, {
        observationId: id, productId: observation.productId, locationId: observation.locationId,
        before: originalPhysical, after: counted, difference: counted - originalPhysical,
        reason: body.reason.trim(), verifiedBy: observation.verifiedBy,
        measuredAt: observation.observedAt, verifiedAt: observation.verifiedAt,
        reservedAndBlockedUntouched: true,
      });
      return { observation: applied, stockId: updatedStockId, previous: originalPhysical,
        current: counted, difference: counted - originalPhysical };
    });
  }

}
