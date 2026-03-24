import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { auditLog } from '@/lib/auditLog';
import { queryKeys } from '../queryKeys';

async function fetchItemsWithCounts() {
  const [categoriesResult, itemsResult, inventoryResult] = await Promise.all([
    supabase.from('categories').select('*').order('name'),
    supabase
      .from('items')
      .select('*, category:categories(id, name, requires_expiration)')
      .eq('is_active', true)
      .order('name'),
    supabase.from('inventory').select('item_id, quantity'),
  ]);

  if (categoriesResult.error) throw categoriesResult.error;
  if (itemsResult.error) throw itemsResult.error;
  if (inventoryResult.error) throw inventoryResult.error;

  const itemsWithCounts = (itemsResult.data ?? []).map((item) => {
    const itemInventory = inventoryResult.data?.filter((inv) => inv.item_id === item.id) ?? [];
    return {
      ...item,
      inventory_count: itemInventory.length,
      total_quantity: itemInventory.reduce((sum, inv) => sum + inv.quantity, 0),
    };
  });

  return {
    categories: categoriesResult.data ?? [],
    items: itemsWithCounts,
  };
}

export function useItemsWithCounts() {
  return useQuery({
    queryKey: queryKeys.items.withCounts(),
    queryFn: fetchItemsWithCounts,
  });
}

async function fetchActiveItems() {
  const { data, error } = await supabase
    .from('items')
    .select('id, name, unit, categories!inner(name, requires_expiration)')
    .eq('is_active', true)
    .order('name');

  if (error) throw error;

  return (data ?? []).map((item) => ({
    ...item,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    category: (item as any).categories,
  }));
}

export function useActiveItems(enabled = true) {
  return useQuery({
    queryKey: queryKeys.items.active(),
    queryFn: fetchActiveItems,
    enabled,
  });
}

interface DeleteItemParams {
  id: number;
  name: string;
  description: string | null;
  category: { name: string };
  unit: string | null;
  price: number | null;
  minimum_stock: number | null;
}

export function useDeleteItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (item: DeleteItemParams) => {
      const { error } = await supabase.from('items').update({ is_active: false }).eq('id', item.id);
      if (error) throw error;
      try {
        await auditLog.itemDeleted(item.id, {
          name: item.name,
          description: item.description,
          category: item.category.name,
          unit: item.unit,
          price: item.price,
          minimum_stock: item.minimum_stock,
        });
      } catch (auditError) {
        console.error('Audit log failed for item delete:', auditError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.items.withCounts() });
    },
  });
}
