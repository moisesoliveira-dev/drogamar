import {
  applyPromotions,
  manualDiscountNeedsApproval,
} from './apply-promotions';
import { derivePromotionStatus } from './promotion-status';

const line = {
  lineId: 'L1',
  stockItemId: 'P1',
  categoryId: 'C1',
  brandId: 'B1',
  quantity: 2,
  unitPrice: 50,
  manualDiscount: false,
};

const percent = {
  id: 'A',
  name: '10% OFF',
  type: 'PERCENT' as const,
  scope: 'ALL' as const,
  targetIds: [],
  stacking: 'STACKABLE' as const,
  priority: 1,
  percentOff: 10,
  amountOff: null,
  promoPrice: null,
  minCartValue: null,
  minQuantity: null,
  maxQtyPerSale: null,
};

describe('applyPromotions', () => {
  it('aplica percentual na linha', () => {
    const result = applyPromotions({
      lines: [line],
      cartDiscountManual: false,
      rules: [percent],
    });
    expect(result.lineDiscounts.L1).toBe(10);
    expect(result.totalDiscount).toBe(10);
  });

  it('preço promocional vira desconto sem mudar unitPrice', () => {
    const result = applyPromotions({
      lines: [line],
      cartDiscountManual: false,
      rules: [
        {
          ...percent,
          id: 'B',
          type: 'PROMO_PRICE',
          promoPrice: 40,
          percentOff: null,
        },
      ],
    });
    expect(result.lineDiscounts.L1).toBe(20);
  });

  it('valor mínimo da compra gera desconto de carrinho', () => {
    const result = applyPromotions({
      lines: [line],
      cartDiscountManual: false,
      rules: [
        {
          ...percent,
          id: 'C',
          type: 'MIN_PURCHASE',
          percentOff: null,
          amountOff: 15,
          minCartValue: 80,
        },
      ],
    });
    expect(result.cartDiscount).toBe(15);
    expect(result.lineDiscounts.L1).toBe(0);
  });

  it('não aplica valor mínimo abaixo do limiar', () => {
    const result = applyPromotions({
      lines: [line],
      cartDiscountManual: false,
      rules: [
        {
          ...percent,
          id: 'C',
          type: 'MIN_PURCHASE',
          percentOff: null,
          amountOff: 15,
          minCartValue: 200,
        },
      ],
    });
    expect(result.cartDiscount).toBe(0);
  });

  it('exclusive vence se o desconto for maior que o pacote stackable', () => {
    const result = applyPromotions({
      lines: [line],
      cartDiscountManual: false,
      rules: [
        percent,
        {
          ...percent,
          id: 'X',
          name: 'R$ 30 OFF',
          type: 'FIXED',
          stacking: 'EXCLUSIVE',
          amountOff: 30,
          percentOff: null,
          priority: 9,
        },
      ],
    });
    expect(result.totalDiscount).toBe(30);
    expect(result.applied).toHaveLength(1);
    expect(result.applied[0]?.promotionId).toBe('X');
  });

  it('respeita desconto manual na linha', () => {
    const result = applyPromotions({
      lines: [{ ...line, manualDiscount: true }],
      cartDiscountManual: false,
      rules: [percent],
    });
    expect(result.lineDiscounts.L1).toBe(0);
  });

  it('limita quantidade promocional', () => {
    const result = applyPromotions({
      lines: [line],
      cartDiscountManual: false,
      rules: [{ ...percent, maxQtyPerSale: 1 }],
    });
    expect(result.lineDiscounts.L1).toBe(5);
  });

  it('acumula stackable sem ultrapassar o bruto da linha', () => {
    const result = applyPromotions({
      lines: [line],
      cartDiscountManual: false,
      rules: [
        percent,
        {
          ...percent,
          id: 'D',
          name: 'Mais 10%',
          priority: 2,
        },
      ],
    });
    expect(result.lineDiscounts.L1).toBe(20);
    expect(result.applied).toHaveLength(2);
  });
});

describe('derivePromotionStatus / approval', () => {
  const startsAt = new Date('2026-01-01T00:00:00Z');
  const endsAt = new Date('2026-12-31T23:59:59Z');

  it('deriva agendada / ativa / expirada', () => {
    expect(
      derivePromotionStatus({
        status: 'PUBLISHED',
        startsAt,
        endsAt,
        now: new Date('2025-12-01'),
      }),
    ).toBe('SCHEDULED');
    expect(
      derivePromotionStatus({
        status: 'PUBLISHED',
        startsAt,
        endsAt,
        now: new Date('2026-06-01'),
      }),
    ).toBe('ACTIVE');
    expect(
      derivePromotionStatus({
        status: 'PUBLISHED',
        startsAt,
        endsAt,
        now: new Date('2027-01-01'),
      }),
    ).toBe('EXPIRED');
  });

  it('exige aprovação acima do limite do operador', () => {
    expect(manualDiscountNeedsApproval(15, 100, 10)).toBe(true);
    expect(manualDiscountNeedsApproval(5, 100, 10)).toBe(false);
  });
});
