import { useQuery } from '@tanstack/react-query';
import { OrdersService } from '@/lib/services/OrdersService';
import { queryKeys } from '../queryKeys';

export function useAvailableOrderItems() {
  return useQuery({
    queryKey: queryKeys.orders.availableItems(),
    queryFn: () => OrdersService.getInstance().loadAvailableItems(),
  });
}
