// CheckInOutWorkflow.test.tsx - Tests for guest check-in/check-out processes with Supabase
// Tests workflow validation, payment processing, and guest service integrations

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Mock Supabase
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(() => Promise.resolve({ data: mockReservation, error: null })),
        order: jest.fn(() => Promise.resolve({ data: [mockReservation], error: null }))
      })),
      order: jest.fn(() => Promise.resolve({ data: [mockReservation], error: null }))
    })),
    insert: jest.fn(() => Promise.resolve({ data: [], error: null })),
    update: jest.fn(() => Promise.resolve({ 
      data: [{ ...mockReservation, status: 'checked_in' }], 
      error: null 
    })),
    delete: jest.fn(() => Promise.resolve({ data: [], error: null }))
  })),
  channel: jest.fn(() => ({
    on: jest.fn(() => ({ subscribe: jest.fn() })),
    unsubscribe: jest.fn()
  }))
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabase)
}));

// Mock data
const mockGuest = {
  id: 1,
  first_name: 'John',
  last_name: 'Smith',
  email: 'john@example.com',
  phone: '+1234567890',
  nationality: 'US',
  passport_number: 'US123456789',
  date_of_birth: '1985-06-15',
  full_name: 'John Smith'
};

const mockRoom = {
  id: 1,
  room_number: '101',
  floor_number: 1,
  room_type: 'Standard',
  max_occupancy: 2,
  is_premium: false,
  is_active: true,
  is_clean: true
};

const mockReservation = {
  id: 1,
  guest_id: 1,
  room_id: 1,
  check_in_date: '2025-08-15',
  check_out_date: '2025-08-18',
  number_of_nights: 3,
  number_of_guests: 2,
  adults: 2,
  children_count: 0,
  status: 'confirmed',
  booking_source: 'direct',
  special_requests: 'Late check-in',
  total_amount: 405.00,
  payment_status: 'paid',
  payment_method: 'credit_card',
  deposit_amount: 100.00,
  balance_due: 305.00,
  confirmation_number: 'HTL001',
  created_at: '2025-08-10T10:00:00Z',
  guests: mockGuest,
  rooms: mockRoom
};

