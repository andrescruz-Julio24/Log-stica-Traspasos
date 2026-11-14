import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, InventoryObservationStatus } from '@prisma/client';
import { PrismaService } from '../../shared/database/prisma.service';
import { TransactionService } from '../../shared/database/transaction.service';
import { ensure } from '../../shared/domain/assertions';
import { CreateInventoryObservationDto } from './dto/conteos.dto';

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
      if (observation.source === 'EXCEL' || observation.method === 'ESTIMATE')
        throw new BadRequestException('Una estimación de Excel no es una medición física verificable');
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
}
