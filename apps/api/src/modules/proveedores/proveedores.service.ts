import { BadRequestException, Injectable } from '@nestjs/common';
import { InventoryBaseUnit, Prisma } from '@prisma/client';
import { PrismaService } from '../../shared/database/prisma.service';
import { TransactionService, Tx } from '../../shared/database/transaction.service';
import { ensure } from '../../shared/domain/assertions';
import { CreateSupplierReceiptDto, InspectSupplierReceiptDto, ReturnBlockedSupplierDto } from './dto/proveedores.dto';
import { measuredAmount } from './utils/measuredAmount';

const zero = () => new Prisma.Decimal(0);
const plus = (a: Prisma.Decimal, b: Prisma.Decimal) => a.plus(b);

@Injectable()
export class ProveedoresService {
  constructor(private readonly db: PrismaService, private readonly transactions: TransactionService) {}

  list() {
    return this.db.supplierReceipt.findMany({
      include: {
        destination: { select: { id: true, name: true } },
        lines: { include: { product: true, returns: { orderBy: { returnedAt: 'asc' } } } },
        inspections: { include: { lines: true }, orderBy: { recordedAt: 'asc' } },
      }, orderBy: { createdAt: 'desc' }, take: 200,
    });
  }
  stocks() {
    return this.db.unitStock.findMany({
      include: { product: { select: { sku: true, name: true } }, location: { select: { name: true } } },
      orderBy: [{ location: { name: 'asc' } }, { product: { name: 'asc' } }],
    });
  }
  create(body: CreateSupplierReceiptDto, key: string | undefined, actor: string) {
    if (new Set(body.items.map(i => i.productId)).size !== body.items.length)
      throw new BadRequestException('Cada producto debe aparecer una vez en el ingreso');
    return this.transactions.idempotent('supplier-receipt:' + actor, key, body, async tx => {
      await tx.location.findUniqueOrThrow({ where: { id: body.destinationId } });
      const products = await tx.product.findMany({ where: { id: { in: body.items.map(i => i.productId) } } });
      ensure(products.length === body.items.length, 'Uno o más productos no existen');
      const lines = body.items.map(i => {
        const product = products.find(p => p.id === i.productId)!;
        return { productId: product.id, unit: product.baseUnit,
          expected: measuredAmount(i.expected, product.baseUnit) };
      });
      const receipt = await tx.supplierReceipt.create({
        data: { supplier: body.supplier.trim(), reference: body.reference?.trim() || null,
          destinationId: body.destinationId, createdBy: actor, lines: { create: lines } },
        include: { lines: true },
      });
      await this.transactions.auditTx(tx, 'SUPPLIER_RECEIPT_OPENED', 'SupplierReceipt', receipt.id, actor, {
        supplier: receipt.supplier, locationId: body.destinationId,
        items: lines.map(l => ({ productId: l.productId, expected: l.expected.toString(), unit: l.unit })),
      });
      return receipt;
    });
  }

  private async addPhysical(tx: Tx, productId: string, locationId: string,
    unit: InventoryBaseUnit, accepted: Prisma.Decimal, blocked: Prisma.Decimal) {
    const physical = accepted.plus(blocked);
    if (unit === 'PIEZA') {
      return tx.stock.upsert({
        where: { productId_locationId: { productId, locationId } },
        create: { productId, locationId, physical: physical.toNumber(),
          blocked: blocked.toNumber(), version: 1 },
        update: { physical: { increment: physical.toNumber() },
          blocked: { increment: blocked.toNumber() }, version: { increment: 1 } },
      });
    }
    return tx.unitStock.upsert({
      where: { productId_locationId: { productId, locationId } },
      create: { productId, locationId, unit, physical, blocked, version: 1 },
      update: { physical: { increment: physical }, blocked: { increment: blocked },
        version: { increment: 1 } },
    });
  }

