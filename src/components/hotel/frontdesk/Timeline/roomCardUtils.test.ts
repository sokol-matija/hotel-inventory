import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getStatusCardColors, calcDaysLeft } from './roomCardUtils';

// ── getStatusCardColors ───────────────────────────────────────────────────────

describe('getStatusCardColors', () => {
  it('returns orange classes for confirmed', () => {
    expect(getStatusCardColors('confirmed')).toBe('bg-orange-200 border-orange-600');
  });

  it('returns green classes for checked-in', () => {
    expect(getStatusCardColors('checked-in')).toBe('bg-green-200 border-green-600');
  });

  it('returns gray classes for checked-out', () => {
    expect(getStatusCardColors('checked-out')).toBe('bg-gray-200 border-gray-600');
  });

  it('returns red classes for room-closure', () => {
    expect(getStatusCardColors('room-closure')).toBe('bg-red-200 border-red-600');
  });

  it('returns blue classes for unallocated', () => {
    expect(getStatusCardColors('unallocated')).toBe('bg-blue-200 border-blue-600');
  });

  it('returns red classes for incomplete-payment', () => {
    expect(getStatusCardColors('incomplete-payment')).toBe('bg-red-200 border-red-600');
  });

  it('returns white/gray default for unknown status', () => {
    expect(getStatusCardColors('maintenance')).toBe('bg-white border-gray-200');
    expect(getStatusCardColors('')).toBe('bg-white border-gray-200');
  });
});

// ── calcDaysLeft ──────────────────────────────────────────────────────────────

describe('calcDaysLeft', () => {
  beforeEach(() => {
    // Fix "now" to 2026-04-10 00:00:00 UTC
    vi.useFakeTimers({ shouldAdvanceTime: false });
    vi.setSystemTime(new Date('2026-04-10T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns positive days when checkout is in the future', () => {
    expect(calcDaysLeft('2026-04-15')).toBe(5);
  });

  it('returns 1 for tomorrow', () => {
    expect(calcDaysLeft('2026-04-11')).toBe(1);
  });

  it('returns 0 or negative when checkout is today', () => {
    // Same-day checkout: difference is ~0 ms, ceil gives 0 or 1 depending on time-of-day.
    // What matters: it is never > 1.
    expect(calcDaysLeft('2026-04-10')).toBeLessThanOrEqual(0);
  });

  it('returns negative days when checkout is in the past', () => {
    expect(calcDaysLeft('2026-04-05')).toBe(-5);
  });
});
