import { useState, useCallback } from 'react';
import type { Reservation } from '../../../lib/hotel/types';
import type { DayAvailability } from './Timeline/types';

export interface UseTimelineModalsReturn {
  // Hotel orders modal
  showHotelOrdersModal: boolean;
  hotelOrdersReservation: Reservation | null;
  openHotelOrdersModal: (reservation: Reservation) => void;
  closeHotelOrdersModal: () => void;

  // Room availability modal
  showAvailabilityModal: boolean;
  selectedAvailabilityDate: Date | null;
  selectedAvailabilityData: DayAvailability | null;
  openAvailabilityModal: (date: Date, availabilityData: DayAvailability) => void;
  closeAvailabilityModal: () => void;
}

export function useTimelineModals(): UseTimelineModalsReturn {
  // Hotel orders modal state
  const [showHotelOrdersModal, setShowHotelOrdersModal] = useState(false);
  const [hotelOrdersReservation, setHotelOrdersReservation] = useState<Reservation | null>(null);

  const openHotelOrdersModal = useCallback((reservation: Reservation) => {
    setHotelOrdersReservation(reservation);
    setShowHotelOrdersModal(true);
  }, []);

  const closeHotelOrdersModal = useCallback(() => {
    setShowHotelOrdersModal(false);
    setHotelOrdersReservation(null);
  }, []);

  // Room availability modal state
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [selectedAvailabilityDate, setSelectedAvailabilityDate] = useState<Date | null>(null);
  const [selectedAvailabilityData, setSelectedAvailabilityData] = useState<DayAvailability | null>(
    null
  );

  const openAvailabilityModal = useCallback((date: Date, availabilityData: DayAvailability) => {
    setSelectedAvailabilityDate(date);
    setSelectedAvailabilityData(availabilityData);
    setShowAvailabilityModal(true);
  }, []);

  const closeAvailabilityModal = useCallback(() => {
    setShowAvailabilityModal(false);
    setSelectedAvailabilityDate(null);
    setSelectedAvailabilityData(null);
  }, []);

  return {
    showHotelOrdersModal,
    hotelOrdersReservation,
    openHotelOrdersModal,
    closeHotelOrdersModal,
    showAvailabilityModal,
    selectedAvailabilityDate,
    selectedAvailabilityData,
    openAvailabilityModal,
    closeAvailabilityModal,
  };
}
