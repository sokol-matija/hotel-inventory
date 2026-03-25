import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryData } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { TablesInsert, TablesUpdate } from '@/lib/supabase';
import { queryKeys } from '../queryKeys';

// ─── Query definitions ──────────────────────────────────────────────────────────

const locationsQuery = supabase.from('locations').select('*').order('name');
const inventoryStatsQuery = supabase
  .from('inventory')
  .select('location_id, quantity, expiration_date, item:items(minimum_stock)');

type LocationRow = QueryData<typeof locationsQuery>[number];
type InventoryStatsRow = QueryData<typeof inventoryStatsQuery>[number];

// ─── Exported types ────────────────────────────────────────────────────────────

export interface LocationWithStats {
  id: number;
  name: string;
  type: string;
  description: string | null;
  is_refrigerated: boolean;
  inventory_count: number;
  low_stock_count: number;
  expiring_count: number;
  total_items: number;
}

// ─── Mapping helpers ───────────────────────────────────────────────────────────

function mapLocationWithStats(
  location: LocationRow,
  inventoryData: InventoryStatsRow[]
): LocationWithStats {
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  const today = new Date();

  const locationInventory = inventoryData.filter((inv) => inv.location_id === location.id);
  const totalItems = locationInventory.reduce((sum, item) => sum + item.quantity, 0);
  const inventoryCount = locationInventory.length;
  const lowStockCount = locationInventory.filter(
    (item) => item.item != null && item.quantity <= (item.item.minimum_stock ?? 0)
  ).length;
  const expiringCount = locationInventory.filter((item) => {
    if (!item.expiration_date) return false;
    const expDate = new Date(item.expiration_date);
    return expDate <= sevenDaysFromNow && expDate >= today;
  }).length;

  return {
    id: location.id,
    name: location.name,
    type: location.type ?? '',
    description: location.description,
    is_refrigerated: location.is_refrigerated ?? false,
    inventory_count: inventoryCount,
    low_stock_count: lowStockCount,
    expiring_count: expiringCount,
    total_items: totalItems,
  };
}

// ─── Service functions ─────────────────────────────────────────────────────────

async function fetchLocationsWithStats(): Promise<LocationWithStats[]> {
  const [locationsResult, inventoryResult] = await Promise.all([
    locationsQuery.throwOnError(),
    inventoryStatsQuery.throwOnError(),
  ]);

  return (locationsResult.data ?? []).map((location) =>
    mapLocationWithStats(location, inventoryResult.data ?? [])
  );
}

// ─── Hooks ─────────────────────────────────────────────────────────────────────

export function useLocationsWithStats() {
  return useQuery({
    queryKey: queryKeys.locations.withStats(),
    queryFn: fetchLocationsWithStats,
  });
}

export function useInvalidateLocations() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.locations.withStats() });
}

export function useCreateLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (location: TablesInsert<'locations'>) => {
      await supabase.from('locations').insert([location]).throwOnError();
    },
    onSettled: () => {
      return queryClient.invalidateQueries({ queryKey: queryKeys.locations.withStats() });
    },
  });
}

export function useUpdateLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: TablesUpdate<'locations'> }) => {
      await supabase.from('locations').update(updates).eq('id', id).throwOnError();
    },
    onSettled: () => {
      return queryClient.invalidateQueries({ queryKey: queryKeys.locations.withStats() });
    },
  });
}

export function useDeleteLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await supabase.from('locations').delete().eq('id', id).throwOnError();
    },
    onSettled: () => {
      return queryClient.invalidateQueries({ queryKey: queryKeys.locations.withStats() });
    },
  });
}
