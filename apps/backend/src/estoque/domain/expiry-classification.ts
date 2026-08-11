/**
 * Classificação centralizada de validade (fonte única de verdade).
 * Compara datas calendário em UTC (Date @db.Date), sem comparação de string.
 */

export type ExpiryStatusKind =
  | 'EXPIRED'
  | 'EXPIRES_TODAY'
  | 'CRITICAL'
  | 'WARNING'
  | 'REGULAR';

export function toUtcDateOnly(input: Date): Date {
  return new Date(
    Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()),
  );
}

export function daysUntilExpiry(today: Date, expiryDate: Date): number {
  const start = toUtcDateOnly(today).getTime();
  const end = toUtcDateOnly(expiryDate).getTime();
  return Math.round((end - start) / 86_400_000);
}

/**
 * - EXPIRED: já passou
 * - EXPIRES_TODAY: vence hoje
 * - CRITICAL: 1..min(7, janela) — vence em breve
 * - WARNING: (7+1)..janela — atenção
 * - REGULAR: além da janela
 */
export function classifyExpiryStatus(
  daysRemaining: number,
  alertWindowDays: number,
): ExpiryStatusKind {
  const window = Math.max(1, alertWindowDays);
  if (daysRemaining < 0) return 'EXPIRED';
  if (daysRemaining === 0) return 'EXPIRES_TODAY';
  const criticalCeiling = Math.min(7, window);
  if (daysRemaining <= criticalCeiling) return 'CRITICAL';
  if (daysRemaining <= window) return 'WARNING';
  return 'REGULAR';
}

export function formatExpiryStatusLabel(
  kind: ExpiryStatusKind,
  daysRemaining: number,
): string {
  switch (kind) {
    case 'EXPIRED':
      return 'Vencido';
    case 'EXPIRES_TODAY':
      return 'Vence hoje';
    case 'CRITICAL':
    case 'WARNING':
    case 'REGULAR':
      return `Vence em ${daysRemaining} dias`;
    default:
      return '—';
  }
}

/** Valor em risco = quantidade × custo unitário do item (quando houver custo). */
export function estimateLotValueAtRisk(
  quantity: number,
  costPrice: number | null,
): number | null {
  if (costPrice == null) return null;
  return Number((quantity * costPrice).toFixed(4));
}

export function isWithinAttention(
  kind: ExpiryStatusKind,
): boolean {
  return (
    kind === 'EXPIRED' ||
    kind === 'EXPIRES_TODAY' ||
    kind === 'CRITICAL' ||
    kind === 'WARNING'
  );
}
