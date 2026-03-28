import { useEffect } from 'react';
import type { Reservation } from '../../../lib/hotel/types';
import type { RoomChangeDialog } from '../../../lib/hotel/services/HotelTimelineService';

export interface UseTimelineKeyboardShortcutsParams {
  dragCreate: {
    state: { isEnabled: boolean };
    actions: { enable: () => void; disable: () => void };
  };
  isExpansionMode: boolean;
  isMoveMode: boolean;
  showReservationPopup: boolean;
  showCreateBooking: boolean;
  roomChangeDialog: RoomChangeDialog;
  currentDate: Date;
  selectedReservation: Reservation | null;
  handleNavigate: (action: 'PREV' | 'NEXT' | 'TODAY') => void;
  toggleExpansionMode: () => void;
  toggleMoveMode: () => void;
  exitAllModes: () => void;
  closeReservationPopup: () => void;
  closeCreateBooking: () => void;
  closeRoomChangeDialog: () => void;
  handleMoveReservationArrow: (direction: 'left' | 'right') => Promise<void>;
}

export function useTimelineKeyboardShortcuts({
  dragCreate,
  isExpansionMode,
  isMoveMode,
  showReservationPopup,
  showCreateBooking,
  roomChangeDialog,
  currentDate,
  selectedReservation,
  handleNavigate,
  toggleExpansionMode,
  toggleMoveMode,
  exitAllModes,
  closeReservationPopup,
  closeCreateBooking,
  closeRoomChangeDialog,
  handleMoveReservationArrow,
}: UseTimelineKeyboardShortcutsParams): void {
  useEffect(() => {
    let cancelled = false;
    let removeListener: (() => void) | undefined;

    const initKeyboardShortcuts = async () => {
      const { KeyboardShortcutService } =
        await import('../../../lib/hotel/services/KeyboardShortcutService');
      if (cancelled) return;
      const shortcutService = KeyboardShortcutService.getInstance();
      shortcutService.updateContext({
        isModalOpen: showReservationPopup || showCreateBooking || roomChangeDialog.show,
        selectedReservations: selectedReservation ? [String(selectedReservation.id)] : [],
        activeMode: dragCreate.state.isEnabled
          ? 'drag_create'
          : isExpansionMode
            ? 'expand'
            : isMoveMode
              ? 'move'
              : 'normal',
        currentDate,
      });

      const handleShortcut = (event: CustomEvent) => {
        const { action } = event.detail;
        switch (action) {
          case 'navigate_prev_day':
            handleNavigate('PREV');
            break;
          case 'navigate_next_day':
            handleNavigate('NEXT');
            break;
          case 'navigate_today':
            handleNavigate('TODAY');
            break;
          case 'toggle_drag_create':
            if (dragCreate.state.isEnabled) {
              dragCreate.actions.disable();
            } else {
              dragCreate.actions.enable();
            }
            break;
          case 'toggle_expansion':
            toggleExpansionMode();
            break;
          case 'toggle_move':
            toggleMoveMode();
            break;
          case 'escape':
            exitAllModes();
            dragCreate.actions.disable();
            if (showReservationPopup) closeReservationPopup();
            if (showCreateBooking) closeCreateBooking();
            if (roomChangeDialog.show) closeRoomChangeDialog();
            break;
          case 'move_reservation_left':
            handleMoveReservationArrow('left');
            break;
          case 'move_reservation_right':
            handleMoveReservationArrow('right');
            break;
        }
      };

      document.addEventListener('hotel-timeline-shortcut', handleShortcut as EventListener);
      removeListener = () =>
        document.removeEventListener('hotel-timeline-shortcut', handleShortcut as EventListener);
    };

    initKeyboardShortcuts();
    return () => {
      cancelled = true;
      removeListener?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dragCreate.state.isEnabled,
    isExpansionMode,
    isMoveMode,
    showReservationPopup,
    showCreateBooking,
    roomChangeDialog.show,
    currentDate,
    closeCreateBooking,
    closeReservationPopup,
    closeRoomChangeDialog,
    dragCreate.actions,
    exitAllModes,
    handleNavigate,
    selectedReservation,
    toggleExpansionMode,
    toggleMoveMode,
  ]);
}
