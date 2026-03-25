import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryData } from '@supabase/supabase-js';
import { supabase } from '../../supabase';
import { queryKeys } from '../queryKeys';
import { hotelDataService } from '../../hotel/services/HotelDataService';
import type { Guest } from './useGuests';
import type {
  Label,
  ReservationStatus,
  BookingSource,
  SeasonalPeriod,
  GuestChild,
  RoomServiceItem,
} from '../../hotel/types';

// ─── Query builder function ──────────────────────────────────────────────────

function buildReservationsQuery() {
  return supabase
    .from('reservations')
    .select(
      `
      *,
      reservation_statuses!status_id(code),
      booking_sources!booking_source_id(code),
      guests!guest_id(id, first_name, last_name, full_name, email, phone, nationality, has_pets, is_vip, vip_level),
      labels!label_id(id, name, color, bg_color)
    `
    )
    .order('check_in_date');
}

// ─── Derived row type ────────────────────────────────────────────────────────

type ReservationRow = QueryData<ReturnType<typeof buildReservationsQuery>>[number];

// ─── Reservation interface ────────────────────────────────────────────────────

export interface Reservation {
  id: string;
  roomId: string;
  guestId: string;
  guest?: Guest;
  checkIn: Date;
  checkOut: Date;
  numberOfGuests: number;
  adults: number;
  children: GuestChild[];
  status: ReservationStatus;
  bookingSource: BookingSource;
  specialRequests: string;
  isR1Bill?: boolean;
  companyId?: string;
  pricingTierId?: string;
  numberOfNights: number;
  /** @deprecated Use ReservationCharge rows instead */
  pricing?: {
    subtotal: number;
    tourismTax: number;
    vatRate: number;
    vatAmount: number;
    roomRate: number;
    seasonalPeriod: SeasonalPeriod;
    discounts: number;
    additionalCharges: number;
    total: number;
  };
  /** @deprecated Use ReservationCharge rows instead */
  seasonalPeriod: SeasonalPeriod;
  /** @deprecated Use ReservationCharge rows instead */
  baseRoomRate: number;
  /** @deprecated Use ReservationCharge rows instead */
  subtotal: number;
  /** @deprecated Use ReservationCharge rows instead */
  childrenDiscounts: number;
  /** @deprecated Use ReservationCharge rows instead */
  tourismTax: number;
  /** @deprecated Use ReservationCharge rows instead */
  vatAmount: number;
  /** @deprecated Use ReservationCharge rows instead */
  petFee: number;
  /** @deprecated Use ReservationCharge rows instead */
  parkingFee: number;
  /** @deprecated Use ReservationCharge rows instead */
  shortStaySuplement: number;
  /** @deprecated Use ReservationCharge rows instead */
  additionalCharges: number;
  /** @deprecated Use ReservationCharge rows instead */
  roomServiceItems: RoomServiceItem[];
  /** @deprecated Use ReservationCharge rows instead */
  totalAmount: number;
  /** @deprecated Use ReservationCharge rows instead */
  paymentStatus?: string;
  hasPets?: boolean;
  checkedInAt?: Date;
  checkedOutAt?: Date;
  bookingDate: Date;
  lastModified: Date;
  notes: string;
  labelId?: string;
  label?: Label;
}

// ─── Input type ────────────────────────────────────────────────────────────

/** Input shape for creating a new reservation via useCreateReservation */
export type NewReservationInput = Omit<Reservation, 'id' | 'bookingDate' | 'lastModified'> & {
  /** When true, a new guest will be created from the `guest` field before booking */
  isNewGuest?: boolean;
  /** Guest data used when isNewGuest is true */
  guest?: Partial<Guest>;
};

// ─── Mapper function ────────────────────────────────────────────────────────

