import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CheckOutWorkflow from './CheckOutWorkflow';
import type { Reservation } from '@/lib/hotel/types';
import type { UseCheckOutWorkflowResult, CheckOutStep } from './useCheckOutWorkflow';
import { CheckCircle, ShoppingBag, Key, CreditCard } from 'lucide-react';

// ── Mock useCheckOutWorkflow ──────────────────────────────────────────────
const mockHandleStepToggle = vi.fn();
const mockHandleMarkAsPaid = vi.fn().mockResolvedValue(undefined);
const mockHandleSendInvoiceEmail = vi.fn();
const mockHandleCompleteCheckOut = vi.fn().mockResolvedValue(undefined);
const mockSetCheckOutNotes = vi.fn();
const mockSetAdditionalCharges = vi.fn();
const mockSetGuestSatisfaction = vi.fn();
const mockSetGenerateInvoice = vi.fn();

const defaultSteps: CheckOutStep[] = [
  {
    id: 'room-inspection',
    title: 'Room Inspection',
    description: 'Inspect room condition',
    completed: false,
    required: true,
    icon: CheckCircle,
  },
  {
    id: 'minibar',
    title: 'Minibar Check',
    description: 'Check minibar usage',
    completed: false,
    required: true,
    icon: ShoppingBag,
  },
  {
    id: 'key-return',
    title: 'Room Key Return',
    description: 'Collect room key',
    completed: false,
    required: true,
    icon: Key,
  },
  {
    id: 'payment-verify',
    title: 'Payment Verification',
    description: 'Verify payment',
    completed: true,
    required: false,
    icon: CreditCard,
  },
];

let mockHookReturn: UseCheckOutWorkflowResult;

function createDefaultHookReturn(
  overrides: Partial<UseCheckOutWorkflowResult> = {}
): UseCheckOutWorkflowResult {
  return {
    guest: {
      id: 1,
      display_name: 'Hans Mueller',
      is_vip: false,
      email: 'hans@example.com',
    } as UseCheckOutWorkflowResult['guest'],
    room: {
      id: 1,
      room_number: '101',
      name_english: 'Double Room',
      floor: 1,
    } as UseCheckOutWorkflowResult['room'],
    checkOutSteps: defaultSteps.map((s) => ({ ...s })),
    isProcessing: false,
    isUpdating: false,
    checkOutNotes: '',
    roomKeyReturned: false,
    additionalCharges: 0,
    guestSatisfaction: 0,
    generateInvoice: true,
    paymentStatus: 'incomplete-payment',
    chargesTotalAmount: 320,
    isEarlyCheckOut: false,
    isLateCheckOut: false,
    progressPercentage: 25,
    totalAmount: 320,
    canCompleteCheckOut: false,
    handleStepToggle: mockHandleStepToggle,
    handleMarkAsPaid: mockHandleMarkAsPaid,
    handleSendInvoiceEmail: mockHandleSendInvoiceEmail,
    handleCompleteCheckOut: mockHandleCompleteCheckOut,
    setCheckOutNotes: mockSetCheckOutNotes,
    setAdditionalCharges: mockSetAdditionalCharges,
    setGuestSatisfaction: mockSetGuestSatisfaction,
    setGenerateInvoice: mockSetGenerateInvoice,
    ...overrides,
  };
}

vi.mock('./useCheckOutWorkflow', () => ({
  useCheckOutWorkflow: () => mockHookReturn,
}));

// ── Test data ─────────────────────────────────────────────────────────────
const mockReservation: Reservation = {
  id: 1,
  room_id: 1,
  guest_id: 1,
  check_in_date: '2026-03-25',
  check_out_date: '2026-03-28',
  status: 'incomplete-payment',
  number_of_guests: 2,
  adults: 2,
  number_of_nights: 3,
  total_amount: 320,
} as Reservation;

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  reservation: mockReservation,
};

