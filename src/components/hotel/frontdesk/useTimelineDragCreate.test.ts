import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useTimelineDragCreate } from './useTimelineDragCreate';
import { buildRoom } from '@/test/utils';

function makeDate(dayOffset: number) {
  const d = new Date(2026, 5, 1); // June 1 2026
  d.setDate(d.getDate() + dayOffset);
  return d;
}

const room101 = buildRoom({ id: 101, room_number: '101' });
const room102 = buildRoom({ id: 102, room_number: '102' });
const rooms = [room101, room102];

function setup(handleRoomClick = vi.fn()) {
  const result = renderHook(() => useTimelineDragCreate({ rooms, handleRoomClick }));
  return { ...result, handleRoomClick };
}

// ── Enable / Disable ──────────────────────────────────────────────────────────

describe('useTimelineDragCreate', () => {
  describe('enable / disable', () => {
    it('starts disabled', () => {
      const { result } = setup();
      expect(result.current.state.isEnabled).toBe(false);
      expect(result.current.state.isSelecting).toBe(false);
    });

    it('enable sets isEnabled true', () => {
      const { result } = setup();
      act(() => result.current.actions.enable());
      expect(result.current.state.isEnabled).toBe(true);
    });

    it('disable resets all state', () => {
      const { result } = setup();
      act(() => result.current.actions.enable());
      act(() => result.current.handleCellClick('101', makeDate(0), false)); // start
      expect(result.current.state.isSelecting).toBe(true);

      act(() => result.current.actions.disable());
      expect(result.current.state.isEnabled).toBe(false);
      expect(result.current.state.isSelecting).toBe(false);
    });
  });

  // ── Quick-create shortcut ───────────────────────────────────────────────────

  describe('quick-create (mode disabled)', () => {
    it('PM click opens modal with 2-night default dates', () => {
      const handleRoomClick = vi.fn();
      const { result } = setup(handleRoomClick);
      const day = makeDate(3);

      act(() => result.current.handleCellClick('101', day, false));

      expect(handleRoomClick).toHaveBeenCalledWith(room101);
      expect(result.current.preSelectedDates).not.toBeNull();
      const { checkIn, checkOut } = result.current.preSelectedDates!;
      expect(checkIn.getHours()).toBe(15);
      expect(checkOut.getHours()).toBe(11);
      // 2-night default: check-out is 2 calendar days after check-in
      expect(checkOut.getDate() - checkIn.getDate()).toBe(2);
    });

    it('AM click does nothing when disabled', () => {
      const handleRoomClick = vi.fn();
      const { result } = setup(handleRoomClick);

      act(() => result.current.handleCellClick('101', makeDate(3), true));

      expect(handleRoomClick).not.toHaveBeenCalled();
      expect(result.current.preSelectedDates).toBeNull();
    });
  });

  // ── Drag-create flow ────────────────────────────────────────────────────────

  describe('drag-create flow', () => {
    it('PM click starts selection', () => {
      const { result } = setup();
      act(() => result.current.actions.enable());
      act(() => result.current.handleCellClick('101', makeDate(0), false));

      expect(result.current.state.isSelecting).toBe(true);
    });

    it('AM click in same room completes selection and opens modal', () => {
      const handleRoomClick = vi.fn();
      const { result } = setup(handleRoomClick);
      const start = makeDate(0);
      const end = makeDate(3);

      act(() => result.current.actions.enable());
      act(() => result.current.handleCellClick('101', start, false));
      act(() => result.current.handleCellClick('101', end, true));

      expect(result.current.state.isSelecting).toBe(false);
      expect(handleRoomClick).toHaveBeenCalledWith(room101);
      expect(result.current.preSelectedDates).toEqual({
        checkIn: start,
        checkOut: end,
      });
    });

    it('AM click in different room does not complete', () => {
      const handleRoomClick = vi.fn();
      const { result } = setup(handleRoomClick);

      act(() => result.current.actions.enable());
      act(() => result.current.handleCellClick('101', makeDate(0), false));
      act(() => result.current.handleCellClick('102', makeDate(3), true));

      expect(result.current.state.isSelecting).toBe(true);
      expect(handleRoomClick).not.toHaveBeenCalled();
    });

    it('AM click before start date does not complete', () => {
      const handleRoomClick = vi.fn();
      const { result } = setup(handleRoomClick);
      const start = makeDate(5);
      const before = makeDate(2);

      act(() => result.current.actions.enable());
      act(() => result.current.handleCellClick('101', start, false));
      act(() => result.current.handleCellClick('101', before, true));

      expect(result.current.state.isSelecting).toBe(true);
      expect(handleRoomClick).not.toHaveBeenCalled();
    });

    it('AM click on same day as start does not complete', () => {
      const handleRoomClick = vi.fn();
      const { result } = setup(handleRoomClick);
      const day = makeDate(0);

      act(() => result.current.actions.enable());
      act(() => result.current.handleCellClick('101', day, false));
      act(() => result.current.handleCellClick('101', day, true));

      expect(result.current.state.isSelecting).toBe(true);
    });
  });

  // ── Escape ──────────────────────────────────────────────────────────────────

  describe('escape key', () => {
    it('cancels active selection but keeps mode enabled', () => {
      const { result } = setup();
      act(() => result.current.actions.enable());
      act(() => result.current.handleCellClick('101', makeDate(0), false));
      expect(result.current.state.isSelecting).toBe(true);

      act(() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      });

      expect(result.current.state.isSelecting).toBe(false);
      expect(result.current.state.isEnabled).toBe(true);
    });
  });

  // ── Hover & night count ─────────────────────────────────────────────────────

  describe('hover and nightCount', () => {
    it('returns null nightCount when not selecting', () => {
      const { result } = setup();
      expect(result.current.nightCount).toBeNull();
    });

    it('returns null nightCount before hover', () => {
      const { result } = setup();
      act(() => result.current.actions.enable());
      act(() => result.current.handleCellClick('101', makeDate(0), false));
      expect(result.current.nightCount).toBeNull();
    });

    it('computes nightCount from start to hover + 1', () => {
      const { result } = setup();
      act(() => result.current.actions.enable());
      act(() => result.current.handleCellClick('101', makeDate(0), false));
      act(() => result.current.handleCellHover('101', makeDate(2)));

      expect(result.current.nightCount).toBe(3); // day0 → day2 = 2 days + 1 = 3 nights
    });

    it('ignores hover from different room', () => {
      const { result } = setup();
      act(() => result.current.actions.enable());
      act(() => result.current.handleCellClick('101', makeDate(0), false));
      act(() => result.current.handleCellHover('102', makeDate(2)));

      expect(result.current.nightCount).toBeNull();
    });
  });

  // ── shouldHighlightCell ─────────────────────────────────────────────────────

  describe('shouldHighlightCell', () => {
    it('returns none when disabled', () => {
      const { result } = setup();
      expect(result.current.shouldHighlightCell('101', makeDate(0), false)).toBe('none');
    });

    it('returns selectable for PM cells when enabled but not selecting', () => {
      const { result } = setup();
      act(() => result.current.actions.enable());
      expect(result.current.shouldHighlightCell('101', makeDate(0), false)).toBe('selectable');
      expect(result.current.shouldHighlightCell('101', makeDate(0), true)).toBe('none');
    });

    it('returns start for the anchor PM cell', () => {
      const { result } = setup();
      const start = makeDate(0);
      act(() => result.current.actions.enable());
      act(() => result.current.handleCellClick('101', start, false));

      expect(result.current.shouldHighlightCell('101', start, false)).toBe('start');
    });

    it('returns selectable for AM checkout targets', () => {
      const { result } = setup();
      act(() => result.current.actions.enable());
      act(() => result.current.handleCellClick('101', makeDate(0), false));

      expect(result.current.shouldHighlightCell('101', makeDate(2), true)).toBe('selectable');
    });

    it('returns none for different room when selecting', () => {
      const { result } = setup();
      act(() => result.current.actions.enable());
      act(() => result.current.handleCellClick('101', makeDate(0), false));

      expect(result.current.shouldHighlightCell('102', makeDate(2), true)).toBe('none');
    });

    it('returns preview for cells in hover range', () => {
      const { result } = setup();
      act(() => result.current.actions.enable());
      act(() => result.current.handleCellClick('101', makeDate(0), false));
      act(() => result.current.handleCellHover('101', makeDate(3)));

      // AM cell day 1 — in range → preview
      expect(result.current.shouldHighlightCell('101', makeDate(1), true)).toBe('preview');
      // PM cell day 2 — in range → preview
      expect(result.current.shouldHighlightCell('101', makeDate(2), false)).toBe('preview');
      // AM cell day 3 — at hover → preview
      expect(result.current.shouldHighlightCell('101', makeDate(3), true)).toBe('preview');
      // AM cell day 4 — past hover → selectable
      expect(result.current.shouldHighlightCell('101', makeDate(4), true)).toBe('selectable');
    });
  });

  // ── clearPreSelectedDates ───────────────────────────────────────────────────

  describe('clearPreSelectedDates', () => {
    it('clears pre-selected dates', () => {
      const { result } = setup();
      act(() => result.current.handleCellClick('101', makeDate(0), false)); // quick-create

      expect(result.current.preSelectedDates).not.toBeNull();
      act(() => result.current.clearPreSelectedDates());
      expect(result.current.preSelectedDates).toBeNull();
    });
  });
});
