import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createWrapper } from '@/test/utils';
import { useInvoices, useUnpaidInvoices, useInvoicesByDateRange } from './useInvoices';

// ── Mutable per-table mock ────────────────────────────────────────────────────

const mockState = vi.hoisted(() => ({
  invoices: { data: [] as unknown, error: null as unknown },
}));

vi.mock('@/lib/supabase', () => {
  function makeProxy(table: string): unknown {
    const handler: ProxyHandler<object> = {
      get(_target, prop: string | symbol) {
        if (prop === 'then') {
          const record = (mockState as Record<string, { data: unknown; error: unknown }>)[
            table
          ] ?? {
            data: [],
            error: null,
          };
          if (record.error !== null) {
            return (_resolve: unknown, reject?: (e: unknown) => void) => {
              if (typeof reject === 'function') reject(record.error);
            };
          }
          return (resolve: (v: unknown) => void) => resolve({ data: record.data });
        }
        return vi.fn().mockReturnValue(new Proxy({}, handler));
      },
    };
    return new Proxy({}, handler);
  }

  return {
    supabase: { from: vi.fn((table: string) => makeProxy(table)) },
  };
});

// ── Test data ─────────────────────────────────────────────────────────────────

const invoiceRow = {
  id: 1,
  invoice_number: 'INV-2026-001',
  reservation_id: 10,
  guest_id: 5,
  company_id: null,
  issue_date: '2026-01-15',
  due_date: '2026-01-20',
  status: 'paid',
  subtotal: '100.00',
  vat_amount: '13.00',
  tourism_tax: '2.00',
  total_amount: '115.00',
  paid_amount: '115.00',
  balance_due: '0.00',
  notes: 'Test invoice',
  created_at: '2026-01-15T10:00:00Z',
  updated_at: '2026-01-15T10:00:00Z',
  fiscal_records: [],
  guests: {
    id: 5,
    first_name: 'Ana',
    last_name: 'Horvat',
    email: 'ana@example.com',
    phone: '+385 98 123 456',
  },
  reservations: null,
};

const unpaidInvoiceRow = {
  ...invoiceRow,
  id: 2,
  invoice_number: 'INV-2026-002',
  status: 'sent',
  paid_amount: '0.00',
  balance_due: '115.00',
};

// ── useInvoices ───────────────────────────────────────────────────────────────

describe('useInvoices', () => {
  beforeEach(() => {
    mockState.invoices = { data: [invoiceRow], error: null };
  });

  afterEach(() => vi.clearAllMocks());

  it('returns mapped invoice entries on success', async () => {
    const { result } = renderHook(() => useInvoices(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].invoiceNumber).toBe('INV-2026-001');
    expect(result.current.data?.[0].status).toBe('paid');
    expect(result.current.data?.[0].guest?.firstName).toBe('Ana');
    expect(result.current.data?.[0].issueDate).toBeInstanceOf(Date);
  });

  it('returns empty array when there are no invoices', async () => {
    mockState.invoices = { data: [], error: null };

    const { result } = renderHook(() => useInvoices(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('surfaces error state when fetch fails (throwOnError)', async () => {
    mockState.invoices = { data: null, error: new Error('Network error') };

    const { result } = renderHook(() => useInvoices(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });
});

// ── useUnpaidInvoices ─────────────────────────────────────────────────────────

describe('useUnpaidInvoices', () => {
  beforeEach(() => {
    mockState.invoices = { data: [invoiceRow, unpaidInvoiceRow], error: null };
  });

  afterEach(() => vi.clearAllMocks());

  it('filters to only non-paid invoices', async () => {
    const { result } = renderHook(() => useUnpaidInvoices(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].invoiceNumber).toBe('INV-2026-002');
    expect(result.current.data?.[0].status).toBe('sent');
  });
});

// ── useInvoicesByDateRange ────────────────────────────────────────────────────

describe('useInvoicesByDateRange', () => {
  beforeEach(() => {
    mockState.invoices = { data: [invoiceRow], error: null };
  });

  afterEach(() => vi.clearAllMocks());

  it('returns all invoices when no date range provided', async () => {
    const { result } = renderHook(() => useInvoicesByDateRange(null, null), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
  });

  it('filters invoices within date range', async () => {
    const start = new Date('2026-01-01');
    const end = new Date('2026-01-31');

    const { result } = renderHook(() => useInvoicesByDateRange(start, end), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // invoiceRow has issueDate = 2026-01-15 which is within Jan 2026
    expect(result.current.data).toHaveLength(1);
  });

  it('returns empty when invoice is outside date range', async () => {
    const start = new Date('2025-01-01');
    const end = new Date('2025-12-31');

    const { result } = renderHook(() => useInvoicesByDateRange(start, end), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // invoiceRow is 2026 — outside range
    expect(result.current.data).toHaveLength(0);
  });
});
