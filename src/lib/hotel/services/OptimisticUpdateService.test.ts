import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OptimisticUpdateService } from './OptimisticUpdateService';
import type { Reservation } from '@/lib/queries/hooks/useReservations';

// Reset singleton between tests
function resetSingleton() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- accessing private static for test reset
  (OptimisticUpdateService as any).instance = undefined;
}

function makeReservation(overrides: Partial<Reservation> = {}): Reservation {
  return {
    id: 1,
    room_id: 101,
    guest_id: 10,
    check_in_date: '2026-04-01',
    check_out_date: '2026-04-05',
    adults: 2,
    children_count: 0,
    number_of_guests: 2,
    status_id: 1,
    booking_source_id: 1,
    special_requests: null,
    internal_notes: null,
    has_pets: false,
    parking_required: false,
    checked_in_at: null,
    checked_out_at: null,
    created_at: '2026-03-01T00:00:00Z',
    updated_at: '2026-03-01T00:00:00Z',
    company_id: null,
    pricing_tier_id: null,
    label_id: null,
    is_r1: false,
    reservation_statuses: { code: 'confirmed' },
    booking_sources: { code: 'direct' },
    guests: {
      id: 10,
      first_name: 'John',
      last_name: 'Doe',
      full_name: 'John Doe',
      email: 'john@example.com',
      phone: null,
      nationality: null,
      has_pets: false,
      is_vip: false,
      vip_level: 0,
    },
    labels: null,
    ...overrides,
  } as unknown as Reservation;
}

