import { Injectable } from '@nestjs/common';
import type {
  Prisma,
  Promotion,
  PromotionScope,
  PromotionStacking,
  PromotionStatus,
  PromotionTarget,
  PromotionTargetKind,
  PromotionType,
} from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import {
  applyPromotions,
  type PromotionRule,
} from '../../domain/promocoes/apply-promotions';
import {
  assertValidPeriod,
  derivePromotionStatus,
} from '../../domain/promocoes/promotion-status';
import {
  ProductNotFoundError,
  PromotionNotFoundError,
  PromotionValidationError,
} from '../../domain/cart/errors';

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

const EXPIRING_MS = 7 * 24 * 60 * 60 * 1000;

type PromotionWithTargets = Promotion & { targets: PromotionTarget[] };

type UpsertInput = {
  name: string;
  description?: string | null;
  type: PromotionType;
  scope: PromotionScope;
  stacking: PromotionStacking;
  priority: number;
  percentOff?: number | null;
  amountOff?: number | null;
  promoPrice?: number | null;
  minCartValue?: number | null;
  minQuantity?: number | null;
  maxQtyPerSale?: number | null;
  startsAt: string;
  endsAt: string;
  targetIds?: string[];
};

@Injectable()
export class PromocaoService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard() {
    const now = new Date();
    const expiringUntil = new Date(now.getTime() + EXPIRING_MS);
    const published: PromotionStatus = 'PUBLISHED';

    const [active, scheduled, expiring, expired, productRows] =
      await Promise.all([
        this.prisma.promotion.count({
          where: {
            status: published,
            startsAt: { lte: now },
            endsAt: { gte: now },
          },
        }),
        this.prisma.promotion.count({
          where: { status: published, startsAt: { gt: now } },
        }),
        this.prisma.promotion.count({
          where: {
            status: published,
            startsAt: { lte: now },
            endsAt: { gte: now, lte: expiringUntil },
          },
        }),
        this.prisma.promotion.count({
          where: { status: published, endsAt: { lt: now } },
        }),
        this.countPromotionalProducts(now),
      ]);

