import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryData } from '@supabase/supabase-js';
import { supabase } from '../../supabase';
import { queryKeys } from '../queryKeys';
import {
  createFullBooking,
  type CreateFullBookingInput,
} from '@/lib/hotel/services/BookingService';

// ─── Query builder ─────────────────────────────────────────────────────────────

function buildReservationsQuery() {
  return supabase
    .from('reservations')
    .select(
      `*,
      reservation_statuses!status_id(code),
      booking_sources!booking_source_id(code),
      guests!guest_id(id, first_name, last_name, full_name, email, phone, nationality, has_pets, is_vip, vip_level),
      labels!label_id(id, name, color, bg_color)`
    )
    .order('check_in_date');
}

// ─── Derived type ───────────────────────────────────────────────────────────────
// QueryData<> stays in sync with migrations automatically — no manual interface.

export type Reservation = QueryData<ReturnType<typeof buildReservationsQuery>>[number];

// ─── Input type for creating a reservation ─────────────────────────────────────

export interface NewReservationInput {
  room_id: number;
  guest_id: number;
  check_in_date: string; // YYYY-MM-DD
  check_out_date: string;
  adults: number;
  children_count?: number;
  number_of_guests?: number;
  /** Status code e.g. 'confirmed'. Defaults to 'confirmed'. */
  status?: string;
  /** Booking source code e.g. 'direct'. Defaults to 'direct'. */
  booking_source?: string;
  special_requests?: string;
  has_pets?: boolean;
  parking_required?: boolean;
  company_id?: number;
  pricing_tier_id?: number;
  label_id?: string;
  is_r1?: boolean;
  /** When true, creates a guest from guestData before booking. */
  isNewGuest?: boolean;
  guestData?: {
    first_name: string;
    last_name: string;
    email?: string | null;
    phone?: string | null;
    nationality?: string | null;
    date_of_birth?: string | null;
  };
}

// ─── Update input ───────────────────────────────────────────────────────────────

export interface ReservationUpdateInput {
  check_in_date?: string;
  check_out_date?: string;
  room_id?: number;
  adults?: number;
  children_count?: number;
  number_of_guests?: number;
  special_requests?: string;
  internal_notes?: string;
  label_id?: string | null;
  is_r1?: boolean;
  company_id?: number | null;
  pricing_tier_id?: number | null;
  has_pets?: boolean;
  parking_required?: boolean;
  checked_in_at?: string | null;
  checked_out_at?: string | null;
  /** Status code e.g. 'confirmed', 'checked_in'. Triggers status_id lookup. */
  status?: string;
}

// ─── Query ─────────────────────────────────────────────────────────────────────

export function useReservations() {
  return useQuery({
    queryKey: queryKeys.reservations.all(),
    queryFn: async () => {
      const { data } = await buildReservationsQuery().throwOnError();
      return data ?? [];
    },
  });
}

// ─── Mutations ─────────────────────────────────────────────────────────────────

export function useUpdateReservationStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const { data: statusRow } = await supabase
        .from('reservation_statuses')
        .select('id')
        .eq('code', status)
        .single();
      const { error } = await supabase
        .from('reservations')
        .update({ status_id: statusRow?.id })
        .eq('id', id);
      if (error) throw error;
    },

    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.reservations.all() });
      const previous = queryClient.getQueryData<Reservation[]>(queryKeys.reservations.all());
      queryClient.setQueryData<Reservation[]>(queryKeys.reservations.all(), (old = []) =>
        old.map((r) => (r.id === id ? { ...r, reservation_statuses: { code: status } } : r))
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous)
        queryClient.setQueryData(queryKeys.reservations.all(), context.previous);
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
    mutationFn: async ({ id, updates }: { id: number; updates: ReservationUpdateInput }) => {
      const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };

      if (updates.check_in_date !== undefined) dbUpdates.check_in_date = updates.check_in_date;
      if (updates.check_out_date !== undefined) dbUpdates.check_out_date = updates.check_out_date;
      if (updates.room_id !== undefined) dbUpdates.room_id = updates.room_id;
      if (updates.adults !== undefined) dbUpdates.adults = updates.adults;
      if (updates.children_count !== undefined) dbUpdates.children_count = updates.children_count;
      if (updates.number_of_guests !== undefined)
        dbUpdates.number_of_guests = updates.number_of_guests;
      if (updates.special_requests !== undefined)
        dbUpdates.special_requests = updates.special_requests;
      if (updates.internal_notes !== undefined) dbUpdates.internal_notes = updates.internal_notes;
      if (updates.label_id !== undefined) dbUpdates.label_id = updates.label_id ?? null;
      if (updates.is_r1 !== undefined) dbUpdates.is_r1 = updates.is_r1;
      if (updates.company_id !== undefined) dbUpdates.company_id = updates.company_id ?? null;
      if (updates.pricing_tier_id !== undefined)
        dbUpdates.pricing_tier_id = updates.pricing_tier_id ?? null;
      if (updates.has_pets !== undefined) dbUpdates.has_pets = updates.has_pets;
      if (updates.parking_required !== undefined)
        dbUpdates.parking_required = updates.parking_required;
      if (updates.checked_in_at !== undefined) dbUpdates.checked_in_at = updates.checked_in_at;
      if (updates.checked_out_at !== undefined) dbUpdates.checked_out_at = updates.checked_out_at;

      if (updates.status) {
        const { data: statusRow } = await supabase
          .from('reservation_statuses')
          .select('id')
          .eq('code', updates.status)
          .single();
        if (statusRow) dbUpdates.status_id = statusRow.id;
      }

      const { error } = await supabase.from('reservations').update(dbUpdates).eq('id', id);
      if (error) throw error;
    },

    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.reservations.all() });
      const previous = queryClient.getQueryData<Reservation[]>(queryKeys.reservations.all());
      queryClient.setQueryData<Reservation[]>(queryKeys.reservations.all(), (old = []) =>
        old.map((r) =>
          r.id === id
            ? {
                ...r,
                ...updates,
                ...(updates.status ? { reservation_statuses: { code: updates.status } } : {}),
              }
            : r
        )
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous)
        queryClient.setQueryData(queryKeys.reservations.all(), context.previous);
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
    mutationFn: async ({ id, notes }: { id: number; notes: string }) => {
      await supabase
        .from('reservations')
        .update({ internal_notes: notes })
        .eq('id', id)
        .throwOnError();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reservations.all() });
    },
  });
}

