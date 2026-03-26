import { useState } from 'react';

export interface UseBookingDatesParams {
  currentDate?: Date;
  preSelectedDates?: { checkIn: Date; checkOut: Date } | null;
}

export interface UseBookingDatesReturn {
  checkInDate: Date;
  setCheckInDate: (d: Date) => void;
  checkOutDate: Date;
  setCheckOutDate: (d: Date) => void;
  numberOfNights: number;
}

export function useBookingDates({
  currentDate,
  preSelectedDates,
}: UseBookingDatesParams): UseBookingDatesReturn {
  const [checkInDate, setCheckInDate] = useState(
    preSelectedDates?.checkIn || currentDate || new Date()
  );
  const [checkOutDate, setCheckOutDate] = useState(
    preSelectedDates?.checkOut ||
      new Date((currentDate || new Date()).getTime() + 2 * 24 * 60 * 60 * 1000)
  );

  const numberOfNights = Math.max(
    1,
    Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24))
  );

  return {
    checkInDate,
    setCheckInDate,
    checkOutDate,
    setCheckOutDate,
    numberOfNights,
  };
}
