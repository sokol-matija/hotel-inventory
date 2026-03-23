import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import { hotelDataService } from '../../hotel/services/HotelDataService';
import { Reservation, ReservationStatus, Guest } from '../../hotel/types';

/** Input shape for creating a new reservation via useCreateReservation */
export type NewReservationInput = Omit<Reservation, 'id' | 'bookingDate' | 'lastModified'> & {
  /** When true, a new guest will be created from the `guest` field before booking */
  isNewGuest?: boolean;
  /** Guest data used when isNewGuest is true */
  guest?: Partial<Guest>;
};

// ─── Query ────────────────────────────────────────────────────────────────────

export function useReservations() {
  return useQuery({
    queryKey: queryKeys.reservations.all(),
    queryFn: () => hotelDataService.getReservations(),
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useUpdateReservationStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ReservationStatus }) =>
      hotelDataService.updateReservation(id, { status }),

    // Optimistic update
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.reservations.all() });
      const previous = queryClient.getQueryData<Reservation[]>(queryKeys.reservations.all());
      queryClient.setQueryData<Reservation[]>(queryKeys.reservations.all(), (old = []) =>
        old.map((r) => (r.id === id ? { ...r, status } : r))
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.reservations.all(), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reservations.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.rooms.all() });
    },
  });
}

export function useUpdateReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Reservation> }) =>
      hotelDataService.updateReservation(id, updates),

    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.reservations.all() });
      const previous = queryClient.getQueryData<Reservation[]>(queryKeys.reservations.all());
      queryClient.setQueryData<Reservation[]>(queryKeys.reservations.all(), (old = []) =>
        old.map((r) => (r.id === id ? { ...r, ...updates } : r))
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.reservations.all(), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reservations.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.rooms.all() });
    },
  });
}

export function useUpdateReservationNotes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      hotelDataService.updateReservation(id, { specialRequests: notes }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reservations.all() });
    },
  });
}

export function useCreateReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (reservationData: NewReservationInput): Promise<Reservation> => {
      let guestId = reservationData.guestId;

      // Inline guest creation when booking a new guest
      if (reservationData.isNewGuest && reservationData.guest) {
        const g = reservationData.guest;
        const newGuest = await hotelDataService.createGuest({
          firstName: g.firstName,
          lastName: g.lastName || '',
          fullName: `${g.firstName} ${g.lastName || ''}`.trim(),
          email: g.email,
          phone: g.phone,
          nationality: g.nationality,
          preferredLanguage: g.preferredLanguage || 'en',
          dietaryRestrictions: [],
          hasPets: g.hasPets || false,
          vipLevel: 0,
          dateOfBirth: undefined,
          children: [],
          emergencyContactName: undefined,
          emergencyContactPhone: undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        guestId = newGuest.id;
      }

      return hotelDataService.createReservation({ ...reservationData, guestId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reservations.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.guests.all() });
    },
  });
}

export function useDeleteReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => hotelDataService.deleteReservation(id),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.reservations.all() });
      const previous = queryClient.getQueryData<Reservation[]>(queryKeys.reservations.all());
      queryClient.setQueryData<Reservation[]>(queryKeys.reservations.all(), (old = []) =>
        old.filter((r) => r.id !== id)
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.reservations.all(), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reservations.all() });
    },
  });
}
