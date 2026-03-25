import { useQuery } from '@tanstack/react-query';
import { supabase, Database } from '@/lib/supabase';
import { queryKeys } from '../queryKeys';

// ─── DB row types ──────────────────────────────────────────────────────────────

type AuditRow = Database['public']['Tables']['audit_logs']['Row'];

// ─── Query definition (module-level for TypeScript inference) ─────────────────
// Note: QueryData cannot resolve the FK-hinted join for user_profiles, so we
// keep the hand-written AuditLogEntry interface and cast after fetching.

// ─── Types ─────────────────────────────────────────────────────────────────────

type AuditRowWithProfile = AuditRow & {
  user_profile?: { role: { name: string } | null } | null;
};

export interface AuditLogEntry {
  id: number;
  user_id: string | null;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'QUANTITY_UPDATE';
  table_name: string;
  record_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  description: string | null;
  created_at: string | null;
  user_profile?: {
    role: {
      name: string;
    };
  };
}

// ─── Mapping helpers ───────────────────────────────────────────────────────────

function mapAuditLogFromDB(row: AuditRowWithProfile): AuditLogEntry {
  const profile = row.user_profile;
  return {
    id: row.id,
    user_id: row.user_id,
    action: row.action as AuditLogEntry['action'],
    table_name: row.table_name,
    record_id: row.record_id,
    old_values: row.old_values as Record<string, unknown> | null,
    new_values: row.new_values as Record<string, unknown> | null,
    description: row.description,
    created_at: row.created_at,
    user_profile: profile?.role ? { role: { name: profile.role.name } } : undefined,
  };
}

// ─── Service functions ─────────────────────────────────────────────────────────

async function fetchAuditLogs(): Promise<AuditLogEntry[]> {
  const { data } = await supabase
    .from('audit_logs')
    .select(
      `
      *,
      user_profile:user_profiles!user_profiles_user_id_fkey(
        role:user_roles(name)
      )
    `
    )
    .order('created_at', { ascending: false })
    .limit(500)
    .throwOnError();

  return (data ?? []).map((row) => mapAuditLogFromDB(row as unknown as AuditRowWithProfile));
}

// ─── Hooks ─────────────────────────────────────────────────────────────────────

export function useAuditLogs() {
  return useQuery({
    queryKey: queryKeys.auditLogs.all(),
    queryFn: fetchAuditLogs,
    // Audit logs don't change often — 1 min stale time is enough
    staleTime: 60_000,
  });
}