  inspect(id: string, body: InspectSupplierReceiptDto, key: string | undefined, actor: string) {
    if (new Set(body.items.map(i => i.receiptLineId)).size !== body.items.length)
      throw new BadRequestException('No repitas líneas en la inspección');
    const observedAt = new Date(body.observedAt);
    if (!Number.isFinite(observedAt.getTime()) || observedAt.getTime() > Date.now() + 5 * 60_000)
      throw new BadRequestException('Hora de recepción inválida');
    return this.transactions.idempotent('supplier-inspection:' + id, key, body, async tx => {
      const receipt = await tx.supplierReceipt.findUniqueOrThrow({
        where: { id }, include: { lines: true },
      });
      ensure(receipt.status !== 'INSPECTED', 'Ingreso ya inspeccionado por completo');
      const lines = body.items.map(item => {
        const line = receipt.lines.find(l => l.id === item.receiptLineId);
        ensure(line, 'La línea no pertenece a este ingreso');
        const presented = measuredAmount(item.presented, line.unit);
        const accepted = measuredAmount(item.accepted, line.unit, true);
        const blocked = measuredAmount(item.blocked, line.unit, true);
        ensure(accepted.plus(blocked).equals(presented),
          'Las cantidades aceptadas y bloqueadas deben sumar lo presentado');
        ensure(line.presented.plus(presented).lte(line.expected),
          'Presentado superior al saldo pendiente; registra excedente como incidencia');
        return { line, presented, accepted, blocked };
      });
      if (lines.some(l => l.blocked.gt(0)) && !body.notes?.trim())
        throw new BadRequestException('Explica la mercancía bloqueada por daño o revisión');
      const inspection = await tx.supplierInspection.create({
        data: { receiptId: id, observedAt, inspectedBy: actor,
          notes: body.notes?.trim() || null, evidenceRef: body.evidenceRef?.trim() || null,
          lines: { create: lines.map(({ line, presented, accepted, blocked }) => ({
            receiptLineId: line.id, presented, accepted, blocked,
          })) } }, include: { lines: true },
      });
      for (const entry of lines) {
        const { line, presented, accepted, blocked } = entry;
        const changed = await tx.supplierReceiptLine.updateMany({
          where: { id: line.id, presented: line.presented },
          data: { presented: { increment: presented }, accepted: { increment: accepted },
            blocked: { increment: blocked } },
        });
        ensure(changed.count === 1, 'La línea cambió durante la recepción');
        await this.addPhysical(tx, line.productId, receipt.destinationId, line.unit, accepted, blocked);
        if (blocked.gt(0)) {
          const inspectionLine = inspection.lines.find(l => l.receiptLineId === line.id);
          ensure(inspectionLine, 'Inspección vinculada no encontrada');
          const product = await tx.product.findUniqueOrThrow({ where: { id: line.productId } });
          const incident = await tx.incident.create({ data: {
            supplierReceiptId: id, supplierInspectionLineId: inspectionLine.id,
            type: 'RECEPCION_PROVEEDOR_BLOQUEADA',
            notes: 'Material en revisión: ' + blocked.toString() + ' ' + line.unit +
              '. ' + (body.notes || ''),
            sku: product.sku, custodian: actor, location: receipt.destinationId,
            evidence: body.evidenceRef || null, blocking: true,
          } });
          await this.transactions.auditTx(tx, 'SUPPLIER_INCIDENT_OPENED', 'Incident', incident.id, actor, {
            receiptId: id, inspectionId: inspection.id, productId: line.productId,
            blocked: blocked.toString(), unit: line.unit,
          });
        }
      }
      const allLines = await tx.supplierReceiptLine.findMany({ where: { receiptId: id } });
      const state = allLines.every(l => l.presented.gte(l.expected))
        ? 'INSPECTED' : 'PARTIAL';
      await tx.supplierReceipt.update({ where: { id }, data: { status: state } });
      await this.transactions.auditTx(tx, 'SUPPLIER_INSPECTION_RECORDED',
        'SupplierInspection', inspection.id, actor, {
          receiptId: id, supplier: receipt.supplier, locationId: receipt.destinationId,
          observedAt: body.observedAt, notes: body.notes || null,
          items: lines.map(l => ({
            productId: l.line.productId, unit: l.line.unit,
            presented: l.presented.toString(), accepted: l.accepted.toString(),
            blocked: l.blocked.toString(),
          })), countedAsAvailableOnlyWhenAccepted: true,
        });
      return inspection;
    });
  }

  returnBlocked(lineId: string, body: ReturnBlockedSupplierDto, key: string | undefined, actor: string) {
    return this.transactions.idempotent('supplier-return:' + lineId, key, body, async tx => {
      const line = await tx.supplierReceiptLine.findUniqueOrThrow({
        where: { id: lineId }, include: { receipt: true, returns: true },
      });
      const qty = measuredAmount(body.quantity, line.unit);
      const returned = line.returns.reduce((sum, r) => plus(sum, r.quantity), zero());
      ensure(qty.lte(line.blocked.minus(returned)),
        'La devolución supera la mercancía bloqueada pendiente');
      if (line.unit === 'PIEZA') {
        const stock = await tx.stock.findUniqueOrThrow({ where: {
          productId_locationId: { productId: line.productId, locationId: line.receipt.destinationId },
        } });
        ensure(stock.blocked >= qty.toNumber() && stock.physical >= qty.toNumber(),
          'Stock bloqueado insuficiente para devolución');
        const updated = await tx.stock.updateMany({ where: { id: stock.id, version: stock.version },
          data: { physical: { decrement: qty.toNumber() }, blocked: { decrement: qty.toNumber() },
            version: { increment: 1 } } });
        ensure(updated.count === 1, 'Stock modificado durante la devolución');
      } else {
        const stock = await tx.unitStock.findUniqueOrThrow({ where: {
          productId_locationId: { productId: line.productId, locationId: line.receipt.destinationId },
        } });
        ensure(stock.blocked.gte(qty) && stock.physical.gte(qty),
          'Stock bloqueado insuficiente para devolución');
        const updated = await tx.unitStock.updateMany({ where: { id: stock.id, version: stock.version },
          data: { physical: { decrement: qty }, blocked: { decrement: qty },
            version: { increment: 1 } } });
        ensure(updated.count === 1, 'Stock modificado durante la devolución');
      }
      const operation = await tx.supplierBlockedReturn.create({
        data: { receiptLineId: lineId, quantity: qty, reason: body.reason.trim(), returnedBy: actor },
      });
      await this.transactions.auditTx(tx, 'SUPPLIER_BLOCKED_RETURNED',
        'SupplierBlockedReturn', operation.id, actor, {
          receiptLineId: line.id, receiptId: line.receiptId, productId: line.productId,
          locationId: line.receipt.destinationId, quantity: qty.toString(), unit: line.unit,
          reason: body.reason.trim(), physicallyRemoved: true, availableNotIncreased: true,
          documentToAccountingRequired: true,
        });
      return operation;
    });
  }
}
