// FloatingCreateButton - Floating Action Button for creating unallocated reservations
// Circular button positioned bottom-right with white plus icon

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import ModernCreateBookingModal from './ModernCreateBookingModal';

interface FloatingCreateButtonProps {
  /**
   * Optional callback when button is clicked
   */
  onClick?: () => void;
}

export default function FloatingCreateButton({ onClick }: FloatingCreateButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={handleClick}
        className="hover:shadow-3xl group fixed right-6 bottom-6 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white shadow-2xl transition-all duration-200 ease-in-out hover:scale-110 hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 focus:outline-none active:scale-95 active:bg-blue-800"
        aria-label="Create new reservation"
        title="Create Unallocated Reservation"
      >
        <Plus className="h-8 w-8 transition-transform duration-200 group-hover:rotate-90" />
      </button>

      {/* Modal for creating unallocated reservation */}
      {isModalOpen && (
        <ModernCreateBookingModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          room={null}
          allowRoomSelection={true}
          unallocatedMode={true}
        />
      )}
    </>
  );
}
