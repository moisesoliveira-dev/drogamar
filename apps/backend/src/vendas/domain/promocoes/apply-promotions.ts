export type PromotionType =
  'PERCENT' | 'FIXED' | 'PROMO_PRICE' | 'MIN_PURCHASE';

export type PromotionScope = 'ALL' | 'PRODUCTS' | 'CATEGORIES' | 'BRANDS';
export type PromotionStacking = 'STACKABLE' | 'EXCLUSIVE';

export type PromotionRule = {
  id: string;
  name: string;
  type: PromotionType;
  scope: PromotionScope;
  targetIds: string[];
  stacking: PromotionStacking;
  priority: number;
  percentOff: number | null;
  amountOff: number | null;
  promoPrice: number | null;
  minCartValue: number | null;
  minQuantity: number | null;
  maxQtyPerSale: number | null;
};

export type PromoLine = {
  lineId: string;
  stockItemId: string;
  categoryId: string | null;
  brandId: string | null;
  quantity: number;
  unitPrice: number;
  manualDiscount: boolean;
};

export type AppliedPromotion = {
  promotionId: string;
  name: string;
  type: PromotionType;
  amount: number;
  lineId: string | null;
};

export type ApplyPromotionsResult = {
  lineDiscounts: Record<string, number>;
  cartDiscount: number;
  applied: AppliedPromotion[];
  totalDiscount: number;
};

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

function lineGross(line: PromoLine): number {
  return roundMoney(line.quantity * line.unitPrice);
}

function eligibleQty(rule: PromotionRule, line: PromoLine): number {
  if (rule.minQuantity != null && line.quantity + 1e-9 < rule.minQuantity) {
    return 0;
  }
  if (rule.maxQtyPerSale == null) return line.quantity;
  return Math.min(line.quantity, rule.maxQtyPerSale);
}

export function ruleMatchesLine(rule: PromotionRule, line: PromoLine): boolean {
  if (line.manualDiscount) return false;
  if (eligibleQty(rule, line) <= 0) return false;
  if (rule.scope === 'ALL') return true;
  if (rule.scope === 'PRODUCTS')
    return rule.targetIds.includes(line.stockItemId);
  if (rule.scope === 'CATEGORIES') {
    return Boolean(line.categoryId && rule.targetIds.includes(line.categoryId));
  }
  if (rule.scope === 'BRANDS') {
    return Boolean(line.brandId && rule.targetIds.includes(line.brandId));
  }
  return false;
}

function lineDiscountForRule(rule: PromotionRule, line: PromoLine): number {
  if (rule.type === 'MIN_PURCHASE') return 0;
  if (!ruleMatchesLine(rule, line)) return 0;
  const qty = eligibleQty(rule, line);
  const gross = roundMoney(qty * line.unitPrice);
  if (gross <= 0) return 0;

  if (rule.type === 'PERCENT') {
    const pct = Math.min(100, Math.max(0, rule.percentOff ?? 0));
    return roundMoney(Math.min(gross, (gross * pct) / 100));
  }
  if (rule.type === 'FIXED') {
    return roundMoney(Math.min(gross, Math.max(0, rule.amountOff ?? 0)));
  }
  if (rule.type === 'PROMO_PRICE') {
    const promo = rule.promoPrice ?? 0;
    if (promo < 0) return 0;
    return roundMoney(
      Math.min(gross, Math.max(0, (line.unitPrice - promo) * qty)),
    );
  }
  return 0;
}

function cartDiscountForRule(
  rule: PromotionRule,
  itemsGross: number,
  remaining: number,
): number {
  if (rule.type !== 'MIN_PURCHASE') return 0;
  const min = rule.minCartValue ?? 0;
  if (itemsGross + 1e-9 < min) return 0;
  if (rule.percentOff != null) {
    const pct = Math.min(100, Math.max(0, rule.percentOff));
    return roundMoney(Math.min(remaining, (itemsGross * pct) / 100));
  }
  return roundMoney(Math.min(remaining, Math.max(0, rule.amountOff ?? 0)));
}

