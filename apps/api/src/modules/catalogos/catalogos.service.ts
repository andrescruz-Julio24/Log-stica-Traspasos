import {inventorySource,hasFreshInventory} from '../../shared/domain/inventory-freshness';
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { TransactionService } from '../../shared/database/transaction.service';
import { CreateCatalogProductDto } from './dto/productos.dto';
import { PrismaService } from '../../shared/database/prisma.service';

@Injectable()
export class CatalogosService {
  constructor(private readonly db: PrismaService, private readonly tx: TransactionService) {}

  createProduct(body: CreateCatalogProductDto, key: string | undefined, actor: string) {
    return this.tx.idempotent('product-catalog:' + actor, key, body, async tx => {
      const product = await tx.product.create({ data: {
        sku: 'INT-' + randomUUID().slice(0, 12).toUpperCase(),
        name: body.name.trim(),
        variant: body.variant?.trim() || null,
        presentation: body.presentation?.trim() || null,
        externalLabel: body.externalLabel?.trim() || null,
        baseUnit: body.baseUnit,
      } });
      await this.tx.auditTx(tx, 'CATALOG_PRODUCT_CREATED', 'Product', product.id, actor, {
        internalCode: product.sku, name: product.name, unit: product.baseUnit,
        presentation: product.presentation, variant: product.variant,
        externalLabel: product.externalLabel,
      });
      return product;
    });
  }
  bootstrap() {
    return Promise.all([
      this.db.product.findMany({ orderBy: { name: 'asc' } }),
      this.db.location.findMany({ orderBy: { name: 'asc' } }),
      this.db.stock.findMany({
        include: { product: true, location: true },
        orderBy: { location: { name: 'asc' } },
      }),
    ]).then(([products, locations, stocks]) => ({
      products,
      locations,
      inventorySource:inventorySource(),
      stocks:stocks.map(stock=>({...stock,stale:!hasFreshInventory(stock.sourceCheckedAt)
      })),
    }));
  }
}
