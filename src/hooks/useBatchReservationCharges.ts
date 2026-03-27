import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

/**
 * Batch-fetch charge totals for an array of reservation IDs.
 * Returns a Record mapping reservation_id → summed total.
 */
export function useBatchReservationCharges(reservationIds: number[]) {
  return useQuery({
    queryKey: ['reservationCharges', 'batch', reservationIds],
    queryFn: async (): Promise<Record<number, number>> => {
      if (reservationIds.length === 0) return {};

      const { data, error } = await supabase
        .from('reservation_charges')
        .select('reservation_id, total')
        .in('reservation_id', reservationIds);

      if (error) throw error;

      const totals: Record<number, number> = {};
      for (const row of data ?? []) {
        const id = row.reservation_id;
        totals[id] = (totals[id] ?? 0) + (row.total ?? 0);
      }
      return totals;
    },
    enabled: reservationIds.length > 0,
  });
}
