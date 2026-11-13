import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';

@Injectable()
export class CatalogosService {
  constructor(private readonly db: PrismaService) {}

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
      inventorySource:
        process.env.SGTL_INVENTORY_SOURCE === 'ERP' ? 'ERP' : 'SGTL',
      stocks: stocks.map((stock) => ({
        ...stock,
        stale:
          process.env.SGTL_INVENTORY_SOURCE === 'ERP' &&
          (!stock.sourceCheckedAt ||
            Date.now() - stock.sourceCheckedAt.getTime() >
              Number(process.env.SGTL_ERP_MAX_AGE_MINUTES || 15) * 60000),
      })),
    }));
  }
}
