import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getFoodAndBeverageItems, processRoomServiceOrder } from '@/lib/hotel/orderService';
import { RoomServiceOrder } from '@/lib/hotel/orderTypes';
import { queryKeys } from '../queryKeys';

export function useFoodAndBeverageItems() {
  return useQuery({
    queryKey: queryKeys.roomService.foodAndBeverage(),
    queryFn: getFoodAndBeverageItems,
  });
}

export function useProcessRoomServiceOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderData: Omit<RoomServiceOrder, 'id' | 'orderNumber' | 'orderedAt'>) =>
      processRoomServiceOrder(orderData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roomService.foodAndBeverage() });
      queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all() });
    },
  });
}
