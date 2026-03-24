import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '../queryKeys';

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

async function fetchLocationsWithStats(): Promise<LocationWithStats[]> {
  const { data: locationsData, error: locationsError } = await supabase
    .from('locations')
    .select('*')
    .order('name');

  if (locationsError) throw locationsError;

  const { data: inventoryData, error: inventoryError } = await supabase
    .from('inventory')
    .select('location_id, quantity, expiration_date, item:items(minimum_stock)');

  if (inventoryError && inventoryError.code !== 'PGRST116') throw inventoryError;

  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  const today = new Date();

  return (locationsData ?? []).map((location) => {
    const locationInventory = inventoryData?.filter((inv) => inv.location_id === location.id) ?? [];
    const totalItems = locationInventory.reduce((sum, item) => sum + item.quantity, 0);
    const inventoryCount = locationInventory.length;
    const lowStockCount = locationInventory.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (item) => item.item && item.quantity <= (item.item as any).minimum_stock
    ).length;
    const expiringCount = locationInventory.filter((item) => {
      if (!item.expiration_date) return false;
      const expDate = new Date(item.expiration_date);
      return expDate <= sevenDaysFromNow && expDate >= today;
    }).length;

    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ...(location as any),
      inventory_count: inventoryCount,
      low_stock_count: lowStockCount,
      expiring_count: expiringCount,
      total_items: totalItems,
    };
  });
}

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