// Create test components for check-in/check-out workflows
const CheckInWorkflow = ({ reservation, onCheckIn, onCancel }: any) => {
  const [guestVerified, setGuestVerified] = React.useState(false);
  const [documentsChecked, setDocumentsChecked] = React.useState(false);
  const [paymentVerified, setPaymentVerified] = React.useState(false);
  const [roomAssigned, setRoomAssigned] = React.useState(false);
  const [keyCardIssued, setKeyCardIssued] = React.useState(false);
  const [additionalCharges, setAdditionalCharges] = React.useState(0);
  const [specialRequests, setSpecialRequests] = React.useState('');

  const canCheckIn = guestVerified && documentsChecked && paymentVerified && roomAssigned;

  const handleCheckIn = async () => {
    if (!canCheckIn) return;

    const checkInData = {
      reservation_id: reservation.id,
      checked_in_at: new Date().toISOString(),
      additional_charges: additionalCharges,
      special_requests: specialRequests,
      key_card_issued: keyCardIssued,
      staff_notes: `Check-in completed at ${new Date().toLocaleString()}`
    };

    await onCheckIn(checkInData);
  };

  return (
    <div data-testid="checkin-workflow">
      <h2>Check-in: {reservation.guests.full_name}</h2>
      <p>Reservation: {reservation.confirmation_number}</p>
      <p>Room: {reservation.rooms.room_number}</p>
      <p>Dates: {reservation.check_in_date} to {reservation.check_out_date}</p>

      <div className="checkin-steps">
        <div className="step">
          <label>
            <input
              type="checkbox"
              checked={guestVerified}
              onChange={(e) => setGuestVerified(e.target.checked)}
              data-testid="guest-verified"
            />
            Guest Identity Verified
          </label>
          <p>Verify guest ID/passport: {reservation.guests.passport_number}</p>
        </div>

        <div className="step">
          <label>
            <input
              type="checkbox"
              checked={documentsChecked}
              onChange={(e) => setDocumentsChecked(e.target.checked)}
              data-testid="documents-checked"
            />
            Documents Checked
          </label>
          <p>Registration forms completed and signed</p>
        </div>

        <div className="step">
          <label>
            <input
              type="checkbox"
              checked={paymentVerified}
              onChange={(e) => setPaymentVerified(e.target.checked)}
              data-testid="payment-verified"
            />
            Payment Verified
          </label>
          <p>Total: €{reservation.total_amount} | Status: {reservation.payment_status}</p>
          {reservation.balance_due > 0 && (
            <p className="warning">Outstanding balance: €{reservation.balance_due}</p>
          )}
        </div>

        <div className="step">
          <label>
            <input
              type="checkbox"
              checked={roomAssigned}
              onChange={(e) => setRoomAssigned(e.target.checked)}
              data-testid="room-assigned"
            />
            Room Assigned & Ready
          </label>
          <p>Room {reservation.rooms.room_number} is clean and available</p>
        </div>

        <div className="additional-services">
          <h3>Additional Services</h3>
          
          <label>
            <input
              type="checkbox"
              checked={keyCardIssued}
              onChange={(e) => setKeyCardIssued(e.target.checked)}
              data-testid="keycard-issued"
            />
            Key Card Issued
          </label>

          <label>
            Additional Charges:
            <input
              type="number"
              step="0.01"
              min="0"
              value={additionalCharges}
              onChange={(e) => setAdditionalCharges(parseFloat(e.target.value) || 0)}
              data-testid="additional-charges"
            />
          </label>

          <label>
            Special Requests/Notes:
            <textarea
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              data-testid="special-requests"
              rows={3}
            />
          </label>
        </div>

        <div className="actions">
          <button
            onClick={handleCheckIn}
            disabled={!canCheckIn}
            data-testid="complete-checkin"
            className={canCheckIn ? 'enabled' : 'disabled'}
          >
            Complete Check-in
          </button>
          <button onClick={onCancel} data-testid="cancel-checkin">
            Cancel
          </button>
        </div>

        <div className="checkin-status">
          Progress: {[guestVerified, documentsChecked, paymentVerified, roomAssigned].filter(Boolean).length}/4 steps completed
        </div>
      </div>
    </div>
  );
};

