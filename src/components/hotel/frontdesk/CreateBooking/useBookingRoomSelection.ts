import { useState } from 'react';
import type { Room } from '@/lib/queries/hooks/useRooms';
import { useRooms } from '@/lib/queries/hooks/useRooms';
import { HOTEL_ID } from '@/lib/hotel/constants';

export interface UseBookingRoomSelectionParams {
  room: Room | null;
  unallocatedMode?: boolean;
}

export interface UseBookingRoomSelectionReturn {
  selectedRoom: Room | null;
  setSelectedRoom: (room: Room | null) => void;
  isUnallocated: boolean;
  setIsUnallocated: (v: boolean) => void;
  availableRooms: Room[];
  hotelId: string;
}

export function useBookingRoomSelection({
  room,
  unallocatedMode = false,
}: UseBookingRoomSelectionParams): UseBookingRoomSelectionReturn {
  const { data: rooms = [] } = useRooms();

  const [selectedRoom, setSelectedRoom] = useState<Room | null>(room);
  const [isUnallocated, setIsUnallocated] = useState(unallocatedMode);

  const availableRooms = rooms.filter((r) => r.floor_number !== 5);
  const hotelId = HOTEL_ID;

  return {
    selectedRoom,
    setSelectedRoom,
    isUnallocated,
    setIsUnallocated,
    availableRooms,
    hotelId,
  };
}
