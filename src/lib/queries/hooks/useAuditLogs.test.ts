import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createWrapper } from '@/test/utils';
import { useAuditLogs } from './useAuditLogs';

// ── Mutable per-table mock ────────────────────────────────────────────────────

const mockState = vi.hoisted(() => ({
  audit_logs: { data: [] as unknown, error: null as unknown },
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
    Database: undefined,
  };
});

// ── Test data ─────────────────────────────────────────────────────────────────

const auditLogRow = {
  id: 1,
  user_id: 'user-abc',
  action: 'CREATE',
  table_name: 'items',
  record_id: '42',
  old_values: null,
  new_values: { name: 'Coffee' },
  description: 'Item created',
  created_at: '2026-01-01T10:00:00Z',
  user_profile: { role: { name: 'admin' } },
};

// ── useAuditLogs ──────────────────────────────────────────────────────────────

describe('useAuditLogs', () => {
  beforeEach(() => {
    mockState.audit_logs = { data: [auditLogRow], error: null };
  });

  afterEach(() => vi.clearAllMocks());

  it('returns audit log entries on success', async () => {
    const { result } = renderHook(() => useAuditLogs(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].id).toBe(1);
    expect(result.current.data?.[0].action).toBe('CREATE');
    expect(result.current.data?.[0].table_name).toBe('items');
    expect(result.current.data?.[0].user_profile?.role?.name).toBe('admin');
  });

  it('returns empty array when there are no audit logs', async () => {
    mockState.audit_logs = { data: [], error: null };

    const { result } = renderHook(() => useAuditLogs(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('surfaces error state when fetch fails (throwOnError)', async () => {
    mockState.audit_logs = { data: null, error: new Error('DB connection refused') };

    const { result } = renderHook(() => useAuditLogs(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });
});
