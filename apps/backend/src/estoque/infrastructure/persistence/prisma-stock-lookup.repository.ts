import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import type {
  StockLookupRepository,
  StockLookups,
} from '../../domain/ports/stock-lookup.repository';

const ITEM_TYPE_LABELS: Record<string, string> = {
  PRODUCT: 'Produto',
  RAW_MATERIAL: 'Matéria-prima',
  PACKAGING: 'Embalagem',
  SERVICE: 'Serviço',
  OTHER: 'Outro',
};

@Injectable()
export class PrismaStockLookupRepository implements StockLookupRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getLookups(): Promise<StockLookups> {
    const [categories, brands, locations, units] = await Promise.all([
      this.prisma.stockCategory.findMany({
        where: { active: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.stockBrand.findMany({
        where: { active: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.stockLocation.findMany({
        where: { active: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.unitOfMeasure.findMany({
        where: { active: true },
        orderBy: { code: 'asc' },
      }),
    ]);

    return {
      categories: categories.map((c) => ({ id: c.id, label: c.name })),
      brands: brands.map((b) => ({ id: b.id, label: b.name })),
      locations: locations.map((l) => ({ id: l.id, label: l.name })),
      units: units.map((u) => ({
        id: u.id,
        label: `${u.code} — ${u.label}`,
        code: u.code,
      })),
      itemTypes: Object.entries(ITEM_TYPE_LABELS).map(([id, label]) => ({
        id,
        label,
      })),
    };
  }
}
