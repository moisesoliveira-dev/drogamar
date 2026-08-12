import { calculateCashCloseSummary } from './cash-close-summary';

describe('calculateCashCloseSummary', () => {
  it('calcula esperado e diferença', () => {
    const summary = calculateCashCloseSummary({
      openingAmount: 100,
      cashSales: 250,
      pixSales: 0,
      cardSales: 0,
      otherSales: 0,
      sangrias: 50,
      suprimentos: 20,
      declaredAmount: 310,
    });
    expect(summary.totalSold).toBe(250);
    expect(summary.expectedAmount).toBe(320);
    expect(summary.difference).toBe(-10);
  });

  it('deixa diferença nula sem valor informado', () => {
    const summary = calculateCashCloseSummary({
      openingAmount: 50,
      cashSales: 10,
      pixSales: 0,
      cardSales: 0,
      otherSales: 0,
      sangrias: 0,
      suprimentos: 0,
      declaredAmount: null,
    });
    expect(summary.expectedAmount).toBe(60);
    expect(summary.difference).toBeNull();
  });
});