describe('OptimisticUpdateService', () => {
  let service: OptimisticUpdateService;

  beforeEach(() => {
    vi.useFakeTimers();
    resetSingleton();
    service = OptimisticUpdateService.getInstance();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getInstance', () => {
    it('returns the same instance on multiple calls', () => {
      const a = OptimisticUpdateService.getInstance();
      const b = OptimisticUpdateService.getInstance();
      expect(a).toBe(b);
    });
  });

  describe('executeOptimisticUpdate', () => {
    it('calls optimisticUpdate immediately and returns data on success', async () => {
      const optimisticUpdate = vi.fn();
      const rollbackUpdate = vi.fn();
      const serverUpdate = vi.fn().mockResolvedValue({ saved: true });

      const result = await service.executeOptimisticUpdate('op-1', {
        type: 'update',
        entity: 'reservation',
        originalData: { old: true },
        newData: { new: true },
        optimisticUpdate,
        rollbackUpdate,
        serverUpdate,
      });

      expect(optimisticUpdate).toHaveBeenCalledOnce();
      expect(rollbackUpdate).not.toHaveBeenCalled();
      expect(result).toEqual({ success: true, data: { saved: true } });
    });

    it('cleans up pending operations after successful update', async () => {
      await service.executeOptimisticUpdate('op-1', {
        type: 'create',
        entity: 'reservation',
        optimisticUpdate: vi.fn(),
        rollbackUpdate: vi.fn(),
        serverUpdate: vi.fn().mockResolvedValue(undefined),
      });

      expect(service.getPendingOperations()).toHaveLength(0);
    });

    it('calls rollbackUpdate and returns error when server fails', async () => {
      const rollbackUpdate = vi.fn();
      const serverUpdate = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await service.executeOptimisticUpdate('op-fail', {
        type: 'update',
        entity: 'reservation',
        optimisticUpdate: vi.fn(),
        rollbackUpdate,
        serverUpdate,
      });

      expect(rollbackUpdate).toHaveBeenCalledOnce();
      expect(result).toEqual({ success: false, error: 'Network error' });
    });

    it('returns generic error message for non-Error throws', async () => {
      const result = await service.executeOptimisticUpdate('op-throw', {
        type: 'update',
        entity: 'reservation',
        optimisticUpdate: vi.fn(),
        rollbackUpdate: vi.fn(),
        serverUpdate: vi.fn().mockRejectedValue('string error'),
      });

      expect(result.error).toBe('Update failed');
    });

    it('keeps rolled-back operation in map for 5 seconds then cleans up', async () => {
      await service.executeOptimisticUpdate('op-cleanup', {
        type: 'delete',
        entity: 'reservation',
        optimisticUpdate: vi.fn(),
        rollbackUpdate: vi.fn(),
        serverUpdate: vi.fn().mockRejectedValue(new Error('fail')),
      });

      // Operation should still be present (rolled_back status)
      expect(service.getPendingOperations()).toHaveLength(1);
      expect(service.getPendingOperations()[0].status).toBe('rolled_back');

      // Advance past the 5-second cleanup timeout
      vi.advanceTimersByTime(5001);

      expect(service.getPendingOperations()).toHaveLength(0);
    });
  });

  describe('optimisticMoveReservation', () => {
    it('applies move immediately and rolls back on failure', async () => {
      const reservation = makeReservation();
      const stateUpdates: Array<{ id: number; updates: Record<string, unknown> }> = [];

      const updateState = vi.fn((id: number, updates: Record<string, unknown>) => {
        stateUpdates.push({ id, updates });
      });

      const result = await service.optimisticMoveReservation(
        1,
        reservation,
        202,
        new Date('2026-05-01'),
        new Date('2026-05-04'),
        updateState,
        vi.fn().mockRejectedValue(new Error('Server down'))
      );

      expect(result.success).toBe(false);
      // First call: optimistic update with new values
      expect(updateState).toHaveBeenCalledTimes(2);
      expect(stateUpdates[0].updates).toMatchObject({
        room_id: 202,
        check_in_date: '2026-05-01',
        check_out_date: '2026-05-04',
      });
      // Second call: rollback with original values
      expect(stateUpdates[1].updates).toMatchObject({
        room_id: reservation.room_id,
        check_in_date: reservation.check_in_date,
        check_out_date: reservation.check_out_date,
      });
    });

    it('succeeds when server update resolves', async () => {
      const reservation = makeReservation();
      const updateState = vi.fn();

      const result = await service.optimisticMoveReservation(
        1,
        reservation,
        202,
        new Date('2026-05-01'),
        new Date('2026-05-04'),
        updateState,
        vi.fn().mockResolvedValue(undefined)
      );

      expect(result.success).toBe(true);
      expect(updateState).toHaveBeenCalledOnce(); // only optimistic, no rollback
    });
  });

  describe('optimisticCreateReservation', () => {
    it('adds to state then removes on failure', async () => {
      const tempRes = makeReservation({ id: 999 });
      const addToState = vi.fn();
      const removeFromState = vi.fn();

      const result = await service.optimisticCreateReservation(
        tempRes,
        addToState,
        removeFromState,
        vi.fn().mockRejectedValue(new Error('Create failed'))
      );

      expect(result.success).toBe(false);
      expect(addToState).toHaveBeenCalledWith(tempRes);
      expect(removeFromState).toHaveBeenCalledWith(999);
    });

    it('returns created reservation on success', async () => {
      const tempRes = makeReservation({ id: 999 });
      const createdRes = makeReservation({ id: 1000 });

      const result = await service.optimisticCreateReservation(
        tempRes,
        vi.fn(),
        vi.fn(),
        vi.fn().mockResolvedValue(createdRes)
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(createdRes);
    });
  });

  describe('optimisticDeleteReservation', () => {
    it('removes from state then re-adds on failure', async () => {
      const reservation = makeReservation();
      const removeFromState = vi.fn();
      const addToState = vi.fn();

      await service.optimisticDeleteReservation(
        reservation,
        removeFromState,
        addToState,
        vi.fn().mockRejectedValue(new Error('Delete failed'))
      );

      expect(removeFromState).toHaveBeenCalledWith(reservation.id);
      expect(addToState).toHaveBeenCalledWith(reservation);
    });
  });

  describe('forceRollback', () => {
    it('rolls back a pending operation and returns true', async () => {
      const rollback = vi.fn();
      // Start an operation that won't resolve yet
      const neverResolve = new Promise<void>(() => {});
      const promise = service.executeOptimisticUpdate('op-force', {
        type: 'update',
        entity: 'reservation',
        optimisticUpdate: vi.fn(),
        rollbackUpdate: rollback,
        serverUpdate: () => neverResolve,
      });

      // Operation is pending while server update is in progress
      // We need a microtask to let the optimisticUpdate call happen
      await vi.advanceTimersByTimeAsync(0);

      const pending = service.getOperationsByStatus('pending');
      expect(pending).toHaveLength(1);

      const result = service.forceRollback('op-force');
      expect(result).toBe(true);
      expect(rollback).toHaveBeenCalledOnce();
      expect(service.getPendingOperations()).toHaveLength(0);

      // Clean up the dangling promise (it will resolve/reject eventually)
      void promise.catch(() => {});
    });

    it('returns false for non-existent operation', () => {
      expect(service.forceRollback('nope')).toBe(false);
    });

    it('returns false for already completed operations', async () => {
      await service.executeOptimisticUpdate('op-done', {
        type: 'update',
        entity: 'reservation',
        optimisticUpdate: vi.fn(),
        rollbackUpdate: vi.fn(),
        serverUpdate: vi.fn().mockResolvedValue(undefined),
      });

      expect(service.forceRollback('op-done')).toBe(false);
    });
  });

  describe('rollbackAllPending', () => {
    it('rolls back all pending operations', async () => {
      const rollback1 = vi.fn();
      const rollback2 = vi.fn();
      const neverResolve = new Promise<void>(() => {});

      const p1 = service.executeOptimisticUpdate('op-a', {
        type: 'update',
        entity: 'reservation',
        optimisticUpdate: vi.fn(),
        rollbackUpdate: rollback1,
        serverUpdate: () => neverResolve,
      });

      const p2 = service.executeOptimisticUpdate('op-b', {
        type: 'delete',
        entity: 'reservation',
        optimisticUpdate: vi.fn(),
        rollbackUpdate: rollback2,
        serverUpdate: () => neverResolve,
      });

      await vi.advanceTimersByTimeAsync(0);

      const result = service.rollbackAllPending();
      expect(result.success).toBe(true);
      expect(result.operationsRolledBack).toBe(2);
      expect(rollback1).toHaveBeenCalledOnce();
      expect(rollback2).toHaveBeenCalledOnce();

      void p1.catch(() => {});
      void p2.catch(() => {});
    });

    it('returns zero when nothing is pending', () => {
      const result = service.rollbackAllPending();
      expect(result.success).toBe(true);
      expect(result.operationsRolledBack).toBe(0);
    });
  });

  describe('clearCompletedOperations', () => {
    it('removes success and rolled_back operations', async () => {
      // Create a successful operation (auto-cleaned on success, so won't appear)
      // Create a failed one that becomes rolled_back
      await service.executeOptimisticUpdate('op-rb', {
        type: 'update',
        entity: 'reservation',
        optimisticUpdate: vi.fn(),
        rollbackUpdate: vi.fn(),
        serverUpdate: vi.fn().mockRejectedValue(new Error('fail')),
      });

      expect(service.getPendingOperations()).toHaveLength(1);
      const cleared = service.clearCompletedOperations();
      expect(cleared).toBe(1);
      expect(service.getPendingOperations()).toHaveLength(0);
    });
  });

  describe('getStatistics', () => {
    it('returns correct counts for mixed statuses', async () => {
      // Add a rolled-back operation
      await service.executeOptimisticUpdate('op-rb', {
        type: 'delete',
        entity: 'reservation',
        optimisticUpdate: vi.fn(),
        rollbackUpdate: vi.fn(),
        serverUpdate: vi.fn().mockRejectedValue(new Error('fail')),
      });

      // Add a pending operation
      const neverResolve = new Promise<void>(() => {});
      const p = service.executeOptimisticUpdate('op-pending', {
        type: 'create',
        entity: 'reservation',
        optimisticUpdate: vi.fn(),
        rollbackUpdate: vi.fn(),
        serverUpdate: () => neverResolve,
      });
      await vi.advanceTimersByTimeAsync(0);

      const stats = service.getStatistics();
      expect(stats.total).toBe(2);
      expect(stats.pending).toBe(1);
      expect(stats.rolledBack).toBe(1);
      expect(stats.oldestOperation).toBeGreaterThan(0);

      void p.catch(() => {});
    });

    it('returns zero stats when empty', () => {
      const stats = service.getStatistics();
      expect(stats).toEqual({
        total: 0,
        pending: 0,
        success: 0,
        failed: 0,
        rolledBack: 0,
        oldestOperation: 0,
      });
    });
  });
});
