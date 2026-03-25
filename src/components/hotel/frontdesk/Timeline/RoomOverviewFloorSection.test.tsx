import { screen } from '@testing-library/react';
import { vi } from 'vitest';
import { buildRoom, buildGuest, buildReservation, renderWithClient } from '@/test/utils';
import { RoomOverviewFloorSection } from './RoomOverviewFloorSection';
import type { OccupancyData } from '../../../../lib/hotel/services/HotelTimelineService';

vi.mock('@/lib/supabase', () => ({
  supabase: { from: vi.fn() },
}));

vi.mock('@/lib/queries/hooks/useReservationCharges', () => ({
  useReservationCharges: vi.fn().mockReturnValue({ data: [], isLoading: false, isError: false }),
}));

// ReservationContextMenu makes complex supabase calls — stub it out
vi.mock('./ReservationContextMenu', () => ({
  ReservationContextMenu: () => null,
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const noop = () => {};

function makeRooms(count: number) {
  return Array.from({ length: count }, (_, i) =>
    buildRoom({ room_number: `10${i + 1}`, floor_number: 2, is_clean: true })
  );
}

function render(
  props: Partial<Parameters<typeof RoomOverviewFloorSection>[0]> & {
    rooms?: ReturnType<typeof makeRooms>;
    occupancyData?: OccupancyData;
  } = {}
) {
  const rooms = props.rooms ?? makeRooms(3);
  const occupancyData: OccupancyData = props.occupancyData ?? {};

  return renderWithClient(
    <RoomOverviewFloorSection
      floor={2}
      rooms={rooms}
      guests={[]}
      isExpanded={true}
      onToggle={noop}
      occupancyData={occupancyData}
      onRoomClick={noop}
      {...props}
    />
  );
}

// ── Header ────────────────────────────────────────────────────────────────────

describe('RoomOverviewFloorSection — header', () => {
  it('shows the floor number', () => {
    render();
    expect(screen.getByText('Floor 2')).toBeInTheDocument();
  });

  it('shows "Rooftop Premium" for floor 4', () => {
    render({ floor: 4 });
    expect(screen.getByText('Rooftop Premium')).toBeInTheDocument();
  });

  it('shows total room count', () => {
    render({ rooms: makeRooms(6) });
    expect(screen.getByText('6 rooms')).toBeInTheDocument();
  });

  it('shows 0% occupancy when no rooms are occupied', () => {
    render({ rooms: makeRooms(4), occupancyData: {} });
    expect(screen.getByText('0% occupied')).toBeInTheDocument();
  });

  it('shows correct occupancy percentage', () => {
    const rooms = makeRooms(4);
    const guest = buildGuest();
    const reservation = buildReservation({ guest_id: guest.id });
    const occupancyData: OccupancyData = {
      [rooms[0].id.toString()]: { status: 'confirmed', reservation, guest },
    };
    render({ rooms, guests: [guest], occupancyData });
    // 1/4 = 25%
    expect(screen.getByText('25% occupied')).toBeInTheDocument();
  });
});

// ── Expand / collapse ─────────────────────────────────────────────────────────

describe('RoomOverviewFloorSection — expand/collapse', () => {
  it('shows room cards when expanded', () => {
    const rooms = makeRooms(2);
    render({ rooms, isExpanded: true });
    expect(screen.getByTestId(`room-card-${rooms[0].room_number}`)).toBeInTheDocument();
    expect(screen.getByTestId(`room-card-${rooms[1].room_number}`)).toBeInTheDocument();
  });

  it('hides room cards when collapsed', () => {
    const rooms = makeRooms(2);
    render({ rooms, isExpanded: false });
    expect(screen.queryByTestId(`room-card-${rooms[0].room_number}`)).not.toBeInTheDocument();
  });

  it('calls onToggle when header is clicked', async () => {
    const user = (await import('@testing-library/user-event')).default.setup();
    const onToggle = vi.fn();
    render({ onToggle });
    await user.click(screen.getByText('Floor 2'));
    expect(onToggle).toHaveBeenCalledOnce();
  });
});

// ── Room cards ────────────────────────────────────────────────────────────────

describe('RoomOverviewFloorSection — room cards', () => {
  it('renders a card for every room', () => {
    const rooms = makeRooms(5);
    render({ rooms, isExpanded: true });
    for (const room of rooms) {
      expect(screen.getByTestId(`room-card-${room.room_number}`)).toBeInTheDocument();
    }
  });

  it('shows guest name on occupied cards', () => {
    const rooms = makeRooms(2);
    const guest = buildGuest({ display_name: 'Ivan Horvat' });
    const reservation = buildReservation({ guest_id: guest.id });
    const occupancyData: OccupancyData = {
      [rooms[0].id.toString()]: { status: 'confirmed', reservation, guest },
    };
    render({ rooms, guests: [guest], occupancyData, isExpanded: true });
    expect(screen.getByText('Ivan Horvat')).toBeInTheDocument();
  });

  it('shows "Click to create booking" on vacant cards', () => {
    const rooms = makeRooms(1);
    render({ rooms, isExpanded: true });
    expect(screen.getByText(/click to create booking/i)).toBeInTheDocument();
  });
});
