/**
 * BookingCreationService - Complete booking creation with optimistic updates
 * 
 * This service integrates the DragCreateService with conflict detection and
 * optimistic updates to provide a seamless booking creation experience.
 * 
 * Features:
 * - Optimistic UI updates with automatic rollback on failure
 * - Real-time conflict detection and resolution
 * - Integration with Supabase backend
 * - Comprehensive error handling and user feedback
 * - Support for both manual booking creation and drag-create workflow
 * 
 * @author Hotel Management System v2.8
 * @since August 2025
 */

import { DragCreateService, DragCreateSelection } from './DragCreateService';
import { ConflictDetectionService } from './ConflictDetectionService';
import { OptimisticUpdateService } from './OptimisticUpdateService';
import { Reservation, Room, Guest } from '../types';
import hotelNotification from '../../notifications';

export interface BookingCreationData {
  roomId: string;
  checkIn: Date;
  checkOut: Date;
  guestData?: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  };
  adults: number;
  children: number;
  specialRequests?: string;
  bookingSource?: 'drag_create' | 'manual' | 'direct';
}

export interface BookingCreationResult {
  success: boolean;
  reservation?: Reservation;
  error?: string;
  conflictResolution?: {
    hasConflicts: boolean;
    suggestedAlternatives?: Room[];
    warnings?: string[];
  };
}

export class BookingCreationService {
  private static instance: BookingCreationService;
  private dragCreateService: DragCreateService;
  private conflictService: ConflictDetectionService;
  private optimisticService: OptimisticUpdateService;

  private constructor() {
    this.dragCreateService = DragCreateService.getInstance();
    this.conflictService = ConflictDetectionService.getInstance();
    this.optimisticService = OptimisticUpdateService.getInstance();
  }

  public static getInstance(): BookingCreationService {
    if (!BookingCreationService.instance) {
      BookingCreationService.instance = new BookingCreationService();
    }
    return BookingCreationService.instance;
  }

  /**
   * Create a booking from drag-create selection with optimistic updates
   */
  public async createFromDragCreate(
    addReservationToState: (reservation: Reservation) => void,
    removeReservationFromState: (id: string) => void,
    serverCreate: (data: BookingCreationData) => Promise<Reservation>
  ): Promise<BookingCreationResult> {
    const dragState = this.dragCreateService.getState();
    
    if (!dragState.selection || dragState.mode !== 'confirming') {
      return {
        success: false,
        error: 'No valid drag-create selection to create booking from'
      };
    }

    return this.createBookingWithOptimisticUpdate(
      this.convertSelectionToBookingData(dragState.selection),
      addReservationToState,
      removeReservationFromState,
      serverCreate
    );
  }

