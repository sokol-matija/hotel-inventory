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
  reservationId: string;
  currentRoomId: string;
  currentRoomFloor: number;
  checkIn: Date;
  checkOut: Date;
  guestName: string;
  reservation: Reservation;
}

export interface SimpleDragCreateHook {
  state: {
    isEnabled: boolean;
    isSelecting: boolean;
    currentSelection?: { roomId: string; checkInDate: Date } | null;
  };
  actions: {
    enable: () => void;
    disable: () => void;
    startSelection: (roomId: string, checkInDate: Date) => void;
    completeSelection: (checkOutDate: Date) => { checkInDate: Date; checkOutDate: Date } | null;
    cancel: () => void;
    setHoverPreview: (roomId: string, hoverDate: Date, isAM: boolean) => void;
    clearHoverPreview: () => void;
  };
  shouldHighlightCell: (
    roomId: string,
    date: Date,
    isAM: boolean
  ) => 'selectable' | 'preview' | 'hover-preview' | 'none';
}

export const ItemTypes = {
  RESERVATION: 'reservation',
} as const;
