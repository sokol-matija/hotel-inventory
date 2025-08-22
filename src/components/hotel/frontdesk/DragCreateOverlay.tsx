/**
 * DragCreateOverlay Component
 * 
 * Provides visual feedback during drag-to-create operations.
 * Shows a growing reservation box that expands as the user hovers over cells.
 */

import React, { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { format, differenceInDays } from 'date-fns';
import { SimpleDragCreateState } from '../../../lib/hooks/useSimpleDragCreate';

interface DragCreateOverlayProps {
  dragCreateState: SimpleDragCreateState;
  timelineRef: React.RefObject<HTMLDivElement | null>;
  cellRefs: Map<string, HTMLElement>; // Map of "roomId-date-isAM" -> HTMLElement
}

interface OverlayRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export const DragCreateOverlay: React.FC<DragCreateOverlayProps> = ({
  dragCreateState,
  timelineRef,
  cellRefs
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Calculate overlay position and size
  const calculateOverlayRect = (): OverlayRect | null => {
    if (!dragCreateState.isSelecting || !dragCreateState.currentSelection || !dragCreateState.hoverPreview) {
      return null;
    }

    const { currentSelection, hoverPreview } = dragCreateState;
    
    // Get start cell (PM cell where drag started)
    const startKey = `${currentSelection.roomId}-${currentSelection.checkInDate.toISOString().split('T')[0]}-PM`;
    const startCell = cellRefs.get(startKey);
    
    // Get end cell (current hover position)
    const endKey = `${hoverPreview.roomId}-${hoverPreview.hoverDate.toISOString().split('T')[0]}-${hoverPreview.isAM ? 'AM' : 'PM'}`;
    const endCell = cellRefs.get(endKey);

    if (!startCell || !endCell || !timelineRef.current) {
      return null;
    }

    const timelineRect = timelineRef.current.getBoundingClientRect();
    const startRect = startCell.getBoundingClientRect();
    const endRect = endCell.getBoundingClientRect();

    // Calculate relative positions
    const left = startRect.left - timelineRect.left;
    const top = startRect.top - timelineRect.top;
    const right = endRect.right - timelineRect.left;
    const bottom = endRect.bottom - timelineRect.top;

    return {
      left,
      top,
      width: right - left,
      height: bottom - top
    };
  };

  // Update overlay position when hover preview changes
  useEffect(() => {
    if (!overlayRef.current) return;

    const rect = calculateOverlayRect();
    
    if (rect) {
      const overlay = overlayRef.current;
      overlay.style.left = `${rect.left}px`;
      overlay.style.top = `${rect.top}px`;
      overlay.style.width = `${rect.width}px`;
      overlay.style.height = `${rect.height}px`;
      overlay.style.opacity = '1';
      overlay.style.pointerEvents = 'none'; // Allow click-through
    } else {
      overlayRef.current.style.opacity = '0';
    }
  }, [dragCreateState.hoverPreview, dragCreateState.currentSelection]);

  // Calculate number of nights for display
  const getNumberOfNights = (): number => {
    if (!dragCreateState.currentSelection || !dragCreateState.hoverPreview) {
      return 0;
    }

    // For PM to AM transition, we add 1 day to get the checkout AM cell
    const endDate = new Date(dragCreateState.hoverPreview.hoverDate);
    if (dragCreateState.hoverPreview.isAM) {
      // If hovering over AM cell, that's the checkout day
      return differenceInDays(endDate, dragCreateState.currentSelection.checkInDate);
    } else {
      // If hovering over PM cell, add 1 for potential AM checkout next day
      return differenceInDays(endDate, dragCreateState.currentSelection.checkInDate) + 1;
    }
  };

  // Get overlay content
  const getOverlayContent = () => {
    if (!dragCreateState.currentSelection || !dragCreateState.hoverPreview) {
      return null;
    }

    const numberOfNights = getNumberOfNights();
    const checkInDate = dragCreateState.currentSelection.checkInDate;
    const checkOutDate = new Date(dragCreateState.hoverPreview.hoverDate);
    
    if (dragCreateState.hoverPreview.isAM) {
      // AM cell is checkout - use as-is
    } else {
      // PM cell - add 1 day for potential checkout
      checkOutDate.setDate(checkOutDate.getDate() + 1);
    }

    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center p-2">
        <div className="text-lg font-bold">New Reservation</div>
        <div className="text-sm opacity-90">
          {format(checkInDate, 'MMM dd')} → {format(checkOutDate, 'MMM dd')}
        </div>
        <div className="text-xs opacity-75">
          {numberOfNights} night{numberOfNights !== 1 ? 's' : ''}
        </div>
      </div>
    );
  };

  // Don't render if not in drag create mode
  if (!dragCreateState.isEnabled || !dragCreateState.isSelecting) {
    return null;
  }

  // Only render if we have both timeline ref and hover preview
  if (!timelineRef.current || !dragCreateState.hoverPreview) {
    return null;
  }

  return createPortal(
    <div
      ref={overlayRef}
      className="absolute z-50 pointer-events-none transition-all duration-150 ease-out"
      style={{
        backgroundColor: 'rgba(59, 130, 246, 0.8)', // Blue with transparency
        border: '2px solid rgb(59, 130, 246)',
        borderRadius: '6px',
        opacity: '0', // Initially hidden, will be shown by useEffect
        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
        backdropFilter: 'blur(2px)'
      }}
    >
      {getOverlayContent()}
    </div>,
    timelineRef.current
  );
};

export default DragCreateOverlay;