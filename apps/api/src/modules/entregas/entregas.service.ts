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

  // Resultado comercial calculado en servidor; 'READY' únicamente significa abastecimiento.
  async deliveryStatus(orderId: string) {
    const order = await this.db.customerOrder.findUniqueOrThrow({
      where: { id: orderId },
      include: {
        lines: true, returns: true,
        weightLines: { include: { shipments: { include: { clientReception: true } } } },
        clientShipments: { include: { lines: true, receptions: { include: { lines: true } } } },
      },
    });
    const delivered = new Map(order.lines.map(l => [l.id, 0]));
    let rejected = 0;
    let shipped = 0;
    let accepted = 0;
    for (const shipment of order.clientShipments) {
      const byId = new Map(shipment.lines.map(l => [l.id, l.orderLineId]));
      for (const line of shipment.lines) shipped += line.quantity;
      for (const receipt of shipment.receptions) {
        for (const line of receipt.lines) {
          const orderLineId = byId.get(line.shipmentLineId);
          if (orderLineId) delivered.set(orderLineId, (delivered.get(orderLineId) || 0) + line.accepted);
          accepted += line.accepted;
          rejected += line.rejected;
        }
      }
    }
    const openReturns = order.returns.filter(r => r.status !== 'RESOLVED').length;
    const pieceComplete = order.lines.every(l => (delivered.get(l.id) || 0) >= l.required);
    const weightSent = order.weightLines.some(l => l.shipments.length > 0);
    const weightAccepted = order.weightLines.reduce((total, l) =>
      total + l.shipments.reduce((sum, sh) =>
        sum + (sh.clientReception?.acceptedKg.toNumber() || 0), 0), 0);
    const weightRejected = order.weightLines.reduce((total, l) =>
      total + l.shipments.reduce((sum, sh) =>
        sum + (sh.clientReception?.rejectedKg.toNumber() || 0), 0), 0);
    const weightComplete = order.weightLines.every(l =>
      l.shipments.reduce((sum, sh) => sum +
        (sh.clientReception?.acceptedKg.toNumber() || 0), 0) >= l.plannedKg.toNumber());
    const hasLines = order.lines.length > 0 || order.weightLines.length > 0;
    const complete = hasLines && pieceComplete && weightComplete;
    const state = order.status === 'CANCELLED' ? 'CANCELADO'
      : (openReturns || rejected || weightRejected || order.status === 'BLOCKED') ? 'CON_INCIDENCIAS'
      : complete ? 'ENTREGADO_CONFORME'
      : accepted > 0 || weightAccepted > 0 ? 'ENTREGA_PARCIAL'
      : shipped > 0 || weightSent ? 'EN_REPARTO' : 'PENDIENTE_DE_REPARTO';
    return {
      orderId: order.id, supplyStatus: order.status, commercialStatus: state,
      shipped, accepted, rejected, openReturns,
      weightAcceptedKg: weightAccepted, weightRejectedKg: weightRejected,
      kilogramsSent: order.weightLines.reduce((n,l)=>n+l.shipments.reduce(
        (sum,sh)=>sum+sh.actualKg.toNumber(),0),0),
      customerReceptionRequired: true,
    };
  }

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
      // T-27: lo rechazado sigue en custodia, sin crear stock en el destino.
      for (const line of result.lines.filter(x => x.rejected > 0)) {
        const original = shipment.lines.find(x => x.id === line.shipmentLineId);
        ensure(original, 'La recepción no corresponde a esta salida');
        const orderLine = await tx.orderLine.findUniqueOrThrow({
          where: { id: original.orderLineId }, include: { product: true },
        });
        const returned = await tx.commercialReturn.create({ data: {
          orderId: shipment.orderId, productId: orderLine.productId,
          returnLocationId: shipment.originId, clientReceptionLineId: line.id,
          expected: line.rejected, unit: 'PIEZA',
          reason: body.notes?.trim() || 'Rechazo parcial del cliente',
          registeredBy: actor,
        } });
        const incident = await tx.incident.create({ data: {
          commercialReturnId: returned.id, type: 'CLIENTE_RECHAZO_PARCIAL',
          blocking: true, sku: orderLine.product.sku,
          quantity: line.rejected, location: shipment.originId,
          notes: 'Cliente rechazó ' + line.rejected + ' PIEZA. ' + (body.notes || ''),
        } });
        await this.transactions.auditTx(tx, 'CLIENT_RETURN_OPENED',
          'CommercialReturn', returned.id, actor, {
            shipmentId: shipment.id, receptionId: result.id,
            clientReceptionLineId: line.id, quantity: line.rejected,
            incidentId: incident.id, awaitingPhysicalReturn: true,
            stockNotRestored: true,
          });
      }
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
