import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VirtualRoomService } from './VirtualRoomService';
import { buildRoom } from '@/test/utils';

// Supabase client is imported by VirtualRoomService — mock it to prevent
// the auth auto-refresh timer from firing in jsdom during unit tests.
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: {
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
}));

// Reset the singleton between tests so config changes don't bleed
let service: VirtualRoomService;

beforeEach(() => {
  // Access via the public factory — same singleton is fine for pure method tests
  service = VirtualRoomService.getInstance();
});

describe('VirtualRoomService.isVirtualRoom', () => {
  it('returns true for a room on floor 5', () => {
    const room = buildRoom({ floor_number: 5, room_types: { code: 'double' } });
    expect(service.isVirtualRoom(room)).toBe(true);
  });

  it('returns true for a room with type UNALLOC regardless of floor', () => {
    const room = buildRoom({ floor_number: 1, room_types: { code: 'UNALLOC' } });
    expect(service.isVirtualRoom(room)).toBe(true);
  });

  it('returns false for a normal room on a regular floor', () => {
    const room = buildRoom({ floor_number: 2, room_types: { code: 'double' } });
    expect(service.isVirtualRoom(room)).toBe(false);
  });

  it('returns false for floor 4 (boundary below virtual floor)', () => {
    const room = buildRoom({ floor_number: 4, room_types: { code: 'double' } });
    expect(service.isVirtualRoom(room)).toBe(false);
  });
});

describe('VirtualRoomService.isVirtualRoomNumber', () => {
  it('returns true for the first virtual room number (501)', () => {
    expect(service.isVirtualRoomNumber('501')).toBe(true);
  });

  it('returns true for a mid-range virtual room number (550)', () => {
    expect(service.isVirtualRoomNumber('550')).toBe(true);
  });

  it('returns true for the last virtual room number (599)', () => {
    expect(service.isVirtualRoomNumber('599')).toBe(true);
  });

  it('returns false for a number just below the range (500)', () => {
    expect(service.isVirtualRoomNumber('500')).toBe(false);
  });

  it('returns false for a number just above the range (600)', () => {
    expect(service.isVirtualRoomNumber('600')).toBe(false);
  });

  it('returns false for a regular room number (101)', () => {
    expect(service.isVirtualRoomNumber('101')).toBe(false);
  });
});
