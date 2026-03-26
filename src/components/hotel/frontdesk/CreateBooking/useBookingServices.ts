import { useState } from 'react';
import type { BookingServices } from './types';

export interface UseBookingServicesReturn {
  bookingServices: BookingServices;
  setBookingServices: React.Dispatch<React.SetStateAction<BookingServices>>;
}

export function useBookingServices(): UseBookingServicesReturn {
  const [bookingServices, setBookingServices] = useState<BookingServices>({
    needsParking: false,
    parkingSpots: 0,
    hasPets: false,
    petCount: 0,
    specialRequests: '',
  });

  return {
    bookingServices,
    setBookingServices,
  };
}
