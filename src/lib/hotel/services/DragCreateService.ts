/**
 * DragCreateService - Modern state machine for drag-to-create reservations
 * 
 * This service provides a clean, predictable state machine for the drag-to-create
 * booking workflow with real-time validation, conflict detection, and optimal UX.
 * 
 * Features:
 * - Clear state machine with defined transitions
 * - Real-time conflict detection during selection
 * - Proactive user guidance and feedback
 * - Full integration with Supabase and optimistic updates
 * - Clean separation of concerns and testable architecture
 * 
 * State Flow:
 * idle → selecting_checkin → selecting_checkout → confirming → creating → completed
 * 
 * @author Hotel Management System v2.8
 * @since August 2025
 */

import { addDays, startOfDay } from 'date-fns';
import { Room, Reservation } from '../types';
import { ConflictDetectionService } from './ConflictDetectionService';

// State machine definitions
export type DragCreateMode = 
  | 'idle' 
  | 'selecting_checkin' 
  | 'selecting_checkout' 
  | 'confirming' 
  | 'creating' 
  | 'completed';

export interface DragCreateSelection {
  roomId: string;
  checkIn: Date;
  checkOut: Date;
  room?: Room;
}

export interface DragCreatePreview {
  roomId: string;
  startDay: number;
  endDay: number;
  checkIn: Date;
  checkOut: Date;
  isValid: boolean;
  conflicts: string[];
  warnings: string[];
  suggestedAlternatives?: Room[];
}

export interface DragCreateState {
  mode: DragCreateMode;
  selection: DragCreateSelection | null;
  preview: DragCreatePreview | null;
  currentStep: {
    instruction: string;
    allowedActions: string[];
    highlightCells: 'pm' | 'am' | 'none';
  };
  error: string | null;
  isEnabled: boolean;
}

export interface SelectionResult {
  success: boolean;
  newState: DragCreateState;
  error?: string;
  shouldShowAlternatives?: Room[];
}

export interface ValidationResult {
  isValid: boolean;
  conflicts: string[];
  warnings: string[];
  suggestedAlternatives?: Room[];
}

export class DragCreateService {
  private static instance: DragCreateService;
  private state: DragCreateState;
  private conflictService: ConflictDetectionService;
  private listeners: Array<(state: DragCreateState) => void> = [];

  private constructor() {
    this.conflictService = ConflictDetectionService.getInstance();
    this.state = this.getInitialState();
  }

  public static getInstance(): DragCreateService {
    if (!DragCreateService.instance) {
      DragCreateService.instance = new DragCreateService();
    }
    return DragCreateService.instance;
  }

  /**
   * Get initial idle state
   */
  private getInitialState(): DragCreateState {
    return {
      mode: 'idle',
      selection: null,
      preview: null,
      currentStep: {
        instruction: 'Click "Drag to Create" to start making a reservation',
        allowedActions: ['enable'],
        highlightCells: 'none'
      },
      error: null,
      isEnabled: false
    };
  }

