import { useState, useCallback, useEffect, useRef } from 'react';
import type { Room } from '../../../lib/queries/hooks/useRooms';

export type CellHighlight = 'selectable' | 'preview' | 'start' | 'none';

interface DragCreateState {
  isEnabled: boolean;
  isSelecting: boolean;
  startRoomId: string | null;
  startDate: Date | null;
  hoverDate: Date | null;
}

const INITIAL_STATE: DragCreateState = {
  isEnabled: false,
  isSelecting: false,
  startRoomId: null,
  startDate: null,
  hoverDate: null,
};

const DAY_MS = 86_400_000;

export function useTimelineDragCreate({
  rooms,
  handleRoomClick,
}: {
  rooms: Room[];
  handleRoomClick: (room: Room) => void;
}) {
  const [state, setState] = useState<DragCreateState>(INITIAL_STATE);
  const stateRef = useRef(state);
  stateRef.current = state;

  const [preSelectedDates, setPreSelectedDates] = useState<{
    checkIn: Date;
    checkOut: Date;
  } | null>(null);

  const enable = useCallback(() => {
    setState({ ...INITIAL_STATE, isEnabled: true });
  }, []);

  const disable = useCallback(() => {
    setState(INITIAL_STATE);
  }, []);

  const cancel = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isSelecting: false,
      startRoomId: null,
      startDate: null,
      hoverDate: null,
    }));
  }, []);

  // Escape cancels active selection (but keeps mode enabled)
  useEffect(() => {
    if (!state.isSelecting) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cancel();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [state.isSelecting, cancel]);

  const handleCellClick = useCallback(
    (roomId: string, date: Date, isAM: boolean) => {
      const s = stateRef.current;

      // Quick-create shortcut: PM click when not in drag-create mode
      if (!s.isEnabled) {
        if (!isAM) {
          const checkIn = new Date(date);
          checkIn.setHours(15, 0, 0, 0);
          const checkOut = new Date(checkIn);
          checkOut.setDate(checkOut.getDate() + 2);
          checkOut.setHours(11, 0, 0, 0);
          setPreSelectedDates({ checkIn, checkOut });
          const room = rooms.find((r) => r.id.toString() === roomId);
          if (room) handleRoomClick(room);
        }
        return;
      }

      // First click: PM cell starts selection
      if (!s.isSelecting && !isAM) {
        setState((prev) => ({
          ...prev,
          isSelecting: true,
          startRoomId: roomId,
          startDate: date,
          hoverDate: null,
        }));
        return;
      }

      // Second click: AM cell in same room completes selection
      if (s.isSelecting && s.startDate && s.startRoomId === roomId && isAM && date > s.startDate) {
        setPreSelectedDates({ checkIn: s.startDate, checkOut: date });
        setState((prev) => ({
          ...prev,
          isSelecting: false,
          startRoomId: null,
          startDate: null,
          hoverDate: null,
        }));
        const room = rooms.find((r) => r.id.toString() === roomId);
        if (room) handleRoomClick(room);
      }
    },
    [rooms, handleRoomClick]
  );

  const handleCellHover = useCallback((roomId: string, date: Date) => {
    const s = stateRef.current;
    if (!s.isSelecting || roomId !== s.startRoomId) return;
    setState((prev) => ({ ...prev, hoverDate: date }));
  }, []);

  const shouldHighlightCell = useCallback(
    (roomId: string, date: Date, isAM: boolean): CellHighlight => {
      const s = stateRef.current;
      if (!s.isEnabled) return 'none';

      // Before first click: all PM cells are selectable
      if (!s.isSelecting) {
        return !isAM ? 'selectable' : 'none';
      }

      // After first click: only same room
      if (roomId !== s.startRoomId || !s.startDate) return 'none';

      // Start cell gets distinct anchor style
      if (!isAM && date.getTime() === s.startDate.getTime()) return 'start';

      // Both AM and PM cells in the range [start+1..hover] are part of the preview body
      if (s.hoverDate && date > s.startDate && date <= s.hoverDate) {
        return 'preview';
      }

      // AM cells after start (past hover or no hover yet) are checkout targets
      if (isAM && date > s.startDate) return 'selectable';

      return 'none';
    },
    []
  );

  // Night count: how many nights the current selection spans
  const nightCount =
    state.isSelecting && state.startDate && state.hoverDate
      ? Math.round((state.hoverDate.getTime() - state.startDate.getTime()) / DAY_MS) + 1
      : null;

  const clearPreSelectedDates = useCallback(() => {
    setPreSelectedDates(null);
  }, []);

  return {
    state: { isEnabled: state.isEnabled, isSelecting: state.isSelecting },
    actions: { enable, disable },
    shouldHighlightCell,
    handleCellClick,
    handleCellHover,
    nightCount,
    preSelectedDates,
    clearPreSelectedDates,
  };
}
