/**
 * Score determinístico (sem IA):
 * - valor em atraso (escala suave)
 * - dias em atraso (peso alto)
 * - quantidade de títulos vencidos
 * - bônus se há promessa quebrada
 */
export function computePriorityScore(input: {
  overdueAmount: number;
  maxDaysOverdue: number;
  overdueAccounts: number;
  hasBrokenPromise: boolean;
}): number {
  const amount = Math.max(
    0,
    Number.isFinite(input.overdueAmount) ? input.overdueAmount : 0,
  );
  const days = Math.max(0, Math.floor(input.maxDaysOverdue) || 0);
  const accounts = Math.max(0, Math.floor(input.overdueAccounts) || 0);
  const amountPart = Math.min(500, Math.floor(amount / 10));
  const daysPart = Math.min(400, days * 4);
  const accountsPart = Math.min(150, accounts * 25);
  const promiseBonus = input.hasBrokenPromise ? 100 : 0;
  return amountPart + daysPart + accountsPart + promiseBonus;
}
