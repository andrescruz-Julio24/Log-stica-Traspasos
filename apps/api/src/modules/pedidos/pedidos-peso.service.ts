import { Injectable } from '@nestjs/common';
import { validTripForDispatch } from '../transporte/trip-validation';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../shared/database/prisma.service';
import { TransactionService } from '../../shared/database/transaction.service';
import { ensure } from '../../shared/domain/assertions';
import { measuredAmount } from '../proveedores/utils/measuredAmount';
import { CreateWeightOrderDto, ReserveWeightOrderDto, DispatchWeightOrderDto, ConfirmWeightClientDto } from './dto/pedidos-peso.dto';

@Injectable()
export class PedidosPesoService {
  constructor(private readonly db: PrismaService, private readonly transactions: TransactionService) {}
  list() {
    return this.db.customerOrder.findMany({ where: { weightLines: { some: {} } },
      include: { destination: true, weightLines: { include: {
        product: true, shipments: { include: { clientReception: true }, orderBy: { dispatchedAt: 'asc' } },
      } } }, orderBy: { createdAt: 'desc' }, take: 200 });
  }
  create(body: CreateWeightOrderDto, key: string | undefined, actor: string) {
    return this.transactions.idempotent('weight-order:' + actor, key, body, async tx => {
      await tx.location.findUniqueOrThrow({ where: { id: body.destinationId } });
      const product = await tx.product.findUniqueOrThrow({ where: { id: body.productId } });
      ensure(product.baseUnit === 'KG', 'Este formulario es para productos con inventario en KG');
      const planned = measuredAmount(body.plannedKg, 'KG');
      const averageBox = body.averageBoxKg ? measuredAmount(body.averageBoxKg, 'KG') : null;
      const order = await tx.customerOrder.create({ data: {
        code: 'CL-KG-' + randomUUID().slice(0, 8).toUpperCase(),
        customer: body.customer.trim(), destinationId: body.destinationId,
        dueAt: body.dueAt ? new Date(body.dueAt) : null,
        weightLines: { create: [{
          productId: product.id, plannedKg: planned,
          estimatedBoxes: body.estimatedBoxes ?? null, averageBoxKg: averageBox,
        }] },
      }, include: { weightLines: true } });
      await this.transactions.auditTx(tx, 'WEIGHT_ORDER_CREATED', 'CustomerOrder', order.id, actor, {
        productId: product.id, plannedKg: planned.toString(), estimatedBoxes: body.estimatedBoxes,
        averageBoxKg: averageBox?.toString() || null, dueAt: body.dueAt || null,
        quantityVsPackagesIndependent: true,
      });
      return order;
    });
  }
  reserve(lineId: string, body: ReserveWeightOrderDto, key: string | undefined, actor: string) {
    return this.transactions.idempotent('weight-order-reserve:' + lineId, key, body, async tx => {
      const line = await tx.weightOrderLine.findUniqueOrThrow({ where: { id: lineId },
        include: { order: true } });
      ensure(line.order.status !== 'CANCELLED' && line.dispatchedKg.isZero(),
        'Este pedido ya fue cancelado o despachado');
      const qty = measuredAmount(body.quantityKg, 'KG');
      ensure(line.reservedKg.plus(qty).lte(line.plannedKg), 'Reserva supera el peso teórico de la venta');
      const stock = await tx.unitStock.findUniqueOrThrow({ where: { productId_locationId: {
        productId: line.productId, locationId: line.order.destinationId,
      } } });
      ensure(stock.unit === 'KG' && stock.physical.minus(stock.reserved).minus(stock.blocked).gte(qty),
        'No hay peso confirmado libre suficiente');
      const updatedStock = await tx.unitStock.updateMany({
        where: { id: stock.id, version: stock.version },
        data: { reserved: { increment: qty }, version: { increment: 1 } },
      });
      ensure(updatedStock.count === 1, 'Inventario de kg modificado durante la reserva');
      const updated = await tx.weightOrderLine.updateMany({ where: { id: line.id, reservedKg: line.reservedKg },
        data: { reservedKg: { increment: qty } } });
      ensure(updated.count === 1, 'La reserva comercial cambió concurrentemente');
      if (line.reservedKg.plus(qty).equals(line.plannedKg))
        await tx.customerOrder.update({ where: { id: line.orderId }, data: { status: 'READY' } });
      else if (line.order.status === 'PENDING')
        await tx.customerOrder.update({ where: { id: line.orderId }, data: { status: 'PARTIAL' } });
      await this.transactions.auditTx(tx, 'WEIGHT_ORDER_RESERVED', 'WeightOrderLine', line.id, actor, {
        orderId: line.orderId, productId: line.productId, unit: 'KG',
        quantityKg: qty.toString(), plannedKg: line.plannedKg.toString(),
        reservedAfter: line.reservedKg.plus(qty).toString(),
      });
      return { lineId, reservedKg: line.reservedKg.plus(qty).toString() };
    });
  }
  confirmCustomer(shipmentId: string, body: ConfirmWeightClientDto,
    key: string | undefined, actor: string) {
    const when = new Date(body.observedAt);
    ensure(Number.isFinite(when.getTime()) && when.getTime() <= Date.now() + 300000,
      'Fecha de recepción del cliente inválida');
    return this.transactions.idempotent('weight-client-confirm:' + shipmentId, key, body, async tx => {
      const shipment = await tx.weightShipment.findUniqueOrThrow({
        where: { id: shipmentId },
        include: { clientReception: true, returnCase: true,
          weightLine: { include: { order: true, product: true } } },
      });
      ensure(!shipment.clientReception, 'La salida de peso ya tiene conformidad del cliente');
      const accepted = measuredAmount(body.acceptedKg, 'KG', true);
      const rejected = measuredAmount(body.rejectedKg, 'KG', true);
      ensure(accepted.plus(rejected).equals(shipment.actualKg),
        'La conformidad debe conciliar la totalidad del peso presentado al cliente');
      if (rejected.gt(0)) {
        ensure(body.notes?.trim(), 'El rechazo de kg requiere motivo');
        ensure(!shipment.returnCase, 'La salida ya tiene devolución abierta; concilia el expediente existente');
      }
      const receipt = await tx.weightClientReception.create({ data: {
        shipmentId: shipment.id, receiverName: body.receiverName.trim(),
        acceptedKg: accepted, rejectedKg: rejected, observedAt: when, recordedBy: actor,
        notes: body.notes?.trim() || null, evidenceRef: body.evidenceRef?.trim() || null,
      } });
      if (rejected.gt(0)) {
        const returned = await tx.commercialReturn.create({ data: {
          orderId: shipment.weightLine.orderId, productId: shipment.weightLine.productId,
          weightShipmentId: shipment.id, returnLocationId: shipment.weightLine.order.destinationId,
          unit: 'KG', expected: rejected, reason: body.notes!.trim(), registeredBy: actor,
        } });
        const incident = await tx.incident.create({ data: {
          commercialReturnId: returned.id, type: 'CLIENTE_RECHAZO_PESO',
          blocking: true, location: returned.returnLocationId,
          sku: shipment.weightLine.product.sku,
          notes: rejected.toString() + ' kg rechazados por el cliente. ' + body.notes!.trim(),
        } });
        await this.transactions.auditTx(tx, 'CLIENT_WEIGHT_RETURN_OPENED',
          'CommercialReturn', returned.id, actor, {
            weightShipmentId: shipment.id, clientReceiptId: receipt.id,
            expectedKg: rejected.toString(), incidentId: incident.id,
            noAutomaticRestock: true,
          });
      }
      await this.transactions.auditTx(tx, 'CLIENT_WEIGHT_RECEIVED',
        'WeightClientReception', receipt.id, actor, {
          weightShipmentId: shipment.id, orderId: shipment.weightLine.orderId,
          acceptedKg: accepted.toString(), rejectedKg: rejected.toString(),
          receiverName: body.receiverName, observedAt: body.observedAt,
          evidenceRef: body.evidenceRef || null, isCommercialReceipt: true,
        });
      return receipt;
    });
  }

