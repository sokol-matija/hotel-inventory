// FloatingCreateButton - Floating Action Button for creating unallocated reservations
// Circular button positioned bottom-right with white plus icon

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../../ui/button';
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
        className="
          fixed
          bottom-6
          right-6
          z-50
          w-16
          h-16
          rounded-full
          bg-blue-600
          hover:bg-blue-700
          active:bg-blue-800
          text-white
          shadow-2xl
          hover:shadow-3xl
          transition-all
          duration-200
          ease-in-out
          hover:scale-110
          active:scale-95
          flex
          items-center
          justify-center
          focus:outline-none
          focus:ring-4
          focus:ring-blue-300
          group
        "
        aria-label="Create new reservation"
        title="Create Unallocated Reservation"
      >
        <Plus
          className="
            w-8
            h-8
            transition-transform
            duration-200
            group-hover:rotate-90
          "
        />
      </button>

      {/* Modal for creating unallocated reservation */}
      {isModalOpen && (
        <ModernCreateBookingModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          room={null as any} // We'll modify ModernCreateBookingModal to handle null room
          allowRoomSelection={true}
          unallocatedMode={true}
        />
      )}
    </>
  );
}
