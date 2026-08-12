import { computePriorityScore } from './collection-priority';

describe('computePriorityScore', () => {
  it('returns 0 for empty input', () => {
    expect(
      computePriorityScore({
        overdueAmount: 0,
        maxDaysOverdue: 0,
        overdueAccounts: 0,
        hasBrokenPromise: false,
      }),
    ).toBe(0);
  });

  it('increases with amount, days and accounts', () => {
    const base = computePriorityScore({
      overdueAmount: 100,
      maxDaysOverdue: 5,
      overdueAccounts: 1,
      hasBrokenPromise: false,
    });
    const higher = computePriorityScore({
      overdueAmount: 1000,
      maxDaysOverdue: 30,
      overdueAccounts: 3,
      hasBrokenPromise: false,
    });
    expect(higher).toBeGreaterThan(base);
  });

  it('adds broken promise bonus', () => {
    const without = computePriorityScore({
      overdueAmount: 500,
      maxDaysOverdue: 10,
      overdueAccounts: 1,
      hasBrokenPromise: false,
    });
    const withBonus = computePriorityScore({
      overdueAmount: 500,
      maxDaysOverdue: 10,
      overdueAccounts: 1,
      hasBrokenPromise: true,
    });
    expect(withBonus - without).toBe(100);
  });

  it('is deterministic', () => {
    const input = {
      overdueAmount: 1234.56,
      maxDaysOverdue: 17,
      overdueAccounts: 2,
      hasBrokenPromise: true,
    };
    expect(computePriorityScore(input)).toBe(computePriorityScore(input));
  });
});