  /**
   * Create a booking with full optimistic update workflow
   */
  public async createBookingWithOptimisticUpdate(
    bookingData: BookingCreationData,
    addReservationToState: (reservation: Reservation) => void,
    removeReservationFromState: (id: string) => void,
    serverCreate: (data: BookingCreationData) => Promise<Reservation>
  ): Promise<BookingCreationResult> {
    try {
      // Step 1: Final conflict check
      const conflictResult = await this.conflictService.checkNewReservation(
        bookingData.roomId,
        bookingData.checkIn,
        bookingData.checkOut,
        ''
      );

      // Handle conflicts
      if (conflictResult.hasConflict) {
        hotelNotification.error(
          'Booking Conflict', 
          conflictResult.conflicts.map(c => c.message).join('\n'), 
          5
        );

        return {
          success: false,
          error: 'Reservation conflicts detected',
          conflictResolution: {
            hasConflicts: true,
            suggestedAlternatives: conflictResult.conflicts[0]?.suggestedAlternatives,
            warnings: conflictResult.warnings.map(w => w.message)
          }
        };
      }

      // Show warnings if any
      if (conflictResult.warnings.length > 0) {
        hotelNotification.warning(
          'Booking Warnings',
          conflictResult.warnings.map(w => w.message).join('\n'),
          4
        );
      }

      // Step 2: Generate temporary reservation for optimistic update
      const tempReservation = this.generateTempReservation(bookingData);

      // Step 3: Execute optimistic update
      const result = await this.optimisticService.optimisticCreateReservation(
        tempReservation,
        addReservationToState,
        removeReservationFromState,
        () => serverCreate(bookingData)
      );

      // Step 4: Handle result
      if (result.success && result.data) {
        hotelNotification.success(
          'Reservation Created',
          `Successfully created reservation for Room ${bookingData.roomId}`,
          3
        );

        // Complete drag-create workflow if applicable
        if (bookingData.bookingSource === 'drag_create') {
          this.dragCreateService.completeCreation();
        }

        return {
          success: true,
          reservation: result.data
        };
      } else {
        // Optimistic update failed and was rolled back
        const errorMessage = result.error || 'Unknown error occurred while creating reservation';
        hotelNotification.error('Reservation Creation Failed', errorMessage, 5);

        return {
          success: false,
          error: errorMessage
        };
      }

    } catch (error) {
      console.error('BookingCreationService error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unexpected error occurred';
      
      hotelNotification.error('Booking Creation Error', errorMessage, 5);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Create a booking with conflict resolution options
   */
  public async createWithConflictResolution(
    bookingData: BookingCreationData,
    autoResolve: boolean = false
  ): Promise<BookingCreationResult> {
    try {
      const conflictResult = await this.conflictService.checkNewReservation(
        bookingData.roomId,
        bookingData.checkIn,
        bookingData.checkOut,
        ''
      );

      if (conflictResult.hasConflict && !autoResolve) {
        return {
          success: false,
          error: 'Conflicts detected - manual resolution required',
          conflictResolution: {
            hasConflicts: true,
            suggestedAlternatives: conflictResult.conflicts[0]?.suggestedAlternatives,
            warnings: conflictResult.warnings.map(w => w.message)
          }
        };
      }

      if (conflictResult.hasConflict && autoResolve) {
        // Auto-resolve by using first suggested alternative
        const firstAlternative = conflictResult.conflicts[0]?.suggestedAlternatives?.[0];
        if (firstAlternative) {
          bookingData.roomId = firstAlternative.id;
          hotelNotification.info(
            'Room Auto-Assigned',
            `Reservation moved to Room ${firstAlternative.number} due to conflict`,
            4
          );
        } else {
          return {
            success: false,
            error: 'No alternative rooms available for auto-resolution'
          };
        }
      }

      // Proceed with booking creation (implement server call here)
      return {
        success: true,
        // reservation: createdReservation
      };

    } catch (error) {
      console.error('Conflict resolution error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error during conflict resolution'
      };
    }
  }

  /**
   * Convert drag-create selection to booking data
   */
  private convertSelectionToBookingData(selection: DragCreateSelection): BookingCreationData {
    return {
      roomId: selection.roomId,
      checkIn: selection.checkIn,
      checkOut: selection.checkOut,
      adults: 2, // Default values - should be collected from modal
      children: 0,
      bookingSource: 'drag_create',
      specialRequests: 'Created via drag-to-create interface'
    };
  }

  /**
   * Generate temporary reservation for optimistic updates
   */
  private generateTempReservation(bookingData: BookingCreationData): Reservation {
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      id: tempId,
      roomId: bookingData.roomId,
      guestId: '', // Will be set by server
      checkIn: bookingData.checkIn,
      checkOut: bookingData.checkOut,
      numberOfGuests: bookingData.adults + bookingData.children,
      adults: bookingData.adults,
      children: Array(bookingData.children).fill({}),
      status: 'confirmed',
      bookingSource: bookingData.bookingSource === 'drag_create' ? 'direct' : (bookingData.bookingSource as any) || 'direct',
      specialRequests: bookingData.specialRequests || '',
      seasonalPeriod: 'A', // Default
      baseRoomRate: 0, // Will be calculated by server
      numberOfNights: Math.ceil((bookingData.checkOut.getTime() - bookingData.checkIn.getTime()) / (24 * 60 * 60 * 1000)),
      subtotal: 0,
      childrenDiscounts: 0,
      tourismTax: 0,
      vatAmount: 0,
      petFee: 0,
      parkingFee: 0,
      shortStaySuplement: 0,
      additionalCharges: 0,
      roomServiceItems: [],
      totalAmount: 0,
      notes: 'Temporary reservation - being created',
      paymentStatus: 'pending',
      bookingDate: new Date(),
      lastModified: new Date()
    };
  }

  /**
   * Get current drag-create state for external access
   */
  public getDragCreateState() {
    return this.dragCreateService.getState();
  }

  /**
   * Clean up and reset all services
   */
  public reset(): void {
    this.dragCreateService.disable();
    // Clear any pending optimistic operations
    this.optimisticService.clearCompletedOperations();
  }
}