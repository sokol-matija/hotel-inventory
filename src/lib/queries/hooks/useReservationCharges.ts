import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QueryData } from '@supabase/supabase-js';
import { queryKeys } from '../queryKeys';
import { supabase } from '../../supabase';
import type { TablesInsert, TablesUpdate } from '../../supabase';
import { ReservationCharge, ChargeType } from '../../hotel/types';

// ─── Query definition ──────────────────────────────────────────────────────────

const chargesQuery = supabase.from('reservation_charges').select('*').order('created_at');

// ─── Derived types ──────────────────────────────────────────────────────────────

export type ReservationChargeRow = QueryData<typeof chargesQuery>[number];

// ─── Mapping helpers ──────────────────────────────────────────────────────────

function mapChargeFromDB(row: ReservationChargeRow): ReservationCharge {
  return {
    id: row.id,
    reservationId: row.reservation_id,
    chargeType: row.charge_type as ChargeType,
    description: row.description,
    quantity: Number(row.quantity),
    unitPrice: Number(row.unit_price),
    total: Number(row.total),
    vatRate: Number(row.vat_rate ?? 0.13),
    stayDate: row.stay_date,
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── Service functions ─────────────────────────────────────────────────────────

async function fetchCharges(reservationId: number): Promise<ReservationCharge[]> {
  const { data } = await chargesQuery
    .eq('reservation_id', reservationId)
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true })
    .throwOnError();
  return (data ?? []).map(mapChargeFromDB);
}

async function insertCharge(
  charge: Omit<TablesInsert<'reservation_charges'>, 'id'>
): Promise<ReservationCharge> {
  const { data } = await supabase
    .from('reservation_charges')
    .insert(charge)
    .select()
    .single()
    .throwOnError();
  return mapChargeFromDB(data);
}

async function updateCharge(
  id: number,
  updates: TablesUpdate<'reservation_charges'>
): Promise<ReservationCharge> {
  const { data } = await supabase
    .from('reservation_charges')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
    .throwOnError();
  return mapChargeFromDB(data);
}

async function deleteCharge(id: number): Promise<void> {
  await supabase.from('reservation_charges').delete().eq('id', id).throwOnError();
}

async function replaceCharges(
  reservationId: number,
  charges: Omit<TablesInsert<'reservation_charges'>, 'id' | 'reservation_id'>[]
): Promise<ReservationCharge[]> {
  // Delete all existing charges then insert the new set atomically
  await supabase
    .from('reservation_charges')
    .delete()
    .eq('reservation_id', reservationId)
    .throwOnError();

  if (charges.length === 0) return [];

  const { data } = await supabase
    .from('reservation_charges')
    .insert(charges.map((c) => ({ ...c, reservation_id: reservationId })))
    .select()
    .throwOnError();
  return (data ?? []).map(mapChargeFromDB);
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useReservationCharges(reservationId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.reservationCharges.byReservation(reservationId ?? 0),
    queryFn: () => fetchCharges(reservationId!),
    enabled: reservationId != null && reservationId > 0,
  });
}

export function useCreateCharge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (charge: Omit<TablesInsert<'reservation_charges'>, 'id'>) => insertCharge(charge),
    onSettled: (_data, _err, variables) => {
      return Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.reservationCharges.byReservation(variables.reservation_id),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.reservations.all() }),
      ]);
    },
  });
}

export function useUpdateCharge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: TablesUpdate<'reservation_charges'> }) =>
      updateCharge(id, updates),
    onSettled: (_data, _err, variables) => {
      // Invalidate the reservation charges for the reservation this charge belongs to
      const reservationId = _data?.reservationId ?? variables.updates.reservation_id;
      if (reservationId != null) {
        return queryClient.invalidateQueries({
          queryKey: queryKeys.reservationCharges.byReservation(reservationId),
        });
      }
    },
  });
}

export function useDeleteCharge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number; reservationId: number }) => deleteCharge(id),
    onSettled: (_data, _err, variables) => {
      return Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.reservationCharges.byReservation(variables.reservationId),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.reservations.all() }),
      ]);
    },
  });
}

export function useReplaceCharges() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      reservationId,
      charges,
    }: {
      reservationId: number;
      charges: Omit<TablesInsert<'reservation_charges'>, 'id' | 'reservation_id'>[];
    }) => replaceCharges(reservationId, charges),
    onSettled: (_data, _err, variables) => {
      return Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.reservationCharges.byReservation(variables.reservationId),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.reservations.all() }),
      ]);
    },
  });
}