    return {
      active,
      scheduled,
      expiring,
      expired,
      promotionalProducts: productRows,
      permissions: this.permissions(),
    };
  }

  async list(search?: string, status?: string) {
    const now = new Date();
    const rows = await this.prisma.promotion.findMany({
      where: {
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: { targets: true, _count: { select: { targets: true } } },
      orderBy: [{ priority: 'asc' }, { startsAt: 'desc' }],
    });

    const mapped = rows.map((row) => this.mapListItem(row, now));
    if (!status) return { items: mapped, permissions: this.permissions() };
    return {
      items: mapped.filter((item) => item.derivedStatus === status),
      permissions: this.permissions(),
    };
  }

  async get(id: string) {
    const row = await this.prisma.promotion.findUnique({
      where: { id },
      include: { targets: true },
    });
    if (!row) throw new PromotionNotFoundError();
    return this.mapDetail(row);
  }

  async create(actorId: string, input: UpsertInput) {
    const data = this.validateInput(input);
    const created = await this.prisma.promotion.create({
      data: {
        ...data.fields,
        targets: { create: data.targets },
      },
      include: { targets: true },
    });
    await this.audit(
      actorId,
      created.id,
      'CREATE',
      null,
      this.snapshot(created),
    );
    return this.mapDetail(created);
  }

  async update(actorId: string, id: string, input: UpsertInput) {
    const current = await this.prisma.promotion.findUnique({
      where: { id },
      include: { targets: true },
    });
    if (!current) throw new PromotionNotFoundError();
    if (current.status === 'CANCELLED') {
      throw new PromotionValidationError(
        'Promoção cancelada não pode ser editada.',
        'PROMOTION_CANCELLED',
      );
    }
    const data = this.validateInput(input);
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.promotionTarget.deleteMany({ where: { promotionId: id } });
      return tx.promotion.update({
        where: { id },
        data: {
          ...data.fields,
          targets: { create: data.targets },
        },
        include: { targets: true },
      });
    });
    await this.audit(
      actorId,
      id,
      'UPDATE',
      this.snapshot(current),
      this.snapshot(updated),
    );
    return this.mapDetail(updated);
  }

  async publish(actorId: string, id: string) {
    return this.transition(actorId, id, 'PUBLISHED', 'ACTIVATE', [
      'DRAFT',
      'PAUSED',
    ]);
  }

  async pause(actorId: string, id: string) {
    return this.transition(actorId, id, 'PAUSED', 'PAUSE', ['PUBLISHED']);
  }

  async cancel(actorId: string, id: string) {
    return this.transition(actorId, id, 'CANCELLED', 'CANCEL', [
      'DRAFT',
      'PUBLISHED',
      'PAUSED',
    ]);
  }

  async remove(actorId: string, id: string) {
    const current = await this.prisma.promotion.findUnique({
      where: { id },
      include: { targets: true },
    });
    if (!current) throw new PromotionNotFoundError();
    if (current.status !== 'DRAFT') {
      throw new PromotionValidationError(
        'Só é possível excluir promoções em rascunho.',
        'PROMOTION_NOT_DRAFT',
      );
    }
    await this.prisma.promotion.delete({ where: { id } });
    await this.audit(actorId, null, 'DELETE', this.snapshot(current), null);
    return { ok: true };
  }

  async lookups() {
    const [categories, brands] = await Promise.all([
      this.prisma.stockCategory.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
      }),
      this.prisma.stockBrand.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
      }),
    ]);
    return { categories, brands };
  }

  async simulate(input: {
    stockItemId: string;
    quantity: number;
    promotionId?: string;
  }) {
    const product = await this.prisma.stockItem.findUnique({
      where: { id: input.stockItemId },
    });
    if (!product) throw new ProductNotFoundError();
    const unitPrice = decOrNull(product.salePrice) ?? 0;
    const line = {
      lineId: 'SIM',
      stockItemId: product.id,
      categoryId: product.categoryId,
      brandId: product.brandId,
      quantity: input.quantity,
      unitPrice,
      manualDiscount: false,
    };
    const rules = input.promotionId
      ? await this.loadRulesByIds([input.promotionId])
      : await this.loadActiveRules(new Date());
    const result = applyPromotions({
      lines: [line],
      cartDiscountManual: false,
      rules,
    });
    const original = Math.round(input.quantity * unitPrice * 10000) / 10000;
    const discount = result.totalDiscount;
    return {
      product: {
        id: product.id,
        code: product.code,
        description: product.description,
        unitPrice,
      },
      quantity: input.quantity,
      original,
      discount,
      final: Math.max(0, original - discount),
      applied: result.applied,
    };
  }

  async applyToCart(cart: {
    id: string;
    cartDiscount: unknown;
    cartDiscountManual: boolean;
    items: Array<{
      id: string;
      stockItemId: string;
      quantity: unknown;
      unitPrice: unknown;
      lineDiscount: unknown;
      lineDiscountManual: boolean;
      stockItem: {
        categoryId: string | null;
        brandId: string | null;
      };
    }>;
  }) {
    const rules = await this.loadActiveRules(new Date());
    const result = applyPromotions({
      lines: cart.items.map((item) => ({
        lineId: item.id,
        stockItemId: item.stockItemId,
        categoryId: item.stockItem.categoryId,
        brandId: item.stockItem.brandId,
        quantity: dec(item.quantity),
        unitPrice: dec(item.unitPrice),
        manualDiscount: item.lineDiscountManual,
      })),
      cartDiscountManual: cart.cartDiscountManual,
      rules,
    });

    await this.prisma.$transaction(async (tx) => {
      for (const item of cart.items) {
        if (item.lineDiscountManual) continue;
        const next = result.lineDiscounts[item.id] ?? 0;
        if (Math.abs(dec(item.lineDiscount) - next) <= 0.0001) continue;
        await tx.saleCartItem.update({
          where: { id: item.id },
          data: { lineDiscount: next },
        });
      }
      if (!cart.cartDiscountManual) {
        if (Math.abs(dec(cart.cartDiscount) - result.cartDiscount) > 0.0001) {
          await tx.saleCart.update({
            where: { id: cart.id },
            data: { cartDiscount: result.cartDiscount },
          });
        }
      }
      await tx.saleCartAppliedPromotion.deleteMany({
        where: { cartId: cart.id },
      });
      if (result.applied.length > 0) {
        await tx.saleCartAppliedPromotion.createMany({
          data: result.applied.map((row) => ({
            cartId: cart.id,
            promotionId: row.promotionId,
            lineId: row.lineId,
            amount: row.amount,
          })),
        });
      }
    });

    return result;
  }

  private permissions() {
    return {
      canView: true,
      canCreate: true,
      canEdit: true,
      canActivate: true,
      canPause: true,
      canCancel: true,
      canDelete: true,
      canApplyManualDiscount: true,
      canApproveDiscount: true,
    };
  }

  private async transition(
    actorId: string,
    id: string,
    next: PromotionStatus,
    action: string,
    allowed: PromotionStatus[],
  ) {
    const current = await this.prisma.promotion.findUnique({
      where: { id },
      include: { targets: true },
    });
    if (!current) throw new PromotionNotFoundError();
    if (!allowed.includes(current.status)) {
      throw new PromotionValidationError(
        'Transição de status inválida.',
        'INVALID_STATUS_TRANSITION',
      );
    }
    const updated = await this.prisma.promotion.update({
      where: { id },
      data: { status: next },
      include: { targets: true },
    });
    await this.audit(
      actorId,
      id,
      action,
      this.snapshot(current),
      this.snapshot(updated),
    );
    return this.mapDetail(updated);
  }

  private validateInput(input: UpsertInput) {
    const startsAt = new Date(input.startsAt);
    const endsAt = new Date(input.endsAt);
    try {
      assertValidPeriod(startsAt, endsAt);
    } catch {
      throw new PromotionValidationError(
        'Período inválido: início deve ser anterior ao fim.',
        'INVALID_PERIOD',
      );
    }

    if (input.type === 'PERCENT') {
      if (input.percentOff == null || input.percentOff <= 0) {
        throw new PromotionValidationError(
          'Informe o percentual de desconto.',
          'INVALID_PERCENT',
        );
      }
    }
    if (
      input.type === 'FIXED' &&
      (input.amountOff == null || input.amountOff <= 0)
    ) {
      throw new PromotionValidationError(
        'Informe o valor fixo de desconto.',
        'INVALID_AMOUNT',
      );
    }
    if (input.type === 'PROMO_PRICE' && input.promoPrice == null) {
      throw new PromotionValidationError(
        'Informe o preço promocional.',
        'INVALID_PROMO_PRICE',
      );
    }
    if (input.type === 'MIN_PURCHASE') {
      if (input.minCartValue == null || input.minCartValue <= 0) {
        throw new PromotionValidationError(
          'Informe o valor mínimo da compra.',
          'INVALID_MIN_CART',
        );
      }
      if (
        (input.percentOff == null || input.percentOff <= 0) &&
        (input.amountOff == null || input.amountOff <= 0)
      ) {
        throw new PromotionValidationError(
          'Informe percentual ou valor fixo para a promoção de valor mínimo.',
          'INVALID_MIN_CART_REWARD',
        );
      }
    }

    const targetIds = [...new Set(input.targetIds ?? [])];
    if (input.scope === 'ALL' && targetIds.length > 0) {
      throw new PromotionValidationError(
        'Promoção para todos os produtos não aceita alvos.',
        'INVALID_SCOPE',
      );
    }
    if (input.scope !== 'ALL' && targetIds.length === 0) {
      throw new PromotionValidationError(
        'Selecione ao menos um alvo para a abrangência.',
        'INVALID_SCOPE',
      );
    }

    const kind: PromotionTargetKind | null =
      input.scope === 'PRODUCTS'
        ? 'PRODUCT'
        : input.scope === 'CATEGORIES'
          ? 'CATEGORY'
          : input.scope === 'BRANDS'
            ? 'BRAND'
            : null;

    const targets: Array<{ kind: PromotionTargetKind; targetId: string }> = kind
      ? targetIds.map((targetId) => ({ kind, targetId }))
      : [];

    return {
      fields: {
        name: input.name.trim(),
        description: input.description?.trim() || null,
        type: input.type,
        scope: input.scope,
        stacking: input.stacking,
        priority: input.priority,
        percentOff: input.percentOff ?? null,
        amountOff: input.amountOff ?? null,
        promoPrice: input.promoPrice ?? null,
        minCartValue: input.minCartValue ?? null,
        minQuantity: input.minQuantity ?? null,
        maxQtyPerSale: input.maxQtyPerSale ?? null,
        startsAt,
        endsAt,
      },
      targets,
    };
  }

  private async loadActiveRules(now: Date): Promise<PromotionRule[]> {
    const rows = await this.prisma.promotion.findMany({
      where: {
        status: 'PUBLISHED',
        startsAt: { lte: now },
        endsAt: { gte: now },
      },
      include: { targets: true },
    });
    return rows.map((row) => this.toRule(row));
  }

  private async loadRulesByIds(ids: string[]): Promise<PromotionRule[]> {
    const rows = await this.prisma.promotion.findMany({
      where: { id: { in: ids } },
      include: { targets: true },
    });
    return rows.map((row) => this.toRule(row));
  }

  private toRule(row: PromotionWithTargets): PromotionRule {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      scope: row.scope,
      targetIds: row.targets.map((t) => t.targetId),
      stacking: row.stacking,
      priority: row.priority,
      percentOff: decOrNull(row.percentOff),
      amountOff: decOrNull(row.amountOff),
      promoPrice: decOrNull(row.promoPrice),
      minCartValue: decOrNull(row.minCartValue),
      minQuantity: decOrNull(row.minQuantity),
      maxQtyPerSale: decOrNull(row.maxQtyPerSale),
    };
  }

  private mapListItem(
    row: PromotionWithTargets & { _count?: { targets: number } },
    now: Date,
  ) {
    const derivedStatus = derivePromotionStatus({
      status: row.status,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      now,
    });
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      scope: row.scope,
      stacking: row.stacking,
      status: row.status,
      derivedStatus,
      priority: row.priority,
      startsAt: row.startsAt.toISOString(),
      endsAt: row.endsAt.toISOString(),
      productCount: row._count?.targets ?? row.targets.length,
    };
  }

  private mapDetail(row: PromotionWithTargets) {
    const now = new Date();
    return {
      ...this.mapListItem(row, now),
      description: row.description,
      percentOff: decOrNull(row.percentOff),
      amountOff: decOrNull(row.amountOff),
      promoPrice: decOrNull(row.promoPrice),
      minCartValue: decOrNull(row.minCartValue),
      minQuantity: decOrNull(row.minQuantity),
      maxQtyPerSale: decOrNull(row.maxQtyPerSale),
      targetIds: row.targets.map((t) => t.targetId),
    };
  }

  private snapshot(row: PromotionWithTargets) {
    return {
      id: row.id,
      name: row.name,
      status: row.status,
      type: row.type,
      scope: row.scope,
      stacking: row.stacking,
      priority: row.priority,
      startsAt: row.startsAt.toISOString(),
      endsAt: row.endsAt.toISOString(),
      targetIds: row.targets.map((t) => t.targetId),
    };
  }

  private async audit(
    actorId: string,
    promotionId: string | null,
    action: string,
    beforeJson: Prisma.InputJsonValue | null,
    afterJson: Prisma.InputJsonValue | null,
  ) {
    await this.prisma.promotionAuditLog.create({
      data: {
        actorId,
        promotionId,
        action,
        beforeJson: beforeJson ?? undefined,
        afterJson: afterJson ?? undefined,
      },
    });
  }

  private async countPromotionalProducts(now: Date) {
    const active = await this.prisma.promotion.findMany({
      where: {
        status: 'PUBLISHED',
        startsAt: { lte: now },
        endsAt: { gte: now },
      },
      include: { targets: true },
    });
    const ids = new Set<string>();
    let all = false;
    const categoryIds: string[] = [];
    const brandIds: string[] = [];
    for (const promo of active) {
      if (promo.scope === 'ALL') {
        all = true;
        break;
      }
      if (promo.scope === 'PRODUCTS') {
        for (const t of promo.targets) ids.add(t.targetId);
      }
      if (promo.scope === 'CATEGORIES') {
        categoryIds.push(...promo.targets.map((t) => t.targetId));
      }
      if (promo.scope === 'BRANDS') {
        brandIds.push(...promo.targets.map((t) => t.targetId));
      }
    }
    if (all) {
      return this.prisma.stockItem.count({ where: { status: 'ACTIVE' } });
    }
    if (categoryIds.length || brandIds.length) {
      const extra = await this.prisma.stockItem.findMany({
        where: {
          status: 'ACTIVE',
          OR: [
            categoryIds.length
              ? { categoryId: { in: categoryIds } }
              : undefined,
            brandIds.length ? { brandId: { in: brandIds } } : undefined,
          ].filter(Boolean) as Prisma.StockItemWhereInput[],
        },
        select: { id: true },
      });
      for (const row of extra) ids.add(row.id);
    }
    return ids.size;
  }
}
