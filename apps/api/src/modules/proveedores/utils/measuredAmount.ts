import { BadRequestException } from '@nestjs/common';
import { InventoryBaseUnit, Prisma } from '@prisma/client';

export function measuredAmount(input: string, unit: InventoryBaseUnit, allowZero = false) {
  if (typeof input !== 'string' || !/^\d{1,12}(\.\d{1,3})?$/.test(input))
    throw new BadRequestException('Cantidad inválida: usa decimal positivo con máximo tres cifras');
  const amount = new Prisma.Decimal(input);
  if (amount.isNegative() || (!allowZero && amount.isZero()))
    throw new BadRequestException('Cantidad debe ser mayor que cero');
  if (unit !== 'KG' && !amount.isInteger())
    throw new BadRequestException('PIEZA y CAJA requieren cantidades enteras');
  if (amount.gt('2147483647') && unit === 'PIEZA')
    throw new BadRequestException('Cantidad excede rango del inventario entero');
  return amount;
}
