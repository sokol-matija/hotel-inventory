import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '../../../ui/button';
import { RoomOverviewFloorSection } from '../Timeline/RoomOverviewFloorSection';
import type { Room } from '../../../../lib/queries/hooks/useRooms';
import type { Guest } from '../../../../lib/queries/hooks/useGuests';
import type { Reservation } from '../../../../lib/hotel/types';
import type { OccupancyData } from '../../../../lib/hotel/services/HotelTimelineService';

interface RoomStatusOverviewProps {
  overviewDate: Date;
  overviewPeriod: 'AM' | 'PM';
  onToggleOverviewPeriod: (period: 'AM' | 'PM') => void;
  onOverviewNavigate: (action: 'PREV' | 'NEXT' | 'TODAY') => void;
  onSetOverviewDate: (date: Date) => void;
  roomsByFloor: Record<number, Room[]>;
  expandedOverviewFloors: Record<number, boolean>;
  onToggleOverviewFloor: (floor: number) => void;
  guests: Guest[];
  currentOccupancy: OccupancyData;
  virtualRoomsWithReservations: Room[];
  onRoomClick: (room: Room, reservation?: Reservation) => void;
  onUpdateReservationStatus: (id: number, status: string) => Promise<void>;
  onDeleteReservation: (id: number) => Promise<void>;
  onShowDrinksModal: (reservation: Reservation) => void;
}

export function RoomStatusOverview({
  overviewDate,
  overviewPeriod,
  onToggleOverviewPeriod,
  onOverviewNavigate,
  onSetOverviewDate,
  roomsByFloor,
  expandedOverviewFloors,
  onToggleOverviewFloor,
  guests,
  currentOccupancy,
  virtualRoomsWithReservations,
  onRoomClick,
  onUpdateReservationStatus,
  onDeleteReservation,
  onShowDrinksModal,
}: RoomStatusOverviewProps) {
  return (
    <div className="bg-gray-50 p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center space-x-2 text-lg font-semibold text-gray-900">
          <CalendarIcon className="h-5 w-5" />
          <span>Room Status Overview - {format(overviewDate, 'MMMM dd, yyyy')}</span>
        </h3>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 rounded-lg border border-gray-300 bg-white p-1">
            <Button
              variant={overviewPeriod === 'AM' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onToggleOverviewPeriod('AM')}
              title="Show rooms with checkout today"
              className="text-xs"
            >
              AM
            </Button>
            <Button
              variant={overviewPeriod === 'PM' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onToggleOverviewPeriod('PM')}
              title="Show rooms with check-in today"
              className="text-xs"
            >
              PM
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOverviewNavigate('PREV')}
            title="Previous day"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOverviewNavigate('TODAY')}
            title="Today"
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOverviewNavigate('NEXT')}
            title="Next day"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <input
            type="date"
            value={format(overviewDate, 'yyyy-MM-dd')}
            onChange={(e) => {
              const d = new Date(e.target.value + 'T00:00:00');
              if (!isNaN(d.getTime())) onSetOverviewDate(d);
            }}
            className="h-9 rounded-md border border-gray-300 px-2 text-sm"
            title="Jump to date"
          />
        </div>
      </div>

      <div className="space-y-4">
        {Object.entries(roomsByFloor)
          .filter(([floor]) => parseInt(floor) !== 5)
          .map(([floor, floorRooms]) => (
            <RoomOverviewFloorSection
              key={`overview-${floor}`}
              floor={parseInt(floor)}
              rooms={floorRooms}
              guests={guests}
              isExpanded={expandedOverviewFloors[parseInt(floor)]}
              onToggle={() => onToggleOverviewFloor(parseInt(floor))}
              occupancyData={currentOccupancy}
              onRoomClick={onRoomClick}
              onUpdateReservationStatus={onUpdateReservationStatus}
              onDeleteReservation={onDeleteReservation}
              onShowDrinksModal={onShowDrinksModal}
            />
          ))}

        {virtualRoomsWithReservations.length > 0 && (
          <RoomOverviewFloorSection
            key="overview-unallocated"
            floor={5}
            rooms={virtualRoomsWithReservations}
            guests={guests}
            isExpanded={expandedOverviewFloors[5]}
            onToggle={() => onToggleOverviewFloor(5)}
            occupancyData={currentOccupancy}
            onRoomClick={onRoomClick}
            onUpdateReservationStatus={onUpdateReservationStatus}
            onDeleteReservation={onDeleteReservation}
            onShowDrinksModal={onShowDrinksModal}
          />
        )}
      </div>
    </div>
  );
}
