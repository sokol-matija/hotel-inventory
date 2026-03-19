import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import { supabase, Database } from '../../supabase';
import { Company } from '../../hotel/types';

// ─── Mapping helpers ──────────────────────────────────────────────────────────

function mapCompanyFromDB(row: Database['public']['Tables']['companies']['Row']): Company {
  return {
    id: row.id.toString(),
    name: row.name,
    oib: row.oib,
    address: {
      street: row.address,
      city: row.city,
      postalCode: row.postal_code,
      country: row.country || 'Croatia',
    },
    contactPerson: row.contact_person,
    email: row.email,
    phone: row.phone || '',
    fax: row.fax || undefined,
    vatNumber: undefined,
    businessRegistrationNumber: undefined,
    discountPercentage: undefined,
    paymentTerms: undefined,
    isActive: row.is_active ?? true,
    notes: row.notes || '',
    createdAt: new Date(row.created_at || ''),
    updatedAt: new Date(row.updated_at || ''),
  };
}

// ─── Service functions (queryFn targets) ──────────────────────────────────────

async function fetchCompanies(): Promise<Company[]> {
  const { data, error } = await supabase
    .from('companies')
    .select('*')
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return (data ?? []).map(mapCompanyFromDB);
}

async function createCompanyInDB(
  company: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Company> {
  const { data, error } = await supabase
    .from('companies')
    .insert({
      name: company.name,
      oib: company.oib,
      address: company.address.street,
      city: company.address.city,
      postal_code: company.address.postalCode,
      country: company.address.country || 'Croatia',
      contact_person: company.contactPerson,
      email: company.email,
      phone: company.phone,
      fax: company.fax,
      is_active: true,
    })
    .select()
    .single();
  if (error) throw error;
  return mapCompanyFromDB(data);
}

async function updateCompanyInDB(id: string, updates: Partial<Company>): Promise<Company> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: any = {};
  if (updates.name) updateData.name = updates.name;
  if (updates.oib) updateData.oib = updates.oib;
  if (updates.address) {
    updateData.address = updates.address.street;
    updateData.city = updates.address.city;
    updateData.postal_code = updates.address.postalCode;
    updateData.country = updates.address.country;
  }
  if (updates.contactPerson) updateData.contact_person = updates.contactPerson;
  if (updates.email) updateData.email = updates.email;
  if (updates.phone) updateData.phone = updates.phone;
  if (updates.fax !== undefined) updateData.fax = updates.fax;
  updateData.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('companies')
    .update(updateData)
    .eq('id', parseInt(id))
    .select()
    .single();
  if (error) throw error;
  return mapCompanyFromDB(data);
}

async function deleteCompanyInDB(id: string): Promise<void> {
  const { error } = await supabase
    .from('companies')
    .update({ is_active: false })
    .eq('id', parseInt(id));
  if (error) throw error;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useCompanies() {
  return useQuery({
    queryKey: queryKeys.companies.all(),
    queryFn: fetchCompanies,
  });
}

export function useCreateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createCompanyInDB,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.all() });
    },
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Company> }) =>
      updateCompanyInDB(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.all() });
    },
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
        old.map((c) => (c.id === id ? { ...c, isActive: false } : c))
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.companies.all(), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.companies.all() });
    },
  });
}
