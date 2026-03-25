import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import { supabase } from '../../supabase';
import type { Tables, TablesInsert, TablesUpdate } from '../../supabase';

export type Company = Tables<'companies'>;
export type CompanyRow = Company;

async function fetchCompanies(): Promise<Company[]> {
  const { data } = await supabase
    .from('companies')
    .select('*')
    .eq('is_active', true)
    .order('name')
    .throwOnError();
  return data ?? [];
}

async function createCompanyInDB(company: TablesInsert<'companies'>): Promise<Company> {
  const { data } = await supabase
    .from('companies')
    .insert(company)
    .select()
    .single()
    .throwOnError();
  return data;
}

async function updateCompanyInDB(id: number, updates: TablesUpdate<'companies'>): Promise<Company> {
  const { data } = await supabase
    .from('companies')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
    .throwOnError();
  return data;
}

async function deleteCompanyInDB(id: number): Promise<void> {
  await supabase.from('companies').update({ is_active: false }).eq('id', id).throwOnError();
}

export function useCompanies() {
  return useQuery({ queryKey: queryKeys.companies.all(), queryFn: fetchCompanies });
}

export function useCreateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCompanyInDB,
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.companies.all() }),
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: TablesUpdate<'companies'> }) =>
      updateCompanyInDB(id, updates),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.companies.all() }),
  });
}

export function useDeleteCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCompanyInDB,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.companies.all() });
      const previous = queryClient.getQueryData<Company[]>(queryKeys.companies.all());
      queryClient.setQueryData<Company[]>(queryKeys.companies.all(), (old = []) =>
        old.map((c) => (c.id === id ? { ...c, is_active: false } : c))
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(queryKeys.companies.all(), context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.companies.all() }),
  });
}
