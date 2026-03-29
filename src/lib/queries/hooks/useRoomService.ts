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

type CategoryJoin = { id: number; name: string; requires_expiration: boolean };
type InventoryJoin = {
  location_id: number;
  quantity: number | null;
  expiration_date: string | null;
  location: { id: number; name: string } | null;
};

function mapToFoodAndBeverageItem(item: RawFoodAndBeverageItem): FoodAndBeverageItem {
  const inventoryArr = item.inventory as unknown as InventoryJoin[] | null;
  const totalStock = inventoryArr?.reduce((sum, inv) => sum + (inv.quantity || 0), 0) || 0;

  const cat = item.category as unknown as CategoryJoin;
  return {
    id: item.id,
    name: item.name,
    description: item.description ?? undefined,
    category: {
      id: cat.id,
      name: cat.name,
      requires_expiration: cat.requires_expiration,
    },
    unit: item.unit ?? '',
    price: item.price || 0,
    minimum_stock: item.minimum_stock ?? 0,
    is_active: item.is_active ?? false,
    totalStock,
    locations:
      inventoryArr?.map((inv) => ({
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

// ─── Fridge Items (refrigerated inventory for room service drinks) ──────────────

const fridgeItemsQuery = supabase
  .from('items')
  .select(
    `
    id, name, description, unit, price, minimum_stock, is_active,
    category:categories(id, name, requires_expiration),
    inventory(id, location_id, quantity, expiration_date, location:locations(id, name, is_refrigerated))
  `
  )
  .eq('is_active', true);

type RawFridgeItem = QueryData<typeof fridgeItemsQuery>[number];

export interface FridgeInventoryItem {
  id: number;
  name: string;
  description?: string | null;
  category: { id: number; name: string; requires_expiration: boolean };
  unit: string;
  price: number;
  minimum_stock: number;
  is_active: boolean;
  inventory: Array<{
    id: number;
    location_id: number;
    quantity: number;
    originalQuantity: number;
    expiration_date?: string | null;
    location: { id: number; name: string };
  }>;
  totalStock: number;
  availableStock: number;
}

type FridgeInventoryJoin = {
  id: number;
  location_id: number;
  quantity: number;
  expiration_date: string | null;
  location: { id: number; name: string; is_refrigerated: boolean } | null;
};

function mapFridgeItem(item: RawFridgeItem): FridgeInventoryItem | null {
  const allInventory = (item.inventory as unknown as FridgeInventoryJoin[]) ?? [];
  const fridgeInventory = allInventory.filter(
    (inv) => inv.location?.is_refrigerated && inv.quantity > 0
  );
  if (fridgeInventory.length === 0) return null;
  const totalStock = fridgeInventory.reduce((sum, inv) => sum + inv.quantity, 0);
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    category: item.category as unknown as CategoryJoin,
    unit: item.unit ?? '',
    price: item.price ?? 0,
    minimum_stock: item.minimum_stock ?? 0,
    is_active: item.is_active ?? false,
    inventory: fridgeInventory.map((inv) => ({
      id: inv.id,
      location_id: inv.location_id,
      quantity: inv.quantity,
      originalQuantity: inv.quantity,
      expiration_date: inv.expiration_date,
      // location is guaranteed non-null here because we filtered on inv.location?.is_refrigerated above
      location: inv.location!,
    })),
    totalStock,
    availableStock: totalStock,
  };
}

export function useFridgeItems(enabled = true) {
  return useQuery({
    queryKey: queryKeys.roomService.fridgeItems(),
    queryFn: async () => {
      const { data } = await fridgeItemsQuery.throwOnError();
      return (data ?? [])
        .map(mapFridgeItem)
        .filter((item): item is FridgeInventoryItem => item !== null);
    },
    enabled,
  });
}
