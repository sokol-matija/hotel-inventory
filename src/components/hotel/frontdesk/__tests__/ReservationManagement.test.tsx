// ReservationManagement.test.tsx - Tests for reservation CRUD operations with Supabase integration
// Tests creation, updates, deletions, and real-time synchronization

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
    insert: jest.fn(() => Promise.resolve({ 
      data: [{ ...mockReservation, id: 999 }], 
      error: null 
    })),
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
  internal_notes: 'VIP guest',
  seasonal_period: 'A',
  base_room_rate: 120.00,
  subtotal: 360.00,
  tourism_tax: 9.00,
  vat_amount: 36.00,
  total_amount: 405.00,
  payment_status: 'paid',
  payment_method: 'credit_card',
  deposit_amount: 100.00,
  balance_due: 305.00,
  booking_date: '2025-08-10T10:00:00Z',
  confirmation_number: 'HTL001',
  created_at: '2025-08-10T10:00:00Z',
  updated_at: '2025-08-10T10:00:00Z',
  guests: mockGuest,
  rooms: mockRoom
};

// Import components to test
import CreateBookingModal from '../CreateBookingModal';
import ReservationPopup from '../Reservations/ReservationPopup';

// Mock hooks
const mockHotelContext = {
  reservations: [mockReservation],
  rooms: [mockRoom],
  guests: [mockGuest],
  loading: false,
  error: null,
  createReservation: jest.fn(),
  updateReservation: jest.fn(),
  deleteReservation: jest.fn(),
  subscribeToReservations: jest.fn(() => () => {})
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

// Mock UI components
jest.mock('../../../ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  )
}));

jest.mock('../../../ui/input', () => ({
  Input: ({ value, onChange, ...props }: any) => (
    <input 
      value={value} 
      onChange={(e) => onChange?.(e.target.value)} 
      {...props}
    />
  )
}));

jest.mock('../../../ui/select', () => ({
  Select: ({ value, onValueChange, children }: any) => (
    <select value={value} onChange={(e) => onValueChange?.(e.target.value)}>
      {children}
    </select>
  ),
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>
}));

jest.mock('../../../ui/textarea', () => ({
  Textarea: ({ value, onChange, ...props }: any) => (
    <textarea 
      value={value} 
      onChange={(e) => onChange?.(e.target.value)} 
      {...props}
    />
  )
}));

jest.mock('../../../ui/dialog', () => ({
  Dialog: ({ open, onOpenChange, children }: any) => 
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: any) => <h2 data-testid="dialog-title">{children}</h2>,
  DialogDescription: ({ children }: any) => <p data-testid="dialog-description">{children}</p>,
  DialogFooter: ({ children }: any) => <div data-testid="dialog-footer">{children}</div>
}));

// Mock date picker
jest.mock('react-datepicker', () => {
  return function MockDatePicker({ selected, onChange, ...props }: any) {
    return (
      <input
        type="date"
        value={selected ? selected.toISOString().split('T')[0] : ''}
        onChange={(e) => onChange?.(new Date(e.target.value))}
        {...props}
      />
    );
  };
});

