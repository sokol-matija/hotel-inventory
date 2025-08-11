// useBookingForm - Clean form state management hook
// Separates form logic from UI components

import { useState, useCallback, useMemo } from 'react';
import { Room, Guest, GuestChild, ReservationStatus, Company } from '../types';
import { BookingService, BookingData, BookingValidationError } from '../services/BookingService';

export interface BookingFormState {
  // Core booking data
  selectedRoom: Room | null;
  selectedGuest: Guest | null;
  isNewGuest: boolean;
  checkIn: Date;
  checkOut: Date;
  adults: number;
  children: GuestChild[];
  specialRequests: string;
  
  // Additional options
  hasPets: boolean;
  needsParking: boolean;
  status: ReservationStatus;
  bookingSource: 'booking.com' | 'direct' | 'other';
  
  // R1 billing
  isR1Bill: boolean;
  selectedCompany: Company | null;
  pricingTierId: string;
  
  // New guest data
  newGuestData: {
    name: string;
    email: string;
    phone: string;
    nationality: string;
    hasPets: boolean;
  };
  
  // Form state
  errors: BookingValidationError[];
  isDirty: boolean;
  isSubmitting: boolean;
}

const initialState: BookingFormState = {
  selectedRoom: null,
  selectedGuest: null,
  isNewGuest: false,
  checkIn: new Date(),
  checkOut: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
  adults: 1,
  children: [],
  specialRequests: '',
  hasPets: false,
  needsParking: false,
  status: 'confirmed',
  bookingSource: 'direct',
  isR1Bill: false,
  selectedCompany: null,
  pricingTierId: '2026-standard',
  newGuestData: {
    name: '',
    email: '',
    phone: '',
    nationality: '',
    hasPets: false
  },
  errors: [],
  isDirty: false,
  isSubmitting: false
};

export function useBookingForm(room?: Room, initialData?: Partial<BookingFormState>) {
  const [formState, setFormState] = useState<BookingFormState>(() => ({
    ...initialState,
    selectedRoom: room || null,
    ...initialData
  }));

  const bookingService = BookingService.getInstance();

  // Form field updaters
  const updateField = useCallback(<K extends keyof BookingFormState>(
    field: K,
    value: BookingFormState[K]
  ) => {
    setFormState(prev => ({
      ...prev,
      [field]: value,
      isDirty: true
    }));
  }, []);

  const updateNewGuestField = useCallback(<K extends keyof BookingFormState['newGuestData']>(
    field: K,
    value: BookingFormState['newGuestData'][K]
  ) => {
    setFormState(prev => ({
      ...prev,
      newGuestData: {
        ...prev.newGuestData,
        [field]: value
      },
      isDirty: true
    }));
  }, []);

  // Computed values
  const bookingData: Partial<BookingData> = useMemo(() => ({
    room: formState.selectedRoom || undefined,
    guest: formState.isNewGuest ? formState.newGuestData : formState.selectedGuest || undefined,
    isNewGuest: formState.isNewGuest,
    checkIn: formState.checkIn,
    checkOut: formState.checkOut,
    adults: formState.adults,
    children: formState.children,
    specialRequests: formState.specialRequests,
    hasPets: formState.hasPets,
    needsParking: formState.needsParking,
    status: formState.status,
    bookingSource: formState.bookingSource,
    isR1Bill: formState.isR1Bill,
    selectedCompany: formState.selectedCompany,
    pricingTierId: formState.pricingTierId
  }), [formState]);

  // Pricing calculation
  const pricing = useMemo(() => {
    return bookingService.calculatePricing(bookingData);
  }, [bookingService, bookingData]);

  // Validation
  const validate = useCallback((existingReservations: any[] = []) => {
    const validationErrors = bookingService.validateBooking(bookingData, existingReservations);
    
    setFormState(prev => ({
      ...prev,
      errors: validationErrors
    }));
    
    return validationErrors.length === 0;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingService]); // Remove bookingData dependency to prevent infinite re-renders

  // Form submission
  const setSubmitting = useCallback((isSubmitting: boolean) => {
    setFormState(prev => ({
      ...prev,
      isSubmitting
    }));
  }, []);

  // Reset form
  const reset = useCallback((newRoom?: Room) => {
    setFormState({
      ...initialState,
      selectedRoom: newRoom || formState.selectedRoom,
      ...initialData
    });
  }, [formState.selectedRoom, initialData]);

  // Add child
  const addChild = useCallback((child: GuestChild) => {
    setFormState(prev => ({
      ...prev,
      children: [...prev.children, child],
      isDirty: true
    }));
  }, []);

  // Remove child
  const removeChild = useCallback((index: number) => {
    setFormState(prev => ({
      ...prev,
      children: prev.children.filter((_, i) => i !== index),
      isDirty: true
    }));
  }, []);

  // Convenience getters
  const isValid = formState.errors.length === 0;
  const hasDateConflict = formState.errors.some(e => e.type === 'date_conflict');
  const hasRoom401Issues = formState.errors.some(e => e.type === 'room_401');
  const hasFormErrors = formState.errors.some(e => e.type === 'form_invalid');

  return {
    // State
    formState,
    bookingData,
    pricing,
    
    // Computed
    isValid,
    hasDateConflict,
    hasRoom401Issues,
    hasFormErrors,
    
    // Actions
    updateField,
    updateNewGuestField,
    validate,
    setSubmitting,
    reset,
    addChild,
    removeChild
  };
}