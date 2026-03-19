import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '../queryKeys';

export interface AuditLogEntry {
  id: number;
  user_id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'QUANTITY_UPDATE';
  table_name: string;
  record_id: number | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  description: string | null;
  created_at: string;
  user_profile?: {
    role: {
      name: string;
    };
  };
}

async function fetchAuditLogs(): Promise<AuditLogEntry[]> {
  const { data, error } = await supabase
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
    .limit(500);

  if (error) throw error;
  return data ?? [];
}

export function useAuditLogs() {
  return useQuery({
    queryKey: queryKeys.auditLogs.all(),
    queryFn: fetchAuditLogs,
    // Audit logs don't change often — 1 min stale time is enough
    staleTime: 60_000,
  });
}
