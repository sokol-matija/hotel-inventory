import { useQuery } from '@tanstack/react-query';
import { supabase, Database } from '@/lib/supabase';
import { queryKeys } from '../queryKeys';

// ─── DB row types ──────────────────────────────────────────────────────────────

type UserRoleRow = Database['public']['Tables']['user_roles']['Row'];

// ─── Mapping helpers ───────────────────────────────────────────────────────────

function mapUserRoleFromDB(row: UserRoleRow) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
  };
}

// ─── Service functions ─────────────────────────────────────────────────────────

async function fetchUserRoles() {
  const { data, error } = await supabase.from('user_roles').select('*').order('name');
  if (error) throw error;
  return (data ?? []).map(mapUserRoleFromDB);
}

// ─── Hooks ─────────────────────────────────────────────────────────────────────

export function useUserRoles() {
  return useQuery({
    queryKey: queryKeys.userRoles.all(),
    queryFn: fetchUserRoles,
    // Roles are static — cache for the full session
    staleTime: Infinity,
  });
}
