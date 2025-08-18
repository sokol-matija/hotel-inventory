/**
 * useDragCreate - Custom hook for drag-to-create functionality
 * 
 * This hook provides a clean React interface to the DragCreateService,
 * handling state subscriptions, side effects, and integration with
 * the hotel management system.
 * 
 * Features:
 * - Automatic state synchronization with DragCreateService
 * - Real-time conflict detection and user feedback
 * - Integration with hotel context and notifications
 * - Clean component interface with minimal boilerplate
 * 
 * @author Hotel Management System v2.8
 * @since August 2025
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { DragCreateService, DragCreateState, SelectionResult } from '../hotel/services/DragCreateService';
import { useHotel } from '../hotel/state/SupabaseHotelContext';
import hotelNotification from '../notifications';

export interface DragCreateActions {
  enable: () => void;
  disable: () => void;
  selectCheckIn: (roomId: string, date: Date) => Promise<void>;
  selectCheckOut: (roomId: string, date: Date, isConfirming?: boolean) => Promise<void>;
  confirmSelection: () => void;
  completeCreation: () => void;
}

export interface DragCreateHookReturn {
  // State
  state: DragCreateState;
  isEnabled: boolean;
  
  // Current step info for UI
  currentInstruction: string;
  highlightMode: 'pm' | 'am' | 'none';
  
  // Preview data for timeline
  preview: DragCreateState['preview'];
  selection: DragCreateState['selection'];
  
  // Actions
  actions: DragCreateActions;
  
  // Utility functions
  shouldHighlightCell: (roomId: string, dayIndex: number, isAM: boolean) => 'selectable' | 'preview' | 'none';
  getClickableRooms: () => { pm: Set<string>; am: Set<string> };
  canClickCell: (roomId: string, isAM: boolean) => boolean;
}

export function useDragCreate(): DragCreateHookReturn {
  const dragCreateService = DragCreateService.getInstance();
  const { rooms, reservations } = useHotel();
  
  // Local state for the drag-create service state
  const [state, setState] = useState<DragCreateState>(dragCreateService.getState());

  // Subscribe to service state changes
  useEffect(() => {
    const unsubscribe = dragCreateService.subscribe((newState) => {
      setState(newState);
    });

    return unsubscribe;
  }, [dragCreateService]);

  // Handle selection results with notifications
  const handleSelectionResult = useCallback((result: SelectionResult) => {
    if (!result.success && result.error) {
      hotelNotification.error('Selection Error', result.error, 3);
    }

    if (result.shouldShowAlternatives && result.shouldShowAlternatives.length > 0) {
      const alternatives = result.shouldShowAlternatives
        .map(room => `Room ${room.number}`)
        .join(', ');
      hotelNotification.info(
        'Alternative Rooms Available', 
        `Try these available rooms: ${alternatives}`, 
        5
      );
    }
  }, []);

  // Action creators
  const actions: DragCreateActions = useMemo(() => ({
    enable: () => {
      const result = dragCreateService.enable();
      if (result.success) {
        hotelNotification.success(
          'Drag Create Enabled', 
          'Click a PM (afternoon) slot to start creating a reservation', 
          3
        );
      }
      handleSelectionResult(result);
    },

    disable: () => {
      const result = dragCreateService.disable();
      if (result.success) {
        hotelNotification.info('Drag Create Disabled', 'Drag-to-create mode turned off', 2);
      }
      handleSelectionResult(result);
    },

    selectCheckIn: async (roomId: string, date: Date) => {
      try {
        const result = await dragCreateService.selectCheckIn(roomId, date, rooms);
        
        if (result.success && result.newState.selection) {
          const room = result.newState.selection.room;
          hotelNotification.success(
            'Check-in Selected', 
            `Room ${room?.number}: ${result.newState.selection.checkIn.toLocaleDateString()} at 3:00 PM`, 
            3
          );
        }
        
        handleSelectionResult(result);
      } catch (error) {
        console.error('Error selecting check-in:', error);
        hotelNotification.error('Selection Error', 'Failed to select check-in date', 3);
      }
    },

    selectCheckOut: async (roomId: string, date: Date, isConfirming = false) => {
      try {
        const result = await dragCreateService.selectCheckOut(roomId, date, isConfirming);
        
        if (result.success && result.newState.selection && isConfirming) {
          const nights = Math.ceil(
            (result.newState.selection.checkOut.getTime() - result.newState.selection.checkIn.getTime()) 
            / (24 * 60 * 60 * 1000)
          );
          
          hotelNotification.success(
            'Reservation Ready', 
            `${nights} night${nights > 1 ? 's' : ''} selected. Opening booking form...`, 
            2
          );
        }
        
        handleSelectionResult(result);
      } catch (error) {
        console.error('Error selecting check-out:', error);
        hotelNotification.error('Selection Error', 'Failed to select check-out date', 3);
      }
    },

    confirmSelection: () => {
      const result = dragCreateService.confirmSelection();
      handleSelectionResult(result);
    },

    completeCreation: () => {
      const result = dragCreateService.completeCreation();
      if (result.success) {
        hotelNotification.success('Reservation Created', 'New reservation has been created successfully', 3);
      }
      handleSelectionResult(result);
    }
  }), [dragCreateService, rooms, handleSelectionResult]);

  // Utility functions
  const shouldHighlightCell = useCallback((roomId: string, dayIndex: number, isAM: boolean) => {
    return dragCreateService.shouldHighlightCell(roomId, dayIndex, isAM);
  }, [dragCreateService, state]); // Include state to trigger re-renders

  const getClickableRooms = useCallback(() => {
    return dragCreateService.getClickableRooms(rooms, reservations);
  }, [dragCreateService, rooms, reservations, state]);

  const canClickCell = useCallback((roomId: string, isAM: boolean) => {
    const clickableRooms = getClickableRooms();
    return isAM ? clickableRooms.am.has(roomId) : clickableRooms.pm.has(roomId);
  }, [getClickableRooms]);

  // Derived state
  const isEnabled = state.isEnabled;
  const currentInstruction = state.currentStep.instruction;
  const highlightMode = state.currentStep.highlightCells;
  const preview = state.preview;
  const selection = state.selection;

  // Show warnings from preview
  useEffect(() => {
    if (preview && preview.warnings.length > 0) {
      const warningMessage = preview.warnings.join('\n');
      hotelNotification.warning('Booking Warnings', warningMessage, 4);
    }
  }, [preview?.warnings]);

  return {
    // State
    state,
    isEnabled,
    
    // Current step info
    currentInstruction,
    highlightMode,
    
    // Preview data
    preview,
    selection,
    
    // Actions
    actions,
    
    // Utility functions
    shouldHighlightCell,
    getClickableRooms,
    canClickCell
  };
}