  /**
   * Subscribe to state changes
   */
  public subscribe(listener: (state: DragCreateState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state));
  }

  /**
   * Get current state
   */
  public getState(): DragCreateState {
    return { ...this.state };
  }

  /**
   * Enable drag-to-create mode
   */
  public enable(): SelectionResult {
    if (this.state.mode !== 'idle') {
      return {
        success: false,
        newState: this.state,
        error: 'Cannot enable: already in progress'
      };
    }

    this.state = {
      ...this.state,
      mode: 'selecting_checkin',
      isEnabled: true,
      currentStep: {
        instruction: 'Click a PM (afternoon) slot to set check-in time',
        allowedActions: ['click_pm_cell', 'disable'],
        highlightCells: 'pm'
      },
      error: null
    };

    this.notifyListeners();
    return { success: true, newState: this.state };
  }

  /**
   * Disable drag-to-create mode and reset
   */
  public disable(): SelectionResult {
    this.state = this.getInitialState();
    this.notifyListeners();
    return { success: true, newState: this.state };
  }

  /**
   * Start check-in selection (first click on PM cell)
   */
  public async selectCheckIn(
    roomId: string, 
    date: Date, 
    rooms: Room[]
  ): Promise<SelectionResult> {
    if (this.state.mode !== 'selecting_checkin') {
      return {
        success: false,
        newState: this.state,
        error: 'Invalid state for check-in selection'
      };
    }

    // Set check-in time to 3 PM
    const checkIn = new Date(date);
    checkIn.setHours(15, 0, 0, 0);

    // Default checkout to next day 11 AM (1 night stay)
    const checkOut = addDays(checkIn, 1);
    checkOut.setHours(11, 0, 0, 0);

    const room = rooms.find(r => r.id === roomId);
    if (!room) {
      return {
        success: false,
        newState: this.state,
        error: 'Room not found'
      };
    }

    const selection: DragCreateSelection = {
      roomId,
      checkIn,
      checkOut,
      room
    };

    // Validate selection and check conflicts
    const validation = await this.validateSelection(selection);

    this.state = {
      ...this.state,
      mode: 'selecting_checkout',
      selection,
      preview: await this.generatePreview(selection, validation),
      currentStep: {
        instruction: `Check-in: ${checkIn.toLocaleDateString()} 3:00 PM. Now click an AM (morning) slot to set check-out time`,
        allowedActions: ['click_am_cell', 'disable'],
        highlightCells: 'am'
      },
      error: validation.isValid ? null : validation.conflicts[0]
    };

    this.notifyListeners();
    
    return {
      success: true,
      newState: this.state,
      shouldShowAlternatives: validation.isValid ? undefined : validation.suggestedAlternatives
    };
  }

  /**
   * Update checkout selection (hover or second click on AM cell)
   */
  public async selectCheckOut(
    roomId: string, 
    date: Date, 
    isConfirming: boolean = false
  ): Promise<SelectionResult> {
    if (this.state.mode !== 'selecting_checkout' || !this.state.selection) {
      return {
        success: false,
        newState: this.state,
        error: 'Invalid state for check-out selection'
      };
    }

    // Must be same room
    if (roomId !== this.state.selection.roomId) {
      return {
        success: false,
        newState: this.state,
        error: 'Check-out must be in the same room as check-in'
      };
    }

    // Set checkout time to 11 AM
    const checkOut = new Date(date);
    checkOut.setHours(11, 0, 0, 0);

    // Validate checkout is after checkin
    if (checkOut <= this.state.selection.checkIn) {
      return {
        success: false,
        newState: this.state,
        error: 'Check-out must be after check-in'
      };
    }

    const updatedSelection: DragCreateSelection = {
      ...this.state.selection,
      checkOut
    };

    // Validate selection and check conflicts
    const validation = await this.validateSelection(updatedSelection);

    if (isConfirming && validation.isValid) {
      // Final confirmation - ready to create booking
      this.state = {
        ...this.state,
        mode: 'confirming',
        selection: updatedSelection,
        preview: await this.generatePreview(updatedSelection, validation),
        currentStep: {
          instruction: `Ready to create reservation: ${updatedSelection.checkIn.toLocaleDateString()} - ${updatedSelection.checkOut.toLocaleDateString()}. Click to confirm.`,
          allowedActions: ['confirm_booking', 'disable'],
          highlightCells: 'none'
        },
        error: null
      };
    } else {
      // Preview mode - show what would happen
      this.state = {
        ...this.state,
        selection: updatedSelection,
        preview: await this.generatePreview(updatedSelection, validation),
        error: validation.isValid ? null : validation.conflicts[0]
      };
    }

    this.notifyListeners();
    
    return {
      success: true,
      newState: this.state,
      shouldShowAlternatives: validation.isValid ? undefined : validation.suggestedAlternatives
    };
  }

  /**
   * Confirm selection and prepare for booking creation
   */
  public confirmSelection(): SelectionResult {
    if (this.state.mode !== 'confirming' || !this.state.selection) {
      return {
        success: false,
        newState: this.state,
        error: 'Nothing to confirm'
      };
    }

    this.state = {
      ...this.state,
      mode: 'creating',
      currentStep: {
        instruction: 'Opening booking modal...',
        allowedActions: [],
        highlightCells: 'none'
      }
    };

    this.notifyListeners();
    return { success: true, newState: this.state };
  }

  /**
   * Mark creation as completed and reset
   */
  public completeCreation(): SelectionResult {
    this.state = this.getInitialState();
    this.notifyListeners();
    return { success: true, newState: this.state };
  }

  /**
   * Validate a selection for conflicts
   */
  private async validateSelection(selection: DragCreateSelection): Promise<ValidationResult> {
    try {
      const result = await this.conflictService.checkNewReservation(
        selection.roomId,
        selection.checkIn,
        selection.checkOut,
        '' // No existing reservation ID
      );

      return {
        isValid: !result.hasConflict,
        conflicts: result.conflicts.map(c => c.message),
        warnings: result.warnings.map(w => w.message),
        suggestedAlternatives: result.conflicts[0]?.suggestedAlternatives
      };
    } catch (error) {
      console.error('Error validating drag-create selection:', error);
      return {
        isValid: false,
        conflicts: ['Unable to validate reservation. Please try again.'],
        warnings: []
      };
    }
  }

  /**
   * Generate preview data for current selection
   */
  private async generatePreview(
    selection: DragCreateSelection,
    validation: ValidationResult
  ): Promise<DragCreatePreview> {
    // Calculate day indices for visual preview (assuming timeline starts from today)
    const today = startOfDay(new Date());
    const startDay = Math.floor((startOfDay(selection.checkIn).getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
    const endDay = Math.floor((startOfDay(selection.checkOut).getTime() - today.getTime()) / (24 * 60 * 60 * 1000)) - 1; // -1 because checkout day is not occupied

    return {
      roomId: selection.roomId,
      startDay,
      endDay,
      checkIn: selection.checkIn,
      checkOut: selection.checkOut,
      isValid: validation.isValid,
      conflicts: validation.conflicts,
      warnings: validation.warnings,
      suggestedAlternatives: validation.suggestedAlternatives
    };
  }

  /**
   * Get rooms that can be clicked in current state
   */
  public getClickableRooms(rooms: Room[], reservations: Reservation[]): {
    pm: Set<string>;
    am: Set<string>;
  } {
    const result = { pm: new Set<string>(), am: new Set<string>() };

    if (!this.state.isEnabled) return result;

    rooms.forEach(room => {
      switch (this.state.mode) {
        case 'selecting_checkin':
          // All rooms with available PM slots can be clicked
          result.pm.add(room.id);
          break;
        case 'selecting_checkout':
          // Only the selected room's AM slots can be clicked
          if (this.state.selection && room.id === this.state.selection.roomId) {
            result.am.add(room.id);
          }
          break;
      }
    });

    return result;
  }

  /**
   * Get visual preview for timeline display
   */
  public getTimelinePreview(): DragCreatePreview | null {
    return this.state.preview;
  }

  /**
   * Check if a specific cell should be highlighted
   */
  public shouldHighlightCell(
    roomId: string, 
    dayIndex: number, 
    isAM: boolean
  ): 'selectable' | 'preview' | 'none' {
    if (!this.state.isEnabled) return 'none';

    // Check if this cell is part of the preview
    if (this.state.preview && 
        this.state.preview.roomId === roomId && 
        dayIndex >= this.state.preview.startDay && 
        dayIndex <= this.state.preview.endDay) {
      return 'preview';
    }

    // Check if this cell is selectable
    const clickableRooms = this.getClickableRooms([], []); // Rooms will be passed from component
    
    if (!isAM && this.state.mode === 'selecting_checkin' && clickableRooms.pm.has(roomId)) {
      return 'selectable';
    }
    
    if (isAM && this.state.mode === 'selecting_checkout' && clickableRooms.am.has(roomId)) {
      return 'selectable';
    }

    return 'none';
  }
}