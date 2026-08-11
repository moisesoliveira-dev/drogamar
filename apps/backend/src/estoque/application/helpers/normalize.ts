import { StockItemValidationError } from '../../domain/errors';

function emptyToNull(value?: string | null): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export function normalizeOptionalText(value?: string | null): string | null {
  return emptyToNull(value);
}

export function assertNonNegative(
  label: string,
  value: number | null | undefined,
): void {
  if (value != null && value < 0) {
    throw new StockItemValidationError(`${label} não pode ser negativo.`);
  }
}
