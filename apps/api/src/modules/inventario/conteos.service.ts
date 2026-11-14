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
      const product = await tx.product.findUniqueOrThrow({ where: { id: body.productId } });
      await tx.location.findUniqueOrThrow({ where: { id: body.locationId } });
      const comparable = body.unit === product.baseUnit;
      const key = { productId: body.productId, locationId: body.locationId };
      const snapshot = comparable && body.unit === 'PIEZA'
        ? await tx.stock.findUnique({ where: { productId_locationId: key } }) : null;
      const measuredSnapshot = comparable && body.unit !== 'PIEZA'
        ? await tx.unitStock.findUnique({ where: { productId_locationId: key } }) : null;
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
          stockMeasuredSnapshot: measuredSnapshot?.physical ?? null,
          stockVersionSnapshot: snapshot?.version ?? measuredSnapshot?.version ?? null,
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
  // D-01: SGTL es la fuente de verdad por unidad declarada del producto.
  // No hay conversiones automáticas: PIEZA usa Stock, KG/CAJA usan UnitStock.
  apply(id: string, body: ApplyInventoryCountDto, actor: string, key?: string) {
    return this.transactions.idempotent('inventory-apply:' + id + ':' + actor, key, body, async tx => {
      const observation = await tx.inventoryObservation.findUniqueOrThrow({ where: { id } });
      ensure(observation.status === 'VERIFIED' && !observation.appliedAt,
        'El conteo debe estar validado y no haber sido aplicado');
      const product = await tx.product.findUniqueOrThrow({ where: { id: observation.productId } });
      if (observation.source !== 'DIGITAL' || observation.unit !== product.baseUnit ||
        (observation.unit === 'KG' && !['COUNT','WEIGHT'].includes(observation.method)) ||
        (observation.unit !== 'KG' && observation.method !== 'COUNT'))
        throw new BadRequestException('Solo puede aplicarse una medición digital de la unidad base del producto');
      const counted = observation.quantity;
      const unit = product.baseUnit;
      let original = new Prisma.Decimal(0);
      let stockId: string;
      if (unit === 'PIEZA') {
        const count = counted.toNumber();
        if (!Number.isSafeInteger(count) || count < 0 || count > 2147483647)
          throw new BadRequestException('Cantidad inválida de piezas');
        const stock = await tx.stock.findUnique({ where: { productId_locationId: {
          productId: product.id, locationId: observation.locationId,
        } } });
        if (!stock) {
          ensure(observation.stockVersionSnapshot === null && observation.stockPhysicalSnapshot === null,
            'El inventario cambió desde el conteo');
          const created = await tx.stock.create({ data: {
            productId: product.id, locationId: observation.locationId, physical: count, version: 1,
          } });
          stockId = created.id;
        } else {
          original = new Prisma.Decimal(stock.physical);
          ensure(observation.stockVersionSnapshot === stock.version &&
            observation.stockPhysicalSnapshot === stock.physical,
            'El inventario cambió desde el conteo. Registra una medición nueva');
          ensure(count >= stock.reserved + stock.blocked,
            'El conteo no cubre las unidades reservadas y bloqueadas; requiere resolver la diferencia antes de ajustar');
          const updated = await tx.stock.updateMany({ where: { id: stock.id, version: stock.version },
            data: { physical: count, version: { increment: 1 } } });
          ensure(updated.count === 1, 'El inventario cambió durante la conciliación');
          stockId = stock.id;
        }
      } else {
        if (!counted.isInteger() && unit === 'CAJA')
          throw new BadRequestException('La cantidad de cajas debe ser entera');
        const stock = await tx.unitStock.findUnique({ where: { productId_locationId: {
          productId: product.id, locationId: observation.locationId,
        } } });
        if (!stock) {
          ensure(observation.stockVersionSnapshot === null && observation.stockMeasuredSnapshot === null,
            'El inventario cambió desde el conteo');
          const created = await tx.unitStock.create({ data: {
            productId: product.id, locationId: observation.locationId,
            unit, physical: counted, version: 1,
          } });
          stockId = created.id;
        } else {
          original = stock.physical;
          ensure(stock.unit === unit && observation.stockVersionSnapshot === stock.version &&
            observation.stockMeasuredSnapshot?.equals(stock.physical),
            'El inventario cambió desde el conteo. Registra una medición nueva');
          ensure(counted.gte(stock.reserved.plus(stock.blocked)),
            'El conteo no cubre la mercancía reservada y bloqueada');
          const changed = await tx.unitStock.updateMany({
            where: { id: stock.id, version: stock.version },
            data: { physical: counted, version: { increment: 1 } },
          });
          ensure(changed.count === 1, 'El inventario cambió durante la conciliación');
          stockId = stock.id;
        }
      }
      const applied = await tx.inventoryObservation.update({ where: { id }, data: {
        appliedAt: new Date(), appliedBy: actor, appliedReason: body.reason.trim(),
        appliedPhysical: unit === 'PIEZA' ? counted.toNumber() : null,
        appliedMeasured: unit === 'PIEZA' ? null : counted,
      } });
      await this.transactions.auditTx(tx, 'INVENTORY_STOCK_ADJUSTED',
        unit === 'PIEZA' ? 'Stock' : 'UnitStock', stockId, actor, {
          observationId: id, productId: product.id, locationId: observation.locationId,
          unit, before: original.toString(), after: counted.toString(),
          difference: counted.minus(original).toString(), reason: body.reason.trim(),
          verifiedBy: observation.verifiedBy, measuredAt: observation.observedAt,
          reservedAndBlockedUntouched: true, noAutomaticConversions: true,
        });
      return { observation: applied, stockId, unit, previous: original.toString(),
        current: counted.toString(), difference: counted.minus(original).toString() };
    });
  }

}
