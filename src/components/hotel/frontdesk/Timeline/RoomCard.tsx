import { Users, Baby, Dog, DollarSign } from 'lucide-react';
import { Reservation, ReservationStatus } from '../../../../lib/hotel/types';
import type { Guest } from '../../../../lib/queries/hooks/useGuests';
import type { Room } from '../../../../lib/queries/hooks/useRooms';
import { RESERVATION_STATUS_COLORS } from '../../../../lib/hotel/calendarUtils';
import { formatRoomNumber, getRoomTypeDisplay } from '../../../../lib/hotel/calendarUtils';
import { useReservationCharges } from '../../../../lib/queries/hooks/useReservationCharges';
import LabelBadge from '../../shared/LabelBadge';
import { getStatusCardColors, calcDaysLeft } from './roomCardUtils';

// ── ReservationTotal ─────────────────────────────────────────────────────────
// Isolated so the TQ hook stays out of the `.map()` in the parent.

function ReservationTotal({ reservationId }: { reservationId: number }) {
  const { data: charges = [] } = useReservationCharges(reservationId);
  const total = charges.reduce((sum, c) => sum + c.total, 0);
  return <span className="text-xs font-bold text-green-600">€{total.toFixed(0)}</span>;
}

// ── RoomCard ─────────────────────────────────────────────────────────────────

export interface RoomCardProps {
  room: Room;
  reservation?: Reservation;
  guest?: Guest | null;
  status?: string;
  showFullLabelText: boolean;
  isClosingContextMenu: boolean;
  onRoomClick: (room: Room, reservation?: Reservation) => void;
  onContextMenu: (e: React.MouseEvent, room: Room, reservation: Reservation) => void;
}

export function RoomCard({
  room,
  reservation,
  guest,
  status,
  showFullLabelText,
  isClosingContextMenu,
  onRoomClick,
  onContextMenu,
}: RoomCardProps) {
  const isOccupied = !!reservation && !!guest;
  const statusColors =
    isOccupied && status ? RESERVATION_STATUS_COLORS[status as ReservationStatus] : null;
  const daysLeft = reservation ? calcDaysLeft(reservation.check_out_date) : 0;
  const isPaymentComplete = (reservation?.reservation_statuses?.code ?? '') === 'checked-out';

  return (
    <div
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
          onContextMenu(e, room, reservation);
        }
      }}
      title={
        isOccupied
          ? `View reservation details for ${guest?.display_name || 'Guest'} (Right-click for options)`
          : `Create new booking for ${formatRoomNumber(room)}`
      }
    >
      {isOccupied && reservation?.labels && (
        <div className="absolute top-0 right-0 z-10">
          <LabelBadge
            label={reservation.labels}
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
              {(reservation.children_count ?? 0) > 0 && (
                <div className="flex items-center space-x-1">
                  <Baby className="h-2.5 w-2.5" />
                  <span>{reservation.children_count}</span>
                </div>
              )}
              {(reservation.has_pets || guest.has_pets) && (
                <Dog className="h-3 w-3 text-gray-500" />
              )}
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-medium text-blue-600">
                {daysLeft > 0 ? `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}` : 'Today'}
              </div>
              <div className="flex items-center gap-1.5">
                <ReservationTotal reservationId={reservation.id} />
                <div
                  className={`flex h-4 w-4 items-center justify-center rounded-full ${
                    isPaymentComplete ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                  }`}
                  title={isPaymentComplete ? 'Payment Complete' : 'Payment Pending'}
                >
                  <DollarSign className="h-2.5 w-2.5" />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-2 text-xs text-gray-400 italic">Click to create booking</div>
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
}
