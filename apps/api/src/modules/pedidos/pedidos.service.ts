import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../shared/database/prisma.service';
import { TransactionService } from '../../shared/database/transaction.service';
import { ensure, uniqueItems } from '../../shared/domain/assertions';
import { PlanOrderDto, CreateOrderDto } from './dto/pedidos.dto';

@Injectable()
export class PedidosService {
  constructor(
    private readonly db: PrismaService,
    private readonly tx: TransactionService,
  ) {}

  history(id: string) {
    return this.db.auditEvent.findMany({
      where: {
        entity: 'CustomerOrder',
        entityId: id,
        type: { in: ['ORDER_CREATED', 'ORDER_PLANNED'] },
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
  }
  orders() {
    return this.db.customerOrder.findMany({
      include: { destination: true, lines: { include: { product: true } } },
      orderBy: [
        { priority: 'desc' },
        { dueAt: { sort: 'asc', nulls: 'last' } },
        { createdAt: 'asc' },
        { id: 'asc' },
      ],
    });
  }

  plan(id: string, body: PlanOrderDto, actor?: string) {
    return this.tx.transaction(async (tx) => {
      const before = await tx.customerOrder.findUnique({ where: { id } });
      if (!before) throw new NotFoundException('Pedido no encontrado');
      ensure(before.status !== 'CANCELLED', 'Pedido cancelado');
      ensure(body.priority || body.dueAt, 'Selecciona prioridad o compromiso');
      const order = await tx.customerOrder.update({
        where: { id },
        data: { priority: body.priority, dueAt: body.dueAt },
      });
      await this.tx.auditTx(tx, 'ORDER_PLANNED', 'CustomerOrder', id, actor, {
        reason: body.reason,
        before: { priority: before.priority, dueAt: before.dueAt },
        after: { priority: order.priority, dueAt: order.dueAt },
      });
      return order;
    });
  }

  async createOrder(body: CreateOrderDto, actor?: string) {
    uniqueItems(body.items);
    return this.tx.transaction(async (tx) => {
      const place = await tx.location.findUnique({
        where: { id: body.destinationId },
      });
      if (!place) throw new NotFoundException('Destino no encontrado');
      const order = await tx.customerOrder.create({
        data: {
          code: 'CL-' + randomUUID().slice(0, 8).toUpperCase(),
          priority: body.priority,
          dueAt: body.dueAt,
          customer: body.customer,
          destinationId: body.destinationId,
          lines: {
            create: body.items.map((i) => ({
              productId: i.productId,
              required: i.required,
            })),
          },
        },
        include: { lines: true },
      });
      await this.tx.auditTx(
        tx,
        'ORDER_CREATED',
        'CustomerOrder',
        order.id,
        actor,
        body,
      );
      return order;
    });
  }
}
