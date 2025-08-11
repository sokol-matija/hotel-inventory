// useReservationState - Reservation popup state management hook
// Manages all reservation-related state and operations

import { useState, useCallback, useEffect } from 'react';
import { CalendarEvent, Reservation } from '../types';
import { useHotel } from '../state/SupabaseHotelContext';
import { ReservationService, ReservationData, FiscalData } from '../services/ReservationService';

export interface ReservationState {
  // UI state
  isEditing: boolean;
  showPaymentDetails: boolean;
  showCheckInWorkflow: boolean;
  showCheckOutWorkflow: boolean;
  
  // Data state
  editedNotes: string;
  fiscalData: FiscalData | null;
  
  // Loading states
  isSendingEmail: boolean;
  isFiscalizing: boolean;
  
  // Error state
  statusUpdateError: string | null;
}

const initialState: ReservationState = {
  isEditing: false,
  showPaymentDetails: false,
  showCheckInWorkflow: false,
  showCheckOutWorkflow: false,
  editedNotes: '',
  fiscalData: null,
  isSendingEmail: false,
  isFiscalizing: false,
  statusUpdateError: null
};

export function useReservationState(
  event: CalendarEvent | null,
  onClose: () => void,
  onStatusChange?: (reservationId: string, newStatus: string) => void
) {
  const { reservations, updateReservationStatus, updateReservationNotes, isUpdating } = useHotel();
  const reservationService = ReservationService.getInstance();
  
  const [state, setState] = useState<ReservationState>(initialState);
  const [reservationData, setReservationData] = useState<ReservationData | null>(null);

  // Reset state when event changes
  useEffect(() => {
    setState(initialState);
    setReservationData(null);
  }, [event?.reservationId]);

  // Get reservation data asynchronously
  useEffect(() => {
    if (event && reservations.length > 0) {
      reservationService.getReservationData(event, reservations)
        .then(data => setReservationData(data))
        .catch(error => {
          console.error('Failed to get reservation data:', error);
          setReservationData(null);
        });
    } else {
      setReservationData(null);
    }
  }, [event, reservations, reservationService]);

  // State updaters
  const updateState = useCallback(<K extends keyof ReservationState>(
    updates: Partial<ReservationState>
  ) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Edit operations
  const handleEditToggle = useCallback(() => {
    if (state.isEditing) {
      updateState({ editedNotes: '', isEditing: false });
    } else {
      const currentNotes = reservationData?.reservation.specialRequests || '';
      updateState({ editedNotes: currentNotes, isEditing: true });
    }
  }, [state.isEditing, reservationData?.reservation.specialRequests, updateState]);

  const handleSaveEdit = useCallback(async () => {
    if (!reservationData?.reservation) return;

    try {
      updateState({ statusUpdateError: null });
      await updateReservationNotes(reservationData.reservation.id, state.editedNotes);
      updateState({ isEditing: false });
    } catch (error) {
      console.error('Failed to save notes:', error);
      updateState({ statusUpdateError: 'Failed to save notes. Please try again.' });
    }
  }, [reservationData?.reservation, state.editedNotes, updateReservationNotes, updateState]);

  // Status management
  const handleStatusUpdate = useCallback(async (newStatus: string) => {
    if (!reservationData?.reservation) return;

    try {
      updateState({ statusUpdateError: null });
      await updateReservationStatus(reservationData.reservation.id, newStatus as any);
      
      // Call original callback if provided
      if (onStatusChange) {
        onStatusChange(reservationData.reservation.id, newStatus);
      }
      
      // Close popup after successful status change
      setTimeout(() => {
        onClose();
      }, 1000);
      
    } catch (error) {
      console.error('Failed to update status:', error);
      updateState({ statusUpdateError: 'Failed to update reservation status. Please try again.' });
    }
  }, [reservationData?.reservation, updateReservationStatus, onStatusChange, onClose, updateState]);

  // Email operations
  const handleSendWelcomeEmail = useCallback(async () => {
    if (!reservationData) return;

    try {
      updateState({ isSendingEmail: true });
      await reservationService.sendWelcomeEmail(
        reservationData.reservation,
        reservationData.guest
      );
    } catch (error) {
      console.error('Error sending welcome email:', error);
    } finally {
      updateState({ isSendingEmail: false });
    }
  }, [reservationData, reservationService, updateState]);

  const handleSendReminderEmail = useCallback(async () => {
    if (!reservationData) return;

    try {
      updateState({ isSendingEmail: true });
      await reservationService.sendReminderEmail(
        reservationData.reservation,
        reservationData.guest
      );
    } catch (error) {
      console.error('Error sending reminder email:', error);
    } finally {
      updateState({ isSendingEmail: false });
    }
  }, [reservationData, reservationService, updateState]);

  // Fiscal operations
  const handleGenerateFiscalInvoice = useCallback(async () => {
    if (!reservationData) return;

    try {
      updateState({ isFiscalizing: true });
      const result = await reservationService.generateFiscalInvoice(
        reservationData.reservation,
        reservationData.guest,
        reservationData.room
      );

      if (result.success && result.fiscalData) {
        updateState({ fiscalData: result.fiscalData });
      }
    } catch (error) {
      console.error('Error generating fiscal invoice:', error);
    } finally {
      updateState({ isFiscalizing: false });
    }
  }, [reservationData, reservationService, updateState]);

  const handleEmailFiscalReceipt = useCallback(async () => {
    if (!reservationData || !state.fiscalData) return;

    try {
      updateState({ isSendingEmail: true });
      await reservationService.emailFiscalReceipt(
        reservationData.reservation,
        reservationData.guest,
        state.fiscalData
      );
    } catch (error) {
      console.error('Error emailing fiscal receipt:', error);
    } finally {
      updateState({ isSendingEmail: false });
    }
  }, [reservationData, state.fiscalData, reservationService, updateState]);

  const handlePrintThermalReceipt = useCallback(async () => {
    if (!reservationData || !state.fiscalData) return;

    try {
      updateState({ isFiscalizing: true });
      await reservationService.printThermalReceipt(
        reservationData.reservation,
        reservationData.guest,
        reservationData.room,
        state.fiscalData
      );
    } catch (error) {
      console.error('Error printing thermal receipt:', error);
    } finally {
      updateState({ isFiscalizing: false });
    }
  }, [reservationData, state.fiscalData, reservationService, updateState]);

  // Dialog management
  const togglePaymentDetails = useCallback(() => {
    updateState({ showPaymentDetails: !state.showPaymentDetails });
  }, [state.showPaymentDetails, updateState]);

  const toggleCheckInWorkflow = useCallback(() => {
    updateState({ showCheckInWorkflow: !state.showCheckInWorkflow });
  }, [state.showCheckInWorkflow, updateState]);

  const toggleCheckOutWorkflow = useCallback(() => {
    updateState({ showCheckOutWorkflow: !state.showCheckOutWorkflow });
  }, [state.showCheckOutWorkflow, updateState]);

  // Error management
  const clearError = useCallback(() => {
    updateState({ statusUpdateError: null });
  }, [updateState]);

  // Helper functions using service
  const getStatusActions = useCallback(() => {
    if (!reservationData?.reservation) return [];
    return reservationService.getStatusActions(reservationData.reservation);
  }, [reservationData?.reservation, reservationService]);

  const shouldShowCheckIn = useCallback(() => {
    if (!reservationData?.reservation) return false;
    return reservationService.shouldShowCheckInWorkflow(reservationData.reservation);
  }, [reservationData?.reservation, reservationService]);

  const shouldShowCheckOut = useCallback(() => {
    if (!reservationData?.reservation) return false;
    return reservationService.shouldShowCheckOutWorkflow(reservationData.reservation);
  }, [reservationData?.reservation, reservationService]);

  const formatDates = useCallback(() => {
    if (!reservationData?.reservation) return '';
    return reservationService.formatReservationDates(reservationData.reservation);
  }, [reservationData?.reservation, reservationService]);

  return {
    // State
    state,
    
    // Data
    reservationData,
    isUpdating,
    
    // Edit operations
    handleEditToggle,
    handleSaveEdit,
    
    // Status management
    handleStatusUpdate,
    
    // Email operations
    handleSendWelcomeEmail,
    handleSendReminderEmail,
    
    // Fiscal operations
    handleGenerateFiscalInvoice,
    handleEmailFiscalReceipt,
    handlePrintThermalReceipt,
    
    // Dialog management
    togglePaymentDetails,
    toggleCheckInWorkflow,
    toggleCheckOutWorkflow,
    
    // Error management
    clearError,
    
    // Helper functions
    getStatusActions,
    shouldShowCheckIn,
    shouldShowCheckOut,
    formatDates,
    
    // Direct state updates (for complex cases)
    updateState
  };
}