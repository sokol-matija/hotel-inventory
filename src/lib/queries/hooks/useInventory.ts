import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryData } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { auditLog } from '@/lib/auditLog';
import { queryKeys } from '../queryKeys';

// ─── Query definition ──────────────────────────────────────────────────────────

const inventoryQuery = supabase
  .from('inventory')
  .select(
    `
    *,
    item:items(id, name, description, unit, minimum_stock, category:categories(id, name, requires_expiration)),
    location:locations(id, name, type, is_refrigerated)
  `
  )
  .order('item(name)');

export type InventoryWithDetails = QueryData<typeof inventoryQuery>[number];

// ─── Hooks ─────────────────────────────────────────────────────────────────────

export function useInventoryWithDetails() {
  return useQuery({
    queryKey: queryKeys.inventory.all(),
    queryFn: async () => {
      const { data } = await inventoryQuery.throwOnError();
      return data ?? [];
    },
  });
}

export function useUpdateInventoryQuantity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      inventoryId,
      newQuantity,
      oldQuantity,
      itemName,
    }: {
      inventoryId: number;
      newQuantity: number;
      oldQuantity: number;
      itemName: string;
    }) => {
      if (newQuantity < 0) {
        throw new Error('Quantity cannot be negative');
      }

      await supabase
        .from('inventory')
        .update({ quantity: newQuantity })
        .eq('id', inventoryId)
        .throwOnError();

      try {
        await auditLog.quantityUpdated(
          inventoryId,
          itemName,
          oldQuantity,
          newQuantity,
          'Dashboard'
        );
      } catch (auditError) {
        console.warn('Audit log failed (non-critical):', auditError);
      }
    },
    onSettled: () => {
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.locations.withStats() }),
      ]);
    },
    onError: (error, variables) => {
      console.error('QUANTITY UPDATE FAILED:', {
        error: error instanceof Error ? error.message : error,
        inventoryId: variables.inventoryId,
        newQuantity: variables.newQuantity,
        timestamp: new Date().toISOString(),
      });
    },
  });
}

// ─── Add Inventory ─────────────────────────────────────────────────────────────

export type AddInventoryInput = {
  item_id: number;
  location_id: number;
  quantity: number;
  expiration_date: string | null;
  cost_per_unit: number | null;
};

export function useAddInventory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: AddInventoryInput) => {
      const { data: maxOrderData } = await supabase
        .from('inventory')
        .select('display_order')
        .eq('location_id', payload.location_id)
        .order('display_order', { ascending: false })
        .limit(1);
      const nextDisplayOrder =
        maxOrderData && maxOrderData.length > 0 ? maxOrderData[0].display_order + 1 : 1;
      await supabase
        .from('inventory')
        .insert([{ ...payload, display_order: nextDisplayOrder }])
        .throwOnError();
    },
    onSettled: (_data, _error, variables) => {
      return Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.locations.detail(variables.location_id),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.locations.withStats() }),
      ]);
    },
  });
}
