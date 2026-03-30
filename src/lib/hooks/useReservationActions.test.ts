import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useReservationActions, UseReservationActionsParams } from './useReservationActions';
import { buildReservation, buildRoom, buildGuest } from '@/test/utils';
import type { RoomChangeDialog } from '@/lib/hotel/services/HotelTimelineService';

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  optimisticMoveReservation: vi.fn(),
  optimisticUpdateReservation: vi.fn(),
  isVirtualRoom: vi.fn().mockReturnValue(false),
  convertToRealReservation: vi.fn(),
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
  notifyInfo: vi.fn(),
  notifyWarning: vi.fn(),
  generateCharges: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: new Proxy(
    {},
    {
      get: (_t, prop) => {
        if (prop === 'then') return undefined;
        return () =>
          new Proxy(
            {},
            {
              get: (_t2, p2) =>
                p2 === 'then' ? undefined : () => new Proxy({}, { get: () => vi.fn() }),
            }
          );
      },
    }
  ),
}));

vi.mock('@/lib/hotel/services/OptimisticUpdateService', () => ({
  OptimisticUpdateService: {
    getInstance: vi.fn(() => ({
      optimisticMoveReservation: mocks.optimisticMoveReservation,
      optimisticUpdateReservation: mocks.optimisticUpdateReservation,
    })),
  },
}));

