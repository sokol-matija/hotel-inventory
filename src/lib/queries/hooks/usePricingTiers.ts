import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryData } from '@supabase/supabase-js';
import { queryKeys } from '../queryKeys';
import { supabase } from '../../supabase';

// ─── Query definition ──────────────────────────────────────────────────────────

const pricingTiersQuery = supabase
  .from('pricing_tiers')
  .select('*')
  .eq('is_active', true)
  .order('is_default', { ascending: false });

// ─── Derived types ──────────────────────────────────────────────────────────────

export type PricingTierRow = QueryData<typeof pricingTiersQuery>[number];

export interface PricingTier {
  id: string; // toString() of PricingTierRow['id'] (number → string)
  name: string;
  description: string;
  discountPercentage: number;
  isDefault: boolean;
  isActive: boolean;
  minimumStayRequirement?: number;
  validFrom?: Date;
  validTo?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Mapping helpers ──────────────────────────────────────────────────────────

function mapPricingTierFromDB(row: PricingTierRow): PricingTier {
  return {
    id: row.id.toString(),
    name: row.name,
    description: row.description || '',
    discountPercentage: Number(row.discount_percentage ?? 0),
    isDefault: row.is_default || false,
    isActive: row.is_active ?? true,
    minimumStayRequirement: row.minimum_stay || undefined,
    validFrom: row.valid_from ? new Date(row.valid_from) : undefined,
    validTo: row.valid_to ? new Date(row.valid_to) : undefined,
    createdAt: new Date(row.created_at || ''),
    updatedAt: new Date(row.updated_at || ''),
  };
}

// ─── Service functions (queryFn targets) ──────────────────────────────────────

async function fetchPricingTiers(): Promise<PricingTier[]> {
  const { data } = await pricingTiersQuery.throwOnError();
  return (data ?? []).map(mapPricingTierFromDB);
}

async function createPricingTierInDB(
  tier: Omit<PricingTier, 'id' | 'createdAt' | 'updatedAt'>
): Promise<PricingTier> {
  const { data } = await supabase
    .from('pricing_tiers')
    .insert({
      name: tier.name,
      description: tier.description || null,
      discount_percentage: tier.discountPercentage,
      minimum_stay: tier.minimumStayRequirement || null,
      valid_from:
        tier.validFrom?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
      valid_to: tier.validTo?.toISOString().split('T')[0] || null,
      is_active: tier.isActive !== false,
      is_default: tier.isDefault || false,
    })
    .select()
    .single()
    .throwOnError();
  return mapPricingTierFromDB(data);
}

async function updatePricingTierInDB(
  id: string,
  updates: Partial<PricingTier>
): Promise<PricingTier> {
  const { data } = await supabase
    .from('pricing_tiers')
    .update({
      name: updates.name,
      description: updates.description,
      discount_percentage: updates.discountPercentage,
      minimum_stay: updates.minimumStayRequirement,
      valid_from: updates.validFrom?.toISOString().split('T')[0],
      valid_to: updates.validTo?.toISOString().split('T')[0],
      is_active: updates.isActive,
      is_default: updates.isDefault,
      updated_at: new Date().toISOString(),
    })
    .eq('id', parseInt(id))
    .select()
    .single()
    .throwOnError();
  return mapPricingTierFromDB(data);
}

async function deletePricingTierInDB(id: string): Promise<void> {
  await supabase
    .from('pricing_tiers')
    .update({ is_active: false })
    .eq('id', parseInt(id))
    .throwOnError();
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function usePricingTiers() {
  return useQuery({
    queryKey: queryKeys.pricingTiers.all(),
    queryFn: fetchPricingTiers,
  });
}

export function useCreatePricingTier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPricingTierInDB,
    onSettled: () => {
      return queryClient.invalidateQueries({ queryKey: queryKeys.pricingTiers.all() });
    },
  });
}

export function useUpdatePricingTier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<PricingTier> }) =>
      updatePricingTierInDB(id, updates),
    onSettled: () => {
      return queryClient.invalidateQueries({ queryKey: queryKeys.pricingTiers.all() });
    },
  });
}

export function useDeletePricingTier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deletePricingTierInDB,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.pricingTiers.all() });
      const previous = queryClient.getQueryData<PricingTier[]>(queryKeys.pricingTiers.all());
      queryClient.setQueryData<PricingTier[]>(queryKeys.pricingTiers.all(), (old = []) =>
        old.filter((t) => t.id !== id)
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.pricingTiers.all(), context.previous);
      }
    },
    onSettled: () => {
      return queryClient.invalidateQueries({ queryKey: queryKeys.pricingTiers.all() });
    },
  });
}
