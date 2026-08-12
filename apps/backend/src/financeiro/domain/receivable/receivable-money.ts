export type ReceivableDisplayStatus =
  | 'OPEN'
  | 'DUE_TODAY'
  | 'OVERDUE'
  | 'PARTIAL'
  | 'SETTLED'
  | 'CANCELLED'
  | 'RENEGOTIATED';

export type MoneyParts = {
  originalAmount: number;
  discountAmount: number;
  interestAmount: number;
  fineAmount: number;
  paidAmount: number;
};

export type ReceivableMoney = MoneyParts & {
  updatedAmount: number;
  balance: number;
};

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

export function toUtcDateOnly(value: Date | string): Date {
  const d = typeof value === 'string' ? new Date(value) : value;
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
}

export function daysOverdue(
  dueDate: Date | string,
  today: Date = new Date(),
): number {
  const due = toUtcDateOnly(dueDate);
  const now = toUtcDateOnly(today);
  const diffMs = now.getTime() - due.getTime();
  return Math.max(0, Math.floor(diffMs / 86_400_000));
}

/** Multa fixa % + juros simples ao dia sobre o principal líquido. */
export function calculateLateCharges(input: {
  originalAmount: number;
  discountAmount: number;
  daysLate: number;
  finePercent?: number;
  dailyInterestPercent?: number;
}): { interestAmount: number; fineAmount: number } {
  const base = Math.max(0, input.originalAmount - input.discountAmount);
  if (input.daysLate <= 0 || base <= 0) {
    return { interestAmount: 0, fineAmount: 0 };
  }
  const finePercent = input.finePercent ?? 2;
  const dailyInterestPercent = input.dailyInterestPercent ?? 0.033;
  return {
    fineAmount: roundMoney((base * finePercent) / 100),
    interestAmount: roundMoney(
      (base * dailyInterestPercent * input.daysLate) / 100,
    ),
  };
}

export function calculateReceivableMoney(parts: MoneyParts): ReceivableMoney {
  const updatedAmount = roundMoney(
    parts.originalAmount +
      parts.interestAmount +
      parts.fineAmount -
      parts.discountAmount,
  );
  const balance = roundMoney(Math.max(0, updatedAmount - parts.paidAmount));
  return {
    ...parts,
    originalAmount: roundMoney(parts.originalAmount),
    discountAmount: roundMoney(parts.discountAmount),
    interestAmount: roundMoney(parts.interestAmount),
    fineAmount: roundMoney(parts.fineAmount),
    paidAmount: roundMoney(parts.paidAmount),
    updatedAmount: Math.max(0, updatedAmount),
    balance,
  };
}

export function resolveDisplayStatus(input: {
  status: 'OPEN' | 'PARTIAL' | 'SETTLED' | 'CANCELLED' | 'RENEGOTIATED';
  dueDate: Date | string;
  balance: number;
  today?: Date;
}): ReceivableDisplayStatus {
  if (input.status === 'SETTLED') return 'SETTLED';
  if (input.status === 'CANCELLED') return 'CANCELLED';
  if (input.status === 'RENEGOTIATED') return 'RENEGOTIATED';
  if (input.balance <= 0) return 'SETTLED';

  const due = toUtcDateOnly(input.dueDate);
  const now = toUtcDateOnly(input.today ?? new Date());
  const diffDays = Math.floor((now.getTime() - due.getTime()) / 86_400_000);

  if (diffDays > 0) return 'OVERDUE';
  if (diffDays === 0) {
    return input.status === 'PARTIAL' ? 'PARTIAL' : 'DUE_TODAY';
  }
  if (input.status === 'PARTIAL') return 'PARTIAL';
  return 'OPEN';
}

export function resolvePersistedStatus(
  balance: number,
  paidAmount: number,
): 'OPEN' | 'PARTIAL' | 'SETTLED' {
  if (balance <= 0.0001) return 'SETTLED';
  if (paidAmount > 0.0001) return 'PARTIAL';
  return 'OPEN';
}
