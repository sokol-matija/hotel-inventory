import { describe, it, expect } from 'vitest';
import {
  formatDateForDisplay,
  formatDateForDatabase,
  validateDateFormat,
} from './inventoryDateUtils';

// ── formatDateForDisplay ──────────────────────────────────────────────────────

describe('formatDateForDisplay', () => {
  it('converts ISO date to DD/MM/YYYY', () => {
    expect(formatDateForDisplay('2026-12-25')).toBe('25/12/2026');
  });

  it('pads single-digit day and month', () => {
    expect(formatDateForDisplay('2026-01-05')).toBe('05/01/2026');
  });

  it('returns empty string for empty input', () => {
    expect(formatDateForDisplay('')).toBe('');
  });
});

// ── formatDateForDatabase ─────────────────────────────────────────────────────

describe('formatDateForDatabase', () => {
  it('converts DD/MM/YYYY to YYYY-MM-DD', () => {
    expect(formatDateForDatabase('25/12/2026')).toBe('2026-12-25');
  });

  it('pads single-digit day and month', () => {
    expect(formatDateForDatabase('5/1/2026')).toBe('2026-01-05');
  });

  it('expands 2-digit year using current century', () => {
    const currentCentury = Math.floor(new Date().getFullYear() / 100) * 100;
    expect(formatDateForDatabase('25/12/26')).toBe(`${currentCentury + 26}-12-25`);
  });

  it('returns empty string for empty input', () => {
    expect(formatDateForDatabase('')).toBe('');
  });

  it('returns empty string for malformed input', () => {
    expect(formatDateForDatabase('not-a-date')).toBe('');
    expect(formatDateForDatabase('25-12-2026')).toBe('');
  });
});

// ── validateDateFormat ────────────────────────────────────────────────────────

describe('validateDateFormat', () => {
  it('accepts valid DD/MM/YYYY', () => {
    expect(validateDateFormat('25/12/2026')).toBe(true);
  });

  it('accepts valid DD/MM/YY', () => {
    expect(validateDateFormat('25/12/26')).toBe(true);
  });

  it('accepts single-digit day and month', () => {
    expect(validateDateFormat('5/1/2026')).toBe(true);
  });

  it('rejects invalid month > 12', () => {
    expect(validateDateFormat('01/13/2026')).toBe(false);
  });

  it('rejects invalid day > 31', () => {
    expect(validateDateFormat('32/01/2026')).toBe(false);
  });

  it('rejects non-existent date (Feb 30)', () => {
    expect(validateDateFormat('30/02/2026')).toBe(false);
  });

  it('rejects non-existent date (Nov 31)', () => {
    expect(validateDateFormat('31/11/2026')).toBe(false);
  });

  it('accepts Feb 29 on leap year', () => {
    expect(validateDateFormat('29/02/2024')).toBe(true);
  });

  it('rejects Feb 29 on non-leap year', () => {
    expect(validateDateFormat('29/02/2026')).toBe(false);
  });

  it('rejects year below 1900', () => {
    expect(validateDateFormat('01/01/1899')).toBe(false);
  });

  it('rejects year above 2100', () => {
    expect(validateDateFormat('01/01/2101')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(validateDateFormat('')).toBe(false);
  });

  it('rejects wrong separator format', () => {
    expect(validateDateFormat('25-12-2026')).toBe(false);
    expect(validateDateFormat('2026/12/25')).toBe(false);
  });
});
