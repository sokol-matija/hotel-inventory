import { useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { Reservation, ReservationStatus } from '../../../../lib/hotel/types';
import type { Guest } from '../../../../lib/queries/hooks/useGuests';
import type { Room } from '../../../../lib/queries/hooks/useRooms';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { ReservationContextMenu } from './ReservationContextMenu';
import { OccupancyData } from '../../../../lib/hotel/services/HotelTimelineService';
import { RoomCard } from './RoomCard';
import { calculateContextMenuPosition } from './roomCardUtils';

interface RoomOverviewFloorSectionProps {
  floor: number;
  rooms: Room[];
  guests: Guest[];
  isExpanded: boolean;
  onToggle: () => void;
  occupancyData: OccupancyData;
  onRoomClick: (room: Room, reservation?: Reservation) => void;
  onUpdateReservationStatus?: (id: number, status: ReservationStatus) => Promise<void>;
  onDeleteReservation?: (id: number) => Promise<void>;
  onShowDrinksModal?: (reservation: Reservation) => void;
}

export function RoomOverviewFloorSection({
  floor,
  rooms,
  guests,
  isExpanded,
  onToggle,
  occupancyData,
  onRoomClick,
  onUpdateReservationStatus,
  onDeleteReservation,
  onShowDrinksModal,
}: RoomOverviewFloorSectionProps) {
  const floorName = floor === 4 ? 'Rooftop Premium' : `Floor ${floor}`;
  const occupiedRooms = rooms.filter((room) => occupancyData[room.id.toString()]);
  const occupancyRate = rooms.length > 0 ? (occupiedRooms.length / rooms.length) * 100 : 0;

  const [contextMenu, setContextMenu] = useState<{
    show: boolean;
    x: number;
    y: number;
    reservation: Reservation | null;
    room: Room | null;
  }>({ show: false, x: 0, y: 0, reservation: null, room: null });
  const [isClosingContextMenu, setIsClosingContextMenu] = useState(false);
  const [showFullLabelText, setShowFullLabelText] = useState(false);

  const handleContextMenuClose = (closedWithAction?: boolean) => {
    if (!closedWithAction) {
      setIsClosingContextMenu(true);
      setTimeout(() => setIsClosingContextMenu(false), 100);
    }
    setContextMenu({ show: false, x: 0, y: 0, reservation: null, room: null });
  };

  const handleCardContextMenu = (e: React.MouseEvent, room: Room, reservation: Reservation) => {
    const position = calculateContextMenuPosition(e);
    setContextMenu({ show: true, x: position.x, y: position.y, reservation, room });
  };

  return (
    <Card className="mb-4">
      <CardHeader className="cursor-pointer transition-colors hover:bg-gray-50" onClick={onToggle}>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-3">
            <span className={floor === 4 ? 'text-yellow-600' : 'text-gray-900'}>{floorName}</span>
            <Badge variant="secondary">{rooms.length} rooms</Badge>
            <Badge
              variant={
                occupancyRate > 80 ? 'default' : occupancyRate > 50 ? 'secondary' : 'destructive'
              }
            >
              {occupancyRate.toFixed(0)}% occupied
            </Badge>
          </CardTitle>

          <div className="flex items-center gap-3">
            <label
              className="flex cursor-pointer items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="checkbox"
                checked={showFullLabelText}
                onChange={(e) => setShowFullLabelText(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Show full label text</span>
            </label>
            <Button variant="ghost" size="sm">
              {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
            {rooms.map((room) => {
              const roomKey = room.id.toString();
              const reservation = occupancyData[roomKey]?.reservation;
              const status = occupancyData[roomKey]?.status;
              const guest = reservation
                ? (guests.find((g) => g.id === reservation.guest_id) ?? null)
                : null;

              return (
                <RoomCard
                  key={room.id}
                  room={room}
                  reservation={reservation}
                  guest={guest}
                  status={status}
                  showFullLabelText={showFullLabelText}
                  isClosingContextMenu={isClosingContextMenu}
                  onRoomClick={onRoomClick}
                  onContextMenu={handleCardContextMenu}
                />
              );
            })}
          </div>
        </CardContent>
      )}

      {contextMenu.show && contextMenu.reservation && contextMenu.room && (
        <ReservationContextMenu
          reservation={contextMenu.reservation}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          guest={guests.find((g) => g.id === contextMenu.reservation!.guest_id)}
          room={contextMenu.room}
          isFullscreen={false}
          onClose={handleContextMenuClose}
          onUpdateReservationStatus={onUpdateReservationStatus}
          onDeleteReservation={onDeleteReservation}
          onShowDrinksModal={onShowDrinksModal}
          showMarkClean={true}
          onMarkClean={(r) => {
            window.location.href = `/nfc/clean?roomId=${r.room_number}`;
          }}
        />
      )}
    </Card>
  );
}