function applyRuleSet(
  rules: PromotionRule[],
  lines: PromoLine[],
  cartDiscountManual: boolean,
): ApplyPromotionsResult {
  const ordered = [...rules].sort((a, b) => a.priority - b.priority);
  const lineDiscounts: Record<string, number> = {};
  for (const line of lines) lineDiscounts[line.lineId] = 0;
  let cartDiscount = 0;
  const applied: AppliedPromotion[] = [];
  const itemsGross = roundMoney(lines.reduce((s, l) => s + lineGross(l), 0));

  for (const rule of ordered) {
    if (rule.type === 'MIN_PURCHASE') {
      if (cartDiscountManual) continue;
      const remaining = roundMoney(
        Math.max(0, itemsGross - cartDiscount - sumLines(lineDiscounts)),
      );
      const amount = cartDiscountForRule(rule, itemsGross, remaining);
      if (amount <= 0) continue;
      cartDiscount = roundMoney(cartDiscount + amount);
      applied.push({
        promotionId: rule.id,
        name: rule.name,
        type: rule.type,
        amount,
        lineId: null,
      });
      continue;
    }

    for (const line of lines) {
      const extra = lineDiscountForRule(rule, line);
      if (extra <= 0) continue;
      const remaining = roundMoney(
        Math.max(0, lineGross(line) - lineDiscounts[line.lineId]),
      );
      const amount = roundMoney(Math.min(remaining, extra));
      if (amount <= 0) continue;
      lineDiscounts[line.lineId] = roundMoney(
        lineDiscounts[line.lineId] + amount,
      );
      applied.push({
        promotionId: rule.id,
        name: rule.name,
        type: rule.type,
        amount,
        lineId: line.lineId,
      });
    }
  }

  const totalDiscount = roundMoney(sumLines(lineDiscounts) + cartDiscount);
  return { lineDiscounts, cartDiscount, applied, totalDiscount };
}

function sumLines(map: Record<string, number>): number {
  return roundMoney(Object.values(map).reduce((s, v) => s + v, 0));
}

/**
 * STACKABLE acumulam por prioridade.
 * EXCLUSIVE competem entre si; vence o maior desconto total.
 * No fim, compara o pacote stackable com o melhor exclusive.
 */
export function applyPromotions(input: {
  lines: PromoLine[];
  cartDiscountManual: boolean;
  rules: PromotionRule[];
}): ApplyPromotionsResult {
  const empty: ApplyPromotionsResult = {
    lineDiscounts: Object.fromEntries(input.lines.map((l) => [l.lineId, 0])),
    cartDiscount: 0,
    applied: [],
    totalDiscount: 0,
  };
  if (input.rules.length === 0) return empty;

  const stackable = input.rules.filter((r) => r.stacking === 'STACKABLE');
  const exclusive = input.rules.filter((r) => r.stacking === 'EXCLUSIVE');

  const stacked = applyRuleSet(
    stackable,
    input.lines,
    input.cartDiscountManual,
  );
  let bestExclusive = empty;
  for (const rule of exclusive) {
    const result = applyRuleSet([rule], input.lines, input.cartDiscountManual);
    if (result.totalDiscount > bestExclusive.totalDiscount + 1e-9) {
      bestExclusive = result;
    }
  }

  if (bestExclusive.totalDiscount > stacked.totalDiscount + 1e-9) {
    return bestExclusive;
  }
  return stacked;
}

export const OPERATOR_MANUAL_DISCOUNT_LIMIT_PERCENT = 10;

export function manualDiscountNeedsApproval(
  cartDiscount: number,
  itemsGross: number,
  limitPercent = OPERATOR_MANUAL_DISCOUNT_LIMIT_PERCENT,
): boolean {
  if (itemsGross <= 0) return cartDiscount > 0;
  return (cartDiscount / itemsGross) * 100 - limitPercent > 1e-9;
}
