import { useQuery } from '@tanstack/react-query';
import { QueryData } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '../queryKeys';

// ─── Query definition ──────────────────────────────────────────────────────────

const availableOrderItemsQuery = supabase
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
  .eq('is_active', true)
  .eq('categories.name', 'Food & Beverage');

// ─── Derived types ─────────────────────────────────────────────────────────────

type RawOrderItem = QueryData<typeof availableOrderItemsQuery>[number];

// ─── Domain type ───────────────────────────────────────────────────────────────

export interface AvailableOrderItem {
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

function mapToAvailableOrderItem(item: RawOrderItem): AvailableOrderItem {
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

async function fetchAvailableOrderItems(): Promise<AvailableOrderItem[]> {
  const { data } = await availableOrderItemsQuery.throwOnError();
  return (data ?? []).map(mapToAvailableOrderItem).filter((item) => item.totalStock > 0);
}

// ─── Hooks ─────────────────────────────────────────────────────────────────────

export function useAvailableOrderItems() {
  return useQuery({
    queryKey: queryKeys.orders.availableItems(),
    queryFn: fetchAvailableOrderItems,
  });
}
