import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { parseSearchIntent } from '../../domain/busca-ia/parse-search-intent';
import type { SearchIntent } from '../../domain/busca-ia/search-intent';
import { OpenAiLlmIntentParser } from '../../infrastructure/openai-llm-intent.parser';

function dec(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'object' && value !== null && 'toNumber' in value) {
    return (value as { toNumber: () => number }).toNumber();
  }
  return Number(value);
}

function decOrNull(value: unknown): number | null {
  if (value == null) return null;
  return dec(value);
}

export type CatalogSearchItem = {
  id: string;
  code: string;
  description: string;
  sku: string | null;
  barcode: string | null;
  salePrice: number | null;
  currentStock: number;
  trackStock: boolean;
  unitCode: string | null;
  categoryName: string | null;
  brandName: string | null;
  imageUrl: string | null;
  hasValidPrice: boolean;
  outOfStock: boolean;
  canAdd: boolean;
};

@Injectable()
export class BuscaIaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly llm: OpenAiLlmIntentParser,
  ) {}

  llmStatus() {
    return { available: this.llm.enabled };
  }

  async search(input: { query: string; page?: number; pageSize?: number }) {
    const query = input.query.trim();
    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(50, Math.max(1, input.pageSize ?? 20));

    if (!query) {
      return this.emptyResult(query, emptyLocalIntent(query), page, pageSize);
    }

    const hints = await this.loadHints();
    let source: 'llm' | 'local' = 'local';
    let intent = parseSearchIntent(query);

    if (this.llm.enabled) {
      const llmIntent = await this.llm.parse(query, hints);
      if (llmIntent) {
        intent = llmIntent;
        source = 'llm';
      }
    }

    const result = await this.queryCatalog(intent, page, pageSize);
    const message =
      result.total === 0
        ? 'Não encontrei produtos que correspondam à sua busca.'
        : `Encontrei ${result.total} produto(s) a partir da sua pergunta.`;

    return {
      query,
      source,
      llmAvailable: this.llm.enabled,
      interpreted: intent,
      message,
      ...result,
    };
  }

  private async loadHints() {
    const [categories, brands] = await Promise.all([
      this.prisma.stockCategory.findMany({
        where: { active: true },
        select: { name: true },
        orderBy: { name: 'asc' },
        take: 40,
      }),
      this.prisma.stockBrand.findMany({
        where: { active: true },
        select: { name: true },
        orderBy: { name: 'asc' },
        take: 40,
      }),
    ]);
    return {
      categories: categories.map((c) => c.name),
      brands: brands.map((b) => b.name),
    };
  }

  private async queryCatalog(
    intent: SearchIntent,
    page: number,
    pageSize: number,
  ) {
    const and: Prisma.StockItemWhereInput[] = [
      { status: 'ACTIVE' },
      { itemType: { in: ['PRODUCT', 'OTHER', 'SERVICE'] } },
    ];

    if (intent.search) {
      const q = intent.search;
      and.push({
        OR: [
          { code: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { sku: { contains: q, mode: 'insensitive' } },
          { barcode: { contains: q, mode: 'insensitive' } },
          { complementaryDescription: { contains: q, mode: 'insensitive' } },
        ],
      });
    }

    if (intent.categoryName) {
      and.push({
        category: {
          is: {
            active: true,
            name: { contains: intent.categoryName, mode: 'insensitive' },
          },
        },
      });
    }

    if (intent.brandName) {
      and.push({
        brand: {
          is: {
            active: true,
            name: { contains: intent.brandName, mode: 'insensitive' },
          },
        },
      });
    }

    const priceFilter: Prisma.DecimalNullableFilter = {};
    if (intent.priceMin != null) priceFilter.gte = intent.priceMin;
    if (intent.priceMax != null) priceFilter.lte = intent.priceMax;
    if (intent.priceMin != null || intent.priceMax != null) {
      and.push({ salePrice: priceFilter });
    }

    if (intent.inStock) {
      and.push({
        OR: [{ trackStock: false }, { currentStock: { gt: 0 } }],
      });
    }

    const where: Prisma.StockItemWhereInput = { AND: and };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.stockItem.count({ where }),
      this.prisma.stockItem.findMany({
        where,
        include: {
          saleUnit: true,
          measureUnit: true,
          category: true,
          brand: true,
        },
        orderBy: { description: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const items: CatalogSearchItem[] = rows.map((p) => {
      const salePrice = decOrNull(p.salePrice);
      const currentStock = dec(p.currentStock);
      const outOfStock = p.trackStock && currentStock <= 0;
      const hasValidPrice = salePrice != null && salePrice > 0;
      return {
        id: p.id,
        code: p.code,
        description: p.description,
        sku: p.sku,
        barcode: p.barcode,
        salePrice,
        currentStock,
        trackStock: p.trackStock,
        unitCode: p.saleUnit?.code ?? p.measureUnit?.code ?? null,
        categoryName: p.category?.name ?? null,
        brandName: p.brand?.name ?? null,
        imageUrl: null,
        hasValidPrice,
        outOfStock,
        canAdd: hasValidPrice && !outOfStock && p.status === 'ACTIVE',
      };
    });

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  private emptyResult(
    query: string,
    intent: SearchIntent,
    page: number,
    pageSize: number,
  ) {
    return {
      query,
      source: 'local' as const,
      llmAvailable: this.llm.enabled,
      interpreted: intent,
      message: 'Informe o que você procura.',
      items: [] as CatalogSearchItem[],
      total: 0,
      page,
      pageSize,
      totalPages: 1,
    };
  }
}

function emptyLocalIntent(raw: string): SearchIntent {
  return parseSearchIntent(raw);
}