  dispatch(lineId: string, body: DispatchWeightOrderDto, key: string | undefined, actor: string) {
    return this.transactions.idempotent('weight-order-dispatch:' + lineId, key, body, async tx => {
      const line = await tx.weightOrderLine.findUniqueOrThrow({ where: { id: lineId },
        include: { order: true, shipments: true } });
      ensure(line.order.status !== 'CANCELLED' && !line.shipments.length &&
        line.dispatchedKg.isZero(), 'Este peso comercial ya fue despachado');
      await validTripForDispatch(tx, body.tripId, { orderId: line.orderId });
      ensure(line.reservedKg.equals(line.plannedKg), 'Falta reservar el peso teórico completo');
      const actual = measuredAmount(body.actualKg, 'KG');
      ensure(actual.lte(line.reservedKg), 'El peso real supera lo reservado; requiere nueva autorización');
      const stock = await tx.unitStock.findUniqueOrThrow({ where: { productId_locationId: {
        productId: line.productId, locationId: line.order.destinationId,
      } } });
      ensure(stock.physical.minus(stock.blocked).gte(actual) &&
        stock.reserved.gte(line.reservedKg), 'La mercancía reservada ya no está utilizable');
      const updated = await tx.unitStock.updateMany({
        where: { id: stock.id, version: stock.version },
        data: { physical: { decrement: actual },
          reserved: { decrement: line.reservedKg }, version: { increment: 1 } },
      });
      ensure(updated.count === 1, 'Stock modificado durante pesaje/despacho comercial');
      const changed = await tx.weightOrderLine.updateMany({
        where: { id: line.id, reservedKg: line.reservedKg, dispatchedKg: line.dispatchedKg },
        data: { reservedKg: new Prisma.Decimal(0), dispatchedKg: actual },
      });
      ensure(changed.count === 1, 'La línea comercial ya fue modificada');
      const diff = actual.minus(line.plannedKg);
      const shipment = await tx.weightShipment.create({ data: {
        weightLineId: line.id, nominalKg: line.plannedKg, actualKg: actual,
        differenceKg: diff, documentRef: body.documentRef?.trim() || null,
        accountingRef: 'REV-PESO-' + randomUUID().slice(0, 12).toUpperCase(),
        custodian: body.custodian.trim(), dispatchedBy: actor,
        tripId: body.tripId || null,
      } });
      await this.transactions.auditTx(tx, 'COMMERCIAL_WEIGHT_DISPATCHED', 'WeightShipment',
        shipment.id, actor, {
          orderId: line.orderId, productId: line.productId, unit: 'KG',
          nominalKg: line.plannedKg.toString(), actualKg: actual.toString(),
          differenceKg: diff.toString(), estimatedBoxes: line.estimatedBoxes,
          averageBoxKg: line.averageBoxKg?.toString() ?? null,
          accountingRef: shipment.accountingRef, documentRef: shipment.documentRef,
          noPriceCalculated: true, requiresCustomerReception: true,
        });
      return shipment;
    });
  }
}
