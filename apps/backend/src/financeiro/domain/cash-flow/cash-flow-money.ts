export { toUtcDateOnly } from '../receivable/receivable-money';

export type CashFlowDirection = 'IN' | 'OUT';
export type CashFlowKind =
  'RECEIPT' | 'PAYMENT' | 'MANUAL' | 'TRANSFER' | 'ADJUSTMENT';

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 10000) / 10000;
}

/** Efeito líquido no saldo: entrada +, saída −. */
export function netEffect(
  direction: CashFlowDirection,
  amount: number,
): number {
  const abs = roundMoney(Math.abs(amount));
  return direction === 'IN' ? abs : roundMoney(-abs);
}

/** Transferências não entram em entradas/saídas de resultado operacional. */
export function isOperationalKind(kind: CashFlowKind): boolean {
  return kind !== 'TRANSFER';
}
