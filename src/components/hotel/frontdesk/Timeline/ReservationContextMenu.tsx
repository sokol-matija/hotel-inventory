import { useState } from 'react';
import { createPortal } from 'react-dom';
import { BarChart3 } from 'lucide-react';
import { Reservation, ReservationStatus } from '../../../../lib/hotel/types';
import type { Guest } from '../../../../lib/queries/hooks/useGuests';
import type { Room } from '../../../../lib/queries/hooks/useRooms';
import { HotelEmailService } from '../../../../lib/emailService';

interface ReservationContextMenuProps {
  reservation: Reservation;
  position: { x: number; y: number };
  guest: Guest | undefined;
  room: Room;
  isFullscreen: boolean;
  onClose: (closedWithAction?: boolean) => void;
  onUpdateReservationStatus?: (id: string, status: ReservationStatus) => Promise<void>;
  onDeleteReservation?: (id: string) => Promise<void>;
  onShowDrinksModal?: (reservation: Reservation) => void;
  onShowExpandedDailyView?: (reservation: Reservation) => void;
  /** Show "Mark Clean (NFC)" item — used in room overview panel */
  showMarkClean?: boolean;
  onMarkClean?: (room: Room) => void;
}

export function ReservationContextMenu({
  reservation,
  position,
  guest,
  room,
  isFullscreen,
  onClose,
  onUpdateReservationStatus,
  onDeleteReservation,
  onShowDrinksModal,
  onShowExpandedDailyView,
  showMarkClean,
  onMarkClean,
}: ReservationContextMenuProps) {
  const [pendingStatus, setPendingStatus] = useState(false);

  const handleStatusUpdate = async (status: ReservationStatus) => {
    if (!onUpdateReservationStatus) return;
    setPendingStatus(true);
    try {
      await onUpdateReservationStatus(reservation.id, status);

      if (status === 'checked-in') {
        await HotelEmailService.sendWelcomeEmail(reservation, guest, room);
      } else if (status === 'checked-out') {
        await HotelEmailService.sendThankYouEmail(reservation, guest, room);
      }
    } finally {
      setPendingStatus(false);
    }
    onClose(true);
  };

  const handleDelete = async () => {
    if (!onDeleteReservation) return;
    if (
      window.confirm(`Are you sure you want to delete the reservation for ${reservation.guestId}?`)
    ) {
      try {
        await onDeleteReservation(reservation.id);
      } catch {
        // error handled by caller
      }
    }
    onClose(true);
  };

  const menu = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        role="button"
        tabIndex={0}
        aria-label="Close context menu"
        onClick={() => onClose(false)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onClose(false);
        }}
      />

      {/* Menu */}
      <div
        className="fixed z-[9999] min-w-[180px] rounded-lg border border-gray-200 bg-white py-2 shadow-xl"
        style={{ left: position.x, top: position.y }}
        role="menu"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fast Check-in */}
        <button
          className={`flex w-full items-center space-x-3 px-4 py-2 text-left text-sm transition-all duration-200 hover:bg-gray-100 ${pendingStatus ? 'cursor-wait opacity-70' : ''}`}
          disabled={pendingStatus}
          onClick={() => handleStatusUpdate('checked-in')}
        >
          <span className={`text-green-600 ${pendingStatus ? 'animate-spin' : ''}`}>
            {pendingStatus ? '⟳' : '✓'}
          </span>
          <span>Fast Check-in</span>
        </button>

        {/* Expand Day-by-Day View (timeline only) */}
        {onShowExpandedDailyView && (
          <button
            className="flex w-full items-center space-x-3 border-t border-gray-100 px-4 py-2 text-left text-sm text-blue-700 hover:bg-blue-50"
            onClick={() => {
              onShowExpandedDailyView(reservation);
              onClose(true);
            }}
          >
            <span className="text-blue-600">
              <BarChart3 className="h-4 w-4" />
            </span>
            <span>Expand Day-by-Day View</span>
          </button>
        )}

        {/* Fast Check-out */}
        <button
          className={`flex w-full items-center space-x-3 px-4 py-2 text-left text-sm transition-all duration-200 hover:bg-gray-100 ${pendingStatus ? 'cursor-wait opacity-70' : ''}`}
          disabled={pendingStatus}
          onClick={() => handleStatusUpdate('checked-out')}
        >
          <span className={`text-blue-600 ${pendingStatus ? 'animate-spin' : ''}`}>
            {pendingStatus ? '⟳' : '↗'}
          </span>
          <span>Fast Check-out</span>
        </button>

        {/* Add Room Service */}
        {onShowDrinksModal && (
          <button
            className="flex w-full items-center space-x-3 px-4 py-2 text-left text-sm hover:bg-gray-100"
            onClick={() => {
              onShowDrinksModal(reservation);
              onClose(true);
            }}
          >
            <span className="text-green-600">🛎️</span>
            <span>Add Room Service to Bill</span>
          </button>
        )}

        <div className="my-1 border-t border-gray-100" />

        {/* Mark Clean (NFC) — room overview only */}
        {showMarkClean && onMarkClean && (
          <>
            <button
              className="flex w-full items-center space-x-3 px-4 py-2 text-left text-sm hover:bg-blue-50"
              onClick={() => {
                onMarkClean(room);
                onClose(true);
              }}
            >
              <span className="text-blue-600">📍</span>
              <span>Mark Clean (NFC)</span>
            </button>
            <div className="my-1 border-t border-gray-100" />
          </>
        )}

        {/* Create Invoice */}
        <button
          className="flex w-full items-center space-x-3 px-4 py-2 text-left text-sm hover:bg-gray-100"
          onClick={() => onClose(true)}
        >
          <span className="text-purple-600">📄</span>
          <span>Create Invoice</span>
        </button>

        {/* Mark as Paid */}
        <button
          className="flex w-full items-center space-x-3 px-4 py-2 text-left text-sm hover:bg-gray-100"
          onClick={() => onClose(true)}
        >
          <span className="text-yellow-600">💰</span>
          <span>Mark as Paid</span>
        </button>

        <div className="my-1 border-t border-gray-100" />

        {/* Delete */}
        <button
          className="flex w-full items-center space-x-3 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
          onClick={handleDelete}
        >
          <span className="text-red-600">×</span>
          <span>Delete Reservation</span>
        </button>
      </div>
    </>
  );

  return isFullscreen ? createPortal(menu, document.body) : menu;
}
