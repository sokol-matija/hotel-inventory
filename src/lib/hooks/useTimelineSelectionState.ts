import { useState, useCallback } from 'react';
import { Reservation } from '@/lib/hotel/types';
import type { Room } from '@/lib/queries/hooks/useRooms';
import type { RoomChangeDialog, DrinkModalState } from '@/lib/hotel/services/HotelTimelineService';

const CLOSED_ROOM_CHANGE: RoomChangeDialog = {
  show: false,
  reservationId: 0,
  fromRoomId: 0,
  toRoomId: 0,
};
const CLOSED_DRINK_MODAL: DrinkModalState = { show: false, reservationId: 0 };

export interface TimelineSelectionState {
  selectedReservation: Reservation | null;
  showReservationPopup: boolean;
  selectedRoom: Room | null;
  showCreateBooking: boolean;
  roomChangeDialog: RoomChangeDialog;
  drinkModal: DrinkModalState;
}

export interface TimelineSelectionActions {
  handleReservationClick: (reservation: Reservation) => void;
  handleRoomClick: (room: Room) => void;
  closeReservationPopup: () => void;
  closeCreateBooking: () => void;
  showRoomChangeDialog: (reservationId: number, fromRoomId: number, toRoomId: number) => void;
  closeRoomChangeDialog: () => void;
  handleShowDrinksModal: (reservationId: number) => void;
  closeDrinksModal: () => void;
}

export function useTimelineSelectionState(): TimelineSelectionState & TimelineSelectionActions {
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [showReservationPopup, setShowReservationPopup] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [showCreateBooking, setShowCreateBooking] = useState(false);
  const [roomChangeDialog, setRoomChangeDialog] = useState<RoomChangeDialog>(CLOSED_ROOM_CHANGE);
  const [drinkModal, setDrinkModal] = useState<DrinkModalState>(CLOSED_DRINK_MODAL);

  const handleReservationClick = useCallback((reservation: Reservation) => {
    setSelectedReservation(reservation);
    setShowReservationPopup(true);
  }, []);

  const handleRoomClick = useCallback((room: Room) => {
    setSelectedRoom(room);
    setShowCreateBooking(true);
  }, []);

  const closeReservationPopup = useCallback(() => {
    setShowReservationPopup(false);
    setSelectedReservation(null);
  }, []);

  const closeCreateBooking = useCallback(() => {
    setShowCreateBooking(false);
    setSelectedRoom(null);
  }, []);

  const showRoomChangeDialog = useCallback(
    (reservationId: number, fromRoomId: number, toRoomId: number) => {
      setRoomChangeDialog({ show: true, reservationId, fromRoomId, toRoomId });
    },
    []
  );

  const closeRoomChangeDialog = useCallback(() => {
    setRoomChangeDialog(CLOSED_ROOM_CHANGE);
  }, []);

  const handleShowDrinksModal = useCallback((reservationId: number) => {
    setDrinkModal({ show: true, reservationId });
  }, []);

  const closeDrinksModal = useCallback(() => {
    setDrinkModal(CLOSED_DRINK_MODAL);
  }, []);

  return {
    selectedReservation,
    showReservationPopup,
    selectedRoom,
    showCreateBooking,
    roomChangeDialog,
    drinkModal,
    handleReservationClick,
    handleRoomClick,
    closeReservationPopup,
    closeCreateBooking,
    showRoomChangeDialog,
    closeRoomChangeDialog,
    handleShowDrinksModal,
    closeDrinksModal,
  };
}
