import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import PaymentDetailsModal from './PaymentDetailsModal';

// ── Mocks ─────────────────────────────────────────────────────────────────
const mockMutateAsync = vi.fn().mockResolvedValue(undefined);

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }),
      }),
      insert: () => Promise.resolve({ data: null, error: null }),
    }),
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
  },
}));

vi.mock('@/lib/queries/hooks/useReservations', () => ({
  useUpdateReservation: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
}));

const mockCharges = [
  {
    id: 1,
    description: 'Room (Double Room)',
    quantity: 3,
    unitPrice: 80,
    total: 240,
    vat_rate: 0.13,
    sort_order: 0,
  },
  {
    id: 2,
    description: 'Tourism Tax',
    quantity: 3,
    unitPrice: 1.33,
    total: 3.99,
    vat_rate: 0,
    sort_order: 1,
  },
];

vi.mock('@/lib/queries/hooks/useReservationCharges', () => ({
  useReservationCharges: () => ({ data: mockCharges, isLoading: false }),
  useReplaceCharges: () => ({
    mutateAsync: vi.fn().mockResolvedValue(undefined),
    isPending: false,
  }),
}));

vi.mock('@/lib/queries/hooks/useCompanies', () => ({
  useCompanies: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/lib/pdfInvoiceGenerator', () => ({
  generatePDFInvoice: vi.fn(),
  generateInvoiceNumber: vi.fn(() => '2026-001-0001'),
}));

