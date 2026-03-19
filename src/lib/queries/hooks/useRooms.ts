import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { queryKeys } from '../queryKeys';
import { hotelDataService } from '../../hotel/services/HotelDataService';
import { Room } from '../../hotel/types';

export function useRooms() {
  return useQuery({
    queryKey: queryKeys.rooms.all(),
    queryFn: () => hotelDataService.getRooms(),
  });
}

/** Derived view: rooms indexed by floor. Shares the same query as useRooms(). */
export function useRoomsByFloor() {
  const { data: rooms = [], ...rest } = useRooms();

  const roomsByFloor = useMemo(() => {
    const map: Record<number, Room[]> = {};
    rooms.forEach((room) => {
      if (!map[room.floor]) map[room.floor] = [];
      map[room.floor].push(room);
    });
    return map;
  }, [rooms]);

  return { roomsByFloor, ...rest };
}

/** Derived view: rooms keyed by id. Shares the same query as useRooms(). */
export function useRoomLookup() {
  const { data: rooms = [], ...rest } = useRooms();

  const roomLookup = useMemo(() => {
    const map: Record<string, Room> = {};
    rooms.forEach((room) => {
      map[room.id] = room;
    });
    return map;
  }, [rooms]);

  return { roomLookup, ...rest };
}
