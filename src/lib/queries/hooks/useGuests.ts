import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { queryKeys } from '../queryKeys';
import { hotelDataService } from '../../hotel/services/HotelDataService';
import { Guest } from '../../hotel/types';

export function useGuests() {
  return useQuery({
    queryKey: queryKeys.guests.all(),
    queryFn: () => hotelDataService.getGuests(),
  });
}

/** Client-side search over cached guests — no extra network request. */
export function useGuestSearch(query: string) {
  const { data: guests = [], ...rest } = useGuests();

  const results = useMemo(() => {
    if (!query.trim()) return guests;
    const q = query.toLowerCase();
    return guests.filter(
      (g) =>
        g.fullName.toLowerCase().includes(q) ||
        (g.email ?? '').toLowerCase().includes(q) ||
        (g.phone ?? '').includes(q) ||
        (g.nationality ?? '').toLowerCase().includes(q)
    );
  }, [guests, query]);

  return { data: results, ...rest };
}

export function useCreateGuest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (guestData: Omit<Guest, 'id' | 'totalStays' | 'isVip'>) =>
      hotelDataService.createGuest(guestData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.guests.all() });
    },
  });
}

export function useUpdateGuest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Guest> }) =>
      hotelDataService.updateGuest(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.guests.all() });
    },
  });
}
