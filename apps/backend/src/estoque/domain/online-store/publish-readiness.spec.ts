import { evaluatePublishReadiness } from './publish-readiness';

describe('evaluatePublishReadiness', () => {
  const base = {
    itemStatus: 'ACTIVE' as const,
    code: 'ITM-001',
    sku: 'SKU-1',
    erpSalePrice: 10,
    useErpPrice: true,
    priceOverride: null,
    promoPrice: null,
    promoStartsAt: null,
    promoEndsAt: null,
    availableQty: 5,
    trackExpiry: false,
    physicalQty: 5,
    itemId: 'item-1',
  };

  it('exige preço', () => {
    const result = evaluatePublishReadiness({
      ...base,
      erpSalePrice: null,
    });
    expect(result.some((p) => p.code === 'NO_PRICE')).toBe(true);
  });

  it('bloqueia item inativo', () => {
    const result = evaluatePublishReadiness({
      ...base,
      itemStatus: 'INACTIVE',
    });
    expect(result.some((p) => p.code === 'INACTIVE_ITEM')).toBe(true);
  });

  it('detecta lotes vencidos', () => {
    const result = evaluatePublishReadiness({
      ...base,
      trackExpiry: true,
      physicalQty: 10,
      availableQty: 0,
    });
    expect(result.some((p) => p.code === 'EXPIRED_STOCK_ONLY')).toBe(true);
  });
});
