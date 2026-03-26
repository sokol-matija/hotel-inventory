import { useState, useEffect } from 'react';
import type { Room } from '@/lib/queries/hooks/useRooms';
import type { Company } from '@/lib/queries/hooks/useCompanies';
import { unifiedPricingService } from '@/lib/hotel/services/UnifiedPricingService';
import type { ReservationCharge } from '@/lib/hotel/types';
import type { BookingGuest, BookingServices } from './types';

export interface UseBookingPricingParams {
  selectedRoom: Room | null;
  isUnallocated: boolean;
  checkInDate: Date;
  checkOutDate: Date;
  bookingGuests: BookingGuest[];
  bookingServices: BookingServices;
  isCompanyBilling: boolean;
  selectedCompanyId: string | null;
  companies: Company[];
}

export interface UseBookingPricingReturn {
  previewCharges: ReservationCharge[];
  chargesLoading: boolean;
  chargeTotal: number;
  chargesByType: Record<string, ReservationCharge[]>;
}

export function useBookingPricing({
  selectedRoom,
  isUnallocated,
  checkInDate,
  checkOutDate,
  bookingGuests,
  bookingServices,
  isCompanyBilling,
  selectedCompanyId,
  companies,
}: UseBookingPricingParams): UseBookingPricingReturn {
  const [previewCharges, setPreviewCharges] = useState<ReservationCharge[]>([]);
  const [chargesLoading, setChargesLoading] = useState(false);

  useEffect(() => {
    if (isUnallocated || !selectedRoom) {
      setPreviewCharges([]);
      return;
    }

    const hasGuest = bookingGuests.some((g) => g.firstName.trim() || g.lastName.trim());
    if (!hasGuest) {
      setPreviewCharges([]);
      return;
    }

    const guests = bookingGuests.map((g) => ({
      name: `${g.firstName} ${g.lastName}`.trim() || (g.type === 'child' ? 'Child' : 'Guest'),
      type: g.type as 'adult' | 'child',
      age: g.age,
    }));

    const primaryGuest = bookingGuests[0];
    const guestId =
      primaryGuest?.isExisting && primaryGuest?.existingGuestId
        ? String(primaryGuest.existingGuestId)
        : undefined;

    const selectedCompany =
      isCompanyBilling && selectedCompanyId
        ? companies.find((c) => String(c.id) === selectedCompanyId)
        : undefined;
    const pricingTierId = selectedCompany?.pricing_tier_id?.toString() ?? undefined;

    let cancelled = false;
    setChargesLoading(true);

    unifiedPricingService
      .generateCharges({
        roomId: selectedRoom.id.toString(),
        checkIn: checkInDate,
        checkOut: checkOutDate,
        guests,
        hasPets: bookingServices.hasPets,
        parkingRequired: bookingServices.needsParking,
        pricingTierId,
        guestId,
      })
      .then((charges) => {
        if (cancelled) return;
        setPreviewCharges(charges);
      })
      .catch(() => {
        /* keep previous charges on error */
      })
      .finally(() => {
        if (!cancelled) setChargesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    checkInDate,
    checkOutDate,
    bookingGuests,
    bookingServices,
    selectedRoom,
    isUnallocated,
    isCompanyBilling,
    selectedCompanyId,
    companies,
  ]);

  const chargeTotal = previewCharges.reduce((sum, c) => sum + c.total, 0);
  const chargesByType = previewCharges.reduce<Record<string, ReservationCharge[]>>((acc, c) => {
    const key = c.chargeType;
    if (!acc[key]) acc[key] = [];
    acc[key].push(c);
    return acc;
  }, {});

  return {
    previewCharges,
    chargesLoading,
    chargeTotal,
    chargesByType,
  };
}
