import { Reservation } from '../../../../lib/hotel/types';
import type { Room } from '../../../../lib/queries/hooks/useRooms';

export interface RoomTypeAvailability {
  total: number;
  available: number;
  occupied: number;
}

export interface DayAvailability {
  date: Date;
  totalRooms: number;
  availableRooms: number;
  occupiedRooms: number;
  occupancyRate: number;
  roomTypes: {
    standard: RoomTypeAvailability;
    premium: RoomTypeAvailability;
    suite: RoomTypeAvailability;
  };
  availableRoomsList: Room[];
  occupiedReservations: Reservation[];
}

export interface DragItem {
  reservationId: number;
  currentRoomId: number;
  currentRoomFloor: number;
  checkIn: Date;
  checkOut: Date;
  guestName: string;
  reservation: Reservation;
}

export const ItemTypes = {
  RESERVATION: 'reservation',
} as const;
