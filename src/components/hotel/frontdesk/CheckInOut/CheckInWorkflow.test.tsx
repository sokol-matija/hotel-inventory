import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import CheckInWorkflow from './CheckInWorkflow';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ order: () => ({ throwOnError: () => Promise.resolve({ data: [] }) }) }),
      }),
    }),
  },
}));

const mockMutateAsync = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/queries/hooks/useRooms', () => ({
  useRooms: vi.fn(() => ({ data: [], isLoading: false, isError: false })),
}));

vi.mock('@/lib/queries/hooks/useGuests', () => ({
  useGuests: vi.fn(() => ({ data: [], isLoading: false, isError: false })),
}));

vi.mock('@/lib/queries/hooks/useReservations', () => ({
  useUpdateReservationStatus: vi.fn(() => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  })),
}));

vi.mock('@/lib/emailService', () => ({
  HotelEmailService: {
    sendWelcomeEmail: vi.fn().mockResolvedValue({ success: true, message: 'Email sent' }),
  },
}));

vi.mock('@/lib/ntfy', () => ({
  ntfyStaffNotify: vi.fn().mockResolvedValue(undefined),
}));

// ─── Imports for mock control ─────────────────────────────────────────────────

import { useRooms } from '@/lib/queries/hooks/useRooms';
import { useGuests } from '@/lib/queries/hooks/useGuests';
import { useUpdateReservationStatus } from '@/lib/queries/hooks/useReservations';
import { HotelEmailService } from '@/lib/emailService';
import { ntfyStaffNotify } from '@/lib/ntfy';

const mockedUseRooms = vi.mocked(useRooms);
const mockedUseGuests = vi.mocked(useGuests);
const mockedUseUpdateReservationStatus = vi.mocked(useUpdateReservationStatus);

// ─── Test Helpers ─────────────────────────────────────────────────────────────

function createQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function createWrapper() {
  const qc = createQueryClient();
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

// A check-in date in the past so we get "Late Arrival" (>4h ago)
const pastCheckIn = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
// A check-in date in the future so we get "Early Arrival"
const futureCheckIn = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
// A check-in date within the last hour so it's "On Time"
const onTimeCheckIn = new Date(Date.now() - 30 * 60 * 1000).toISOString().slice(0, 10);

function makeReservation(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    room_id: 10,
    guest_id: 20,
    check_in_date: onTimeCheckIn,
    check_out_date: '2026-04-05',
    adults: 2,
    children_count: 0,
    number_of_guests: 2,
    status_id: 1,
    reservation_statuses: { code: 'confirmed' },
    booking_sources: { code: 'direct' },
    guests: {
      id: 20,
      first_name: 'John',
      last_name: 'Doe',
      full_name: 'John Doe',
      email: 'john@example.com',
      phone: '+385123456',
      nationality: 'Croatian',
      has_pets: false,
      is_vip: false,
      vip_level: 0,
    },
    labels: null,
    special_requests: '',
    has_pets: false,
    parking_required: false,
    internal_notes: null,
    booking_source_id: 1,
    company_id: null,
    pricing_tier_id: null,
    label_id: null,
    is_r1: false,
    checked_in_at: null,
    checked_out_at: null,
    created_at: '2026-03-01',
    updated_at: '2026-03-01',
    ...overrides,
  } as unknown as Parameters<typeof CheckInWorkflow>[0]['reservation'];
}

function makeRoom(overrides: Record<string, unknown> = {}) {
  return {
    id: 10,
    room_number: '101',
    floor: 1,
    room_type_id: 1,
    name_english: 'Double Room',
    name_croatian: 'Dvokrevetna soba',
    max_occupancy: 3,
    is_premium: false,
    is_clean: true,
    amenities: ['wifi', 'tv'],
    seasonal_rates: { A: 60, B: 70, C: 90, D: 110 },
    room_types: { code: 'D' },
    room_pricing: [],
    is_active: true,
    ...overrides,
  };
}