describe('Reservation Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('CreateBookingModal', () => {
    const defaultProps = {
      isOpen: true,
      onClose: jest.fn(),
      onSave: jest.fn(),
      selectedRoom: mockRoom,
      selectedDate: new Date('2025-08-15')
    };

    it('renders creation form with all required fields', async () => {
      await act(async () => {
        render(<CreateBookingModal {...defaultProps} />);
      });

      expect(screen.getByTestId('dialog')).toBeInTheDocument();
      expect(screen.getByTestId('dialog-title')).toHaveTextContent('Create New Booking');
      
      // Check for required form fields
      expect(screen.getByLabelText(/guest/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/check.in/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/check.out/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/adults/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/children/i)).toBeInTheDocument();
    });

    it('validates required fields before submission', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(<CreateBookingModal {...defaultProps} />);
      });

      const saveButton = screen.getByText('Create Booking');
      await user.click(saveButton);

      // Should show validation errors
      expect(screen.getByText(/guest is required/i)).toBeInTheDocument();
    });

    it('calculates pricing correctly based on dates and rates', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(<CreateBookingModal {...defaultProps} />);
      });

      // Fill in guest
      const guestSelect = screen.getByLabelText(/guest/i);
      await user.selectOptions(guestSelect, '1');

      // Set dates
      const checkInInput = screen.getByLabelText(/check.in/i);
      const checkOutInput = screen.getByLabelText(/check.out/i);
      
      await user.type(checkInInput, '2025-08-15');
      await user.type(checkOutInput, '2025-08-18');

      // Should calculate total automatically
      expect(screen.getByText(/total.*€\s*405/i)).toBeInTheDocument();
    });

    it('creates reservation with Supabase integration', async () => {
      const user = userEvent.setup();
      const onSave = jest.fn();
      
      await act(async () => {
        render(<CreateBookingModal {...defaultProps} onSave={onSave} />);
      });

      // Fill in all required fields
      const guestSelect = screen.getByLabelText(/guest/i);
      await user.selectOptions(guestSelect, '1');

      const checkInInput = screen.getByLabelText(/check.in/i);
      const checkOutInput = screen.getByLabelText(/check.out/i);
      
      await user.type(checkInInput, '2025-08-15');
      await user.type(checkOutInput, '2025-08-18');

      const adultsInput = screen.getByLabelText(/adults/i);
      await user.type(adultsInput, '2');

      // Submit form
      const saveButton = screen.getByText('Create Booking');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockHotelContext.createReservation).toHaveBeenCalledWith(
          expect.objectContaining({
            guest_id: 1,
            room_id: 1,
            check_in_date: '2025-08-15',
            check_out_date: '2025-08-18',
            adults: 2
          })
        );
      });

      expect(onSave).toHaveBeenCalled();
    });

    it('handles creation errors gracefully', async () => {
      const user = userEvent.setup();
      mockHotelContext.createReservation.mockRejectedValueOnce(
        new Error('Failed to create reservation')
      );
      
      await act(async () => {
        render(<CreateBookingModal {...defaultProps} />);
      });

      // Fill form and submit
      const guestSelect = screen.getByLabelText(/guest/i);
      await user.selectOptions(guestSelect, '1');

      const saveButton = screen.getByText('Create Booking');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockNotifications.error).toHaveBeenCalledWith(
          'Creation Failed',
          'Failed to create reservation'
        );
      });
    });

    it('validates date ranges and availability', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(<CreateBookingModal {...defaultProps} />);
      });

      // Try to set check-out before check-in
      const checkInInput = screen.getByLabelText(/check.in/i);
      const checkOutInput = screen.getByLabelText(/check.out/i);
      
      await user.type(checkInInput, '2025-08-18');
      await user.type(checkOutInput, '2025-08-15');

      const saveButton = screen.getByText('Create Booking');
      await user.click(saveButton);

      expect(screen.getByText(/check.out.*after.*check.in/i)).toBeInTheDocument();
    });

    it('supports special requests and internal notes', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(<CreateBookingModal {...defaultProps} />);
      });

      const specialRequestsField = screen.getByLabelText(/special.requests/i);
      const internalNotesField = screen.getByLabelText(/internal.notes/i);

      await user.type(specialRequestsField, 'Late check-in requested');
      await user.type(internalNotesField, 'VIP guest - provide upgrade if available');

      expect(specialRequestsField).toHaveValue('Late check-in requested');
      expect(internalNotesField).toHaveValue('VIP guest - provide upgrade if available');
    });
  });

  describe('ReservationPopup', () => {
    const defaultProps = {
      isOpen: true,
      reservation: mockReservation,
      onClose: jest.fn()
    };

    it('displays reservation details correctly', async () => {
      await act(async () => {
        render(<ReservationPopup {...defaultProps} />);
      });

      expect(screen.getByText('John Smith')).toBeInTheDocument();
      expect(screen.getByText('Room 101')).toBeInTheDocument();
      expect(screen.getByText('Aug 15 - Aug 18')).toBeInTheDocument();
      expect(screen.getByText('€405.00')).toBeInTheDocument();
      expect(screen.getByText('confirmed')).toBeInTheDocument();
    });

    it('allows editing reservation details', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(<ReservationPopup {...defaultProps} />);
      });

      const editButton = screen.getByText('Edit');
      await user.click(editButton);

      // Should switch to edit mode
      expect(screen.getByText('Save Changes')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();

      // Should show editable fields
      const notesField = screen.getByDisplayValue('VIP guest');
      expect(notesField).toBeInTheDocument();
    });

    it('updates reservation status', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(<ReservationPopup {...defaultProps} />);
      });

      const statusButton = screen.getByText('Check In');
      await user.click(statusButton);

      await waitFor(() => {
        expect(mockHotelContext.updateReservation).toHaveBeenCalledWith(
          1,
          expect.objectContaining({
            status: 'checked_in',
            checked_in_at: expect.any(String)
          })
        );
      });
    });

    it('handles check-out process', async () => {
      const user = userEvent.setup();
      const checkedInReservation = {
        ...mockReservation,
        status: 'checked_in',
        checked_in_at: '2025-08-15T14:00:00Z'
      };
      
      await act(async () => {
        render(<ReservationPopup {...defaultProps} reservation={checkedInReservation} />);
      });

      const checkOutButton = screen.getByText('Check Out');
      await user.click(checkOutButton);

      await waitFor(() => {
        expect(mockHotelContext.updateReservation).toHaveBeenCalledWith(
          1,
          expect.objectContaining({
            status: 'checked_out',
            checked_out_at: expect.any(String)
          })
        );
      });
    });

    it('supports reservation cancellation', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(<ReservationPopup {...defaultProps} />);
      });

      const cancelButton = screen.getByText('Cancel Reservation');
      await user.click(cancelButton);

      // Should show confirmation dialog
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();

      const confirmButton = screen.getByText('Confirm Cancellation');
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockHotelContext.updateReservation).toHaveBeenCalledWith(
          1,
          expect.objectContaining({
            status: 'cancelled'
          })
        );
      });
    });

    it('displays payment information', async () => {
      await act(async () => {
        render(<ReservationPopup {...defaultProps} />);
      });

      expect(screen.getByText('Payment Status')).toBeInTheDocument();
      expect(screen.getByText('paid')).toBeInTheDocument();
      expect(screen.getByText('Credit Card')).toBeInTheDocument();
      expect(screen.getByText('€100.00')).toBeInTheDocument(); // Deposit
      expect(screen.getByText('€305.00')).toBeInTheDocument(); // Balance
    });

    it('supports adding payment records', async () => {
      const user = userEvent.setup();
      const unpaidReservation = {
        ...mockReservation,
        payment_status: 'pending',
        balance_due: 405.00
      };
      
      await act(async () => {
        render(<ReservationPopup {...defaultProps} reservation={unpaidReservation} />);
      });

      const addPaymentButton = screen.getByText('Add Payment');
      await user.click(addPaymentButton);

      // Should show payment form
      const amountInput = screen.getByLabelText(/amount/i);
      const methodSelect = screen.getByLabelText(/method/i);

      await user.type(amountInput, '405.00');
      await user.selectOptions(methodSelect, 'credit_card');

      const submitPaymentButton = screen.getByText('Record Payment');
      await user.click(submitPaymentButton);

      await waitFor(() => {
        expect(mockHotelContext.updateReservation).toHaveBeenCalledWith(
          1,
          expect.objectContaining({
            payment_status: 'paid',
            balance_due: 0
          })
        );
      });
    });
  });

  describe('Real-time Updates', () => {
    it('subscribes to reservation changes on mount', async () => {
      await act(async () => {
        render(<CreateBookingModal isOpen={true} onClose={jest.fn()} onSave={jest.fn()} />);
      });

      expect(mockHotelContext.subscribeToReservations).toHaveBeenCalled();
    });

    it('handles real-time reservation updates', async () => {
      const { rerender } = render(
        <ReservationPopup isOpen={true} reservation={mockReservation} onClose={jest.fn()} />
      );

      // Simulate real-time update
      const updatedReservation = {
        ...mockReservation,
        status: 'checked_in',
        checked_in_at: '2025-08-15T14:00:00Z'
      };

      await act(async () => {
        rerender(
          <ReservationPopup isOpen={true} reservation={updatedReservation} onClose={jest.fn()} />
        );
      });

      expect(screen.getByText('checked_in')).toBeInTheDocument();
    });

    it('handles concurrent updates gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock concurrent update scenario
      mockHotelContext.updateReservation
        .mockResolvedValueOnce({ data: mockReservation, error: null })
        .mockRejectedValueOnce(new Error('Conflict: Reservation was updated by another user'));

      await act(async () => {
        render(<ReservationPopup isOpen={true} reservation={mockReservation} onClose={jest.fn()} />);
      });

      const editButton = screen.getByText('Edit');
      await user.click(editButton);

      const saveButton = screen.getByText('Save Changes');
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockNotifications.warning).toHaveBeenCalledWith(
          'Conflict Detected',
          expect.stringContaining('updated by another user')
        );
      });
    });
  });

  describe('Data Validation', () => {
    it('validates guest capacity against room limits', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(<CreateBookingModal 
          isOpen={true} 
          onClose={jest.fn()} 
          onSave={jest.fn()}
          selectedRoom={mockRoom} // max_occupancy: 2
        />);
      });

      const adultsInput = screen.getByLabelText(/adults/i);
      const childrenInput = screen.getByLabelText(/children/i);

      await user.type(adultsInput, '2');
      await user.type(childrenInput, '2'); // Total: 4, exceeds room capacity

      const saveButton = screen.getByText('Create Booking');
      await user.click(saveButton);

      expect(screen.getByText(/exceeds room capacity/i)).toBeInTheDocument();
    });

    it('prevents double bookings for same room and dates', async () => {
      const user = userEvent.setup();
      
      // Mock existing reservation check
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            or: jest.fn(() => Promise.resolve({ 
              data: [mockReservation], // Existing reservation found
              error: null 
            }))
          }))
        }))
      });

      await act(async () => {
        render(<CreateBookingModal 
          isOpen={true} 
          onClose={jest.fn()} 
          onSave={jest.fn()}
          selectedRoom={mockRoom}
          selectedDate={new Date('2025-08-15')} // Same dates as existing reservation
        />);
      });

      const guestSelect = screen.getByLabelText(/guest/i);
      await user.selectOptions(guestSelect, '1');

      const saveButton = screen.getByText('Create Booking');
      await user.click(saveButton);

      expect(screen.getByText(/room is already booked/i)).toBeInTheDocument();
    });

    it('validates business rules for minimum stay', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(<CreateBookingModal 
          isOpen={true} 
          onClose={jest.fn()} 
          onSave={jest.fn()}
          selectedRoom={mockRoom}
        />);
      });

      // Set same-day check-in and check-out
      const checkInInput = screen.getByLabelText(/check.in/i);
      const checkOutInput = screen.getByLabelText(/check.out/i);
      
      await user.type(checkInInput, '2025-08-15');
      await user.type(checkOutInput, '2025-08-15');

      const saveButton = screen.getByText('Create Booking');
      await user.click(saveButton);

      expect(screen.getByText(/minimum stay.*1 night/i)).toBeInTheDocument();
    });
  });

  describe('Error Recovery', () => {
    it('retries failed operations automatically', async () => {
      const user = userEvent.setup();
      
      // Mock temporary failure followed by success
      mockHotelContext.createReservation
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ data: mockReservation, error: null });

      await act(async () => {
        render(<CreateBookingModal 
          isOpen={true} 
          onClose={jest.fn()} 
          onSave={jest.fn()}
          selectedRoom={mockRoom}
        />);
      });

      const guestSelect = screen.getByLabelText(/guest/i);
      await user.selectOptions(guestSelect, '1');

      const saveButton = screen.getByText('Create Booking');
      await user.click(saveButton);

      // Should show retry option
      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });

      const retryButton = screen.getByText('Retry');
      await user.click(retryButton);

      await waitFor(() => {
        expect(mockHotelContext.createReservation).toHaveBeenCalledTimes(2);
      });
    });

    it('provides offline support for viewing reservations', async () => {
      // Mock offline scenario
      mockSupabase.from.mockReturnValueOnce({
        select: jest.fn(() => {
          throw new Error('Network error');
        })
      });

      await act(async () => {
        render(<ReservationPopup 
          isOpen={true} 
          reservation={mockReservation} 
          onClose={jest.fn()} 
        />);
      });

      // Should still display cached reservation data
      expect(screen.getByText('John Smith')).toBeInTheDocument();
      expect(screen.getByText(/offline mode/i)).toBeInTheDocument();
    });
  });
});