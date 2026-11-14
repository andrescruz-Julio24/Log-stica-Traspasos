import { validTripForDispatch } from '../transporte/trip-validation';
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { TransactionService } from '../../shared/database/transaction.service';
import { ensure } from '../../shared/domain/assertions';
import { refreshOrderState } from '../pedidos/readiness';
import { CreateClientReceptionDto, CreateClientShipmentDto } from './dto/entregas.dto';

@Injectable()
export class EntregasService {
  constructor(private readonly db: PrismaService, private readonly transactions: TransactionService) {}

  // Reserva directa: una existencia validada en destino no necesita traspaso ficticio.
  allocateLocal(body: { orderLineId: string; quantity: number }, key: string | undefined, actor: string) {
    return this.transactions.idempotent('local-commitment:' + actor, key, body, async (tx) => {
      const line = await tx.orderLine.findUniqueOrThrow({
        where: { id: body.orderLineId }, include: { order: true },
      });
      ensure(line.order.status !== 'CANCELLED', 'Pedido cancelado');
      ensure(line.accepted + body.quantity <= line.required, 'El pedido no necesita tantas unidades');
      const stock = await tx.stock.findUnique({
        where: { productId_locationId: {
          productId: line.productId, locationId: line.order.destinationId,
        } },
      });
      ensure(stock && stock.physical - stock.blocked - stock.reserved >= body.quantity,
        'Stock local utilizable insuficiente');
      // No convertir una estimación Excel en disponibilidad. Sin concordancia de un
      // conteo físico verificado se necesita reconciliación previa, no un ajuste oculto.
      const physicalCount = await tx.inventoryObservation.findFirst({
        where: {
          productId: line.productId, locationId: line.order.destinationId,
          status: 'VERIFIED', unit: 'PIEZA', method: 'COUNT',
        },
        orderBy: [{ observedAt: 'desc' }, { recordedAt: 'desc' }],
      });
      ensure(physicalCount && physicalCount.quantity.equals(stock.physical),
        'Se requiere un conteo físico validado y concordante para reservar stock local');
      const updated = await tx.stock.updateMany({
        where: { id: stock.id, version: stock.version, physical: { gte: body.quantity } },
        data: { reserved: { increment: body.quantity }, version: { increment: 1 } },
      });
      ensure(updated.count === 1, 'El stock local cambió durante la asignación');
      await tx.orderLine.update({ where: { id: line.id }, data: { accepted: { increment: body.quantity } } });
      const commitment = await tx.localStockCommitment.create({
        data: { orderLineId: line.id, stockId: stock.id, quantity: body.quantity, actor },
      });
      await refreshOrderState(tx, line.orderId);
      await this.transactions.auditTx(tx, 'LOCAL_STOCK_COMMITTED', 'LocalStockCommitment',
        commitment.id, actor, {
          orderLineId: line.id, stockId: stock.id, quantity: body.quantity,
          countId: physicalCount.id, locationId: line.order.destinationId,
        });
      return commitment;
    });
  }

  list(orderId?: string) {
    return this.db.clientShipment.findMany({
      where: orderId ? { orderId } : {},
      include: {
        order: { select: { id: true, code: true, customer: true, status: true } },
        lines: { include: { orderLine: { include: { product: true } } } },
        receptions: { include: { lines: true }, orderBy: { recordedAt: 'asc' } },
      },
      orderBy: { dispatchedAt: 'desc' },
      take: orderId ? undefined : 200,
    });
  }

