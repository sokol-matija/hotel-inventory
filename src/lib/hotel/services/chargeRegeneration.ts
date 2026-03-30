import { unifiedPricingService } from './UnifiedPricingService';
import { supabase } from '@/lib/supabase';

export interface RegenerateChargesParams {
  reservationId: number;
  roomId: number;
  checkIn: Date;
  checkOut: Date;
  adults: number;
  childrenCount: number;
  guestDisplayName: string;
  hasPets: boolean;
  parkingRequired: boolean;
}

/**
 * Delete existing charges for a reservation and regenerate them from the
 * pricing service. Extracted from `useReservationActions` where the same
 * block was duplicated three times.
 */
export async function regenerateReservationCharges(params: RegenerateChargesParams): Promise<void> {
  const {
    reservationId,
    roomId,
    checkIn,
    checkOut,
    adults,
    childrenCount,
    guestDisplayName,
    hasPets,
    parkingRequired,
  } = params;

  const guestEntries = [
    ...Array(adults)
      .fill(null)
      .map(() => ({
        name: guestDisplayName,
        type: 'adult' as const,
      })),
    ...Array(childrenCount)
      .fill(null)
      .map((_, i) => ({
        name: `Child ${i + 1}`,
        type: 'child' as const,
      })),
  ];

  const newCharges = await unifiedPricingService.generateCharges({
    roomId: String(roomId),
    checkIn,
    checkOut,
    guests: guestEntries,
    hasPets,
    parkingRequired,
  });

  await supabase.from('reservation_charges').delete().eq('reservation_id', reservationId);

  if (newCharges.length > 0) {
    await supabase.from('reservation_charges').insert(
      newCharges.map((c) => ({
        reservation_id: reservationId,
        charge_type: c.chargeType,
        description: c.description,
        quantity: c.quantity,
        unit_price: c.unitPrice,
        total: c.total,
        vat_rate: c.vatRate ?? 0.13,
        sort_order: c.sortOrder ?? 0,
      }))
    );
  }
}
