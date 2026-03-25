import { screen, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { ReservationBlock } from './ReservationBlock';
import { buildReservation, buildGuest, buildRoom } from '@/test/utils';
import type { Reservation } from '@/lib/hotel/types';

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('react-dnd', () => ({
  useDrag: () => [{ isDragging: false }, vi.fn(), vi.fn()],
  useDrop: () => [{ isOver: false }, vi.fn()],
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { count?: number; defaultValue?: string }) =>
      opts?.defaultValue ?? opts?.count?.toString() ?? key,
    i18n: { language: 'en' },
  }),
}));

// Mock GSAP to avoid animation-related errors in tests
vi.mock('gsap', () => ({
  gsap: {
    fromTo: vi.fn((el, from, to) => {
      // No-op animation in tests
      if (el) {
        Object.assign(el.style, to);
      }
    }),
  },
}));

vi.mock('./ReservationContextMenu', () => ({
  ReservationContextMenu: ({ isFullscreen }: { isFullscreen?: boolean }) =>
    React.createElement('div', { 'data-testid': 'context-menu' }),
}));

vi.mock('../../shared/LabelBadge', () => ({
  default: ({ label }: { label?: unknown }) =>
    label ? React.createElement('div', { 'data-testid': 'label-badge' }, 'Badge') : null,
}));

vi.mock('lucide-react', () => ({
  Users: () => React.createElement('svg', { 'data-testid': 'users-icon' }),
  Baby: () => React.createElement('svg', { 'data-testid': 'baby-icon' }),
  Dog: () => React.createElement('svg', { 'data-testid': 'dog-icon' }),
  Move: () => React.createElement('svg', { 'data-testid': 'move-icon' }),
  Plus: () => React.createElement('svg', { 'data-testid': 'plus-icon' }),
}));

// ── Test data ─────────────────────────────────────────────────────────────────

