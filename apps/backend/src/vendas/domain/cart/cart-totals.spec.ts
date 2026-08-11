import { calculateCartTotals, lineSubtotal } from './cart-totals';
import { validateCart } from './cart-validation';

describe('calculateCartTotals', () => {
  it('calcula subtotal, descontos, acréscimos e total', () => {
    const totals = calculateCartTotals({
      lines: [
        { quantity: 2, unitPrice: 10, lineDiscount: 1 },
        { quantity: 1, unitPrice: 5, lineDiscount: 0 },
      ],
      cartDiscount: 2,
      cartSurcharge: 1.5,
    });

    expect(totals.subtotal).toBe(25);
    expect(totals.lineDiscounts).toBe(1);
    expect(totals.cartDiscount).toBe(2);
    expect(totals.discounts).toBe(3);
    expect(totals.surcharges).toBe(1.5);
    expect(totals.total).toBe(23.5);
  });

  it('calcula subtotal da linha', () => {
    expect(lineSubtotal(3, 4.5, 1.5)).toBe(12);
  });
});

describe('validateCart', () => {
  const baseLine = {
    lineId: 'l1',
    stockItemId: 'i1',
    quantity: 1,
    unitPrice: 10,
    lineDiscount: 0,
    itemStatus: 'ACTIVE' as const,
    currentSalePrice: 10,
    trackStock: true,
    availableStock: 5,
    productDescription: 'Produto A',
  };

  it('bloqueia carrinho vazio', () => {
    const result = validateCart({
      lines: [],
      cartDiscount: 0,
      cartSurcharge: 0,
      requireCustomer: false,
      hasCustomer: false,
    });
    expect(result.canCheckout).toBe(false);
    expect(result.issues.some((i) => i.code === 'EMPTY_CART')).toBe(true);
  });

  it('identifica preço inválido e estoque insuficiente', () => {
    const result = validateCart({
      lines: [
        {
          ...baseLine,
          currentSalePrice: null,
          availableStock: 0,
          quantity: 2,
        },
      ],
      cartDiscount: 0,
      cartSurcharge: 0,
      requireCustomer: false,
      hasCustomer: false,
    });
    expect(result.issues.some((i) => i.code === 'INVALID_PRICE')).toBe(true);
    expect(result.issues.some((i) => i.code === 'INSUFFICIENT_STOCK')).toBe(
      true,
    );
    expect(result.canCheckout).toBe(false);
  });

  it('marca itemsUpdated quando preço mudou (soft)', () => {
    const result = validateCart({
      lines: [{ ...baseLine, currentSalePrice: 12 }],
      cartDiscount: 0,
      cartSurcharge: 0,
      requireCustomer: false,
      hasCustomer: false,
      softConcurrency: true,
    });
    expect(result.itemsUpdated).toBe(true);
    expect(result.warnings.some((i) => i.code === 'PRICE_CHANGED')).toBe(true);
    expect(result.canCheckout).toBe(true);
  });
});
