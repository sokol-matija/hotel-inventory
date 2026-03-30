import ReservationPopup from '../Reservations/ReservationPopup';
import ModernCreateBookingModal from '../ModernCreateBookingModal';
import RoomChangeConfirmDialog from '../RoomChangeConfirmDialog';
import HotelOrdersModal from '../RoomService/HotelOrdersModal';
import { RoomAvailabilityModal } from '../Timeline/RoomAvailabilityModal';
import { EditReservationSheet } from '../EditReservation/EditReservationSheet';
import type { CalendarEvent, Reservation } from '../../../../lib/hotel/types';
import type { Room } from '../../../../lib/queries/hooks/useRooms';
import type { Guest } from '../../../../lib/queries/hooks/useGuests';
import type { RoomChangeDialog } from '../../../../lib/hotel/services/HotelTimelineService';
import type { OrderItem } from '../../../../lib/hotel/orderTypes';
import type { DayAvailability } from '../Timeline/types';

interface TimelineModalsProps {
  // Reservation popup
  showReservationPopup: boolean;
  onCloseReservationPopup: () => void;
  selectedEvent: CalendarEvent | null;

  // Create booking
  showCreateBooking: boolean;
  onCloseCreateBooking: () => void;
  selectedRoom: Room | null;
  overviewDate: Date;
  preSelectedDates: { checkIn: Date; checkOut: Date } | null;
  onClearPreSelectedDates: () => void;
  onDisableDragCreate: () => void;

  // Room change
  roomChangeDialog: RoomChangeDialog;
  onCloseRoomChangeDialog: () => void;
  localReservations: Reservation[];
  rooms: Room[];
  guests: Guest[];
  onConfirmRoomChange: () => Promise<void>;
  onFreeUpgrade: () => Promise<void>;

  // Hotel orders
  showHotelOrdersModal: boolean;
  hotelOrdersReservation: Reservation | null;
  onCloseHotelOrdersModal: () => void;
  onDrinksOrderComplete: (reservation: Reservation, orderItems: OrderItem[], total: number) => void;

  // Room availability
  showAvailabilityModal: boolean;
  onCloseAvailabilityModal: () => void;
  selectedAvailabilityDate: Date | null;
  selectedAvailabilityData: DayAvailability | null;

  // Edit reservation
  editReservationId: number | null;
  onCloseEditReservation: () => void;
}

export function TimelineModals({
  showReservationPopup,
  onCloseReservationPopup,
  selectedEvent,
  showCreateBooking,
  onCloseCreateBooking,
  selectedRoom,
  overviewDate,
  preSelectedDates,
  onClearPreSelectedDates,
  onDisableDragCreate,
  roomChangeDialog,
  onCloseRoomChangeDialog,
  localReservations,
  rooms,
  guests,
  onConfirmRoomChange,
  onFreeUpgrade,
  showHotelOrdersModal,
  hotelOrdersReservation,
  onCloseHotelOrdersModal,
  onDrinksOrderComplete,
  showAvailabilityModal,
  onCloseAvailabilityModal,
  selectedAvailabilityDate,
  selectedAvailabilityData,
  editReservationId,
  onCloseEditReservation,
}: TimelineModalsProps) {
  return (
    <>
      <ReservationPopup
        isOpen={showReservationPopup}
        onClose={onCloseReservationPopup}
        event={selectedEvent}
        onStatusChange={() => {
          onCloseReservationPopup();
        }}
      />

      {selectedRoom && (
        <ModernCreateBookingModal
          isOpen={showCreateBooking}
          onClose={() => {
            onCloseCreateBooking();
            onClearPreSelectedDates();
            onDisableDragCreate();
          }}
          room={selectedRoom}
          currentDate={overviewDate}
          preSelectedDates={preSelectedDates}
        />
      )}

      {roomChangeDialog.show &&
        (() => {
          const reservation = localReservations.find(
            (r) => r.id === roomChangeDialog.reservationId
          );
          const currentRoom = rooms.find((r) => r.id === roomChangeDialog.fromRoomId);
          const targetRoom = rooms.find((r) => r.id === roomChangeDialog.toRoomId);
          const guest = reservation
            ? guests.find((g) => g.id === reservation.guest_id) || null
            : null;
          if (!reservation || !currentRoom || !targetRoom) return null;
          return (
            <RoomChangeConfirmDialog
              isOpen={roomChangeDialog.show}
              onClose={onCloseRoomChangeDialog}
              currentRoom={currentRoom}
              targetRoom={targetRoom}
              reservation={reservation}
              guest={guest}
              onConfirmChange={onConfirmRoomChange}
              onFreeUpgrade={onFreeUpgrade}
            />
          );
        })()}

      {showHotelOrdersModal && hotelOrdersReservation && (
        <HotelOrdersModal
          reservation={hotelOrdersReservation}
          isOpen={showHotelOrdersModal}
          onClose={onCloseHotelOrdersModal}
          onOrderComplete={(orderItems, total) => {
            onDrinksOrderComplete(hotelOrdersReservation, orderItems, total);
            onCloseHotelOrdersModal();
          }}
        />
      )}

      <RoomAvailabilityModal
        isOpen={showAvailabilityModal}
        onClose={onCloseAvailabilityModal}
        date={selectedAvailabilityDate}
        availabilityData={selectedAvailabilityData}
      />

      <EditReservationSheet reservationId={editReservationId} onClose={onCloseEditReservation} />
    </>
  );
}
