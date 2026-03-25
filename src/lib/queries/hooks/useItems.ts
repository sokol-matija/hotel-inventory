import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryData } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { TablesInsert, TablesUpdate } from '@/lib/supabase';
import { auditLog } from '@/lib/auditLog';
import { queryKeys } from '../queryKeys';

// ─── Query definitions ──────────────────────────────────────────────────────────

const itemsWithCategoryQuery = supabase
  .from('items')
  .select('*, category:categories(id, name, requires_expiration)')
  .eq('is_active', true)
  .order('name');

const activeItemsQuery = supabase
  .from('items')
  .select('id, name, unit, category:categories!inner(name, requires_expiration)')
  .eq('is_active', true)
  .order('name');

const categoriesQuery = supabase.from('categories').select('*').order('name');

// ─── Derived types ─────────────────────────────────────────────────────────────

type ItemBase = QueryData<typeof itemsWithCategoryQuery>[number];

export type ItemWithCategory = ItemBase & {
  inventory_count: number;
  total_quantity: number;
};

export type ActiveItem = QueryData<typeof activeItemsQuery>[number];
export type Category = QueryData<typeof categoriesQuery>[number];

// ─── Mutation param types ──────────────────────────────────────────────────────

interface DeleteItemParams {
  id: number;
  name: string;
  description: string | null;
  category: { name: string } | null;
  unit: string | null;
  price: number | null;
  minimum_stock: number | null;
}

interface UpdateItemParams {
  id: number;
  data: TablesUpdate<'items'>;
  oldData: TablesUpdate<'items'>;
}

// ─── Service functions ─────────────────────────────────────────────────────────

async function fetchItemsWithCounts(): Promise<ItemWithCategory[]> {
  const [itemsResult, inventoryResult] = await Promise.all([
    itemsWithCategoryQuery.throwOnError(),
    supabase.from('inventory').select('item_id, quantity').throwOnError(),
  ]);

  return (itemsResult.data ?? []).map((item) => {
    const itemInventory = inventoryResult.data?.filter((inv) => inv.item_id === item.id) ?? [];
    return {
      ...item,
      inventory_count: itemInventory.length,
      total_quantity: itemInventory.reduce((sum, inv) => sum + inv.quantity, 0),
    };
  });
}

async function fetchActiveItems(): Promise<ActiveItem[]> {
  const { data } = await activeItemsQuery.throwOnError();
  return data ?? [];
}

async function fetchCategoriesData(): Promise<Category[]> {
  const { data } = await categoriesQuery.throwOnError();
  return data ?? [];
}

// ─── Hooks ─────────────────────────────────────────────────────────────────────

export function useItemsWithCounts() {
  return useQuery({
    queryKey: queryKeys.items.withCounts(),
    queryFn: fetchItemsWithCounts,
  });
}

export function useActiveItems(enabled = true) {
  return useQuery({
    queryKey: queryKeys.items.active(),
    queryFn: fetchActiveItems,
    enabled,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: queryKeys.categories.all(),
    queryFn: fetchCategoriesData,
  });
}

// ─── Mutations ─────────────────────────────────────────────────────────────────

export function useDeleteItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (item: DeleteItemParams) => {
      await supabase.from('items').update({ is_active: false }).eq('id', item.id).throwOnError();
      try {
        await auditLog.itemDeleted(item.id, {
          name: item.name,
          description: item.description,
          category: item.category?.name ?? '',
          unit: item.unit,
          price: item.price,
          minimum_stock: item.minimum_stock,
        });
      } catch (auditError) {
        console.error('Audit log failed for item delete:', auditError);
      }
    },
    onSettled: () => {
      return queryClient.invalidateQueries({ queryKey: queryKeys.items.withCounts() });
    },
  });
}

export function useCreateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (item: TablesInsert<'items'>) => {
      const { data } = await supabase.from('items').insert([item]).select().throwOnError();
      try {
        if (data?.[0]) {
          await auditLog.itemCreated(data[0].id, item as unknown as Record<string, unknown>);
        }
      } catch (auditError) {
        console.error('Audit log failed for item create:', auditError);
      }
      return data?.[0];
    },
    onSettled: () => {
      return queryClient.invalidateQueries({ queryKey: queryKeys.items.withCounts() });
    },
  });
}

export function useUpdateItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data, oldData }: UpdateItemParams) => {
      await supabase.from('items').update(data).eq('id', id).throwOnError();
      try {
        await auditLog.itemUpdated(id, oldData, data);
      } catch (auditError) {
        console.error('Audit log failed for item update:', auditError);
      }
    },
    onSettled: () => {
      return queryClient.invalidateQueries({ queryKey: queryKeys.items.withCounts() });
    },
  });
}