// ── Tests ─────────────────────────────────────────────────────────────────
describe('CheckOutWorkflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHookReturn = createDefaultHookReturn();
  });

  // ── Rendering ─────────────────────────────────────────────────────────
  describe('rendering', () => {
    it('renders nothing when isOpen is false', () => {
      const { container } = render(<CheckOutWorkflow {...defaultProps} isOpen={false} />);
      expect(container.innerHTML).toBe('');
    });

    it('renders nothing when reservation is null', () => {
      const { container } = render(<CheckOutWorkflow {...defaultProps} reservation={null} />);
      expect(container.innerHTML).toBe('');
    });

    it('renders nothing when guest is null', () => {
      mockHookReturn = createDefaultHookReturn({ guest: null });
      const { container } = render(<CheckOutWorkflow {...defaultProps} />);
      expect(container.innerHTML).toBe('');
    });

    it('renders nothing when room is undefined', () => {
      mockHookReturn = createDefaultHookReturn({ room: undefined });
      const { container } = render(<CheckOutWorkflow {...defaultProps} />);
      expect(container.innerHTML).toBe('');
    });

    it('displays the dialog title', () => {
      render(<CheckOutWorkflow {...defaultProps} />);
      expect(screen.getByText('Check-Out Workflow')).toBeInTheDocument();
    });

    it('displays guest name and room info', () => {
      render(<CheckOutWorkflow {...defaultProps} />);
      expect(screen.getByText('Hans Mueller')).toBeInTheDocument();
      expect(screen.getByText(/Room 101/)).toBeInTheDocument();
      expect(screen.getByText(/Double Room/)).toBeInTheDocument();
    });

    it('shows VIP badge when guest is VIP', () => {
      mockHookReturn = createDefaultHookReturn({
        guest: {
          id: 1,
          display_name: 'Hans Mueller',
          is_vip: true,
          email: 'h@e.com',
        } as UseCheckOutWorkflowResult['guest'],
      });
      render(<CheckOutWorkflow {...defaultProps} />);
      expect(screen.getByText('VIP')).toBeInTheDocument();
    });

    it('shows progress percentage', () => {
      mockHookReturn = createDefaultHookReturn({ progressPercentage: 75 });
      render(<CheckOutWorkflow {...defaultProps} />);
      expect(screen.getByText('75% Complete')).toBeInTheDocument();
    });

    it('displays all checklist steps', () => {
      render(<CheckOutWorkflow {...defaultProps} />);
      expect(screen.getByText('Room Inspection')).toBeInTheDocument();
      expect(screen.getByText('Minibar Check')).toBeInTheDocument();
      expect(screen.getByText('Room Key Return')).toBeInTheDocument();
      expect(screen.getByText('Payment Verification')).toBeInTheDocument();
    });

    it('shows Required badges for incomplete required steps', () => {
      render(<CheckOutWorkflow {...defaultProps} />);
      const requiredBadges = screen.getAllByText('Required');
      expect(requiredBadges.length).toBe(3); // 3 incomplete required steps
    });
  });

  // ── Departure timing ──────────────────────────────────────────────────
  describe('departure timing', () => {
    it('shows On Time badge by default', () => {
      render(<CheckOutWorkflow {...defaultProps} />);
      expect(screen.getByText('On Time')).toBeInTheDocument();
    });

    it('shows Early Departure badge and alert', () => {
      mockHookReturn = createDefaultHookReturn({ isEarlyCheckOut: true });
      render(<CheckOutWorkflow {...defaultProps} />);
      const matches = screen.getAllByText('Early Departure');
      expect(matches.length).toBeGreaterThanOrEqual(2); // badge + alert heading
      expect(screen.getByText(/leaving before scheduled/)).toBeInTheDocument();
    });

    it('shows Late Departure badge and alert', () => {
      mockHookReturn = createDefaultHookReturn({ isLateCheckOut: true });
      render(<CheckOutWorkflow {...defaultProps} />);
      const matches = screen.getAllByText('Late Departure');
      expect(matches.length).toBeGreaterThanOrEqual(2); // badge + alert heading
      expect(screen.getByText(/after standard check-out time/)).toBeInTheDocument();
    });
  });

  // ── Payment ───────────────────────────────────────────────────────────
  describe('payment', () => {
    it('shows PAYMENT PENDING when status is incomplete-payment', () => {
      render(<CheckOutWorkflow {...defaultProps} />);
      expect(screen.getByText('PAYMENT PENDING')).toBeInTheDocument();
    });

    it('shows PAYMENT COMPLETE when paid', () => {
      mockHookReturn = createDefaultHookReturn({ paymentStatus: 'confirmed' });
      render(<CheckOutWorkflow {...defaultProps} />);
      expect(screen.getByText('PAYMENT COMPLETE')).toBeInTheDocument();
    });

    it('shows Mark as Paid button only for incomplete-payment', () => {
      render(<CheckOutWorkflow {...defaultProps} />);
      expect(screen.getByText(/Mark as Paid/)).toBeInTheDocument();
    });

    it('hides Mark as Paid button when already paid', () => {
      mockHookReturn = createDefaultHookReturn({ paymentStatus: 'confirmed' });
      render(<CheckOutWorkflow {...defaultProps} />);
      expect(screen.queryByText(/Mark as Paid/)).not.toBeInTheDocument();
    });

    it('calls handleMarkAsPaid when button clicked', async () => {
      const user = userEvent.setup();
      render(<CheckOutWorkflow {...defaultProps} />);
      await user.click(screen.getByText(/Mark as Paid/));
      expect(mockHandleMarkAsPaid).toHaveBeenCalledOnce();
    });

    it('displays total amount', () => {
      render(<CheckOutWorkflow {...defaultProps} />);
      const amounts = screen.getAllByText('€320.00');
      expect(amounts.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── Step toggling ─────────────────────────────────────────────────────
  describe('step toggling', () => {
    it('calls handleStepToggle when a step is clicked', async () => {
      const user = userEvent.setup();
      render(<CheckOutWorkflow {...defaultProps} />);
      await user.click(screen.getByText('Room Inspection'));
      expect(mockHandleStepToggle).toHaveBeenCalledWith('room-inspection');
    });
  });

  // ── Complete Check-Out button ─────────────────────────────────────────
  describe('complete check-out button', () => {
    it('is disabled when canCompleteCheckOut is false', () => {
      render(<CheckOutWorkflow {...defaultProps} />);
      const btn = screen.getByText('Complete Check-Out');
      expect(btn.closest('button')).toBeDisabled();
    });

    it('shows warning text when cannot complete', () => {
      render(<CheckOutWorkflow {...defaultProps} />);
      expect(screen.getByText('Complete all required steps to proceed')).toBeInTheDocument();
    });

    it('is enabled when canCompleteCheckOut is true', () => {
      mockHookReturn = createDefaultHookReturn({ canCompleteCheckOut: true });
      render(<CheckOutWorkflow {...defaultProps} />);
      const btn = screen.getByText('Complete Check-Out');
      expect(btn.closest('button')).not.toBeDisabled();
    });

    it('calls handleCompleteCheckOut when clicked', async () => {
      mockHookReturn = createDefaultHookReturn({ canCompleteCheckOut: true });
      const user = userEvent.setup();
      render(<CheckOutWorkflow {...defaultProps} />);
      await user.click(screen.getByText('Complete Check-Out'));
      expect(mockHandleCompleteCheckOut).toHaveBeenCalledOnce();
    });

    it('shows Processing text when isProcessing', () => {
      mockHookReturn = createDefaultHookReturn({ isProcessing: true });
      render(<CheckOutWorkflow {...defaultProps} />);
      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });
  });

  // ── Invoice checkbox ──────────────────────────────────────────────────
  describe('invoice generation checkbox', () => {
    it('is checked by default', () => {
      render(<CheckOutWorkflow {...defaultProps} />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();
    });

    it('calls setGenerateInvoice when toggled', async () => {
      const user = userEvent.setup();
      render(<CheckOutWorkflow {...defaultProps} />);
      await user.click(screen.getByRole('checkbox'));
      expect(mockSetGenerateInvoice).toHaveBeenCalledWith(false);
    });
  });

  // ── Send invoice email ────────────────────────────────────────────────
  describe('send invoice email', () => {
    it('calls handleSendInvoiceEmail when clicked', async () => {
      const user = userEvent.setup();
      render(<CheckOutWorkflow {...defaultProps} />);
      await user.click(screen.getByText(/Send PDF Invoice to Email/));
      expect(mockHandleSendInvoiceEmail).toHaveBeenCalledOnce();
    });
  });

  // ── Guest satisfaction ────────────────────────────────────────────────
  describe('guest satisfaction', () => {
    it('renders 5 star buttons', () => {
      render(<CheckOutWorkflow {...defaultProps} />);
      const stars = screen.getAllByText('★');
      expect(stars).toHaveLength(5);
    });

    it('calls setGuestSatisfaction when a star is clicked', async () => {
      const user = userEvent.setup();
      render(<CheckOutWorkflow {...defaultProps} />);
      const stars = screen.getAllByText('★');
      await user.click(stars[3]); // 4th star
      expect(mockSetGuestSatisfaction).toHaveBeenCalledWith(4);
    });
  });

  // ── Check-out notes ───────────────────────────────────────────────────
  describe('check-out notes', () => {
    it('calls setCheckOutNotes on input', async () => {
      const user = userEvent.setup();
      render(<CheckOutWorkflow {...defaultProps} />);
      const textarea = screen.getByPlaceholderText(/Add any notes/);
      await user.type(textarea, 'G');
      expect(mockSetCheckOutNotes).toHaveBeenCalled();
    });
  });

  // ── Cancel ────────────────────────────────────────────────────────────
  describe('cancel', () => {
    it('calls onClose when cancel button clicked', async () => {
      const user = userEvent.setup();
      render(<CheckOutWorkflow {...defaultProps} />);
      await user.click(screen.getByText('Cancel'));
      expect(defaultProps.onClose).toHaveBeenCalledOnce();
    });
  });
});
