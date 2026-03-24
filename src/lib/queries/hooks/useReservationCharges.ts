import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../queryKeys';
import { supabase, Database } from '../../supabase';
import { ReservationCharge, ChargeType } from '../../hotel/types';

type ChargeRow = Database['public']['Tables']['reservation_charges']['Row'];
type ChargeInsert = Database['public']['Tables']['reservation_charges']['Insert'];
type ChargeUpdate = Database['public']['Tables']['reservation_charges']['Update'];

function mapChargeFromDB(row: ChargeRow): ReservationCharge {
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

async function fetchCharges(reservationId: number): Promise<ReservationCharge[]> {
  const { data, error } = await supabase
    .from('reservation_charges')
    .select('*')
    .eq('reservation_id', reservationId)
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(mapChargeFromDB);
}

async function insertCharge(charge: Omit<ChargeInsert, 'id'>): Promise<ReservationCharge> {
  const { data, error } = await supabase
    .from('reservation_charges')
    .insert(charge)
    .select()
    .single();
  if (error) throw error;
  return mapChargeFromDB(data);
}

async function updateCharge(id: number, updates: ChargeUpdate): Promise<ReservationCharge> {
  const { data, error } = await supabase
    .from('reservation_charges')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return mapChargeFromDB(data);
}

async function deleteCharge(id: number): Promise<void> {
  const { error } = await supabase.from('reservation_charges').delete().eq('id', id);
  if (error) throw error;
}

async function replaceCharges(
  reservationId: number,
  charges: Omit<ChargeInsert, 'id' | 'reservation_id'>[]
): Promise<ReservationCharge[]> {
  // Delete all existing charges then insert the new set atomically
  const { error: delError } = await supabase
    .from('reservation_charges')
    .delete()
    .eq('reservation_id', reservationId);
  if (delError) throw delError;

  if (charges.length === 0) return [];

  const { data, error } = await supabase
    .from('reservation_charges')
    .insert(charges.map((c) => ({ ...c, reservation_id: reservationId })))
    .select();
  if (error) throw error;
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
    mutationFn: (charge: Omit<ChargeInsert, 'id'>) => insertCharge(charge),
    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.reservationCharges.byReservation(variables.reservation_id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.reservations.all() });
    },
  });
}

export function useUpdateCharge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: ChargeUpdate }) =>
      updateCharge(id, updates),
    onSettled: (_data, _err, variables) => {
      // Invalidate the reservation charges for the reservation this charge belongs to
      if (_data) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.reservationCharges.byReservation(_data.reservationId),
        });
      } else if (variables.updates.reservation_id) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.reservationCharges.byReservation(variables.updates.reservation_id),
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
      queryClient.invalidateQueries({
        queryKey: queryKeys.reservationCharges.byReservation(variables.reservationId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.reservations.all() });
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
      charges: Omit<ChargeInsert, 'id' | 'reservation_id'>[];
    }) => replaceCharges(reservationId, charges),
    onSettled: (_data, _err, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.reservationCharges.byReservation(variables.reservationId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.reservations.all() });
    },
  });
}
