import { X } from 'lucide-react';
import type { Reservation } from '../../../../../lib/queries/hooks/useReservations';
import type { Guest } from '../../../../../lib/queries/hooks/useGuests';
import type { Room } from '../../../../../lib/queries/hooks/useRooms';
import { Company } from '../../../../../lib/hotel/types';
import { ReservationState } from '../../../../../lib/hotel/hooks/useReservationState';
import { FiscalData } from '../../../../../lib/hotel/services/ReservationService';
import { CompanyCard } from './CompanyCard';
import { GuestCard } from './GuestCard';
import { FiscalCard } from './FiscalCard';
import { ReservationDetailsCard } from './ReservationDetailsCard';
import { PaymentCard } from './PaymentCard';

export interface ReservationPopupContentProps {
  reservation: Reservation;
  guest: Guest;
  room: Room;
  state: ReservationState & { fiscalData: FiscalData | null };
  reservationStatusCode: string;
  company: Company | null;
  chargesTotalAmount: number;
  clearError: () => void;
  handleSendWelcomeEmail: () => void;
  handleSendReminderEmail: () => void;
  handleGenerateFiscalInvoice: () => void;
  handlePrintThermalReceipt: () => void;
  handleEmailFiscalReceipt: () => void;
  handleSaveEdit: () => void;
  handleEditToggle: () => void;
  togglePaymentDetails: () => void;
  updateState: (partial: Partial<ReservationState>) => void;
}

export const ReservationPopupContent = ({
  reservation,
  guest,
  room,
  state,
  reservationStatusCode,
  company,
  chargesTotalAmount,
  clearError,
  handleSendWelcomeEmail,
  handleSendReminderEmail,
  handleGenerateFiscalInvoice,
  handlePrintThermalReceipt,
  handleEmailFiscalReceipt,
  handleSaveEdit,
  handleEditToggle,
  togglePaymentDetails,
  updateState,
}: ReservationPopupContentProps) => (
  <div className="space-y-6">
    {state.statusUpdateError && (
      <div className="rounded-md border border-red-200 bg-red-50 p-3">
        <div className="flex">
          <X className="h-5 w-5 flex-shrink-0 text-red-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <div className="mt-2 text-sm text-red-700">{state.statusUpdateError}</div>
          </div>
          <div className="ml-auto pl-3">
            <button
              onClick={clearError}
              className="inline-flex rounded-md bg-red-50 p-1.5 text-red-500 hover:bg-red-100"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    )}

    {company && <CompanyCard company={company} />}

    <GuestCard
      guest={guest}
      reservation={reservation}
      reservationStatusCode={reservationStatusCode}
      isSendingEmail={state.isSendingEmail}
      onSendWelcome={handleSendWelcomeEmail}
      onSendReminder={handleSendReminderEmail}
    />

    {reservationStatusCode === 'checked-out' && (
      <FiscalCard
        fiscalData={state.fiscalData}
        isFiscalizing={state.isFiscalizing}
        isSendingEmail={state.isSendingEmail}
        guestEmail={guest.email}
        onGenerateInvoice={handleGenerateFiscalInvoice}
        onPrintReceipt={handlePrintThermalReceipt}
        onEmailReceipt={handleEmailFiscalReceipt}
      />
    )}

    <ReservationDetailsCard
      reservation={reservation}
      room={room}
      state={state}
      onNoteChange={(note) => updateState({ editedNotes: note })}
      onSave={handleSaveEdit}
      onCancelEdit={handleEditToggle}
    />

    <PaymentCard
      chargesTotalAmount={chargesTotalAmount}
      nights={reservation.number_of_nights ?? 1}
      onViewBreakdown={togglePaymentDetails}
    />
  </div>
);
