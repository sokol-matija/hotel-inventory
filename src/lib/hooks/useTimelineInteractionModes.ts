import { useState, useCallback } from 'react';
import type {
  HotelTimelineService,
  DragCreateState,
  DragCreatePreview,
} from '@/lib/hotel/services/HotelTimelineService';

export interface TimelineInteractionModesState {
  isDragCreateMode: boolean;
  isDragCreating: boolean;
  dragCreateStart: DragCreateState | null;
  dragCreateEnd: DragCreateState | null;
  dragCreatePreview: DragCreatePreview | null;
  dragCreateDates: { checkIn: Date; checkOut: Date } | null;
  isExpansionMode: boolean;
  isMoveMode: boolean;
}

export interface TimelineInteractionModesActions {
  toggleDragCreateMode: () => void;
  toggleExpansionMode: () => void;
  toggleMoveMode: () => void;
  exitAllModes: () => void;
  handleDragCreateStart: (roomId: string, dayIndex: number) => void;
  handleDragCreateMove: (roomId: string, dayIndex: number) => void;
  handleDragCreateEnd: () => void;
  clearDragCreate: () => void;
}

interface Params {
  currentDate: Date;
  timelineService: HotelTimelineService;
}

export function useTimelineInteractionModes({
  currentDate,
  timelineService,
}: Params): TimelineInteractionModesState & TimelineInteractionModesActions {
  const [isDragCreateMode, setIsDragCreateMode] = useState(false);
  const [isDragCreating, setIsDragCreating] = useState(false);
  const [dragCreateStart, setDragCreateStart] = useState<DragCreateState | null>(null);
  const [dragCreateEnd, setDragCreateEnd] = useState<DragCreateState | null>(null);
  const [dragCreatePreview, setDragCreatePreview] = useState<DragCreatePreview | null>(null);
  const [dragCreateDates, setDragCreateDates] = useState<{ checkIn: Date; checkOut: Date } | null>(
    null
  );
  const [isExpansionMode, setIsExpansionMode] = useState(false);
  const [isMoveMode, setIsMoveMode] = useState(false);

  const clearDragState = useCallback(() => {
    setIsDragCreating(false);
    setDragCreateStart(null);
    setDragCreateEnd(null);
    setDragCreatePreview(null);
    setDragCreateDates(null);
  }, []);

  const exitAllModes = useCallback(() => {
    setIsDragCreateMode(false);
    setIsExpansionMode(false);
    setIsMoveMode(false);
    clearDragState();
  }, [clearDragState]);

  const toggleDragCreateMode = useCallback(() => {
    setIsDragCreateMode((prev) => {
      if (!prev) {
        // Entering drag-create: disable other modes
        setIsExpansionMode(false);
        setIsMoveMode(false);
      } else {
        clearDragState();
      }
      return !prev;
    });
  }, [clearDragState]);

  const toggleExpansionMode = useCallback(() => {
    setIsExpansionMode((prev) => {
      if (!prev) {
        setIsDragCreateMode(false);
        setIsMoveMode(false);
        clearDragState();
      }
      return !prev;
    });
  }, [clearDragState]);

  const toggleMoveMode = useCallback(() => {
    setIsMoveMode((prev) => {
      if (!prev) {
        setIsDragCreateMode(false);
        setIsExpansionMode(false);
        clearDragState();
      }
      return !prev;
    });
  }, [clearDragState]);

  const handleDragCreateStart = useCallback(
    (roomId: string, dayIndex: number) => {
      if (!isDragCreateMode) return;
      setIsDragCreating(true);
      const start = { roomId, dayIndex };
      setDragCreateStart(start);
      setDragCreateEnd(start);
      const preview = timelineService.calculateDragCreatePreview(start, start);
      setDragCreatePreview(preview);
      if (preview) {
        setDragCreateDates(
          timelineService.convertDayIndexToDates(preview.startDay, preview.endDay, currentDate)
        );
      }
    },
    [isDragCreateMode, currentDate, timelineService]
  );

  const handleDragCreateMove = useCallback(
    (roomId: string, dayIndex: number) => {
      if (!isDragCreating || !dragCreateStart) return;
      const end = { roomId, dayIndex };
      setDragCreateEnd(end);
      const preview = timelineService.calculateDragCreatePreview(dragCreateStart, end);
      setDragCreatePreview(preview);
      if (preview) {
        setDragCreateDates(
          timelineService.convertDayIndexToDates(preview.startDay, preview.endDay, currentDate)
        );
      }
    },
    [isDragCreating, dragCreateStart, currentDate, timelineService]
  );

  const handleDragCreateEnd = useCallback(() => {
    setIsDragCreating(false);
    // Preview + dates are kept intentionally for booking creation
  }, []);

  const clearDragCreate = useCallback(() => {
    clearDragState();
  }, [clearDragState]);

  return {
    isDragCreateMode,
    isDragCreating,
    dragCreateStart,
    dragCreateEnd,
    dragCreatePreview,
    dragCreateDates,
    isExpansionMode,
    isMoveMode,
    toggleDragCreateMode,
    toggleExpansionMode,
    toggleMoveMode,
    exitAllModes,
    handleDragCreateStart,
    handleDragCreateMove,
    handleDragCreateEnd,
    clearDragCreate,
  };
}
