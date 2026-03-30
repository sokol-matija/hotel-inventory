import { RefObject } from 'react';
import { TimelineHeader } from '../Timeline/TimelineHeader';
import { FloorSection } from '../Timeline/FloorSection';
import type { Room } from '../../../../lib/queries/hooks/useRooms';
import type { Guest } from '../../../../lib/queries/hooks/useGuests';
import type { Reservation } from '../../../../lib/hotel/types';
import type { CellHighlight } from '../useTimelineDragCreate';
import type { DayAvailability } from '../Timeline/types';

interface FloorSectionSharedProps {
  reservations: Reservation[];
  guests: Guest[];
  startDate: Date;
  onReservationClick: (reservation: Reservation) => void;
  onMoveReservation: (
    reservationId: number,
    newRoomId: number,
    newCheckIn: Date,
    newCheckOut: Date
  ) => Promise<void>;
  isFullscreen: boolean;
  onUpdateReservationStatus: (id: number, status: string) => Promise<void>;
  onDeleteReservation: (id: number) => Promise<void>;
  onEditReservation: (id: number) => void;
  isExpansionMode: boolean;
  isMoveMode: boolean;
  onResizeReservation: (reservationId: number, side: 'start' | 'end', newDate: Date) => void;
  onShowDrinksModal: (reservation: Reservation) => void;
  calculateContextMenuPosition: (e: React.MouseEvent) => { x: number; y: number };
  onCellClick: (roomId: string, date: Date, isAM: boolean) => void;
  onCellHover: (roomId: string, date: Date) => void;
  shouldHighlightCell: (roomId: string, date: Date, isAM: boolean) => CellHighlight;
  dragNightCount: number | null;
}

interface TimelineGridProps {
  timelineRef: RefObject<HTMLDivElement | null>;
  currentDate: Date;
  rooms: Room[];
  localReservations: Reservation[];
  roomsByFloor: Record<number, Room[]>;
  expandedFloors: Record<number, boolean>;
  onToggleFloor: (floor: number) => void;
  onNavigate: (action: 'PREV' | 'NEXT' | 'TODAY') => void;
  onDateSelect: (date: Date) => void;
  onAvailabilityClick: (date: Date, availabilityData: DayAvailability) => void;
  virtualRoomsWithReservations: Room[];
  floorSectionSharedProps: FloorSectionSharedProps;
}

export type { FloorSectionSharedProps };

export function TimelineGrid({
  timelineRef,
  currentDate,
  rooms,
  localReservations,
  roomsByFloor,
  expandedFloors,
  onToggleFloor,
  onNavigate,
  onDateSelect,
  onAvailabilityClick,
  virtualRoomsWithReservations,
  floorSectionSharedProps,
}: TimelineGridProps) {
  return (
    <div ref={timelineRef} className="relative flex-1 overflow-auto">
      <TimelineHeader
        startDate={currentDate}
        onNavigate={onNavigate}
        onDateSelect={onDateSelect}
        rooms={rooms}
        reservations={localReservations}
        onAvailabilityClick={onAvailabilityClick}
      />

      <div>
        {Object.entries(roomsByFloor)
          .filter(([floor]) => parseInt(floor) !== 5)
          .map(([floor, floorRooms]) => (
            <FloorSection
              key={floor}
              floor={parseInt(floor)}
              rooms={floorRooms}
              isExpanded={expandedFloors[parseInt(floor)]}
              onToggle={() => onToggleFloor(parseInt(floor))}
              {...floorSectionSharedProps}
            />
          ))}

        <div className="sticky bottom-0 z-20 border-t-4 border-blue-500 bg-white shadow-2xl dark:bg-gray-900">
          <FloorSection
            key="timeline-unallocated"
            floor={5}
            rooms={virtualRoomsWithReservations}
            isExpanded={expandedFloors[5]}
            onToggle={() => onToggleFloor(5)}
            {...floorSectionSharedProps}
          />
        </div>
      </div>
    </div>
  );
}
