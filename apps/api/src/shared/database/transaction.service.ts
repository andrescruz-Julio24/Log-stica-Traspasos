import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { PrismaService } from './prisma.service';
import { ensure } from '../domain/assertions';

export type Tx = Prisma.TransactionClient;
function actorName(value?: string) {
  return (value || 'operador-demo').slice(0, 80);
}
function fingerprint(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

@Injectable()
export class TransactionService {
  constructor(private readonly db: PrismaService) {}
  async auditTx(
    tx: Tx,
    type: string,
    entity: string,
    entityId: string,
    actor?: string,
    data: unknown = {},
  ) {
    await tx.auditEvent.create({
      data: {
        type,
        entity,
        entityId,
        actor: actorName(actor),
        data: data as Prisma.InputJsonValue,
      },
    });
  }
  async transaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await this.db.$transaction(fn, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          timeout: 15000,
        });
      } catch (e: any) {
        if (e.code === 'P2034') {
          if (attempt < 2) continue;
          throw new ConflictException(
            'Conflicto de concurrencia: vuelve a intentar',
          );
        }
        if (e.code === 'P2025')
          throw new BadRequestException('Registro inexistente');
        if (e.code === 'P2003')
          throw new BadRequestException('Una referencia indicada no existe');
        if (e.code === 'P2002')
          throw new ConflictException('Folio o clave duplicada');
        throw e;
      }
    }
    throw new ConflictException('Conflicto de concurrencia: vuelve a intentar');
  }
  async idempotent<T>(
    operation: string,
    key: string | undefined,
    payload: unknown,
    fn: (tx: Tx) => Promise<T>,
  ): Promise<T> {
    if (!key || key.length > 120)
      throw new BadRequestException(
        'Se requiere Idempotency-Key (máximo 120 caracteres)',
      );
    const id = operation + ':' + key;
    const hash = fingerprint(payload);
    const cached = await this.db.idempotencyRecord.findUnique({
      where: { key: id },
    });
    if (cached) {
      const result = cached.result as any;
      ensure(
        result.hash === hash,
        'Idempotency-Key reutilizada con contenido diferente',
      );
      return result.response as T;
    }
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await this.db.$transaction(
          async (tx) => {
            // Reclamar la clave antes de evaluar saldos que el primer intento pudo modificar.
            await tx.idempotencyRecord.create({
              data: { key: id, operation, result: { hash } },
            });
            const response = await fn(tx);
            await tx.idempotencyRecord.update({
              where: { key: id },
              data: { result: { hash, response } as Prisma.InputJsonValue },
            });
            return response;
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            timeout: 15000,
          },
        );
      } catch (e: any) {
        if (e.code === 'P2002' || e.code === 'P2034') {
          const recorded = await this.db.idempotencyRecord.findUnique({
            where: { key: id },
          });
          if (recorded) {
            const result = recorded.result as any;
            ensure(
              result.hash === hash,
              'Idempotency-Key reutilizada con contenido diferente',
            );
            return result.response as T;
          }
          if (attempt < 2) continue;
          throw new ConflictException(
            'Conflicto de concurrencia; reintenta la operación',
          );
        }
        throw e;
      }
    }
    throw new ConflictException('No se pudo confirmar la operación');
  }
}
