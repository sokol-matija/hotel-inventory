import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import { supabase, Database } from '../../supabase';
import { PricingTier } from '../../hotel/types';

// ─── Mapping helpers ──────────────────────────────────────────────────────────

function mapPricingTierFromDB(
  row: Database['public']['Tables']['pricing_tiers']['Row']
): PricingTier {
  return {
    id: row.id.toString(),
    name: row.name,
    description: row.description || '',
    discountPercentage: (row.seasonal_rate_a || 0) * 100,
    isDefault: row.is_default || false,
    isActive: row.is_active || true,
    seasonalRates: {
      A: row.seasonal_rate_a || 0,
      B: row.seasonal_rate_b || 0,
      C: row.seasonal_rate_c || 0,
      D: row.seasonal_rate_d || 0,
    },
    roomTypeMultipliers: {},
    minimumStayRequirement: row.minimum_stay || undefined,
    advanceBookingDiscount: undefined,
    lastMinuteDiscount: undefined,
    validFrom: row.valid_from ? new Date(row.valid_from) : undefined,
    validTo: row.valid_to ? new Date(row.valid_to) : undefined,
    applicableServices: [],
    createdAt: new Date(row.created_at || ''),
    updatedAt: new Date(row.updated_at || ''),
  };
}

// ─── Service functions (queryFn targets) ──────────────────────────────────────

async function fetchPricingTiers(): Promise<PricingTier[]> {
  const { data, error } = await supabase
    .from('pricing_tiers')
    .select('*')
    .eq('is_active', true)
    .order('is_default', { ascending: false });
  if (error) throw error;
  return (data ?? []).map(mapPricingTierFromDB);
}

async function createPricingTierInDB(
  tier: Omit<PricingTier, 'id' | 'createdAt' | 'updatedAt'>
): Promise<PricingTier> {
  const { data, error } = await supabase
    .from('pricing_tiers')
    .insert({
      name: tier.name,
      description: tier.description || null,
      seasonal_rate_a: tier.seasonalRates?.A || 0,
      seasonal_rate_b: tier.seasonalRates?.B || 0,
      seasonal_rate_c: tier.seasonalRates?.C || 0,
      seasonal_rate_d: tier.seasonalRates?.D || 0,
      is_percentage_discount: true,
      minimum_stay: tier.minimumStayRequirement || null,
      valid_from:
        tier.validFrom?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
      valid_to: tier.validTo?.toISOString().split('T')[0] || null,
      is_active: tier.isActive !== false,
      is_default: tier.isDefault || false,
    })
    .select()
    .single();
  if (error) throw error;
  return mapPricingTierFromDB(data);
}

async function updatePricingTierInDB(
  id: string,
  updates: Partial<PricingTier>
): Promise<PricingTier> {
  const { data, error } = await supabase
    .from('pricing_tiers')
    .update({
      name: updates.name,
      description: updates.description,
      seasonal_rate_a: updates.seasonalRates?.A,
      seasonal_rate_b: updates.seasonalRates?.B,
      seasonal_rate_c: updates.seasonalRates?.C,
      seasonal_rate_d: updates.seasonalRates?.D,
      minimum_stay: updates.minimumStayRequirement,
      valid_from: updates.validFrom?.toISOString().split('T')[0],
      valid_to: updates.validTo?.toISOString().split('T')[0],
      is_active: updates.isActive,
      is_default: updates.isDefault,
      updated_at: new Date().toISOString(),
    })
    .eq('id', parseInt(id))
    .select()
    .single();
  if (error) throw error;
  return mapPricingTierFromDB(data);
}

async function deletePricingTierInDB(id: string): Promise<void> {
  const { error } = await supabase
    .from('pricing_tiers')
    .update({ is_active: false })
    .eq('id', parseInt(id));
  if (error) throw error;
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pricingTiers.all() });
    },
  });
}

export function useUpdatePricingTier() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<PricingTier> }) =>
      updatePricingTierInDB(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pricingTiers.all() });
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
        old.map((t) => (t.id === id ? { ...t, isActive: false } : t))
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.pricingTiers.all(), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pricingTiers.all() });
    },
  });
}