const CheckOutWorkflow = ({ reservation, onCheckOut, onCancel }: any) => {
  const [roomInspected, setRoomInspected] = React.useState(false);
  const [damagesNoted, setDamagesNoted] = React.useState(false);
  const [minibarChecked, setMinibarChecked] = React.useState(false);
  const [keyCardsReturned, setKeyCardsReturned] = React.useState(false);
  const [finalBillReviewed, setFinalBillReviewed] = React.useState(false);
  const [additionalCharges, setAdditionalCharges] = React.useState(0);
  const [damageCharges, setDamageCharges] = React.useState(0);
  const [minibarCharges, setMinibarCharges] = React.useState(0);
  const [feedbackCollected, setFeedbackCollected] = React.useState(false);
  const [guestSatisfaction, setGuestSatisfaction] = React.useState(5);

  const totalCharges = additionalCharges + damageCharges + minibarCharges;
  const canCheckOut = roomInspected && keyCardsReturned && finalBillReviewed;

  const handleCheckOut = async () => {
    if (!canCheckOut) return;

    const checkOutData = {
      reservation_id: reservation.id,
      checked_out_at: new Date().toISOString(),
      additional_charges: totalCharges,
      damage_charges: damageCharges,
      minibar_charges: minibarCharges,
      key_cards_returned: keyCardsReturned,
      room_condition: damagesNoted ? 'damaged' : 'good',
      guest_satisfaction: guestSatisfaction,
      feedback_collected: feedbackCollected,
      staff_notes: `Check-out completed at ${new Date().toLocaleString()}`
    };

    await onCheckOut(checkOutData);
  };

  return (
    <div data-testid="checkout-workflow">
      <h2>Check-out: {reservation.guests.full_name}</h2>
      <p>Reservation: {reservation.confirmation_number}</p>
      <p>Room: {reservation.rooms.room_number}</p>
      <p>Check-out Date: {reservation.check_out_date}</p>

      <div className="checkout-steps">
        <div className="step">
          <label>
            <input
              type="checkbox"
              checked={roomInspected}
              onChange={(e) => setRoomInspected(e.target.checked)}
              data-testid="room-inspected"
            />
            Room Inspected
          </label>
          
          <div className="sub-step">
            <label>
              <input
                type="checkbox"
                checked={damagesNoted}
                onChange={(e) => setDamagesNoted(e.target.checked)}
                data-testid="damages-noted"
              />
              Damages Found
            </label>
            {damagesNoted && (
              <label>
                Damage Charges:
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={damageCharges}
                  onChange={(e) => setDamageCharges(parseFloat(e.target.value) || 0)}
                  data-testid="damage-charges"
                />
              </label>
            )}
          </div>
        </div>

        <div className="step">
          <label>
            <input
              type="checkbox"
              checked={minibarChecked}
              onChange={(e) => setMinibarChecked(e.target.checked)}
              data-testid="minibar-checked"
            />
            Minibar Checked
          </label>
          {minibarChecked && (
            <label>
              Minibar Charges:
              <input
                type="number"
                step="0.01"
                min="0"
                value={minibarCharges}
                onChange={(e) => setMinibarCharges(parseFloat(e.target.value) || 0)}
                data-testid="minibar-charges"
              />
            </label>
          )}
        </div>

        <div className="step">
          <label>
            <input
              type="checkbox"
              checked={keyCardsReturned}
              onChange={(e) => setKeyCardsReturned(e.target.checked)}
              data-testid="keycards-returned"
            />
            Key Cards Returned
          </label>
        </div>

        <div className="step">
          <label>
            <input
              type="checkbox"
              checked={finalBillReviewed}
              onChange={(e) => setFinalBillReviewed(e.target.checked)}
              data-testid="final-bill-reviewed"
            />
            Final Bill Reviewed
          </label>
          <p>Original Amount: €{reservation.total_amount}</p>
          {totalCharges > 0 && (
            <p>Additional Charges: €{totalCharges}</p>
          )}
          <p className="total">Final Total: €{reservation.total_amount + totalCharges}</p>
        </div>

        <div className="feedback-section">
          <h3>Guest Feedback</h3>
          
          <label>
            <input
              type="checkbox"
              checked={feedbackCollected}
              onChange={(e) => setFeedbackCollected(e.target.checked)}
              data-testid="feedback-collected"
            />
            Feedback Collected
          </label>

          <label>
            Guest Satisfaction (1-5):
            <input
              type="range"
              min="1"
              max="5"
              value={guestSatisfaction}
              onChange={(e) => setGuestSatisfaction(parseInt(e.target.value))}
              data-testid="satisfaction-rating"
            />
            <span>{guestSatisfaction} stars</span>
          </label>
        </div>

        <div className="actions">
          <button
            onClick={handleCheckOut}
            disabled={!canCheckOut}
            data-testid="complete-checkout"
            className={canCheckOut ? 'enabled' : 'disabled'}
          >
            Complete Check-out
          </button>
          <button onClick={onCancel} data-testid="cancel-checkout">
            Cancel
          </button>
        </div>

        <div className="checkout-status">
          Progress: {[roomInspected, keyCardsReturned, finalBillReviewed].filter(Boolean).length}/3 required steps completed
        </div>
      </div>
    </div>
  );
};

