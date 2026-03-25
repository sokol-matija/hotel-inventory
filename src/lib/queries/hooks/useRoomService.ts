import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryData } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { processRoomServiceOrder } from '@/lib/hotel/orderService';
import type { RoomServiceOrder } from '@/lib/hotel/orderTypes';
import { queryKeys } from '../queryKeys';

// ─── Query definition ──────────────────────────────────────────────────────────

const foodAndBeverageItemsQuery = supabase
  .from('items')
  .select(
    `
    id,
    name,
    description,
    unit,
    price,
    minimum_stock,
    is_active,
    category:categories(id, name, requires_expiration),
    inventory(
      location_id,
      quantity,
      expiration_date,
      location:locations(id, name)
    )
  `
  )
  .eq('is_active', true);

// ─── Derived types ─────────────────────────────────────────────────────────────

type RawFoodAndBeverageItem = QueryData<typeof foodAndBeverageItemsQuery>[number];

// ─── Domain type ───────────────────────────────────────────────────────────────

export interface FoodAndBeverageItem {
  id: number;
  name: string;
  description?: string;
  category: {
    id: number;
    name: string;
    requires_expiration: boolean;
  };
  unit: string;
  price: number;
  minimum_stock: number;
  is_active: boolean;
  totalStock: number;
  locations: Array<{
    locationId: number;
    locationName: string;
    quantity: number;
    expiration_date?: string;
  }>;
}

// ─── Mapping helpers ───────────────────────────────────────────────────────────

function mapToFoodAndBeverageItem(item: RawFoodAndBeverageItem): FoodAndBeverageItem {
  const totalStock =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (item.inventory as any[])?.reduce(
      (sum: number, inv: { quantity: number | null }) => sum + (inv.quantity || 0),
      0
    ) || 0;

  return {
    id: item.id,
    name: item.name,
    description: item.description ?? undefined,
    category: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      id: (item.category as any).id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      name: (item.category as any).name,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      requires_expiration: (item.category as any).requires_expiration,
    },
    unit: item.unit ?? '',
    price: item.price || 0,
    minimum_stock: item.minimum_stock ?? 0,
    is_active: item.is_active ?? false,
    totalStock,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    locations:
      (item.inventory as any[])?.map((inv: any) => ({
        locationId: inv.location_id,
        locationName: inv.location?.name || 'Unknown',
        quantity: inv.quantity || 0,
        expiration_date: inv.expiration_date ?? undefined,
      })) || [],
  };
}

// ─── Service functions ─────────────────────────────────────────────────────────

async function fetchFoodAndBeverageItems(): Promise<FoodAndBeverageItem[]> {
  const { data } = await foodAndBeverageItemsQuery.throwOnError();
  return (data ?? []).map(mapToFoodAndBeverageItem).filter((item) => item.totalStock > 0);
}

// ─── Hooks ─────────────────────────────────────────────────────────────────────

export function useFoodAndBeverageItems() {
  return useQuery({
    queryKey: queryKeys.roomService.foodAndBeverage(),
    queryFn: fetchFoodAndBeverageItems,
  });
}

export function useProcessRoomServiceOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderData: Omit<RoomServiceOrder, 'id' | 'orderNumber' | 'orderedAt'>) =>
      processRoomServiceOrder(orderData),
    onSettled: () => {
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.roomService.foodAndBeverage() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all() }),
      ]);
    },
  });
}
