import { useState, useCallback, useEffect } from 'react';
import type { Room } from '../../../lib/queries/hooks/useRooms';
import { useSimpleDragCreate, DragCreateSelection } from '../../../lib/hooks/useSimpleDragCreate';

export interface UseTimelineDragCreateParams {
  rooms: Room[];
  handleRoomClick: (room: Room) => void;
}

export interface UseTimelineDragCreateReturn {
  dragCreate: ReturnType<typeof useSimpleDragCreate>;
  dragCreatePreSelectedDates: { checkIn: Date; checkOut: Date } | null;
  clearDragCreatePreSelectedDates: () => void;
  handleDragCreateCellClick: (roomId: string, date: Date, isAM: boolean) => void;
}

export function useTimelineDragCreate({
  rooms,
  handleRoomClick,
}: UseTimelineDragCreateParams): UseTimelineDragCreateReturn {
  const dragCreate = useSimpleDragCreate();

  const [dragCreatePreSelectedDates, setDragCreatePreSelectedDates] = useState<{
    checkIn: Date;
    checkOut: Date;
  } | null>(null);

  const clearDragCreatePreSelectedDates = useCallback(() => {
    setDragCreatePreSelectedDates(null);
  }, []);

  // Cancel drag-create on Escape
  const dragCreateActions = dragCreate.actions;
  const dragCreateIsSelecting = dragCreate.state.isSelecting;
  useEffect(() => {
    if (!dragCreateIsSelecting) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dragCreateActions.cancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [dragCreateIsSelecting, dragCreateActions]);

  const handleDragCreateCellClick = useCallback(
    (roomId: string, date: Date, isAM: boolean) => {
      if (!dragCreate.state.isEnabled) return;

      if (!dragCreate.state.isSelecting && !isAM) {
        dragCreate.actions.startSelection(roomId, date);
      } else if (dragCreate.state.isSelecting && dragCreate.state.currentSelection && isAM) {
        const completedSelection = dragCreate.actions.completeSelection(
          date
        ) as DragCreateSelection | null;
        if (completedSelection && completedSelection.checkOutDate) {
          const dragDates = {
            checkIn: completedSelection.checkInDate,
            checkOut: completedSelection.checkOutDate,
          };
          setDragCreatePreSelectedDates(dragDates);
          const room = rooms.find((r) => r.id.toString() === roomId);
          if (room) handleRoomClick(room);
        }
      }
    },
    [dragCreate, rooms, handleRoomClick]
  );

  return {
    dragCreate,
    dragCreatePreSelectedDates,
    clearDragCreatePreSelectedDates,
    handleDragCreateCellClick,
  };
}
