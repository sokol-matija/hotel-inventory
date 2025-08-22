/**
 * Simple Drag-to-Create Hook
 * 
 * A minimal implementation for drag-to-create functionality without
 * complex state machines or services. Just basic state management.
 */

import { useState, useCallback, useRef, useEffect } from 'react';

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
    isAM: boolean;
  } | null;
}

export function useSimpleDragCreate() {
  const [state, setState] = useState<SimpleDragCreateState>({
    isEnabled: false,
    currentSelection: null,
    isSelecting: false,
    hoverPreview: null
  });

  const stateRef = useRef(state);
  
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

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
    let completedSelection: DragCreateSelection | null = null;
    
    setState(prevState => {
      if (!prevState.currentSelection) {
        return prevState;
      }
      
      console.log('🔵 Completing selection:', { checkOutDate });
      completedSelection = {
        ...prevState.currentSelection,
        checkOutDate
      };
      
      return {
        isEnabled: true,
        currentSelection: completedSelection,
        isSelecting: false,
        hoverPreview: null
      };
    });
    
    return completedSelection;
  }, []);

  const cancel = useCallback(() => {
    console.log('❌ Cancelling selection');
    setState(prev => ({
      ...prev,
      currentSelection: null,
      isSelecting: false,
      hoverPreview: null
    }));
  }, []);

  const setHoverPreview = useCallback((roomId: string, hoverDate: Date, isAM: boolean) => {
    setState(prev => {
      if (!prev.isSelecting || !prev.currentSelection) return prev;
      if (roomId !== prev.currentSelection.roomId) return prev;
      
      console.log('🎯 Setting hover preview:', { roomId, hoverDate: hoverDate.toLocaleDateString(), isAM, checkIn: prev.currentSelection.checkInDate.toLocaleDateString() });
      
      return {
        ...prev,
        hoverPreview: { roomId, hoverDate, isAM }
      };
    });
  }, []);

  const clearHoverPreview = useCallback(() => {
    setState(prev => ({
      ...prev,
      hoverPreview: null
    }));
  }, []);

  const shouldHighlightCell = useCallback((roomId: string, date: Date, isAM: boolean) => {
    const currentState = stateRef.current;
    if (!currentState.isEnabled) return 'none';

    if (!currentState.isSelecting) {
      // First click: highlight PM cells only (all rooms available for selection)
      return !isAM ? 'selectable' : 'none';
    } else if (currentState.currentSelection) {
      const isSameRoom = roomId === currentState.currentSelection.roomId;
      
      // Only highlight cells in the SAME ROOM where drag started
      if (!isSameRoom) return 'none';
      
      // PRIORITY: Only AM cells after the hovered PM position are selectable for ending reservation
      if (isAM && currentState.hoverPreview) {
        const dayAfterHover = new Date(currentState.hoverPreview.hoverDate);
        dayAfterHover.setDate(dayAfterHover.getDate() + 1);
        dayAfterHover.setHours(0, 0, 0, 0); // Start of day
        
        const currentDateStart = new Date(date);
        currentDateStart.setHours(0, 0, 0, 0);
        
        if (currentDateStart >= dayAfterHover) {
          return 'selectable';
        }
      }
      
      // Show hover preview (growing reservation box effect) - PM cells up to hovered position
      if (currentState.hoverPreview && currentState.hoverPreview.roomId === roomId && 
          date >= currentState.currentSelection.checkInDate && date <= currentState.hoverPreview.hoverDate) {
        
        // For PM cells: show preview up to hover position 
        if (!isAM) {
          console.log('📦 Showing hover preview for PM cell:', { roomId, date: date.toLocaleDateString() });
          return 'hover-preview';
        }
        
        // For AM cells: show preview only if it's the same day as hover position (checkout)
        const hoverDay = new Date(currentState.hoverPreview.hoverDate);
        hoverDay.setHours(0, 0, 0, 0);
        const currentDay = new Date(date);
        currentDay.setHours(0, 0, 0, 0);
        
        if (currentDay.getTime() === hoverDay.getTime()) {
          console.log('📦 Showing hover preview for checkout AM cell:', { roomId, date: date.toLocaleDateString() });
          return 'hover-preview';
        }
      }
      
      // Show basic preview for current selection span (check-in onwards, but not the selectable AM cells)
      if (date >= currentState.currentSelection.checkInDate) {
        return 'preview';
      }
    }

    return 'none';
  }, []);

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