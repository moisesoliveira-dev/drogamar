import { describe, expect, it } from '@jest/globals';
import {
  classifyExpiryStatus,
  daysUntilExpiry,
  formatExpiryStatusLabel,
  toUtcDateOnly,
} from './expiry-classification';

describe('expiry-classification', () => {
  const today = toUtcDateOnly(new Date('2026-08-11T15:00:00.000Z'));

  it('calcula dias restantes em calendário UTC', () => {
    const expiry = toUtcDateOnly(new Date('2026-08-16T00:00:00.000Z'));
    expect(daysUntilExpiry(today, expiry)).toBe(5);
  });

  it('classifica vencido / hoje / crítico / atenção / regular', () => {
    expect(classifyExpiryStatus(-3, 30)).toBe('EXPIRED');
    expect(classifyExpiryStatus(0, 30)).toBe('EXPIRES_TODAY');
    expect(classifyExpiryStatus(5, 30)).toBe('CRITICAL');
    expect(classifyExpiryStatus(20, 30)).toBe('WARNING');
    expect(classifyExpiryStatus(84, 30)).toBe('REGULAR');
  });

  it('formata rótulos legíveis', () => {
    expect(formatExpiryStatusLabel('EXPIRED', -2)).toBe('Vencido');
    expect(formatExpiryStatusLabel('EXPIRES_TODAY', 0)).toBe('Vence hoje');
    expect(formatExpiryStatusLabel('CRITICAL', 5)).toBe('Vence em 5 dias');
  });
});