function makeGuest(overrides: Record<string, unknown> = {}) {
  return {
    id: 20,
    first_name: 'John',
    last_name: 'Doe',
    full_name: 'John Doe',
    display_name: 'John Doe',
    email: 'john@example.com',
    phone: '+385123456',
    nationality: 'Croatian',
    preferred_language: 'en',
    has_pets: false,
    is_vip: false,
    vip_level: 0,
    date_of_birth: null,
    passport_number: null,
    id_card_number: null,
    special_needs: null,
    total_stays: 1,
    emergency_contact_name: null,
    emergency_contact_phone: null,
    dietary_restrictions: null,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
    ...overrides,
  };
}

function setupMocks(
  options: {
    rooms?: ReturnType<typeof makeRoom>[];
    guests?: ReturnType<typeof makeGuest>[];
    isPending?: boolean;
  } = {}
) {
  const { rooms = [makeRoom()], guests = [makeGuest()], isPending = false } = options;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock return shape doesn't match full UseQueryResult
  mockedUseRooms.mockReturnValue({ data: rooms, isLoading: false, isError: false } as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockedUseGuests.mockReturnValue({ data: guests, isLoading: false, isError: false } as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockedUseUpdateReservationStatus.mockReturnValue({
    mutateAsync: mockMutateAsync,
    isPending,
  } as any);
}

function renderWorkflow(props: Partial<Parameters<typeof CheckInWorkflow>[0]> = {}) {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    reservation: makeReservation(),
  };
  const merged = { ...defaultProps, ...props };
  return {
    ...render(<CheckInWorkflow {...merged} />, { wrapper: createWrapper() }),
    onClose: merged.onClose,
  };
}

/**
 * Click each of the 4 required checklist steps to enable the Complete Check-In button.
 * The required steps are: Verify Guest Identity, Confirm Room Ready, Issue Room Key, Explain Amenities.
 * (Note Payment Status is auto-completed and not required.)
 */
async function completeAllRequiredSteps(user: ReturnType<typeof userEvent.setup>) {
  const requiredTitles = [
    'Verify Guest Identity',
    'Confirm Room Ready',
    'Issue Room Key',
    'Explain Amenities',
  ];
  for (const title of requiredTitles) {
    const stepButton = screen.getByText(title).closest('button');
    if (stepButton) {
      await user.click(stepButton);
    }
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CheckInWorkflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  // ── Rendering ──────────────────────────────────────────────────────────────

  describe('rendering', () => {
    it('renders nothing when isOpen is false', () => {
      const { container } = renderWorkflow({ isOpen: false });
      expect(container.textContent).toBe('');
    });

    it('renders nothing when reservation is null', () => {
      const { container } = renderWorkflow({ reservation: null });
      expect(container.textContent).toBe('');
    });

    it('renders nothing when guest is not found in guests list', () => {
      setupMocks({ guests: [] });
      const { container } = renderWorkflow();
      expect(container.textContent).toBe('');
    });

    it('renders nothing when room is not found in rooms list', () => {
      setupMocks({ rooms: [] });
      const { container } = renderWorkflow();
      expect(container.textContent).toBe('');
    });

    it('renders the dialog with guest information when open', () => {
      renderWorkflow();
      expect(screen.getByText('Check-In Workflow')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Guest Information')).toBeInTheDocument();
    });

    it('displays room number and name', () => {
      renderWorkflow();
      expect(screen.getByText('Room 101')).toBeInTheDocument();
      expect(screen.getByText('(Double Room)')).toBeInTheDocument();
    });

    it('displays guest contact info', () => {
      renderWorkflow();
      expect(screen.getByText(/john@example\.com/)).toBeInTheDocument();
      expect(screen.getByText(/\+385123456/)).toBeInTheDocument();
    });

    it('shows check-in checklist steps', () => {
      renderWorkflow();
      expect(screen.getByText('Verify Guest Identity')).toBeInTheDocument();
      expect(screen.getByText('Note Payment Status')).toBeInTheDocument();
      expect(screen.getByText('Confirm Room Ready')).toBeInTheDocument();
      expect(screen.getByText('Issue Room Key')).toBeInTheDocument();
      expect(screen.getByText('Explain Amenities')).toBeInTheDocument();
      expect(screen.getByText('Provide WiFi Information')).toBeInTheDocument();
    });

    it('shows number of guests and dates', () => {
      renderWorkflow();
      expect(screen.getByText('2 guests')).toBeInTheDocument();
    });

    it('displays children count when present', () => {
      renderWorkflow({ reservation: makeReservation({ children_count: 2 }) });
      expect(screen.getByText('2 children')).toBeInTheDocument();
    });
  });

  // ── VIP guest ──────────────────────────────────────────────────────────────

  describe('VIP guest', () => {
    it('shows VIP badge for VIP guests', () => {
      setupMocks({ guests: [makeGuest({ is_vip: true })] });
      renderWorkflow();
      expect(screen.getByText('VIP')).toBeInTheDocument();
    });

    it('shows parking step for VIP guests', () => {
      setupMocks({ guests: [makeGuest({ is_vip: true })] });
      renderWorkflow();
      expect(screen.getByText('Assign Parking')).toBeInTheDocument();
    });

    it('does not show parking step for non-VIP guests', () => {
      renderWorkflow();
      expect(screen.queryByText('Assign Parking')).not.toBeInTheDocument();
    });
  });

  // ── Arrival timing badges ──────────────────────────────────────────────────

  describe('arrival timing', () => {
    it('shows "Early Arrival" badge for future check-in date', () => {
      renderWorkflow({ reservation: makeReservation({ check_in_date: futureCheckIn }) });
      expect(screen.getAllByText('Early Arrival').length).toBeGreaterThanOrEqual(1);
      expect(
        screen.getByText('Guest arrived before official check-in time. Room may not be ready.')
      ).toBeInTheDocument();
    });

    it('shows "Late Arrival" badge for significantly past check-in date', () => {
      renderWorkflow({ reservation: makeReservation({ check_in_date: pastCheckIn }) });
      expect(screen.getAllByText('Late Arrival').length).toBeGreaterThanOrEqual(1);
      expect(
        screen.getByText(
          'Guest arrived significantly after expected check-in time. Consider calling guest.'
        )
      ).toBeInTheDocument();
    });
  });

  // ── Step toggling ──────────────────────────────────────────────────────────

  describe('step toggling', () => {
    it('toggles a step when clicked', async () => {
      const user = userEvent.setup();
      renderWorkflow();

      const identityStep = screen.getByText('Verify Guest Identity').closest('button')!;
      await user.click(identityStep);

      // After toggling, the step title remains but "Required" badge for this step should be gone
      expect(screen.getByText('Verify Guest Identity')).toBeInTheDocument();
    });

    it('shows "Check All" button', () => {
      renderWorkflow();
      expect(screen.getByText('Check All (Experienced Staff)')).toBeInTheDocument();
    });

    it('enables complete button after manually completing all required steps', async () => {
      const user = userEvent.setup();
      renderWorkflow();

      await completeAllRequiredSteps(user);

      await waitFor(() => {
        expect(
          screen.queryByText('Complete all required steps to proceed')
        ).not.toBeInTheDocument();
      });

      const btn = screen.getByRole('button', { name: /Complete Check-In/i });
      expect(btn).not.toBeDisabled();
    });
  });

  // ── Complete Check-In button state ─────────────────────────────────────────

  describe('complete check-in button', () => {
    it('disables the Complete Check-In button when required steps are incomplete', () => {
      renderWorkflow();
      const btn = screen.getByRole('button', { name: /Complete Check-In/i });
      expect(btn).toBeDisabled();
    });

    it('shows validation message when required steps are incomplete', () => {
      renderWorkflow();
      expect(screen.getByText('Complete all required steps to proceed')).toBeInTheDocument();
    });

    it('enables the Complete Check-In button after completing required steps', async () => {
      const user = userEvent.setup();
      renderWorkflow();

      await completeAllRequiredSteps(user);

      await waitFor(() => {
        const btn = screen.getByRole('button', { name: /Complete Check-In/i });
        expect(btn).not.toBeDisabled();
      });
    });

    it('disables button when mutation is pending', () => {
      setupMocks({ isPending: true });
      renderWorkflow();
      const btn = screen.getByRole('button', { name: /Processing/i });
      expect(btn).toBeDisabled();
    });
  });

  // ── Check-in submission ────────────────────────────────────────────────────

  describe('check-in submission', () => {
    it('calls updateReservationStatus and sends email on submission', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      renderWorkflow({ onClose });

      await completeAllRequiredSteps(user);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Complete Check-In/i })).not.toBeDisabled();
      });

      await user.click(screen.getByRole('button', { name: /Complete Check-In/i }));

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith({
          id: 1,
          status: 'checked-in',
        });
      });

      expect(HotelEmailService.sendWelcomeEmail).toHaveBeenCalled();
      expect(ntfyStaffNotify).toHaveBeenCalledWith(
        'Check-In - Room 101',
        'John Doe has checked in',
        'default',
        'hotel,checkin'
      );
    });

    it('shows success email feedback after check-in', async () => {
      const user = userEvent.setup();
      renderWorkflow();

      await completeAllRequiredSteps(user);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Complete Check-In/i })).not.toBeDisabled();
      });

      await user.click(screen.getByRole('button', { name: /Complete Check-In/i }));

      await waitFor(() => {
        expect(screen.getByText('Email sent')).toBeInTheDocument();
      });
    });

    it('shows warning when email fails', async () => {
      vi.mocked(HotelEmailService.sendWelcomeEmail).mockResolvedValueOnce({
        success: false,
        message: 'SMTP connection failed',
      });

      const user = userEvent.setup();
      renderWorkflow();

      await completeAllRequiredSteps(user);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Complete Check-In/i })).not.toBeDisabled();
      });

      await user.click(screen.getByRole('button', { name: /Complete Check-In/i }));

      await waitFor(() => {
        expect(screen.getByText('SMTP connection failed')).toBeInTheDocument();
      });
    });

    it('shows alert when updateReservationStatus throws', async () => {
      mockMutateAsync.mockRejectedValueOnce(new Error('DB error'));
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      const user = userEvent.setup();
      renderWorkflow();

      await completeAllRequiredSteps(user);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Complete Check-In/i })).not.toBeDisabled();
      });

      await user.click(screen.getByRole('button', { name: /Complete Check-In/i }));

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Failed to complete check-in. Please try again.');
      });

      alertSpy.mockRestore();
    });
  });

  // ── Check-in notes ─────────────────────────────────────────────────────────

  describe('check-in notes', () => {
    it('allows typing notes in the textarea', async () => {
      const user = userEvent.setup();
      renderWorkflow();

      const textarea = screen.getByPlaceholderText(/Add any notes about the check-in process/i);
      await user.type(textarea, 'Guest requested late checkout');
      expect(textarea).toHaveValue('Guest requested late checkout');
    });
  });

  // ── Cancel ─────────────────────────────────────────────────────────────────

  describe('cancel', () => {
    it('calls onClose when Cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      renderWorkflow({ onClose });

      await user.click(screen.getByRole('button', { name: /Cancel/i }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  // ── Progress bar ───────────────────────────────────────────────────────────

  describe('progress', () => {
    it('starts at partial progress (payment is auto-completed)', () => {
      renderWorkflow();
      // Payment step is always completed, so initial progress is 1/6 = ~17%
      expect(screen.getByText(/17% Complete/)).toBeInTheDocument();
    });

    it('increases progress as steps are completed', async () => {
      const user = userEvent.setup();
      renderWorkflow();

      // Complete one required step
      const identityStep = screen.getByText('Verify Guest Identity').closest('button')!;
      await user.click(identityStep);

      // 2/6 = 33%
      await waitFor(() => {
        expect(screen.getByText(/33% Complete/)).toBeInTheDocument();
      });
    });

    it('reaches 100% after completing all steps', async () => {
      const user = userEvent.setup();
      renderWorkflow();

      // Complete all 6 steps (4 required + wifi optional)
      await completeAllRequiredSteps(user);

      // Click optional steps too
      const wifiStep = screen.getByText('Provide WiFi Information').closest('button')!;
      await user.click(wifiStep);

      await waitFor(() => {
        expect(screen.getByText('100% Complete')).toBeInTheDocument();
      });
    });
  });
});
