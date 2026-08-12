import {
  calculateLateCharges,
  calculateReceivableMoney,
  daysOverdue,
  resolveDisplayStatus,
  resolvePersistedStatus,
} from './receivable-money';

describe('receivable-money', () => {
  it('calcula multa e juros por atraso', () => {
    const charges = calculateLateCharges({
      originalAmount: 500,
      discountAmount: 0,
      daysLate: 5,
      finePercent: 2,
      dailyInterestPercent: 0.033,
    });
    expect(charges.fineAmount).toBe(10);
    expect(charges.interestAmount).toBe(0.825);
  });

  it('calcula saldo atualizado', () => {
    const money = calculateReceivableMoney({
      originalAmount: 500,
      discountAmount: 20,
      interestAmount: 5,
      fineAmount: 10,
      paidAmount: 100,
    });
    expect(money.updatedAmount).toBe(495);
    expect(money.balance).toBe(395);
  });

  it('resolve status de exibição', () => {
    expect(
      resolveDisplayStatus({
        status: 'OPEN',
        dueDate: '2026-08-05',
        balance: 100,
        today: new Date('2026-08-10T12:00:00Z'),
      }),
    ).toBe('OVERDUE');
    expect(daysOverdue('2026-08-05', new Date('2026-08-10T12:00:00Z'))).toBe(5);
    expect(resolvePersistedStatus(0, 100)).toBe('SETTLED');
    expect(resolvePersistedStatus(50, 50)).toBe('PARTIAL');
  });
});