// Mock hotel context
const mockHotelContext = {
  reservations: [mockReservation],
  rooms: [mockRoom],
  guests: [mockGuest],
  loading: false,
  error: null,
  updateReservation: jest.fn(),
  processCheckIn: jest.fn(),
  processCheckOut: jest.fn()
};

jest.mock('../../../contexts/SupabaseHotelProvider', () => ({
  useHotel: () => mockHotelContext
}));

// Mock notifications
const mockNotifications = {
  success: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warning: jest.fn()
};

jest.mock('../../../lib/hotel/notifications', () => mockNotifications);

// Mock print service
const mockPrintService = {
  printRegistrationForm: jest.fn(),
  printKeyCardEnvelope: jest.fn(),
  printInvoice: jest.fn(),
  printReceipt: jest.fn()
};

jest.mock('../../../lib/hotel/printService', () => mockPrintService);

describe('Check-in/Check-out Workflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-08-15T14:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Check-in Workflow', () => {
    const mockCheckIn = jest.fn();
    const mockCancel = jest.fn();

    it('renders check-in form with reservation details', async () => {
      await act(async () => {
        render(
          <CheckInWorkflow 
            reservation={mockReservation}
            onCheckIn={mockCheckIn}
            onCancel={mockCancel}
          />
        );
      });

      expect(screen.getByText('Check-in: John Smith')).toBeInTheDocument();
      expect(screen.getByText('Reservation: HTL001')).toBeInTheDocument();
      expect(screen.getByText('Room: 101')).toBeInTheDocument();
      expect(screen.getByText(/2025-08-15 to 2025-08-18/)).toBeInTheDocument();
    });

    it('displays all required check-in steps', async () => {
      await act(async () => {
        render(
          <CheckInWorkflow 
            reservation={mockReservation}
            onCheckIn={mockCheckIn}
            onCancel={mockCancel}
          />
        );
      });

      expect(screen.getByTestId('guest-verified')).toBeInTheDocument();
      expect(screen.getByTestId('documents-checked')).toBeInTheDocument();
      expect(screen.getByTestId('payment-verified')).toBeInTheDocument();
      expect(screen.getByTestId('room-assigned')).toBeInTheDocument();
    });

    it('requires all mandatory steps before enabling check-in', async () => {
      const user = userEvent.setup();

      await act(async () => {
        render(
          <CheckInWorkflow 
            reservation={mockReservation}
            onCheckIn={mockCheckIn}
            onCancel={mockCancel}
          />
        );
      });

      const checkInButton = screen.getByTestId('complete-checkin');
      expect(checkInButton).toBeDisabled();

      // Complete all mandatory steps
      await user.click(screen.getByTestId('guest-verified'));
      await user.click(screen.getByTestId('documents-checked'));
      await user.click(screen.getByTestId('payment-verified'));
      await user.click(screen.getByTestId('room-assigned'));

      expect(checkInButton).toBeEnabled();
    });

    it('processes check-in with correct data', async () => {
      const user = userEvent.setup();

      await act(async () => {
        render(
          <CheckInWorkflow 
            reservation={mockReservation}
            onCheckIn={mockCheckIn}
            onCancel={mockCancel}
          />
        );
      });

      // Complete mandatory steps
      await user.click(screen.getByTestId('guest-verified'));
      await user.click(screen.getByTestId('documents-checked'));
      await user.click(screen.getByTestId('payment-verified'));
      await user.click(screen.getByTestId('room-assigned'));

      // Add optional services
      await user.click(screen.getByTestId('keycard-issued'));
      await user.type(screen.getByTestId('additional-charges'), '25.50');
      await user.type(screen.getByTestId('special-requests'), 'Extra towels requested');

      // Complete check-in
      const checkInButton = screen.getByTestId('complete-checkin');
      await user.click(checkInButton);

      expect(mockCheckIn).toHaveBeenCalledWith({
        reservation_id: 1,
        checked_in_at: expect.any(String),
        additional_charges: 25.5,
        special_requests: 'Extra towels requested',
        key_card_issued: true,
        staff_notes: expect.stringContaining('Check-in completed')
      });
    });

    it('shows progress tracking', async () => {
      const user = userEvent.setup();

      await act(async () => {
        render(
          <CheckInWorkflow 
            reservation={mockReservation}
            onCheckIn={mockCheckIn}
            onCancel={mockCancel}
          />
        );
      });

      expect(screen.getByText('Progress: 0/4 steps completed')).toBeInTheDocument();

      await user.click(screen.getByTestId('guest-verified'));
      expect(screen.getByText('Progress: 1/4 steps completed')).toBeInTheDocument();

      await user.click(screen.getByTestId('documents-checked'));
      expect(screen.getByText('Progress: 2/4 steps completed')).toBeInTheDocument();
    });

    it('handles outstanding balance warnings', async () => {
      const reservationWithBalance = {
        ...mockReservation,
        payment_status: 'partial',
        balance_due: 150.00
      };

      await act(async () => {
        render(
          <CheckInWorkflow 
            reservation={reservationWithBalance}
            onCheckIn={mockCheckIn}
            onCancel={mockCancel}
          />
        );
      });

      expect(screen.getByText('Outstanding balance: €150')).toBeInTheDocument();
      expect(screen.getByText(/warning/)).toBeInTheDocument();
    });

    it('validates guest identity information', async () => {
      await act(async () => {
        render(
          <CheckInWorkflow 
            reservation={mockReservation}
            onCheckIn={mockCheckIn}
            onCancel={mockCancel}
          />
        );
      });

      expect(screen.getByText('Verify guest ID/passport: US123456789')).toBeInTheDocument();
    });
  });

  describe('Check-out Workflow', () => {
    const mockCheckOut = jest.fn();
    const mockCancel = jest.fn();
    
    const checkedInReservation = {
      ...mockReservation,
      status: 'checked_in',
      checked_in_at: '2025-08-15T14:00:00Z'
    };

    it('renders check-out form with reservation details', async () => {
      await act(async () => {
        render(
          <CheckOutWorkflow 
            reservation={checkedInReservation}
            onCheckOut={mockCheckOut}
            onCancel={mockCancel}
          />
        );
      });

      expect(screen.getByText('Check-out: John Smith')).toBeInTheDocument();
      expect(screen.getByText('Reservation: HTL001')).toBeInTheDocument();
      expect(screen.getByText('Room: 101')).toBeInTheDocument();
      expect(screen.getByText('Check-out Date: 2025-08-18')).toBeInTheDocument();
    });

    it('displays all required check-out steps', async () => {
      await act(async () => {
        render(
          <CheckOutWorkflow 
            reservation={checkedInReservation}
            onCheckOut={mockCheckOut}
            onCancel={mockCancel}
          />
        );
      });

      expect(screen.getByTestId('room-inspected')).toBeInTheDocument();
      expect(screen.getByTestId('minibar-checked')).toBeInTheDocument();
      expect(screen.getByTestId('keycards-returned')).toBeInTheDocument();
      expect(screen.getByTestId('final-bill-reviewed')).toBeInTheDocument();
    });

    it('requires mandatory steps before enabling check-out', async () => {
      const user = userEvent.setup();

      await act(async () => {
        render(
          <CheckOutWorkflow 
            reservation={checkedInReservation}
            onCheckOut={mockCheckOut}
            onCancel={mockCancel}
          />
        );
      });

      const checkOutButton = screen.getByTestId('complete-checkout');
      expect(checkOutButton).toBeDisabled();

      // Complete mandatory steps
      await user.click(screen.getByTestId('room-inspected'));
      await user.click(screen.getByTestId('keycards-returned'));
      await user.click(screen.getByTestId('final-bill-reviewed'));

      expect(checkOutButton).toBeEnabled();
    });

    it('calculates additional charges correctly', async () => {
      const user = userEvent.setup();

      await act(async () => {
        render(
          <CheckOutWorkflow 
            reservation={checkedInReservation}
            onCheckOut={mockCheckOut}
            onCancel={mockCancel}
          />
        );
      });

      // Add damage charges
      await user.click(screen.getByTestId('damages-noted'));
      await user.type(screen.getByTestId('damage-charges'), '50.00');

      // Add minibar charges
      await user.click(screen.getByTestId('minibar-checked'));
      await user.type(screen.getByTestId('minibar-charges'), '15.75');

      // Should calculate final total
      expect(screen.getByText('Additional Charges: €65.75')).toBeInTheDocument();
      expect(screen.getByText('Final Total: €470.75')).toBeInTheDocument();
    });

    it('processes check-out with all data', async () => {
      const user = userEvent.setup();

      await act(async () => {
        render(
          <CheckOutWorkflow 
            reservation={checkedInReservation}
            onCheckOut={mockCheckOut}
            onCancel={mockCancel}
          />
        );
      });

      // Complete mandatory steps
      await user.click(screen.getByTestId('room-inspected'));
      await user.click(screen.getByTestId('keycards-returned'));
      await user.click(screen.getByTestId('final-bill-reviewed'));

      // Add charges and feedback
      await user.click(screen.getByTestId('damages-noted'));
      await user.type(screen.getByTestId('damage-charges'), '30.00');
      await user.click(screen.getByTestId('feedback-collected'));
      
      const satisfactionSlider = screen.getByTestId('satisfaction-rating');
      fireEvent.change(satisfactionSlider, { target: { value: '4' } });

      // Complete check-out
      const checkOutButton = screen.getByTestId('complete-checkout');
      await user.click(checkOutButton);

      expect(mockCheckOut).toHaveBeenCalledWith({
        reservation_id: 1,
        checked_out_at: expect.any(String),
        additional_charges: 30,
        damage_charges: 30,
        minibar_charges: 0,
        key_cards_returned: true,
        room_condition: 'damaged',
        guest_satisfaction: 4,
        feedback_collected: true,
        staff_notes: expect.stringContaining('Check-out completed')
      });
    });

    it('handles guest satisfaction feedback', async () => {
      const user = userEvent.setup();

      await act(async () => {
        render(
          <CheckOutWorkflow 
            reservation={checkedInReservation}
            onCheckOut={mockCheckOut}
            onCancel={mockCancel}
          />
        );
      });

      const satisfactionSlider = screen.getByTestId('satisfaction-rating');
      expect(screen.getByText('5 stars')).toBeInTheDocument();

      fireEvent.change(satisfactionSlider, { target: { value: '3' } });
      expect(screen.getByText('3 stars')).toBeInTheDocument();

      await user.click(screen.getByTestId('feedback-collected'));
      expect(screen.getByTestId('feedback-collected')).toBeChecked();
    });

    it('shows conditional damage charges form', async () => {
      const user = userEvent.setup();

      await act(async () => {
        render(
          <CheckOutWorkflow 
            reservation={checkedInReservation}
            onCheckOut={mockCheckOut}
            onCancel={mockCancel}
          />
        );
      });

      // Damage charges field should not be visible initially
      expect(screen.queryByTestId('damage-charges')).not.toBeInTheDocument();

      // Enable damages noted
      await user.click(screen.getByTestId('damages-noted'));

      // Now damage charges field should be visible
      expect(screen.getByTestId('damage-charges')).toBeInTheDocument();
    });

    it('tracks check-out progress', async () => {
      const user = userEvent.setup();

      await act(async () => {
        render(
          <CheckOutWorkflow 
            reservation={checkedInReservation}
            onCheckOut={mockCheckOut}
            onCancel={mockCancel}
          />
        );
      });

      expect(screen.getByText('Progress: 0/3 required steps completed')).toBeInTheDocument();

      await user.click(screen.getByTestId('room-inspected'));
      expect(screen.getByText('Progress: 1/3 required steps completed')).toBeInTheDocument();

      await user.click(screen.getByTestId('keycards-returned'));
      expect(screen.getByText('Progress: 2/3 required steps completed')).toBeInTheDocument();

      await user.click(screen.getByTestId('final-bill-reviewed'));
      expect(screen.getByText('Progress: 3/3 required steps completed')).toBeInTheDocument();
    });
  });

  describe('Integration with Hotel Services', () => {
    it('integrates with Supabase for check-in updates', async () => {
      const user = userEvent.setup();
      mockHotelContext.processCheckIn.mockResolvedValue({ 
        data: { ...mockReservation, status: 'checked_in' }, 
        error: null 
      });

      await act(async () => {
        render(
          <CheckInWorkflow 
            reservation={mockReservation}
            onCheckIn={mockHotelContext.processCheckIn}
            onCancel={jest.fn()}
          />
        );
      });

      // Complete check-in flow
      await user.click(screen.getByTestId('guest-verified'));
      await user.click(screen.getByTestId('documents-checked'));
      await user.click(screen.getByTestId('payment-verified'));
      await user.click(screen.getByTestId('room-assigned'));
      await user.click(screen.getByTestId('complete-checkin'));

      expect(mockHotelContext.processCheckIn).toHaveBeenCalled();
    });

    it('integrates with Supabase for check-out updates', async () => {
      const user = userEvent.setup();
      const checkedInReservation = { ...mockReservation, status: 'checked_in' };
      
      mockHotelContext.processCheckOut.mockResolvedValue({ 
        data: { ...checkedInReservation, status: 'checked_out' }, 
        error: null 
      });

      await act(async () => {
        render(
          <CheckOutWorkflow 
            reservation={checkedInReservation}
            onCheckOut={mockHotelContext.processCheckOut}
            onCancel={jest.fn()}
          />
        );
      });

      // Complete check-out flow
      await user.click(screen.getByTestId('room-inspected'));
      await user.click(screen.getByTestId('keycards-returned'));
      await user.click(screen.getByTestId('final-bill-reviewed'));
      await user.click(screen.getByTestId('complete-checkout'));

      expect(mockHotelContext.processCheckOut).toHaveBeenCalled();
    });

    it('handles print service integration', async () => {
      const user = userEvent.setup();

      await act(async () => {
        render(
          <CheckInWorkflow 
            reservation={mockReservation}
            onCheckIn={jest.fn()}
            onCancel={jest.fn()}
          />
        );
      });

      // Complete check-in and verify print services are called
      await user.click(screen.getByTestId('guest-verified'));
      await user.click(screen.getByTestId('documents-checked'));
      await user.click(screen.getByTestId('payment-verified'));
      await user.click(screen.getByTestId('room-assigned'));
      await user.click(screen.getByTestId('keycard-issued'));
      await user.click(screen.getByTestId('complete-checkin'));

      await waitFor(() => {
        expect(mockPrintService.printRegistrationForm).toHaveBeenCalledWith(mockReservation);
        expect(mockPrintService.printKeyCardEnvelope).toHaveBeenCalledWith(mockReservation.rooms);
      });
    });
  });

  describe('Error Handling', () => {
    it('handles check-in process failures', async () => {
      const user = userEvent.setup();
      const mockCheckInFail = jest.fn().mockRejectedValue(new Error('Database error'));

      await act(async () => {
        render(
          <CheckInWorkflow 
            reservation={mockReservation}
            onCheckIn={mockCheckInFail}
            onCancel={jest.fn()}
          />
        );
      });

      // Complete required steps
      await user.click(screen.getByTestId('guest-verified'));
      await user.click(screen.getByTestId('documents-checked'));
      await user.click(screen.getByTestId('payment-verified'));
      await user.click(screen.getByTestId('room-assigned'));
      await user.click(screen.getByTestId('complete-checkin'));

      await waitFor(() => {
        expect(mockNotifications.error).toHaveBeenCalledWith(
          'Check-in Failed',
          'Database error'
        );
      });
    });

    it('handles check-out process failures', async () => {
      const user = userEvent.setup();
      const mockCheckOutFail = jest.fn().mockRejectedValue(new Error('Payment processing failed'));

      await act(async () => {
        render(
          <CheckOutWorkflow 
            reservation={{ ...mockReservation, status: 'checked_in' }}
            onCheckOut={mockCheckOutFail}
            onCancel={jest.fn()}
          />
        );
      });

      // Complete required steps
      await user.click(screen.getByTestId('room-inspected'));
      await user.click(screen.getByTestId('keycards-returned'));
      await user.click(screen.getByTestId('final-bill-reviewed'));
      await user.click(screen.getByTestId('complete-checkout'));

      await waitFor(() => {
        expect(mockNotifications.error).toHaveBeenCalledWith(
          'Check-out Failed',
          'Payment processing failed'
        );
      });
    });

    it('validates business rules during check-in', async () => {
      const user = userEvent.setup();
      const reservationToday = {
        ...mockReservation,
        check_in_date: '2025-08-16' // Tomorrow, not today
      };

      await act(async () => {
        render(
          <CheckInWorkflow 
            reservation={reservationToday}
            onCheckIn={jest.fn()}
            onCancel={jest.fn()}
          />
        );
      });

      // Try to check in early
      await user.click(screen.getByTestId('guest-verified'));
      await user.click(screen.getByTestId('documents-checked'));
      await user.click(screen.getByTestId('payment-verified'));
      await user.click(screen.getByTestId('room-assigned'));
      await user.click(screen.getByTestId('complete-checkin'));

      expect(screen.getByText(/early check-in/i)).toBeInTheDocument();
    });

    it('prevents duplicate check-in attempts', async () => {
      const user = userEvent.setup();
      const alreadyCheckedIn = {
        ...mockReservation,
        status: 'checked_in',
        checked_in_at: '2025-08-15T14:00:00Z'
      };

      await act(async () => {
        render(
          <CheckInWorkflow 
            reservation={alreadyCheckedIn}
            onCheckIn={jest.fn()}
            onCancel={jest.fn()}
          />
        );
      });

      expect(screen.getByText(/already checked in/i)).toBeInTheDocument();
      expect(screen.getByTestId('complete-checkin')).toBeDisabled();
    });
  });

  describe('Accessibility and UX', () => {
    it('provides clear step-by-step guidance', async () => {
      await act(async () => {
        render(
          <CheckInWorkflow 
            reservation={mockReservation}
            onCheckIn={jest.fn()}
            onCancel={jest.fn()}
          />
        );
      });

      // Each step should have clear instructions
      expect(screen.getByText('Verify guest ID/passport')).toBeInTheDocument();
      expect(screen.getByText('Registration forms completed and signed')).toBeInTheDocument();
      expect(screen.getByText(/Room.*is clean and available/)).toBeInTheDocument();
    });

    it('maintains focus management during workflow', async () => {
      const user = userEvent.setup();

      await act(async () => {
        render(
          <CheckInWorkflow 
            reservation={mockReservation}
            onCheckIn={jest.fn()}
            onCancel={jest.fn()}
          />
        );
      });

      // Tab through the workflow steps
      await user.tab();
      expect(screen.getByTestId('guest-verified')).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId('documents-checked')).toHaveFocus();
    });

    it('provides visual feedback for completed steps', async () => {
      const user = userEvent.setup();

      await act(async () => {
        render(
          <CheckInWorkflow 
            reservation={mockReservation}
            onCheckIn={jest.fn()}
            onCancel={jest.fn()}
          />
        );
      });

      const guestVerified = screen.getByTestId('guest-verified');
      await user.click(guestVerified);

      expect(guestVerified).toBeChecked();
      expect(screen.getByText('Progress: 1/4 steps completed')).toBeInTheDocument();
    });
  });
});