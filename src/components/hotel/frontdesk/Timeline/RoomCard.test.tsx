import { screen } from '@testing-library/react';
import { vi } from 'vitest';
import { buildRoom, buildGuest, buildReservation, renderWithClient } from '@/test/utils';
import { RoomCard } from './RoomCard';
import type { RoomCardProps } from './RoomCard';

// Mock supabase so useReservationCharges never hits the network
vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
}));

// Mock useReservationCharges to return predictable data
vi.mock('@/lib/queries/hooks/useReservationCharges', () => ({
  useReservationCharges: vi.fn(),
}));

import { useReservationCharges } from '@/lib/queries/hooks/useReservationCharges';

// ── Helpers ───────────────────────────────────────────────────────────────────

function mockCharges(total: number) {
  vi.mocked(useReservationCharges).mockReturnValue({
    data: total > 0 ? [{ id: 1, total, vat_rate: 13 } as never] : [],
    isLoading: false,
    isError: false,
  } as never);
}

const noop = () => {};

function renderCard(overrides: Partial<RoomCardProps> = {}) {
  const room = buildRoom({ room_number: '101', is_clean: true });
  const props: RoomCardProps = {
    room,
    reservation: undefined,
    guest: undefined,
    status: undefined,
    showFullLabelText: false,
    isClosingContextMenu: false,
    onRoomClick: noop,
    onContextMenu: noop,
    ...overrides,
  };
  return renderWithClient(<RoomCard {...props} />);
}

// ── Vacant room ───────────────────────────────────────────────────────────────

describe('RoomCard — vacant', () => {
  beforeEach(() => mockCharges(0));

  it('shows the room number', () => {
    renderCard();
    expect(screen.getByText('101')).toBeInTheDocument();
  });

  it('shows "Click to create booking" prompt', () => {
    renderCard();
    expect(screen.getByText(/click to create booking/i)).toBeInTheDocument();
  });

  it('does not show guest name', () => {
    renderCard();
    expect(screen.queryByText(/Matija/i)).not.toBeInTheDocument();
  });
});

// ── Occupied room ─────────────────────────────────────────────────────────────

describe('RoomCard — occupied', () => {
  const futureCheckOut = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  function occupiedCard(
    resOverrides = {},
    guestOverrides = {},
    extraProps: Partial<RoomCardProps> = {}
  ) {
    mockCharges(113);
    const guest = buildGuest({ display_name: 'Matija Sokol', has_pets: null, ...guestOverrides });
    const reservation = buildReservation({
      guest_id: guest.id,
      adults: 2,
      children_count: 0,
      has_pets: false,
      check_out_date: futureCheckOut,
      reservation_statuses: { code: 'confirmed' },
      ...resOverrides,
    });
    return renderCard({ reservation, guest, status: 'confirmed', ...extraProps });
  }

  it('shows guest display name', () => {
    occupiedCard();
    expect(screen.getByText('Matija Sokol')).toBeInTheDocument();
  });

  it('shows adult count', () => {
    occupiedCard({ adults: 2 });
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows children count when children > 0', () => {
    occupiedCard({ children_count: 1 });
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('hides children icon when children = 0', async () => {
    const { container } = occupiedCard({ children_count: 0 });
    // Baby icon renders as SVG — verify it's absent by checking aria or test-id absence
    expect(container.querySelector('[data-lucide="baby"]')).toBeNull();
  });

  it('shows pets icon when reservation has_pets is true', () => {
    const { container } = occupiedCard({ has_pets: true });
    // Dog icon is rendered as SVG with lucide class
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('shows days remaining as "N days"', () => {
    occupiedCard();
    expect(screen.getByText(/days/i)).toBeInTheDocument();
  });

  it('shows "Today" when checkout is today', () => {
    const today = new Date().toISOString().split('T')[0];
    occupiedCard({ check_out_date: today });
    expect(screen.getByText('Today')).toBeInTheDocument();
  });

  it('shows charge total from useReservationCharges', () => {
    occupiedCard();
    // 113 total → toFixed(0) = "113"
    expect(screen.getByText('€113')).toBeInTheDocument();
  });

  it('shows Payment Pending indicator for non-checked-out status', () => {
    occupiedCard({ reservation_statuses: { code: 'confirmed' } });
    expect(screen.getByTitle('Payment Pending')).toBeInTheDocument();
  });

  it('shows Payment Complete indicator when status is checked-out', () => {
    occupiedCard({ reservation_statuses: { code: 'checked-out' } }, {}, { status: 'checked-out' });
    expect(screen.getByTitle('Payment Complete')).toBeInTheDocument();
  });

  it('does not show "Click to create booking" when occupied', () => {
    occupiedCard();
    expect(screen.queryByText(/click to create booking/i)).not.toBeInTheDocument();
  });
});

// ── Interactions ──────────────────────────────────────────────────────────────

describe('RoomCard — interactions', () => {
  beforeEach(() => mockCharges(0));

  it('calls onRoomClick when clicked', async () => {
    const user = (await import('@testing-library/user-event')).default.setup();
    const onRoomClick = vi.fn();
    renderCard({ onRoomClick });
    await user.click(screen.getByRole('button'));
    expect(onRoomClick).toHaveBeenCalledOnce();
  });

  it('does not call onRoomClick when isClosingContextMenu is true', async () => {
    const user = (await import('@testing-library/user-event')).default.setup();
    const onRoomClick = vi.fn();
    renderCard({ onRoomClick, isClosingContextMenu: true });
    await user.click(screen.getByRole('button'));
    expect(onRoomClick).not.toHaveBeenCalled();
  });
});