function mapReservationFromRow(row: ReservationRow): Reservation {
  // Map guest if present in join
  const guest: Guest | undefined = row.guests
    ? {
        id: row.guests.id,
        first_name: row.guests.first_name,
        last_name: row.guests.last_name,
        full_name: row.guests.full_name,
        email: row.guests.email,
        phone: row.guests.phone,
        nationality: row.guests.nationality,
        date_of_birth: null,
        passport_number: null,
        id_card_number: null,
        preferred_language: null,
        dietary_restrictions: null,
        special_needs: null,
        has_pets: row.guests.has_pets,
        is_vip: row.guests.is_vip,
        vip_level: row.guests.vip_level,
        marketing_consent: null,
        average_rating: null,
        notes: null,
        country_code: null,
        created_at: null,
        updated_at: null,
        display_name:
          row.guests.full_name || `${row.guests.first_name} ${row.guests.last_name}`.trim(),
      }
    : undefined;

  // Map label if present in join
  const label: Label | undefined = row.labels
    ? {
        id: row.labels.id,
        hotelId: '',
        name: row.labels.name,
        color: row.labels.color ?? '#000000',
        bgColor: row.labels.bg_color ?? '#FFFFFF',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    : undefined;

  return {
    id: row.id.toString(),
    roomId: row.room_id.toString(),
    guestId: row.guest_id.toString(),
    guest,
    checkIn: new Date(row.check_in_date),
    checkOut: new Date(row.check_out_date),
    numberOfGuests: row.number_of_guests,
    adults: row.adults,
    children: [],
    status: (row.reservation_statuses?.code ?? 'confirmed') as ReservationStatus,
    bookingSource: (row.booking_sources?.code ?? 'direct') as BookingSource,
    specialRequests: row.special_requests ?? '',
    isR1Bill: row.is_r1 ?? false,
    companyId: row.company_id != null ? row.company_id.toString() : undefined,
    pricingTierId: row.pricing_tier_id != null ? row.pricing_tier_id.toString() : undefined,
    numberOfNights: row.number_of_nights ?? 1,
    // Deprecated pricing fields — all zeros/defaults
    seasonalPeriod: 'A' as SeasonalPeriod,
    baseRoomRate: 0,
    subtotal: 0,
    childrenDiscounts: 0,
    tourismTax: 0,
    vatAmount: 0,
    petFee: 0,
    parkingFee: 0,
    shortStaySuplement: 0,
    additionalCharges: 0,
    roomServiceItems: [],
    totalAmount: 0,
    paymentStatus: undefined,
    pricing: undefined,
    hasPets: row.has_pets ?? false,
    checkedInAt: row.checked_in_at ? new Date(row.checked_in_at) : undefined,
    checkedOutAt: row.checked_out_at ? new Date(row.checked_out_at) : undefined,
    bookingDate: new Date(row.booking_date ?? row.created_at ?? new Date().toISOString()),
    lastModified: new Date(row.last_modified ?? row.updated_at ?? new Date().toISOString()),
    notes: row.internal_notes ?? '',
    labelId: row.label_id ?? undefined,
    label,
  };
}

// ─── Service function ──────────────────────────────────────────────────────

async function fetchReservations(): Promise<Reservation[]> {
  const reservationsQuery = buildReservationsQuery();
  const { data } = await reservationsQuery.throwOnError();
  return (data ?? []).map(mapReservationFromRow);
}

// ─── Query ────────────────────────────────────────────────────────────────────

export function useReservations() {
  return useQuery({
    queryKey: queryKeys.reservations.all(),
    queryFn: fetchReservations,
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
          first_name: g.first_name ?? '',
          last_name: g.last_name ?? '',
          full_name: g.full_name ?? `${g.first_name ?? ''} ${g.last_name ?? ''}`.trim(),
          email: g.email ?? null,
          phone: g.phone ?? null,
          nationality: g.nationality ?? null,
          preferred_language: g.preferred_language ?? 'en',
          dietary_restrictions: null,
          has_pets: g.has_pets ?? null,
          is_vip: null,
          vip_level: null,
          date_of_birth: null,
          passport_number: null,
          id_card_number: null,
          special_needs: null,
          marketing_consent: null,
          average_rating: null,
          notes: null,
          country_code: null,
          created_at: null,
          updated_at: null,
        });
        guestId = String(newGuest.id);
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
