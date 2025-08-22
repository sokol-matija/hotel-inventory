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
  hoverPreview: {
    roomId: string;
    hoverDate: Date;
  } | null;
}

export function useSimpleDragCreate() {
  const [state, setState] = useState<SimpleDragCreateState>({
    isEnabled: false,
    currentSelection: null,
    isSelecting: false,
    hoverPreview: null
  });

  const enable = useCallback(() => {
    setState({
      isEnabled: true,
      currentSelection: null,
      isSelecting: false,
      hoverPreview: null
    });
  }, []);

  const disable = useCallback(() => {
    setState({
      isEnabled: false,
      currentSelection: null,
      isSelecting: false,
      hoverPreview: null
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
      isSelecting: true,
      hoverPreview: null
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
      isSelecting: false,
      hoverPreview: null
    });

    return completedSelection;
  }, [state.currentSelection]);

  const cancel = useCallback(() => {
    console.log('❌ Cancelling selection');
    setState(prev => ({
      ...prev,
      currentSelection: null,
      isSelecting: false,
      hoverPreview: null
    }));
  }, []);

  const setHoverPreview = useCallback((roomId: string, hoverDate: Date) => {
    if (!state.isSelecting || !state.currentSelection) return;
    if (roomId !== state.currentSelection.roomId) return;
    
    console.log('🎯 Setting hover preview:', { roomId, hoverDate: hoverDate.toLocaleDateString(), checkIn: state.currentSelection.checkInDate.toLocaleDateString() });
    
    setState(prev => ({
      ...prev,
      hoverPreview: { roomId, hoverDate }
    }));
  }, [state.isSelecting, state.currentSelection]);

  const clearHoverPreview = useCallback(() => {
    setState(prev => ({
      ...prev,
      hoverPreview: null
    }));
  }, []);

  const shouldHighlightCell = useCallback((roomId: string, date: Date, isAM: boolean) => {
    if (!state.isEnabled) return 'none';

    if (!state.isSelecting) {
      // First click: highlight PM cells only (all rooms available for selection)
      return !isAM ? 'selectable' : 'none';
    } else if (state.currentSelection) {
      const isSameRoom = roomId === state.currentSelection.roomId;
      
      // Only highlight cells in the SAME ROOM where drag started
      if (!isSameRoom) return 'none';
      
      // PRIORITY: Only AM cells after the hovered PM position are selectable for ending reservation
      if (isAM && state.hoverPreview) {
        const dayAfterHover = new Date(state.hoverPreview.hoverDate);
        dayAfterHover.setDate(dayAfterHover.getDate() + 1);
        dayAfterHover.setHours(0, 0, 0, 0); // Start of day
        
        const currentDateStart = new Date(date);
        currentDateStart.setHours(0, 0, 0, 0);
        
        if (currentDateStart >= dayAfterHover) {
          return 'selectable';
        }
      }
      
      // Show hover preview (growing reservation box effect) - ONLY for PM cells from check-in onwards
      if (state.hoverPreview && state.hoverPreview.roomId === roomId && 
          date >= state.currentSelection.checkInDate && date <= state.hoverPreview.hoverDate &&
          !isAM) { // CONSTRAINT: Only show hover preview on PM cells (reservations span PM to AM)
        console.log('📦 Showing hover preview for PM cell:', { roomId, date: date.toLocaleDateString() });
        return 'hover-preview';
      }
      
      // Show basic preview for current selection span (check-in onwards, but not the selectable AM cells)
      if (date >= state.currentSelection.checkInDate) {
        return 'preview';
      }
    }

    return 'none';
  }, [state.isEnabled, state.isSelecting, state.currentSelection, state.hoverPreview]);

  return {
    state,
    actions: {
      enable,
      disable,
      startSelection,
      completeSelection,
      cancel,
      setHoverPreview,
      clearHoverPreview
    },
    shouldHighlightCell
  };
}