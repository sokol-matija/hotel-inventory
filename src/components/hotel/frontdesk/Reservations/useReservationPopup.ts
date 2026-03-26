// useReservationPopup - Thin orchestration hook for ReservationPopup
// Combines useReservationState with data derivations (charges, company)
// so the component only needs one import to get everything it needs.

import { useReservationState } from '@/lib/hotel/hooks/useReservationState';
import { useReservationCharges } from '@/lib/queries/hooks/useReservationCharges';
import { useCompanies } from '@/lib/queries/hooks/useCompanies';
import { CalendarEvent, Company } from '@/lib/hotel/types';

export interface UseReservationPopupReturn {
  // Delegated from useReservationState
  state: ReturnType<typeof useReservationState>['state'];
  reservationData: ReturnType<typeof useReservationState>['reservationData'];
  isUpdating: boolean;
  handleEditToggle: ReturnType<typeof useReservationState>['handleEditToggle'];
  handleSaveEdit: ReturnType<typeof useReservationState>['handleSaveEdit'];
  handleStatusUpdate: ReturnType<typeof useReservationState>['handleStatusUpdate'];
  handleSendWelcomeEmail: ReturnType<typeof useReservationState>['handleSendWelcomeEmail'];
  handleSendReminderEmail: ReturnType<typeof useReservationState>['handleSendReminderEmail'];
  handleGenerateFiscalInvoice: ReturnType<
    typeof useReservationState
  >['handleGenerateFiscalInvoice'];
  handleEmailFiscalReceipt: ReturnType<typeof useReservationState>['handleEmailFiscalReceipt'];
  handlePrintThermalReceipt: ReturnType<typeof useReservationState>['handlePrintThermalReceipt'];
  togglePaymentDetails: ReturnType<typeof useReservationState>['togglePaymentDetails'];
  toggleCheckInWorkflow: ReturnType<typeof useReservationState>['toggleCheckInWorkflow'];
  toggleCheckOutWorkflow: ReturnType<typeof useReservationState>['toggleCheckOutWorkflow'];
  clearError: ReturnType<typeof useReservationState>['clearError'];
  getStatusActions: ReturnType<typeof useReservationState>['getStatusActions'];
  formatDates: ReturnType<typeof useReservationState>['formatDates'];
  updateState: ReturnType<typeof useReservationState>['updateState'];
  // Derived data
  chargesTotalAmount: number;
  company: Company | null;
}

export function useReservationPopup(
  event: CalendarEvent | null,
  onClose: () => void,
  onStatusChange?: (reservationId: string, newStatus: string) => void
): UseReservationPopupReturn {
  const reservationState = useReservationState(event, onClose, onStatusChange);
  const { reservationData } = reservationState;

  // Derive total from reservation_charges
  const numericReservationId = reservationData?.reservation?.id;
  const { data: charges = [] } = useReservationCharges(numericReservationId);
  const chargesTotalAmount = charges.reduce((sum, c) => sum + c.total, 0);

  // Company data for R1 billing — resolved from TQ cache
  const { data: companies = [] } = useCompanies();
  const res = reservationData?.reservation as unknown as Record<string, unknown> | undefined;
  const company: Company | null =
    res?.is_r1 && res?.company_id
      ? (companies.find((c) => c.id === Number(res.company_id)) ?? null)
      : null;

  return {
    // Spread all state members explicitly to keep a typed contract
    state: reservationState.state,
    reservationData: reservationState.reservationData,
    isUpdating: reservationState.isUpdating,
    handleEditToggle: reservationState.handleEditToggle,
    handleSaveEdit: reservationState.handleSaveEdit,
    handleStatusUpdate: reservationState.handleStatusUpdate,
    handleSendWelcomeEmail: reservationState.handleSendWelcomeEmail,
    handleSendReminderEmail: reservationState.handleSendReminderEmail,
    handleGenerateFiscalInvoice: reservationState.handleGenerateFiscalInvoice,
    handleEmailFiscalReceipt: reservationState.handleEmailFiscalReceipt,
    handlePrintThermalReceipt: reservationState.handlePrintThermalReceipt,
    togglePaymentDetails: reservationState.togglePaymentDetails,
    toggleCheckInWorkflow: reservationState.toggleCheckInWorkflow,
    toggleCheckOutWorkflow: reservationState.toggleCheckOutWorkflow,
    clearError: reservationState.clearError,
    getStatusActions: reservationState.getStatusActions,
    formatDates: reservationState.formatDates,
    updateState: reservationState.updateState,
    // Derived
    chargesTotalAmount,
    company,
  };
}