export function useCreateReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewReservationInput): Promise<Reservation> => {
      let guestId = input.guest_id;

      if (input.isNewGuest && input.guestData) {
        const { data: newGuest, error: guestError } = await supabase
          .from('guests')
          .insert({
            first_name: input.guestData.first_name,
            last_name: input.guestData.last_name,
            email: input.guestData.email ?? null,
            phone: input.guestData.phone ?? null,
            nationality: input.guestData.nationality ?? null,
            date_of_birth: input.guestData.date_of_birth ?? null,
          })
          .select('id')
          .single();
        if (guestError) throw guestError;
        guestId = newGuest.id;
      }

      const { data: statusRow } = await supabase
        .from('reservation_statuses')
        .select('id')
        .eq('code', input.status ?? 'confirmed')
        .single();
      const { data: sourceRow } = await supabase
        .from('booking_sources')
        .select('id')
        .eq('code', input.booking_source ?? 'direct')
        .single();

      const { data: created, error } = await supabase
        .from('reservations')
        .insert({
          guest_id: guestId,
          room_id: input.room_id,
          check_in_date: input.check_in_date,
          check_out_date: input.check_out_date,
          adults: input.adults,
          children_count: input.children_count ?? 0,
          number_of_guests: input.number_of_guests ?? input.adults + (input.children_count ?? 0),
          status_id: statusRow?.id,
          booking_source_id: sourceRow?.id,
          special_requests: input.special_requests ?? null,
          has_pets: input.has_pets ?? false,
          parking_required: input.parking_required ?? false,
          company_id: input.company_id ?? null,
          pricing_tier_id: input.pricing_tier_id ?? null,
          is_r1: input.is_r1 ?? false,
          label_id: input.label_id ?? null,
        })
        .select('id')
        .single();
      if (error) throw error;

      const { data: full, error: fetchError } = await buildReservationsQuery()
        .eq('id', created.id)
        .single();
      if (fetchError) throw fetchError;
      return full;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reservations.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.guests.all() });
    },
  });
}

export function useDeleteReservation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await supabase.from('reservations').delete().eq('id', id).throwOnError();
    },

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.reservations.all() });
      const previous = queryClient.getQueryData<Reservation[]>(queryKeys.reservations.all());
      queryClient.setQueryData<Reservation[]>(queryKeys.reservations.all(), (old = []) =>
        old.filter((r) => r.id !== id)
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      const ctx = context as { previous?: Reservation[] } | undefined;
      if (ctx?.previous) queryClient.setQueryData(queryKeys.reservations.all(), ctx.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reservations.all() });
    },
  });
}

export function useBatchDeleteReservations() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: number[]) => {
      if (ids.length === 0) return;
      await supabase.from('reservation_charges').delete().in('reservation_id', ids).throwOnError();
      await supabase.from('reservations').delete().in('id', ids).throwOnError();
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reservations.all() });
    },
  });
}

// ─── Create Full Booking (multi-guest with charges and junction tables) ─────────

export { type CreateFullBookingInput };

export function useCreateFullBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createFullBooking,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reservations.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.rooms.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.guests.all() });
    },
  });
}
