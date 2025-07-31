import React, { createContext, useContext, useState, useEffect } from 'react';
import { Reservation, ReservationStatus, Guest, Room } from '../types';
import { SAMPLE_RESERVATIONS, SAMPLE_GUESTS } from '../sampleData';
import { HOTEL_POREC_ROOMS } from '../hotelData';

interface HotelContextType {
  // Data state
  reservations: Reservation[];
  guests: Guest[];
  rooms: Room[];
  
  // Loading states
  isUpdating: boolean;
  lastUpdated: Date;
  
  // Actions
  updateReservationStatus: (id: string, newStatus: ReservationStatus) => Promise<void>;
  updateReservationNotes: (id: string, notes: string) => Promise<void>;
  
  // Sync utilities
  refreshData: () => void;
}

const HotelContext = createContext<HotelContextType | undefined>(undefined);

const STORAGE_KEYS = {
  RESERVATIONS: 'hotel_reservations_v1',
  LAST_SYNC: 'hotel_last_sync_v1'
};

export function HotelProvider({ children }: { children: React.ReactNode }) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [guests] = useState<Guest[]>(SAMPLE_GUESTS);
  const [rooms] = useState<Room[]>(HOTEL_POREC_ROOMS);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Initialize data from localStorage or use sample data
  useEffect(() => {
    const storedReservations = localStorage.getItem(STORAGE_KEYS.RESERVATIONS);
    if (storedReservations) {
      try {
        const parsed = JSON.parse(storedReservations);
        // Convert date strings back to Date objects
        const reservationsWithDates = parsed.map((res: any) => ({
          ...res,
          checkIn: new Date(res.checkIn),
          checkOut: new Date(res.checkOut),
          bookingDate: new Date(res.bookingDate),
          lastModified: new Date(res.lastModified)
        }));
        setReservations(reservationsWithDates);
      } catch (error) {
        console.error('Failed to parse stored reservations:', error);
        setReservations(SAMPLE_RESERVATIONS);
      }
    } else {
      setReservations(SAMPLE_RESERVATIONS);
    }
  }, []);

  // Save to localStorage whenever reservations change
  const saveToStorage = (updatedReservations: Reservation[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.RESERVATIONS, JSON.stringify(updatedReservations));
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to save reservations to localStorage:', error);
    }
  };

  // Update reservation status with optimistic updates
  const updateReservationStatus = async (reservationId: string, newStatus: ReservationStatus): Promise<void> => {
    const originalReservations = [...reservations];
    
    // 1. Optimistic update (immediate UI change)
    const updatedReservations = reservations.map(reservation =>
      reservation.id === reservationId
        ? { ...reservation, status: newStatus, lastModified: new Date() }
        : reservation
    );
    
    setReservations(updatedReservations);
    setIsUpdating(true);

    try {
      // 2. Simulate API call delay (replace with real API later)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 3. Persist to localStorage
      saveToStorage(updatedReservations);
      
      // 4. Success feedback (handled by calling component)
      console.log(`Reservation ${reservationId} status updated to ${newStatus}`);
      
    } catch (error) {
      // 5. Rollback on failure
      console.error('Failed to update reservation status:', error);
      setReservations(originalReservations);
      throw error; // Re-throw for component error handling
    } finally {
      setIsUpdating(false);
    }
  };

  // Update reservation notes
  const updateReservationNotes = async (reservationId: string, notes: string): Promise<void> => {
    const originalReservations = [...reservations];
    
    // Optimistic update
    const updatedReservations = reservations.map(reservation =>
      reservation.id === reservationId
        ? { ...reservation, specialRequests: notes, lastModified: new Date() }
        : reservation
    );
    
    setReservations(updatedReservations);
    setIsUpdating(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Persist to localStorage
      saveToStorage(updatedReservations);
      
    } catch (error) {
      console.error('Failed to update reservation notes:', error);
      setReservations(originalReservations);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  // Refresh data from storage
  const refreshData = () => {
    const storedReservations = localStorage.getItem(STORAGE_KEYS.RESERVATIONS);
    if (storedReservations) {
      try {
        const parsed = JSON.parse(storedReservations);
        const reservationsWithDates = parsed.map((res: any) => ({
          ...res,
          checkIn: new Date(res.checkIn),
          checkOut: new Date(res.checkOut),
          bookingDate: new Date(res.bookingDate),
          lastModified: new Date(res.lastModified)
        }));
        setReservations(reservationsWithDates);
        setLastUpdated(new Date());
      } catch (error) {
        console.error('Failed to refresh reservations:', error);
      }
    }
  };

  const value: HotelContextType = {
    reservations,
    guests,
    rooms,
    isUpdating,
    lastUpdated,
    updateReservationStatus,
    updateReservationNotes,
    refreshData
  };

  return (
    <HotelContext.Provider value={value}>
      {children}
    </HotelContext.Provider>
  );
}

export function useHotel(): HotelContextType {
  const context = useContext(HotelContext);
  if (context === undefined) {
    throw new Error('useHotel must be used within a HotelProvider');
  }
  return context;
}