vi.mock('@/lib/notifications', () => ({
  default: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

vi.mock('@/lib/hotel/services/InvoiceService', () => ({
  createInvoice: vi.fn().mockResolvedValue({ id: 'inv-1', invoiceNumber: '2026-001-0001' }),
}));

vi.mock('@/lib/hotel/services/UnifiedPricingService', () => ({
  unifiedPricingService: { generateCharges: vi.fn().mockResolvedValue([]) },
}));

// ── Helpers ───────────────────────────────────────────────────────────────
function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

const mockGuest = {
  id: 1,
  display_name: 'Hans Mueller',
  email: 'hans@example.com',
  has_pets: false,
  is_vip: false,
} as Parameters<typeof PaymentDetailsModal>[0]['guest'];

const mockRoom = {
  id: 1,
  room_number: '101',
  name_english: 'Double Room',
  floor: 1,
} as Parameters<typeof PaymentDetailsModal>[0]['room'];

const mockReservation = {
  id: 1,
  room_id: 1,
  guest_id: 1,
  check_in_date: '2026-03-25',
  check_out_date: '2026-03-28',
  status: 'incomplete-payment',
  number_of_guests: 2,
  adults: 2,
  number_of_nights: 3,
  total_amount: 243.99,
  booking_date: '2026-03-20',
  reservation_statuses: { code: 'incomplete-payment' },
} as Parameters<typeof PaymentDetailsModal>[0]['reservation'];

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  reservation: mockReservation,
  guest: mockGuest,
  room: mockRoom,
};

function renderModal(overrides = {}) {
  return render(<PaymentDetailsModal {...defaultProps} {...overrides} />, {
    wrapper: createWrapper(),
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────
describe('PaymentDetailsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Rendering ─────────────────────────────────────────────────────────
  describe('rendering', () => {
    it('renders the dialog title with room number', () => {
      renderModal();
      expect(screen.getByText(/Payment Breakdown - Room 101/)).toBeInTheDocument();
    });

    it('displays guest name', () => {
      renderModal();
      expect(screen.getByText('Hans Mueller')).toBeInTheDocument();
    });

    it('displays room info', () => {
      renderModal();
      expect(screen.getByText('101 - Double Room')).toBeInTheDocument();
    });

    it('displays duration in nights', () => {
      renderModal();
      const nightsElements = screen.getAllByText('3 nights');
      expect(nightsElements.length).toBeGreaterThanOrEqual(1);
    });

    it('displays guest count', () => {
      renderModal();
      expect(screen.getByText('2 guests')).toBeInTheDocument();
    });

    it('shows charge descriptions in table', () => {
      renderModal();
      expect(screen.getByText('Room (Double Room)')).toBeInTheDocument();
      expect(screen.getByText('Tourism Tax')).toBeInTheDocument();
    });

    it('shows grand total amount', () => {
      renderModal();
      // 240 + 3.99 = 243.99
      expect(screen.getByText('€243.99')).toBeInTheDocument();
    });
  });

  // ── Pet badge ─────────────────────────────────────────────────────────
  describe('pet badge', () => {
    it('shows Pet badge when guest has pets', () => {
      renderModal({ guest: { ...mockGuest, has_pets: true } });
      expect(screen.getByText('Pet')).toBeInTheDocument();
    });

    it('hides Pet badge when guest has no pets', () => {
      renderModal();
      expect(screen.queryByText('Pet')).not.toBeInTheDocument();
    });
  });

  // ── Payment status ────────────────────────────────────────────────────
  describe('payment status', () => {
    it('shows PENDING badge for incomplete payment', () => {
      renderModal();
      expect(screen.getByText('PENDING')).toBeInTheDocument();
      expect(screen.getByText('Payment Pending')).toBeInTheDocument();
    });

    it('shows Mark as Paid button for pending payments', () => {
      renderModal();
      expect(screen.getByText('Mark as Paid')).toBeInTheDocument();
    });

    it('calls mutation when Mark as Paid clicked', async () => {
      const user = userEvent.setup();
      renderModal();
      await user.click(screen.getByText('Mark as Paid'));
      expect(mockMutateAsync).toHaveBeenCalledWith({
        id: 1,
        updates: { status: 'checked-out' },
      });
    });
  });

  // ── Action buttons ────────────────────────────────────────────────────
  describe('action buttons', () => {
    it('renders Print PDF Invoice button', () => {
      renderModal();
      expect(screen.getByText('Print PDF Invoice')).toBeInTheDocument();
    });

    it('renders Send Reminder Email button', () => {
      renderModal();
      expect(screen.getByText('Send Reminder Email')).toBeInTheDocument();
    });

    it('renders Close button that calls onClose', async () => {
      const user = userEvent.setup();
      renderModal();
      // The Dialog also renders a built-in X close button named "Close", so there
      // are two buttons with that accessible name. We target the footer's outline button.
      const closeButtons = screen.getAllByRole('button', { name: /^close$/i });
      const footerClose = closeButtons[closeButtons.length - 1];
      await user.click(footerClose);
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('calls generatePDFInvoice when Print PDF clicked', async () => {
      const { generatePDFInvoice } = await import('@/lib/pdfInvoiceGenerator');
      const user = userEvent.setup();
      renderModal();
      await user.click(screen.getByText('Print PDF Invoice'));
      expect(generatePDFInvoice).toHaveBeenCalled();
    });
  });

  // ── Legal notice ──────────────────────────────────────────────────────
  describe('legal notice', () => {
    it('displays Croatian OIB and VAT info', () => {
      renderModal();
      expect(screen.getByText(/OIB: 87246357068/)).toBeInTheDocument();
      expect(screen.getByText(/VAT included at 13%/)).toBeInTheDocument();
    });
  });

  // ── Modal visibility ──────────────────────────────────────────────────
  describe('modal visibility', () => {
    it('does not render content when isOpen is false', () => {
      renderModal({ isOpen: false });
      expect(screen.queryByText(/Payment Breakdown/)).not.toBeInTheDocument();
    });
  });

  // ── Edit mode ─────────────────────────────────────────────────────────
  describe('edit mode', () => {
    it('shows Edit Bill button', () => {
      renderModal();
      expect(screen.getByText('Edit Bill')).toBeInTheDocument();
    });
  });
});
