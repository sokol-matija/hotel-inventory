/**
 * Simple Drag-to-Create Hook
 * 
 * A minimal implementation for drag-to-create functionality without
 * complex state machines or services. Just basic state management.
 */

import { useState, useCallback } from 'react';

export interface DragCreateSelection {
  roomId: string;
  checkInDate: Date;
  checkOutDate?: Date;
}

export interface SimpleDragCreateState {
  isEnabled: boolean;
  currentSelection: DragCreateSelection | null;
  isSelecting: boolean;
}

export function useSimpleDragCreate() {
  const [state, setState] = useState<SimpleDragCreateState>({
    isEnabled: false,
    currentSelection: null,
    isSelecting: false
  });

  const enable = useCallback(() => {
    setState({
      isEnabled: true,
      currentSelection: null,
      isSelecting: false
    });
  }, []);

  const disable = useCallback(() => {
    setState({
      isEnabled: false,
      currentSelection: null,
      isSelecting: false
    });
  }, []);

  const startSelection = useCallback((roomId: string, checkInDate: Date) => {
    console.log('🟢 Starting selection:', { roomId, checkInDate });
    setState({
      isEnabled: true,
      currentSelection: {
        roomId,
        checkInDate
      },
      isSelecting: true
    });
  }, []);

  const completeSelection = useCallback((checkOutDate: Date) => {
    if (!state.currentSelection) return null;
    
    console.log('🔵 Completing selection:', { checkOutDate });
    const completedSelection = {
      ...state.currentSelection,
      checkOutDate
    };

    setState({
      isEnabled: true,
      currentSelection: completedSelection,
      isSelecting: false
    });

    return completedSelection;
  }, [state.currentSelection]);

  const cancel = useCallback(() => {
    console.log('❌ Cancelling selection');
    setState(prev => ({
      ...prev,
      currentSelection: null,
      isSelecting: false
    }));
  }, []);

  const shouldHighlightCell = useCallback((roomId: string, date: Date, isAM: boolean) => {
    if (!state.isEnabled) return 'none';

    if (!state.isSelecting) {
      // First click: highlight PM cells only
      return !isAM ? 'selectable' : 'none';
    } else if (state.currentSelection) {
      // Second click: highlight AM cells after the check-in date
      if (isAM && date > state.currentSelection.checkInDate) {
        return 'selectable';
      }
      // Show preview for the current selection
      if (roomId === state.currentSelection.roomId && 
          date >= state.currentSelection.checkInDate) {
        return 'preview';
      }
    }

    return 'none';
  }, [state.isEnabled, state.isSelecting, state.currentSelection]);

  return {
    state,
    actions: {
      enable,
      disable,
      startSelection,
      completeSelection,
      cancel
    },
    shouldHighlightCell
  };
}