  dispatch(body: CreateClientShipmentDto, key: string | undefined, actor: string) {
    if (new Set(body.items.map((i) => i.orderLineId)).size !== body.items.length)
      throw new BadRequestException('No repetir líneas en un mismo despacho comercial');
    return this.transactions.idempotent('client-shipment:' + actor, key, body, async (tx) => {
      const order = await tx.customerOrder.findUniqueOrThrow({
        where: { id: body.orderId }, include: { lines: true },
      });
      ensure(order.status !== 'CANCELLED', 'Pedido comercial cancelado');
      await validTripForDispatch(tx, body.tripId, { orderId: order.id });
      const blocking = await tx.incident.count({
        where: { status: 'OPEN', blocking: true, allocation: { reservation: { orderLine: { orderId: order.id } } } },
      });
      ensure(blocking === 0, 'El pedido tiene mercancía retenida o incidencia bloqueante');
      for (const item of body.items) {
        const line = order.lines.find((l) => l.id === item.orderLineId);
        ensure(line, 'Línea ajena al pedido');
        const shipped = await tx.clientShipmentLine.aggregate({
          where: { orderLineId: line.id }, _sum: { quantity: true },
        });
        ensure(item.quantity <= line.accepted - (shipped._sum.quantity || 0),
          'No se puede despachar más mercancía que la aceptada y comprometida');
        const stock = await tx.stock.findUnique({
          where: { productId_locationId: { productId: line.productId, locationId: order.destinationId } },
        });
        ensure(stock && stock.physical - stock.blocked >= item.quantity && stock.reserved >= item.quantity,
          'Sin saldo físico utilizable y reservado para la salida comercial');
        const updated = await tx.stock.updateMany({
          where: { id: stock.id, version: stock.version, physical: { gte: item.quantity }, reserved: { gte: item.quantity } },
          data: { physical: { decrement: item.quantity }, reserved: { decrement: item.quantity }, version: { increment: 1 } },
        });
        ensure(updated.count === 1, 'Inventario modificado durante la preparación comercial');
      }
      const shipment = await tx.clientShipment.create({
        data: {
          orderId: order.id, originId: order.destinationId, tripId: body.tripId ?? null, custodian: body.custodian.trim(),
          reference: body.reference || null, dispatchedBy: actor,
          lines: { create: body.items.map((i) => ({ orderLineId: i.orderLineId, quantity: i.quantity })) },
        },
        include: { lines: true },
      });
      await this.transactions.auditTx(tx, 'CLIENT_SHIPMENT_DISPATCHED', 'ClientShipment', shipment.id, actor, {
        orderId: order.id, originId: order.destinationId, custodian: body.custodian,
        items: body.items, inTransit: true,
      });
      return shipment;
    });
  }

  confirm(shipmentId: string, body: CreateClientReceptionDto, key: string | undefined, actor: string) {
    if (new Set(body.items.map((i) => i.shipmentLineId)).size !== body.items.length)
      throw new BadRequestException('No repetir líneas en una misma confirmación');
    if (body.items.some((i) => i.accepted + i.rejected < 1))
      throw new BadRequestException('Cada línea confirmada debe presentar una cantidad positiva');
    if (body.items.some((i) => i.rejected > 0) && !body.notes?.trim())
      throw new BadRequestException('Explica las cantidades rechazadas');
    const observedAt = new Date(body.observedAt);
    ensure(observedAt.getTime() <= Date.now() + 5 * 60_000, 'La entrega no puede ocurrir en el futuro');
    return this.transactions.idempotent('client-reception:' + shipmentId, key, body, async (tx) => {
      const shipment = await tx.clientShipment.findUniqueOrThrow({
        where: { id: shipmentId },
        include: { lines: true, receptions: { include: { lines: true } } },
      });
      for (const item of body.items) {
        const line = shipment.lines.find((l) => l.id === item.shipmentLineId);
        ensure(line, 'La línea no pertenece a este despacho comercial');
        const registered = shipment.receptions.flatMap((r) => r.lines)
          .filter((r) => r.shipmentLineId === line.id)
          .reduce((sum, r) => sum + r.accepted + r.rejected, 0);
        ensure(registered + item.accepted + item.rejected <= line.quantity,
          'La recepción comercial excede el despacho');
      }
      const result = await tx.clientReception.create({
        data: {
          shipmentId, receiverName: body.receiverName.trim(), observedAt, recordedBy: actor,
          notes: body.notes || null, evidenceRef: body.evidenceRef || null,
          lines: { create: body.items.map((i) => ({
            shipmentLineId: i.shipmentLineId, accepted: i.accepted, rejected: i.rejected,
          })) },
        }, include: { lines: true },
      });
      await this.transactions.auditTx(tx, 'CLIENT_RECEIPT_CONFIRMED', 'ClientReception', result.id, actor, {
        shipmentId, orderId: shipment.orderId, receiverName: body.receiverName, observedAt: body.observedAt,
        items: body.items, rejected: body.items.some((i) => i.rejected > 0),
        notes: body.notes || null, evidenceRef: body.evidenceRef || null,
        // Una recepción rechazada NO se reintegra automáticamente al stock.
        returnedToStock: false,
      });
      return result;
    });
  }
}
