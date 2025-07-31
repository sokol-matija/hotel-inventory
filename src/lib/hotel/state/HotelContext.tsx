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
  
  // Actions - Reservations
  updateReservationStatus: (id: string, newStatus: ReservationStatus) => Promise<void>;
  updateReservationNotes: (id: string, notes: string) => Promise<void>;
  updateReservation: (id: string, updates: Partial<Reservation>) => Promise<void>;
  createReservation: (reservationData: Omit<Reservation, 'id' | 'bookingDate' | 'lastModified'>) => Promise<void>;
  
  // Actions - Guests
  createGuest: (guest: Omit<Guest, 'id' | 'totalStays'>) => Promise<void>;
  updateGuest: (id: string, updates: Partial<Guest>) => Promise<void>;
  findGuestsByName: (query: string) => Guest[];
  getGuestStayHistory: (guestId: string) => Reservation[];
  
  // Sync utilities
  refreshData: () => void;
}

const HotelContext = createContext<HotelContextType | undefined>(undefined);

const STORAGE_KEYS = {
  RESERVATIONS: 'hotel_reservations_v1',
  GUESTS: 'hotel_guests_v1',
  LAST_SYNC: 'hotel_last_sync_v1'
};

export function HotelProvider({ children }: { children: React.ReactNode }) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [rooms] = useState<Room[]>(HOTEL_POREC_ROOMS);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Initialize data from localStorage or use sample data
  useEffect(() => {
    // Initialize reservations
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

    // Initialize guests
    const storedGuests = localStorage.getItem(STORAGE_KEYS.GUESTS);
    if (storedGuests) {
      try {
        const parsed = JSON.parse(storedGuests);
        // Convert date strings back to Date objects for children
        const guestsWithDates = parsed.map((guest: any) => ({
          ...guest,
          dateOfBirth: guest.dateOfBirth ? new Date(guest.dateOfBirth) : undefined,
          children: guest.children?.map((child: any) => ({
            ...child,
            dateOfBirth: new Date(child.dateOfBirth)
          })) || []
        }));
        setGuests(guestsWithDates);
      } catch (error) {
        console.error('Failed to parse stored guests:', error);
        setGuests(SAMPLE_GUESTS);
      }
    } else {
      setGuests(SAMPLE_GUESTS);
    }
  }, []);

  // Save to localStorage whenever data changes
  const saveReservationsToStorage = (updatedReservations: Reservation[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.RESERVATIONS, JSON.stringify(updatedReservations));
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to save reservations to localStorage:', error);
    }
  };

  const saveGuestsToStorage = (updatedGuests: Guest[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.GUESTS, JSON.stringify(updatedGuests));
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to save guests to localStorage:', error);
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
      saveReservationsToStorage(updatedReservations);
      
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
      saveReservationsToStorage(updatedReservations);
      
    } catch (error) {
      console.error('Failed to update reservation notes:', error);
      setReservations(originalReservations);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  // Update reservation (for moving rooms, changing dates, etc.)
  const updateReservation = async (reservationId: string, updates: Partial<Reservation>): Promise<void> => {
    const originalReservations = [...reservations];
    
    // Optimistic update
    const updatedReservations = reservations.map(reservation =>
      reservation.id === reservationId
        ? { ...reservation, ...updates, lastModified: new Date() }
        : reservation
    );
    
    setReservations(updatedReservations);
    setIsUpdating(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Persist to localStorage
      saveReservationsToStorage(updatedReservations);
      
      console.log(`Reservation ${reservationId} updated successfully`);
      
    } catch (error) {
      console.error('Failed to update reservation:', error);
      setReservations(originalReservations);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  // Create new reservation
  const createReservation = async (reservationData: Omit<Reservation, 'id' | 'bookingDate' | 'lastModified'>): Promise<void> => {
    const newReservation: Reservation = {
      ...reservationData,
      id: `res-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      bookingDate: new Date(),
      lastModified: new Date()
    };

    const updatedReservations = [...reservations, newReservation];
    setReservations(updatedReservations);
    setIsUpdating(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Persist to localStorage
      saveReservationsToStorage(updatedReservations);
      
      console.log(`Reservation ${newReservation.id} created successfully`);
      
    } catch (error) {
      console.error('Failed to create reservation:', error);
      setReservations(reservations); // Rollback
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  // Create new guest
  const createGuest = async (guestData: Omit<Guest, 'id' | 'totalStays'>): Promise<void> => {
    const newGuest: Guest = {
      ...guestData,
      id: `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      totalStays: 0
    };

    const updatedGuests = [...guests, newGuest];
    setGuests(updatedGuests);
    setIsUpdating(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Persist to localStorage
      saveGuestsToStorage(updatedGuests);
      
      console.log(`Guest ${newGuest.name} created successfully`);
      
    } catch (error) {
      console.error('Failed to create guest:', error);
      setGuests(guests); // Rollback
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  // Update guest information
  const updateGuest = async (guestId: string, updates: Partial<Guest>): Promise<void> => {
    const originalGuests = [...guests];
    
    // Optimistic update
    const updatedGuests = guests.map(guest =>
      guest.id === guestId
        ? { ...guest, ...updates }
        : guest
    );
    
    setGuests(updatedGuests);
    setIsUpdating(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Persist to localStorage
      saveGuestsToStorage(updatedGuests);
      
      console.log(`Guest ${guestId} updated successfully`);
      
    } catch (error) {
      console.error('Failed to update guest:', error);
      setGuests(originalGuests); // Rollback
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  // Find guests by name (search function)
  const findGuestsByName = (query: string): Guest[] => {
    if (!query.trim()) return [];
    
    const searchTerm = query.toLowerCase().trim();
    return guests.filter(guest =>
      guest.name.toLowerCase().includes(searchTerm) ||
      guest.email.toLowerCase().includes(searchTerm) ||
      guest.phone.toLowerCase().includes(searchTerm) ||
      guest.nationality.toLowerCase().includes(searchTerm)
    );
  };

  // Get guest stay history
  const getGuestStayHistory = (guestId: string): Reservation[] => {
    return reservations
      .filter(reservation => reservation.guestId === guestId)
      .sort((a, b) => b.checkIn.getTime() - a.checkIn.getTime());
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
    updateReservation,
    createReservation,
    createGuest,
    updateGuest,
    findGuestsByName,
    getGuestStayHistory,
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