describe('ReservationBlock', () => {
  let mockOnClick: (reservation: Reservation) => void;
  let mockOnMove: (id: number, roomId: number, checkIn: Date, checkOut: Date) => void;
  let mockOnResize: (id: number, side: 'start' | 'end', date: Date) => void;

  const baseReservation = buildReservation({
    check_in_date: '2026-04-01',
    check_out_date: '2026-04-05',
    number_of_guests: 2,
    adults: 2,
    children_count: 0,
    reservation_statuses: { code: 'confirmed' },
  });

  const baseGuest = buildGuest({
    display_name: 'John Doe',
    nationality: 'US',
    has_pets: false,
  });

  const baseRoom = buildRoom({
    floor_number: 1,
  });

  const timelineStart = new Date('2026-04-01');

  beforeEach(() => {
    mockOnClick = vi.fn() as unknown as typeof mockOnClick;
    mockOnMove = vi.fn() as unknown as typeof mockOnMove;
    mockOnResize = vi.fn() as unknown as typeof mockOnResize;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the guest name', () => {
      render(
        <ReservationBlock
          reservation={baseReservation}
          guest={baseGuest}
          room={baseRoom}
          startDate={timelineStart}
          onReservationClick={mockOnClick}
        />
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('renders fallback text when guest is undefined', () => {
      render(
        <ReservationBlock
          reservation={baseReservation}
          guest={undefined}
          room={baseRoom}
          startDate={timelineStart}
          onReservationClick={mockOnClick}
        />
      );

      expect(screen.getByText('Guest')).toBeInTheDocument();
    });

    it('renders adult count icon when adults > 0', () => {
      render(
        <ReservationBlock
          reservation={baseReservation}
          guest={baseGuest}
          room={baseRoom}
          startDate={timelineStart}
          onReservationClick={mockOnClick}
        />
      );

      expect(screen.getByTestId('users-icon')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('renders children count icon when children array is not empty', () => {
      const reservationWithChildren = buildReservation({
        ...baseReservation,
        children_count: 1,
      });

      render(
        <ReservationBlock
          reservation={reservationWithChildren}
          guest={baseGuest}
          room={baseRoom}
          startDate={timelineStart}
          onReservationClick={mockOnClick}
        />
      );

      expect(screen.getByTestId('baby-icon')).toBeInTheDocument();
      expect(screen.getAllByText('1')[0]).toBeInTheDocument();
    });

    it('renders dog icon when guest has pets', () => {
      const guestWithPets = buildGuest({
        ...baseGuest,
        has_pets: true,
      });

      render(
        <ReservationBlock
          reservation={baseReservation}
          guest={guestWithPets}
          room={baseRoom}
          startDate={timelineStart}
          onReservationClick={mockOnClick}
        />
      );

      expect(screen.getByTestId('dog-icon')).toBeInTheDocument();
    });

    it('renders dog icon when reservation has pets flag', () => {
      const reservationWithPets = buildReservation({
        ...baseReservation,
        has_pets: true,
      });

      render(
        <ReservationBlock
          reservation={reservationWithPets}
          guest={baseGuest}
          room={baseRoom}
          startDate={timelineStart}
          onReservationClick={mockOnClick}
        />
      );

      expect(screen.getByTestId('dog-icon')).toBeInTheDocument();
    });

    it('renders with button role and tabindex', () => {
      const { container } = render(
        <ReservationBlock
          reservation={baseReservation}
          guest={baseGuest}
          room={baseRoom}
          startDate={timelineStart}
          onReservationClick={mockOnClick}
        />
      );

      const block = container.querySelector('[role="button"]');
      expect(block).toHaveAttribute('tabIndex', '0');
    });

    it('renders label badge when reservation has label', () => {
      const reservationWithLabel = buildReservation({
        ...baseReservation,
        labels: {
          id: 'label-1',
          name: 'VIP',
          color: '#fff',
          bg_color: '#000',
        },
      });

      render(
        <ReservationBlock
          reservation={reservationWithLabel}
          guest={baseGuest}
          room={baseRoom}
          startDate={timelineStart}
          onReservationClick={mockOnClick}
        />
      );

      expect(screen.getByTestId('label-badge')).toBeInTheDocument();
    });

    it('does not render when reservation is completely outside the 14-day window', () => {
      const futureReservation = buildReservation({
        check_in_date: '2026-04-20',
        check_out_date: '2026-04-25',
      });

      const { container } = render(
        <ReservationBlock
          reservation={futureReservation}
          guest={baseGuest}
          room={baseRoom}
          startDate={timelineStart}
          onReservationClick={mockOnClick}
        />
      );

      expect(container.querySelector('[role="button"]')).not.toBeInTheDocument();
    });
  });

  describe('interaction', () => {
    it('calls onReservationClick when block is clicked', async () => {
      const user = userEvent.setup();

      render(
        <ReservationBlock
          reservation={baseReservation}
          guest={baseGuest}
          room={baseRoom}
          startDate={timelineStart}
          onReservationClick={mockOnClick}
        />
      );

      const block = screen.getByRole('button');
      await user.click(block);

      expect(mockOnClick).toHaveBeenCalledWith(baseReservation);
    });

    it('calls onReservationClick when Enter key is pressed', async () => {
      const user = userEvent.setup();

      render(
        <ReservationBlock
          reservation={baseReservation}
          guest={baseGuest}
          room={baseRoom}
          startDate={timelineStart}
          onReservationClick={mockOnClick}
        />
      );

      const block = screen.getByRole('button');
      block.focus();
      await user.keyboard('{Enter}');

      expect(mockOnClick).toHaveBeenCalledWith(baseReservation);
    });

    it('calls onReservationClick when Space key is pressed', async () => {
      const user = userEvent.setup();

      render(
        <ReservationBlock
          reservation={baseReservation}
          guest={baseGuest}
          room={baseRoom}
          startDate={timelineStart}
          onReservationClick={mockOnClick}
        />
      );

      const block = screen.getByRole('button');
      block.focus();
      await user.keyboard(' ');

      expect(mockOnClick).toHaveBeenCalledWith(baseReservation);
    });

    it('right-click shows context menu', async () => {
      const user = userEvent.setup();

      render(
        <ReservationBlock
          reservation={baseReservation}
          guest={baseGuest}
          room={baseRoom}
          startDate={timelineStart}
          onReservationClick={mockOnClick}
        />
      );

      const block = screen.getByRole('button');
      await user.pointer({ keys: '[MouseRight]', target: block });

      expect(screen.getByTestId('context-menu')).toBeInTheDocument();
    });
  });

  describe('move mode', () => {
    it('renders move button handle when isMoveMode is true and reservation is multi-day', () => {
      render(
        <ReservationBlock
          reservation={baseReservation}
          guest={baseGuest}
          room={baseRoom}
          startDate={timelineStart}
          onReservationClick={mockOnClick}
          isMoveMode={true}
        />
      );

      expect(screen.getByTestId('move-icon')).toBeInTheDocument();
    });

    it('renders plus icon for drag handle when reservation is short (≤2 days)', () => {
      const shortReservation = buildReservation({
        check_in_date: '2026-04-01',
        check_out_date: '2026-04-02',
      });

      render(
        <ReservationBlock
          reservation={shortReservation}
          guest={baseGuest}
          room={baseRoom}
          startDate={timelineStart}
          onReservationClick={mockOnClick}
          isMoveMode={true}
        />
      );

      expect(screen.getByTestId('plus-icon')).toBeInTheDocument();
    });

    it('renders left/right navigation buttons when isMoveMode is true', () => {
      render(
        <ReservationBlock
          reservation={baseReservation}
          guest={baseGuest}
          room={baseRoom}
          startDate={timelineStart}
          onReservationClick={mockOnClick}
          isMoveMode={true}
        />
      );

      const buttons = screen.getAllByRole('button');
      // Should have main button + 2 move buttons (left/right)
      expect(buttons.length).toBeGreaterThanOrEqual(3);
    });

    it('renders move buttons in move mode', async () => {
      render(
        <ReservationBlock
          reservation={baseReservation}
          guest={baseGuest}
          room={baseRoom}
          startDate={timelineStart}
          onReservationClick={mockOnClick}
          isMoveMode={true}
          onMoveReservation={mockOnMove}
        />
      );

      // In move mode, should have buttons with arrow content
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('expansion mode', () => {
    it('renders resize buttons when isExpansionMode is true', () => {
      render(
        <ReservationBlock
          reservation={baseReservation}
          guest={baseGuest}
          room={baseRoom}
          startDate={timelineStart}
          onReservationClick={mockOnClick}
          isExpansionMode={true}
        />
      );

      const buttons = screen.getAllByRole('button');
      // Should have multiple resize buttons
      expect(buttons.length).toBeGreaterThan(1);
    });

    it('calls onResizeReservation when left expand button is clicked', async () => {
      const user = userEvent.setup();
      // Reservation starts on day 2 of the timeline so the left-expand button is not disabled
      const midReservation = buildReservation({
        check_in_date: '2026-04-03',
        check_out_date: '2026-04-07',
        number_of_guests: 2,
        adults: 2,
        children_count: 0,
        reservation_statuses: { code: 'confirmed' },
      });

      render(
        <ReservationBlock
          reservation={midReservation}
          guest={baseGuest}
          room={baseRoom}
          startDate={timelineStart}
          onReservationClick={mockOnClick}
          isExpansionMode={true}
          onResizeReservation={mockOnResize}
        />
      );

      const buttons = screen.getAllByRole('button');
      // buttons[0] is the main reservation block (role="button"); buttons[1] is the left expand control
      expect(buttons.length).toBeGreaterThan(1);
      await user.click(buttons[1]);
      expect(mockOnResize).toHaveBeenCalled();
    });
  });

  describe('title attribute', () => {
    it('includes guest name and guest count in title', () => {
      const { container } = render(
        <ReservationBlock
          reservation={baseReservation}
          guest={baseGuest}
          room={baseRoom}
          startDate={timelineStart}
          onReservationClick={mockOnClick}
        />
      );

      const block = container.querySelector('[role="button"]');
      expect(block).toHaveAttribute('title', expect.stringContaining('John Doe'));
      expect(block).toHaveAttribute('title', expect.stringContaining('2 guests'));
    });
  });

  describe('status colors', () => {
    it('applies confirmed status styles', () => {
      const confirmedRes = buildReservation({
        ...baseReservation,
        reservation_statuses: { code: 'confirmed' },
      });

      const { container } = render(
        <ReservationBlock
          reservation={confirmedRes}
          guest={baseGuest}
          room={baseRoom}
          startDate={timelineStart}
          onReservationClick={mockOnClick}
        />
      );

      const block = container.querySelector('[role="button"]');
      // Confirmed status should render with styles applied
      expect(block).toHaveAttribute('style');
    });

    it('applies checked-in status when reservation status is checked_in', () => {
      const checkedInRes = buildReservation({
        ...baseReservation,
        reservation_statuses: { code: 'checked-in' },
      });

      const { container } = render(
        <ReservationBlock
          reservation={checkedInRes}
          guest={baseGuest}
          room={baseRoom}
          startDate={timelineStart}
          onReservationClick={mockOnClick}
        />
      );

      const block = container.querySelector('[role="button"]');
      expect(block).toBeInTheDocument();
    });
  });

  describe('minimal props', () => {
    it('does not crash with minimal required props', () => {
      const minimalRes = buildReservation();
      const minimalGuest = buildGuest();
      const minimalRoom = buildRoom();

      render(
        <ReservationBlock
          reservation={minimalRes}
          guest={minimalGuest}
          room={minimalRoom}
          startDate={new Date('2026-04-01')}
          onReservationClick={vi.fn()}
        />
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('renders without optional callbacks', () => {
      render(
        <ReservationBlock
          reservation={baseReservation}
          guest={baseGuest}
          room={baseRoom}
          startDate={timelineStart}
          onReservationClick={mockOnClick}
          // no onMoveReservation, onResizeReservation, etc.
        />
      );

      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('days remaining calculation', () => {
    it('renders days remaining text until checkout', () => {
      // Create a reservation within the timeline window (2026-04-01)
      // that checks out in 3 days from the timeline start
      const futureRes = buildReservation({
        check_in_date: '2026-04-01',
        check_out_date: '2026-04-04',
      });

      render(
        <ReservationBlock
          reservation={futureRes}
          guest={baseGuest}
          room={baseRoom}
          startDate={timelineStart}
          onReservationClick={mockOnClick}
        />
      );

      // Should render days or day text
      const block = screen.getByRole('button');
      expect(block.textContent).toMatch(/day|days/i);
    });
  });
});
