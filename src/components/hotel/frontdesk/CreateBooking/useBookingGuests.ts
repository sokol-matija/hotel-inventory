import { useState, useEffect } from 'react';
import type { Guest } from '@/lib/queries/hooks/useGuests';
import type { Room } from '@/lib/queries/hooks/useRooms';
import type { BookingGuest } from './types';

function createEmptyGuest(type: 'adult' | 'child'): BookingGuest {
  return {
    id: `new-${Date.now()}-${Math.random()}`,
    firstName: '',
    lastName: '',
    fullName: '',
    email: '',
    phone: '',
    nationality: '',
    dateOfBirth: '',
    type,
    age: type === 'child' ? 12 : undefined,
    isExisting: false,
    preferredLanguage: 'en',
    dietaryRestrictions: [],
    hasPets: false,
    isVip: false,
    vipLevel: 0,
    children: [],
    totalStays: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export interface UseBookingGuestsParams {
  selectedRoom: Room | null;
}

export interface UseBookingGuestsReturn {
  bookingGuests: BookingGuest[];
  addAdult: () => void;
  addChild: () => void;
  removeGuest: (guestId: string) => void;
  updateGuest: (guestId: string, field: string, value: string | number | boolean) => void;
  handleSelectExistingGuest: (guest: Guest, guestIndex: number) => void;
  adultsCount: number;
  childrenCount: number;
}

export function useBookingGuests({ selectedRoom }: UseBookingGuestsParams): UseBookingGuestsReturn {
  const [bookingGuests, setBookingGuests] = useState<BookingGuest[]>([]);

  useEffect(() => {
    if (bookingGuests.length === 0) {
      setBookingGuests([createEmptyGuest('adult')]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const adultsCount = bookingGuests.filter((g) => g.type === 'adult').length;
  const childrenCount = bookingGuests.filter((g) => g.type === 'child').length;

  const addAdult = () => {
    const maxOccupancy = selectedRoom?.max_occupancy || 99;
    if (bookingGuests.length < maxOccupancy) {
      setBookingGuests((prev) => [...prev, createEmptyGuest('adult')]);
    }
  };

  const addChild = () => {
    const maxOccupancy = selectedRoom?.max_occupancy || 99;
    if (bookingGuests.length < maxOccupancy) {
      setBookingGuests((prev) => [...prev, createEmptyGuest('child')]);
    }
  };

  const removeGuest = (guestId: string) => {
    if (bookingGuests.length > 1) {
      setBookingGuests((prev) => prev.filter((g) => g.id !== guestId));
    }
  };

  const updateGuest = (guestId: string, field: string, value: string | number | boolean) => {
    setBookingGuests((prev) =>
      prev.map((g) => {
        if (g.id !== guestId) return g;
        const updated = { ...g, [field]: value };

        if (field === 'firstName' || field === 'lastName') {
          updated.fullName = `${updated.firstName} ${updated.lastName}`.trim();
        }

        if (field === 'type') {
          if (value === 'child' && !updated.age) {
            updated.age = 12;
          } else if (value === 'adult') {
            updated.age = undefined;
          }
        }

        return updated;
      })
    );
  };

  const handleSelectExistingGuest = (guest: Guest, guestIndex: number) => {
    setBookingGuests((prev) => {
      const updatedGuests = [...prev];
      updatedGuests[guestIndex] = {
        id: guest.id.toString(),
        firstName: guest.first_name,
        lastName: guest.last_name,
        fullName: guest.display_name,
        email: guest.email || '',
        phone: guest.phone || '',
        nationality: guest.nationality || '',
        dateOfBirth: guest.date_of_birth ?? '',
        type: 'adult' as const,
        age: undefined,
        isExisting: true,
        existingGuestId: guest.id,
        preferredLanguage: guest.preferred_language || 'en',
        dietaryRestrictions: guest.dietary_restrictions || [],
        hasPets: guest.has_pets || false,
        isVip: guest.is_vip || false,
        vipLevel: guest.vip_level || 0,
        children: [],
        totalStays: 0,
        createdAt: guest.created_at ? new Date(guest.created_at) : new Date(),
        updatedAt: guest.updated_at ? new Date(guest.updated_at) : new Date(),
      };
      return updatedGuests;
    });
  };

  return {
    bookingGuests,
    addAdult,
    addChild,
    removeGuest,
    updateGuest,
    handleSelectExistingGuest,
    adultsCount,
    childrenCount,
  };
}
