import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { auditLog } from '@/lib/auditLog';
import { queryKeys } from '../queryKeys';

export interface InventoryWithDetails {
  id: number;
  quantity: number;
  expiration_date: string | null;
  cost_per_unit: number | null;
  created_at: string;
  updated_at: string;
  item: {
    id: number;
    name: string;
    description: string | null;
    unit: string;
    minimum_stock: number;
    category: {
      id: number;
      name: string;
      requires_expiration: boolean;
    };
  };
  location: {
    id: number;
    name: string;
    type: string;
    is_refrigerated: boolean;
  };
}

async function fetchInventoryWithDetails(): Promise<InventoryWithDetails[]> {
  const { data, error } = await supabase
    .from('inventory')
    .select(
      `
      *,
      item:items(
        id,
        name,
        description,
        unit,
        minimum_stock,
        category:categories(id, name, requires_expiration)
      ),
      location:locations(id, name, type, is_refrigerated)
    `
    )
    .order('item(name)');

  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []) as any as InventoryWithDetails[];
}

export function useInventoryWithDetails() {
  return useQuery({
    queryKey: queryKeys.inventory.all(),
    queryFn: fetchInventoryWithDetails,
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

      const { error } = await supabase
        .from('inventory')
        .update({ quantity: newQuantity })
        .eq('id', inventoryId);

      if (error) throw error;

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
    onSuccess: () => {
      // Invalidate all inventory and location caches since quantity changed
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all() });
      queryClient.invalidateQueries({ queryKey: ['locations'] });
    },
    onError: (error, variables) => {
      console.error('🔢 QUANTITY UPDATE FAILED:', {
        error: error instanceof Error ? error.message : error,
        inventoryId: variables.inventoryId,
        newQuantity: variables.newQuantity,
        timestamp: new Date().toISOString(),
      });

      if (
        error instanceof Error &&
        (error.message.includes('fetch') ||
          error.message.includes('network') ||
          error.message.includes('timeout'))
      ) {
        // transient network error — TanStack Query will retry automatically
      }
    },
  });
}
