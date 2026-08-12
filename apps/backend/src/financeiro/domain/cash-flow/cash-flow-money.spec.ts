import { isOperationalKind, netEffect, roundMoney } from './cash-flow-money';

describe('cash-flow-money', () => {
  it('arredonda em 4 casas', () => {
    expect(roundMoney(1.23456)).toBe(1.2346);
    expect(roundMoney(10.1)).toBe(10.1);
  });

  it('calcula efeito líquido por direção', () => {
    expect(netEffect('IN', 100)).toBe(100);
    expect(netEffect('OUT', 50)).toBe(-50);
    expect(netEffect('OUT', -25)).toBe(-25);
  });

  it('exclui TRANSFER do resultado operacional', () => {
    expect(isOperationalKind('RECEIPT')).toBe(true);
    expect(isOperationalKind('PAYMENT')).toBe(true);
    expect(isOperationalKind('MANUAL')).toBe(true);
    expect(isOperationalKind('ADJUSTMENT')).toBe(true);
    expect(isOperationalKind('TRANSFER')).toBe(false);
  });
});