vi.mock('@/lib/hotel/services/VirtualRoomService', () => ({
  virtualRoomService: {
    isVirtualRoom: mocks.isVirtualRoom,
    convertToRealReservation: mocks.convertToRealReservation,
    getVirtualRoomsWithReservations: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/lib/hotel/services/UnifiedPricingService', () => ({
  unifiedPricingService: {
    generateCharges: mocks.generateCharges,
  },
}));

vi.mock('@/lib/notifications', () => ({
  default: {
    success: mocks.notifySuccess,
    error: mocks.notifyError,
    info: mocks.notifyInfo,
    warning: mocks.notifyWarning,
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const CLOSED_DIALOG: RoomChangeDialog = {
  show: false,
  reservationId: 0,
  fromRoomId: 0,
  toRoomId: 0,
};

function makeParams(
  overrides: Partial<UseReservationActionsParams> = {}
): UseReservationActionsParams {
  return {
    reservations: [],
    rooms: [],
    guests: [],
    roomChangeDialog: CLOSED_DIALOG,
    selectedReservation: null,
    showRoomChangeDialog: vi.fn(),
    closeRoomChangeDialog: vi.fn(),
    updateReservation: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isVirtualRoom.mockReturnValue(false);
  mocks.optimisticMoveReservation.mockResolvedValue({ success: true });
  mocks.optimisticUpdateReservation.mockResolvedValue({ success: true });
});

describe('localReservations', () => {
  it('returns TQ data unchanged when no overrides exist', () => {
    const r1 = buildReservation({ id: 1 });
    const r2 = buildReservation({ id: 2 });
    const { result } = renderHook(() =>
      useReservationActions(makeParams({ reservations: [r1, r2] }))
    );
    expect(result.current.localReservations).toEqual([r1, r2]);
  });

  it('applies optimistic overrides after a successful move', async () => {
    const room1 = buildRoom({ id: 1 });
    const room2 = buildRoom({ id: 2 });
    const reservation = buildReservation({ id: 1, room_id: 1 });

    // Mock optimisticMoveReservation to call the updateFn immediately
    mocks.optimisticMoveReservation.mockImplementation(
      async (
        _id: number,
        _orig: unknown,
        _roomId: number,
        _ci: Date,
        _co: Date,
        updateFn: (id: number, updates: object) => void
      ) => {
        updateFn(1, { room_id: 2 });
        return { success: true };
      }
    );

    const params = makeParams({ reservations: [reservation], rooms: [room1, room2] });
    const { result } = renderHook(() => useReservationActions(params));

    await act(async () => {
      await result.current.handleMoveReservation(
        1,
        2,
        new Date('2026-04-01'),
        new Date('2026-04-05')
      );
    });

    expect(result.current.localReservations[0].room_id).toBe(2);
  });
});

describe('handleMoveReservation', () => {
  it('shows error notification and returns when room is not available', async () => {
    const room1 = buildRoom({ id: 1 });
    const room2 = buildRoom({ id: 2 });
    // Blocker occupies room2 during the same dates
    const blocker = buildReservation({
      id: 2,
      room_id: 2,
      check_in_date: '2026-04-01',
      check_out_date: '2026-04-05',
      reservation_statuses: { code: 'confirmed' },
    });
    const reservation = buildReservation({ id: 1, room_id: 1 });

    const { result } = renderHook(() =>
      useReservationActions(
        makeParams({ reservations: [reservation, blocker], rooms: [room1, room2] })
      )
    );

    await act(async () => {
      await result.current.handleMoveReservation(
        1,
        2,
        new Date('2026-04-01'),
        new Date('2026-04-05')
      );
    });

    expect(mocks.notifyError).toHaveBeenCalledWith('Move Blocked!', expect.any(String), 5);
    expect(mocks.optimisticMoveReservation).not.toHaveBeenCalled();
  });

  it('calls showRoomChangeDialog when room type changes (no optimistic call)', async () => {
    const room1 = buildRoom({ id: 1, room_types: { code: 'double' } });
    const room2 = buildRoom({ id: 2, room_types: { code: 'suite' } });
    const reservation = buildReservation({ id: 1, room_id: 1 });
    const showRoomChangeDialog = vi.fn();

    const { result } = renderHook(() =>
      useReservationActions(
        makeParams({
          reservations: [reservation],
          rooms: [room1, room2],
          showRoomChangeDialog,
        })
      )
    );

    await act(async () => {
      await result.current.handleMoveReservation(
        1,
        2,
        new Date('2026-04-10'),
        new Date('2026-04-15')
      );
    });

    expect(showRoomChangeDialog).toHaveBeenCalledWith(1, 1, 2);
    expect(mocks.optimisticMoveReservation).not.toHaveBeenCalled();
  });

  it('calls optimisticMoveReservation and shows success on valid same-type move', async () => {
    const room1 = buildRoom({ id: 1, room_types: { code: 'double' } });
    const room2 = buildRoom({ id: 2, room_types: { code: 'double' } });
    const guest = buildGuest({ id: 10, display_name: 'Jane Doe' });
    const reservation = buildReservation({ id: 1, room_id: 1, guest_id: 10 });

    const { result } = renderHook(() =>
      useReservationActions(
        makeParams({
          reservations: [reservation],
          rooms: [room1, room2],
          guests: [guest],
        })
      )
    );

    await act(async () => {
      await result.current.handleMoveReservation(
        1,
        2,
        new Date('2026-04-10'),
        new Date('2026-04-15')
      );
    });

    expect(mocks.optimisticMoveReservation).toHaveBeenCalledWith(
      1,
      reservation,
      2,
      expect.any(Date),
      expect.any(Date),
      expect.any(Function),
      expect.any(Function)
    );
    expect(mocks.notifySuccess).toHaveBeenCalledWith(
      'Reservation Moved Successfully!',
      expect.stringContaining('Jane Doe'),
      5
    );
  });

  it('calls optimisticUpdateReservation with status: confirmed when moving virtual → real', async () => {
    // Both rooms must share the same type code so the room-type-change guard is not triggered.
    // isVirtualRoom() is what distinguishes them (mocked below).
    const virtualRoom = buildRoom({ id: 1, room_types: { code: 'double' } });
    const realRoom = buildRoom({ id: 2, room_types: { code: 'double' } });
    const guest = buildGuest({ id: 10 });
    const reservation = buildReservation({ id: 1, room_id: 1, guest_id: 10 });

    // First call returns true (virtualRoom), second returns false (realRoom)
    mocks.isVirtualRoom.mockImplementation((room: { id: number }) => room.id === 1);

    const { result } = renderHook(() =>
      useReservationActions(
        makeParams({
          reservations: [reservation],
          rooms: [virtualRoom, realRoom],
          guests: [guest],
        })
      )
    );

    await act(async () => {
      await result.current.handleMoveReservation(
        1,
        2,
        new Date('2026-04-10'),
        new Date('2026-04-15')
      );
    });

    expect(mocks.optimisticUpdateReservation).toHaveBeenCalledWith(
      1,
      reservation,
      expect.objectContaining({ status: 'confirmed', room_id: 2 }),
      expect.any(Function),
      expect.any(Function)
    );
  });

  it('shows error notification when optimistic service returns { success: false }', async () => {
    mocks.optimisticMoveReservation.mockResolvedValue({ success: false, error: 'Server error' });

    const room1 = buildRoom({ id: 1, room_types: { code: 'double' } });
    const room2 = buildRoom({ id: 2, room_types: { code: 'double' } });
    const reservation = buildReservation({ id: 1, room_id: 1 });

    const { result } = renderHook(() =>
      useReservationActions(makeParams({ reservations: [reservation], rooms: [room1, room2] }))
    );

    await act(async () => {
      await result.current.handleMoveReservation(
        1,
        2,
        new Date('2026-04-10'),
        new Date('2026-04-15')
      );
    });

    expect(mocks.notifyError).toHaveBeenCalledWith('Move Failed', 'Server error', 4);
  });

  it('shows generic error when reservation ID not found', async () => {
    const { result } = renderHook(() => useReservationActions(makeParams({ reservations: [] })));

    await act(async () => {
      await result.current.handleMoveReservation(
        999,
        2,
        new Date('2026-04-10'),
        new Date('2026-04-15')
      );
    });

    expect(mocks.notifyError).toHaveBeenCalledWith(
      'Failed to Move Reservation',
      expect.any(String),
      5
    );
  });
});

describe('handleMoveReservationArrow', () => {
  it('shows info notification when selectedReservation is null', async () => {
    const { result } = renderHook(() =>
      useReservationActions(makeParams({ selectedReservation: null }))
    );

    await act(async () => {
      await result.current.handleMoveReservationArrow('left');
    });

    expect(mocks.notifyInfo).toHaveBeenCalledWith('No Selection', expect.any(String), 3);
    expect(mocks.optimisticMoveReservation).not.toHaveBeenCalled();
  });

  it('delegates with date −1 day for left and +1 day for right', async () => {
    const room = buildRoom({ id: 1, room_types: { code: 'double' } });
    const reservation = buildReservation({
      id: 1,
      room_id: 1,
      check_in_date: '2026-04-05',
      check_out_date: '2026-04-10',
    });

    const { result } = renderHook(() =>
      useReservationActions(
        makeParams({
          reservations: [reservation],
          rooms: [room],
          selectedReservation: reservation,
        })
      )
    );

    await act(async () => {
      await result.current.handleMoveReservationArrow('right');
    });

    expect(mocks.optimisticMoveReservation).toHaveBeenCalledWith(
      1,
      reservation,
      1,
      new Date('2026-04-06'),
      new Date('2026-04-11'),
      expect.any(Function),
      expect.any(Function)
    );

    vi.clearAllMocks();
    mocks.optimisticMoveReservation.mockResolvedValue({ success: true });

    await act(async () => {
      await result.current.handleMoveReservationArrow('left');
    });

    expect(mocks.optimisticMoveReservation).toHaveBeenCalledWith(
      1,
      reservation,
      1,
      new Date('2026-04-04'),
      new Date('2026-04-09'),
      expect.any(Function),
      expect.any(Function)
    );
  });
});

describe('handleConfirmRoomChange', () => {
  it('returns early when roomChangeDialog.show is false', async () => {
    const { result } = renderHook(() =>
      useReservationActions(makeParams({ roomChangeDialog: CLOSED_DIALOG }))
    );

    await act(async () => {
      await result.current.handleConfirmRoomChange();
    });

    expect(mocks.optimisticUpdateReservation).not.toHaveBeenCalled();
  });

  it('shows "Room Change Successful!" and calls closeRoomChangeDialog on success', async () => {
    const room1 = buildRoom({ id: 1 });
    const room2 = buildRoom({ id: 2 });
    const guest = buildGuest({ id: 10, display_name: 'John' });
    const reservation = buildReservation({ id: 1, room_id: 1, guest_id: 10 });
    const closeRoomChangeDialog = vi.fn();

    const dialog: RoomChangeDialog = {
      show: true,
      reservationId: 1,
      fromRoomId: 1,
      toRoomId: 2,
    };

    const { result } = renderHook(() =>
      useReservationActions(
        makeParams({
          reservations: [reservation],
          rooms: [room1, room2],
          guests: [guest],
          roomChangeDialog: dialog,
          closeRoomChangeDialog,
        })
      )
    );

    await act(async () => {
      await result.current.handleConfirmRoomChange();
    });

    expect(mocks.notifySuccess).toHaveBeenCalledWith(
      'Room Change Successful!',
      expect.any(String),
      5
    );
    expect(closeRoomChangeDialog).toHaveBeenCalled();
  });

  it('shows error notification when optimistic service fails', async () => {
    mocks.optimisticUpdateReservation.mockResolvedValue({
      success: false,
      error: 'DB error',
    });

    const room1 = buildRoom({ id: 1 });
    const room2 = buildRoom({ id: 2 });
    const reservation = buildReservation({ id: 1, room_id: 1 });
    const dialog: RoomChangeDialog = {
      show: true,
      reservationId: 1,
      fromRoomId: 1,
      toRoomId: 2,
    };

    const { result } = renderHook(() =>
      useReservationActions(
        makeParams({
          reservations: [reservation],
          rooms: [room1, room2],
          roomChangeDialog: dialog,
        })
      )
    );

    await act(async () => {
      await result.current.handleConfirmRoomChange();
    });

    expect(mocks.notifyError).toHaveBeenCalledWith('Move Failed!', 'DB error', 5);
  });
});

describe('handleFreeUpgrade', () => {
  it('returns early when roomChangeDialog.show is false', async () => {
    const { result } = renderHook(() =>
      useReservationActions(makeParams({ roomChangeDialog: CLOSED_DIALOG }))
    );

    await act(async () => {
      await result.current.handleFreeUpgrade();
    });

    expect(mocks.optimisticUpdateReservation).not.toHaveBeenCalled();
  });

  it('shows "Free Upgrade Applied!" and calls closeRoomChangeDialog on success', async () => {
    const room1 = buildRoom({ id: 1 });
    const room2 = buildRoom({ id: 2 });
    const guest = buildGuest({ id: 10, display_name: 'Maria' });
    const reservation = buildReservation({ id: 1, room_id: 1, guest_id: 10 });
    const closeRoomChangeDialog = vi.fn();

    const dialog: RoomChangeDialog = {
      show: true,
      reservationId: 1,
      fromRoomId: 1,
      toRoomId: 2,
    };

    const { result } = renderHook(() =>
      useReservationActions(
        makeParams({
          reservations: [reservation],
          rooms: [room1, room2],
          guests: [guest],
          roomChangeDialog: dialog,
          closeRoomChangeDialog,
        })
      )
    );

    await act(async () => {
      await result.current.handleFreeUpgrade();
    });

    expect(mocks.notifySuccess).toHaveBeenCalledWith(
      'Free Upgrade Applied!',
      expect.stringContaining('Maria'),
      7
    );
    expect(closeRoomChangeDialog).toHaveBeenCalled();
  });
});

describe('handleResizeReservation', () => {
  it('shows error when resulting duration is less than 1 day', async () => {
    const reservation = buildReservation({
      id: 1,
      room_id: 1,
      check_in_date: '2026-04-05',
      check_out_date: '2026-04-06',
    });

    const { result } = renderHook(() =>
      useReservationActions(makeParams({ reservations: [reservation] }))
    );

    // Shrink end to same as start → 0 days
    await act(async () => {
      await result.current.handleResizeReservation(1, 'end', new Date('2026-04-05'));
    });

    expect(mocks.notifyError).toHaveBeenCalledWith(
      'Invalid Reservation Length',
      expect.any(String),
      3
    );
    expect(mocks.optimisticUpdateReservation).not.toHaveBeenCalled();
  });

  it('shows error when resized dates conflict with another reservation in the same room', async () => {
    const reservation = buildReservation({
      id: 1,
      room_id: 1,
      check_in_date: '2026-04-01',
      check_out_date: '2026-04-05',
    });
    const blocker = buildReservation({
      id: 2,
      room_id: 1,
      check_in_date: '2026-04-08',
      check_out_date: '2026-04-12',
    });

    const { result } = renderHook(() =>
      useReservationActions(makeParams({ reservations: [reservation, blocker] }))
    );

    // Extend end to overlap blocker
    await act(async () => {
      await result.current.handleResizeReservation(1, 'end', new Date('2026-04-10'));
    });

    expect(mocks.notifyError).toHaveBeenCalledWith('Booking Conflict', expect.any(String), 4);
    expect(mocks.optimisticUpdateReservation).not.toHaveBeenCalled();
  });

  it('calls optimisticUpdateReservation with correct dates and shows success', async () => {
    const room = buildRoom({ id: 1 });
    const guest = buildGuest({ id: 10, display_name: 'Ana' });
    const reservation = buildReservation({
      id: 1,
      room_id: 1,
      guest_id: 10,
      check_in_date: '2026-04-01',
      check_out_date: '2026-04-05',
    });

    const { result } = renderHook(() =>
      useReservationActions(
        makeParams({ reservations: [reservation], rooms: [room], guests: [guest] })
      )
    );

    await act(async () => {
      await result.current.handleResizeReservation(1, 'end', new Date('2026-04-08'));
    });

    expect(mocks.optimisticUpdateReservation).toHaveBeenCalledWith(
      1,
      reservation,
      expect.objectContaining({
        check_in_date: '2026-04-01',
        check_out_date: '2026-04-08',
      }),
      expect.any(Function),
      expect.any(Function)
    );
    expect(mocks.notifySuccess).toHaveBeenCalledWith('Reservation Updated!', expect.any(String), 6);
  });
});

describe('handleDrinksOrderComplete', () => {
  it('calls updateReservation with notes string containing item names and total', async () => {
    const updateReservation = vi.fn().mockResolvedValue(undefined);
    const reservation = buildReservation({ id: 1, room_id: 1, internal_notes: '' });
    const orderItems = [
      {
        id: 'item-1',
        itemId: 1,
        itemName: 'Cola',
        category: 'Drinks',
        price: 3,
        quantity: 2,
        totalPrice: 6,
        unit: 'pcs',
        availableStock: 10,
      },
      {
        id: 'item-2',
        itemId: 2,
        itemName: 'Beer',
        category: 'Drinks',
        price: 5,
        quantity: 1,
        totalPrice: 5,
        unit: 'pcs',
        availableStock: 10,
      },
    ];

    const { result } = renderHook(() =>
      useReservationActions(makeParams({ reservations: [reservation], updateReservation }))
    );

    await act(async () => {
      await result.current.handleDrinksOrderComplete(reservation, orderItems, 11);
    });

    expect(updateReservation).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        internal_notes: expect.stringContaining('Cola'),
      })
    );
    expect(updateReservation).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        internal_notes: expect.stringContaining('€11.00'),
      })
    );
    expect(mocks.notifySuccess).toHaveBeenCalledWith(
      'Room Service Added to Bill',
      expect.stringContaining('€11.00'),
      4
    );
  });

  it('shows error notification when updateReservation throws', async () => {
    const updateReservation = vi.fn().mockRejectedValue(new Error('DB error'));
    const reservation = buildReservation({ id: 1, room_id: 1 });

    const { result } = renderHook(() => useReservationActions(makeParams({ updateReservation })));

    await act(async () => {
      await result.current.handleDrinksOrderComplete(reservation, [], 0);
    });

    expect(mocks.notifyError).toHaveBeenCalledWith(
      'Failed to Add Room Service',
      expect.any(String),
      5
    );
  });
});
