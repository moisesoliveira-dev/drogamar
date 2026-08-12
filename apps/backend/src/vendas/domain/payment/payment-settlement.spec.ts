import { settlePayments } from './payment-settlement';

describe('settlePayments', () => {
  it('calcula troco em dinheiro', () => {
    const result = settlePayments(85, [
      { method: 'CASH', amount: 85, tenderedAmount: 100 },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.settlement.amountPaid).toBe(85);
    expect(result.settlement.changeAmount).toBe(15);
    expect(result.settlement.remaining).toBe(0);
    expect(result.settlement.canComplete).toBe(true);
  });

  it('rejeita troco negativo', () => {
    const result = settlePayments(85, [
      { method: 'CASH', amount: 85, tenderedAmount: 50 },
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issue.code).toBe('NEGATIVE_CHANGE');
  });

  it('rejeita pagamento incompleto', () => {
    const result = settlePayments(200, [
      { method: 'CASH', amount: 80, tenderedAmount: 80 },
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issue.code).toBe('INCOMPLETE_PAYMENT');
  });

  it('aceita divisão em múltiplas linhas de dinheiro', () => {
    const result = settlePayments(200, [
      { method: 'CASH', amount: 80, tenderedAmount: 80 },
      { method: 'CASH', amount: 120, tenderedAmount: 120 },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.settlement.amountPaid).toBe(200);
    expect(result.settlement.changeAmount).toBe(0);
  });

  it('rejeita método sem integração', () => {
    const result = settlePayments(10, [{ method: 'PIX', amount: 10 }]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issue.code).toBe('UNSUPPORTED_METHOD');
  });

  it('rejeita overpayment no valor aplicado', () => {
    const result = settlePayments(50, [
      { method: 'CASH', amount: 60, tenderedAmount: 60 },
    ]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issue.code).toBe('OVERPAYMENT');
  });
});
