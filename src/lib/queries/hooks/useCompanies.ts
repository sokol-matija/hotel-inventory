import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryData } from '@supabase/supabase-js';
import { queryKeys } from '../queryKeys';
import { supabase } from '../../supabase';
import type { TablesUpdate } from '../../supabase';

// ─── Query definition ──────────────────────────────────────────────────────────

const companiesQuery = supabase.from('companies').select('*').eq('is_active', true).order('name');

// ─── Derived types ──────────────────────────────────────────────────────────────

export type CompanyRow = QueryData<typeof companiesQuery>[number];

export interface Company {
  id: string; // toString() of CompanyRow['id'] (number → string)
  name: string;
  oib: string;
  address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  contactPerson: string;
  email: string;
  phone: string;
  fax?: string;
  vatNumber?: string;
  businessRegistrationNumber?: string;
  discountPercentage?: number;
  paymentTerms?: string;
  billingAddress?: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pricingTier?: any;
  pricingTierId?: string;
  roomAllocationGuarantee?: CompanyRow['room_allocation_guarantee'];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  notes: string;
}

// ─── Mapping helpers ──────────────────────────────────────────────────────────

function mapCompanyFromDB(row: CompanyRow): Company {
  return {
    id: row.id.toString(),
    name: row.name,
    oib: row.oib ?? '',
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
  const { data } = await companiesQuery.throwOnError();
  return (data ?? []).map(mapCompanyFromDB);
}

async function createCompanyInDB(
  company: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Company> {
  const { data } = await supabase
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
    .single()
    .throwOnError();
  return mapCompanyFromDB(data);
}

async function updateCompanyInDB(id: string, updates: Partial<Company>): Promise<Company> {
  const updateData: TablesUpdate<'companies'> = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.oib !== undefined) updateData.oib = updates.oib;
  if (updates.address !== undefined) {
    updateData.address = updates.address.street;
    updateData.city = updates.address.city;
    updateData.postal_code = updates.address.postalCode;
    updateData.country = updates.address.country;
  }
  if (updates.contactPerson !== undefined) updateData.contact_person = updates.contactPerson;
  if (updates.email !== undefined) updateData.email = updates.email;
  if (updates.phone !== undefined) updateData.phone = updates.phone;
  if (updates.fax !== undefined) updateData.fax = updates.fax;
  updateData.updated_at = new Date().toISOString();

  const { data } = await supabase
    .from('companies')
    .update(updateData)
    .eq('id', parseInt(id))
    .select()
    .single()
    .throwOnError();
  return mapCompanyFromDB(data);
}

async function deleteCompanyInDB(id: string): Promise<void> {
  await supabase
    .from('companies')
    .update({ is_active: false })
    .eq('id', parseInt(id))
    .throwOnError();
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
    onSettled: () => {
      return queryClient.invalidateQueries({ queryKey: queryKeys.companies.all() });
    },
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Company> }) =>
      updateCompanyInDB(id, updates),
    onSettled: () => {
      return queryClient.invalidateQueries({ queryKey: queryKeys.companies.all() });
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
      return queryClient.invalidateQueries({ queryKey: queryKeys.companies.all() });
    },
  });
}
