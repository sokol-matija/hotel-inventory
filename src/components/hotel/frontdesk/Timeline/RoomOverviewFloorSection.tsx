import { useState } from 'react';
import { Maximize2, Minimize2, Users, Baby, Dog, DollarSign } from 'lucide-react';
import { Reservation, ReservationStatus } from '../../../../lib/hotel/types';
import type { Guest } from '../../../../lib/queries/hooks/useGuests';
import type { Room } from '../../../../lib/queries/hooks/useRooms';
import { RESERVATION_STATUS_COLORS } from '../../../../lib/hotel/calendarUtils';
import { formatRoomNumber, getRoomTypeDisplay } from '../../../../lib/hotel/calendarUtils';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import LabelBadge from '../../shared/LabelBadge';
import { ReservationContextMenu } from './ReservationContextMenu';
import { OccupancyData } from '../../../../lib/hotel/services/HotelTimelineService';

interface RoomOverviewFloorSectionProps {
  floor: number;
  rooms: Room[];
  guests: Guest[];
  isExpanded: boolean;
  onToggle: () => void;
  occupancyData: OccupancyData;
  onRoomClick: (room: Room, reservation?: Reservation) => void;
  onUpdateReservationStatus?: (id: string, status: ReservationStatus) => Promise<void>;
  onDeleteReservation?: (id: string) => Promise<void>;
  onShowDrinksModal?: (reservation: Reservation) => void;
}

function calculateContextMenuPosition(e: React.MouseEvent, menuWidth = 180, menuHeight = 300) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  let x = e.clientX;
  let y = e.clientY;
  if (x + menuWidth > viewportWidth) x = e.clientX - menuWidth;
  if (y + menuHeight > viewportHeight) y = e.clientY - menuHeight;
  if (y < 0) y = 10;
  if (x < 0) x = 10;
  return { x, y };
}

function getStatusCardColors(status: string): string {
  switch (status) {
    case 'confirmed':
      return 'bg-orange-200 border-orange-600';
    case 'checked-in':
      return 'bg-green-200 border-green-600';
    case 'checked-out':
      return 'bg-gray-200 border-gray-600';
    case 'room-closure':
      return 'bg-red-200 border-red-600';
    case 'unallocated':
      return 'bg-blue-200 border-blue-600';
    case 'incomplete-payment':
      return 'bg-red-200 border-red-600';
    default:
      return 'bg-white border-gray-200';
  }
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
              const isOccupied = !!occupancyData[roomKey];
              const reservation = occupancyData[roomKey]?.reservation;
              const status = occupancyData[roomKey]?.status;
              const statusColors = status
                ? RESERVATION_STATUS_COLORS[status as ReservationStatus]
                : null;
              const guest = reservation
                ? guests.find((g) => g.id === Number(reservation.guestId))
                : null;
              const daysLeft = reservation
                ? Math.ceil(
                    (reservation.checkOut.getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000)
                  )
                : 0;

              return (
                <div
                  key={room.id}
                  role="button"
                  tabIndex={0}
                  data-testid={`room-card-${room.room_number}`}
                  className={`relative cursor-pointer rounded-lg p-3 transition-all duration-200 hover:shadow-md ${
                    isOccupied && status
                      ? `border-2 ${getStatusCardColors(status)}`
                      : 'border border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50'
                  } ${room.is_premium && !isOccupied ? 'bg-gradient-to-br from-yellow-50 to-amber-50' : ''} ${room.is_clean ? 'border-l-4 border-l-blue-500' : 'border-l-4 border-l-red-500'}`}
                  onClick={() => {
                    if (!isClosingContextMenu) onRoomClick(room, reservation);
                  }}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && !isClosingContextMenu) {
                      onRoomClick(room, reservation);
                    }
                  }}
                  onContextMenu={(e) => {
                    if (isOccupied && reservation) {
                      e.preventDefault();
                      e.stopPropagation();
                      const position = calculateContextMenuPosition(e);
                      setContextMenu({
                        show: true,
                        x: position.x,
                        y: position.y,
                        reservation,
                        room,
                      });
                    }
                  }}
                  title={
                    isOccupied
                      ? `View reservation details for ${guest?.display_name || 'Guest'} (Right-click for options)`
                      : `Create new booking for ${formatRoomNumber(room)}`
                  }
                >
                  {isOccupied && reservation?.label && (
                    <div className="absolute top-0 right-0 z-10">
                      <LabelBadge
                        label={reservation.label}
                        alwaysExpanded={showFullLabelText}
                        expandDirection="left"
                        semiCircle={true}
                      />
                    </div>
                  )}

                  <div className="flex flex-col space-y-1 pb-8">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-semibold">{formatRoomNumber(room)}</div>
                    </div>
                    <div className="text-xs text-gray-500">{getRoomTypeDisplay(room)}</div>

                    {isOccupied && reservation && guest ? (
                      <div className="mt-2 space-y-1 text-xs">
                        <div className="font-medium">{guest.display_name}</div>
                        <div className="flex items-center space-x-2 text-gray-500">
                          <div className="flex items-center space-x-1">
                            <Users className="h-2.5 w-2.5" />
                            <span>{reservation.adults}</span>
                          </div>
                          {reservation.children.length > 0 && (
                            <div className="flex items-center space-x-1">
                              <Baby className="h-2.5 w-2.5" />
                              <span>{reservation.children.length}</span>
                            </div>
                          )}
                          {(reservation.hasPets || guest.has_pets) && (
                            <Dog className="h-3 w-3 text-gray-500" />
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-xs font-medium text-blue-600">
                            {daysLeft > 0
                              ? `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}`
                              : 'Today'}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="text-xs font-bold text-green-600">
                              €{reservation.totalAmount}
                            </div>
                            <div
                              className={`flex h-4 w-4 items-center justify-center rounded-full ${
                                reservation.status === 'checked-out'
                                  ? 'bg-green-100 text-green-600'
                                  : 'bg-red-100 text-red-600'
                              }`}
                              title={
                                reservation.status === 'checked-out'
                                  ? 'Payment Complete'
                                  : 'Payment Pending'
                              }
                            >
                              <DollarSign className="h-2.5 w-2.5" />
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 text-xs text-gray-400 italic">
                        Click to create booking
                      </div>
                    )}
                  </div>

                  {isOccupied && statusColors && (
                    <div
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 transform rounded-t-lg px-4 py-1.5 text-xs font-medium shadow-sm"
                      style={{
                        backgroundColor: statusColors.backgroundColor,
                        color: statusColors.textColor,
                      }}
                    >
                      {statusColors.label}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      )}

      {/* Context Menu */}
      {contextMenu.show && contextMenu.reservation && contextMenu.room && (
        <ReservationContextMenu
          reservation={contextMenu.reservation}
          position={{ x: contextMenu.x, y: contextMenu.y }}
          guest={guests.find((g) => g.id === Number(contextMenu.reservation!.guestId))}
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
