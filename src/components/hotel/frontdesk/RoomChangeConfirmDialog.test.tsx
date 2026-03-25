import { screen, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, afterEach } from 'vitest';
import React from 'react';
import RoomChangeConfirmDialog from './RoomChangeConfirmDialog';
import { buildRoom, buildGuest, buildReservation } from '@/test/utils';

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

// ── Test data ─────────────────────────────────────────────────────────────────

const currentRoom = buildRoom({
  id: 1,
  room_number: '101',
  floor_number: 1,
  seasonal_rates: { A: 80, B: 100, C: 120, D: 150 },
  is_premium: false,
});

const targetRoom = buildRoom({
  id: 2,
  room_number: '102',
  floor_number: 1,
  seasonal_rates: { A: 120, B: 150, C: 180, D: 200 },
  is_premium: true,
});

const downgradeRoom = buildRoom({
  id: 3,
  room_number: '103',
  floor_number: 1,
  seasonal_rates: { A: 50, B: 60, C: 70, D: 80 },
  is_premium: false,
});

const sameRateRoom = buildRoom({
  id: 4,
  room_number: '104',
  floor_number: 1,
  seasonal_rates: { A: 80, B: 100, C: 120, D: 150 }, // Same as currentRoom
  is_premium: false,
});

const guest = buildGuest({
  id: 1,
  display_name: 'John Doe',
});

const reservation = buildReservation({
  id: 'res-upgrade-test',
  numberOfNights: 4,
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function setupMocks() {
  const onClose = vi.fn();
  const onConfirmChange = vi.fn();
  const onFreeUpgrade = vi.fn();

  return { onClose, onConfirmChange, onFreeUpgrade };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('RoomChangeConfirmDialog', () => {
  afterEach(() => vi.clearAllMocks());

  describe('rendering', () => {
    it('renders nothing when isOpen is false', () => {
      const mocks = setupMocks();
      const { container } = render(
        <RoomChangeConfirmDialog
          isOpen={false}
          onClose={mocks.onClose}
          currentRoom={currentRoom}
          targetRoom={targetRoom}
          reservation={reservation}
          guest={guest}
          onConfirmChange={mocks.onConfirmChange}
          onFreeUpgrade={mocks.onFreeUpgrade}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('renders dialog when isOpen is true', () => {
      const mocks = setupMocks();
      render(
        <RoomChangeConfirmDialog
          isOpen={true}
          onClose={mocks.onClose}
          currentRoom={currentRoom}
          targetRoom={targetRoom}
          reservation={reservation}
          guest={guest}
          onConfirmChange={mocks.onConfirmChange}
          onFreeUpgrade={mocks.onFreeUpgrade}
        />
      );

      expect(screen.getByText('Confirm Room Change')).toBeInTheDocument();
    });

    it('displays guest name and reservation ID in header', () => {
      const mocks = setupMocks();
      render(
        <RoomChangeConfirmDialog
          isOpen={true}
          onClose={mocks.onClose}
          currentRoom={currentRoom}
          targetRoom={targetRoom}
          reservation={reservation}
          guest={guest}
          onConfirmChange={mocks.onConfirmChange}
          onFreeUpgrade={mocks.onFreeUpgrade}
        />
      );

      expect(screen.getByText(/John Doe/)).toBeInTheDocument();
      // Reservation ID is last 8 chars
      const resIdSliced = reservation.id.slice(-8);
      expect(screen.getByText(new RegExp(resIdSliced))).toBeInTheDocument();
    });

    it('displays current and target room numbers', () => {
      const mocks = setupMocks();
      render(
        <RoomChangeConfirmDialog
          isOpen={true}
          onClose={mocks.onClose}
          currentRoom={currentRoom}
          targetRoom={targetRoom}
          reservation={reservation}
          guest={guest}
          onConfirmChange={mocks.onConfirmChange}
          onFreeUpgrade={mocks.onFreeUpgrade}
        />
      );

      // Current and target room labels
      expect(screen.getByText('Current Room')).toBeInTheDocument();
      expect(screen.getByText('New Room')).toBeInTheDocument();
    });
  });

  describe('price impact display', () => {
    it('displays correct price impact for upgrade', () => {
      const mocks = setupMocks();
      // currentRoom average rate: (80+100+120+150)/4 = 112.5
      // targetRoom average rate: (120+150+180+200)/4 = 162.5
      // difference: 50
      render(
        <RoomChangeConfirmDialog
          isOpen={true}
          onClose={mocks.onClose}
          currentRoom={currentRoom}
          targetRoom={targetRoom}
          reservation={reservation}
          guest={guest}
          onConfirmChange={mocks.onConfirmChange}
          onFreeUpgrade={mocks.onFreeUpgrade}
        />
      );

      // Should show price increase
      expect(screen.getByText(/\+€50\/night/)).toBeInTheDocument();
    });

    it('displays total increase for stay in upgrade scenario', () => {
      const mocks = setupMocks();
      render(
        <RoomChangeConfirmDialog
          isOpen={true}
          onClose={mocks.onClose}
          currentRoom={currentRoom}
          targetRoom={targetRoom}
          reservation={reservation} // 4 nights
          guest={guest}
          onConfirmChange={mocks.onConfirmChange}
          onFreeUpgrade={mocks.onFreeUpgrade}
        />
      );

      // Total increase: 50 * 4 = €200
      expect(screen.getByText(/Total increase: €200 for this stay/)).toBeInTheDocument();
    });

    it('displays correct price impact for downgrade', () => {
      const mocks = setupMocks();
      // currentRoom average: 112.5
      // downgradeRoom average: (50+60+70+80)/4 = 65
      // difference: -47.5
      render(
        <RoomChangeConfirmDialog
          isOpen={true}
          onClose={mocks.onClose}
          currentRoom={currentRoom}
          targetRoom={downgradeRoom}
          reservation={reservation}
          guest={guest}
          onConfirmChange={mocks.onConfirmChange}
          onFreeUpgrade={mocks.onFreeUpgrade}
        />
      );

      // Should show price decrease
      expect(screen.getByText(/€47.5\/night less/)).toBeInTheDocument();
    });

    it('displays no change when rooms have same rate', () => {
      const mocks = setupMocks();
      render(
        <RoomChangeConfirmDialog
          isOpen={true}
          onClose={mocks.onClose}
          currentRoom={currentRoom}
          targetRoom={sameRateRoom}
          reservation={reservation}
          guest={guest}
          onConfirmChange={mocks.onConfirmChange}
          onFreeUpgrade={mocks.onFreeUpgrade}
        />
      );

      expect(screen.getByText('No change')).toBeInTheDocument();
    });
  });

  describe('buttons', () => {
    it('calls onClose when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const mocks = setupMocks();
      render(
        <RoomChangeConfirmDialog
          isOpen={true}
          onClose={mocks.onClose}
          currentRoom={currentRoom}
          targetRoom={targetRoom}
          reservation={reservation}
          guest={guest}
          onConfirmChange={mocks.onConfirmChange}
          onFreeUpgrade={mocks.onFreeUpgrade}
        />
      );

      await user.click(screen.getByRole('button', { name: /Cancel/i }));

      expect(mocks.onClose).toHaveBeenCalledOnce();
    });

    it('calls onClose when X button is clicked', async () => {
      const user = userEvent.setup();
      const mocks = setupMocks();
      render(
        <RoomChangeConfirmDialog
          isOpen={true}
          onClose={mocks.onClose}
          currentRoom={currentRoom}
          targetRoom={targetRoom}
          reservation={reservation}
          guest={guest}
          onConfirmChange={mocks.onConfirmChange}
          onFreeUpgrade={mocks.onFreeUpgrade}
        />
      );

      // X button is the first button in CardHeader
      const closeButtons = screen.getAllByRole('button');
      const xButton = closeButtons[0]; // X button is first
      await user.click(xButton);

      expect(mocks.onClose).toHaveBeenCalledOnce();
    });

    it('calls onConfirmChange when confirm button is clicked for upgrade', async () => {
      const user = userEvent.setup();
      const mocks = setupMocks();
      render(
        <RoomChangeConfirmDialog
          isOpen={true}
          onClose={mocks.onClose}
          currentRoom={currentRoom}
          targetRoom={targetRoom}
          reservation={reservation}
          guest={guest}
          onConfirmChange={mocks.onConfirmChange}
          onFreeUpgrade={mocks.onFreeUpgrade}
        />
      );

      // For upgrade, button text includes the price difference
      const confirmButton = screen.getByRole('button', { name: /Confirm Upgrade/ });
      await user.click(confirmButton);

      expect(mocks.onConfirmChange).toHaveBeenCalledOnce();
      expect(mocks.onFreeUpgrade).not.toHaveBeenCalled();
    });

    it('calls onFreeUpgrade when free upgrade button is clicked', async () => {
      const user = userEvent.setup();
      const mocks = setupMocks();
      render(
        <RoomChangeConfirmDialog
          isOpen={true}
          onClose={mocks.onClose}
          currentRoom={currentRoom}
          targetRoom={targetRoom}
          reservation={reservation}
          guest={guest}
          onConfirmChange={mocks.onConfirmChange}
          onFreeUpgrade={mocks.onFreeUpgrade}
        />
      );

      const freeUpgradeButton = screen.getByRole('button', { name: /Free Upgrade/ });
      await user.click(freeUpgradeButton);

      expect(mocks.onFreeUpgrade).toHaveBeenCalledOnce();
      expect(mocks.onConfirmChange).not.toHaveBeenCalled();
    });

    it('only shows free upgrade button for upgrades', () => {
      const mocks = setupMocks();
      const { rerender } = render(
        <RoomChangeConfirmDialog
          isOpen={true}
          onClose={mocks.onClose}
          currentRoom={currentRoom}
          targetRoom={targetRoom} // upgrade
          reservation={reservation}
          guest={guest}
          onConfirmChange={mocks.onConfirmChange}
          onFreeUpgrade={mocks.onFreeUpgrade}
        />
      );

      expect(screen.getByRole('button', { name: /Free Upgrade/ })).toBeInTheDocument();

      // Rerender with downgrade
      rerender(
        <RoomChangeConfirmDialog
          isOpen={true}
          onClose={mocks.onClose}
          currentRoom={currentRoom}
          targetRoom={downgradeRoom}
          reservation={reservation}
          guest={guest}
          onConfirmChange={mocks.onConfirmChange}
          onFreeUpgrade={mocks.onFreeUpgrade}
        />
      );

      expect(screen.queryByRole('button', { name: /Free Upgrade/ })).not.toBeInTheDocument();
    });

    it('calls onConfirmChange when confirm button is clicked for downgrade', async () => {
      const user = userEvent.setup();
      const mocks = setupMocks();
      render(
        <RoomChangeConfirmDialog
          isOpen={true}
          onClose={mocks.onClose}
          currentRoom={currentRoom}
          targetRoom={downgradeRoom}
          reservation={reservation}
          guest={guest}
          onConfirmChange={mocks.onConfirmChange}
          onFreeUpgrade={mocks.onFreeUpgrade}
        />
      );

      const confirmButton = screen.getByRole('button', { name: /Confirm Change/ });
      await user.click(confirmButton);

      expect(mocks.onConfirmChange).toHaveBeenCalledOnce();
    });
  });

  describe('premium badge', () => {
    it('shows premium badge on current room when is_premium is true', () => {
      const mocks = setupMocks();
      const premiumCurrentRoom = buildRoom({
        id: 5,
        is_premium: true,
        seasonal_rates: { A: 100, B: 120, C: 140, D: 160 },
      });

      render(
        <RoomChangeConfirmDialog
          isOpen={true}
          onClose={mocks.onClose}
          currentRoom={premiumCurrentRoom}
          targetRoom={targetRoom}
          reservation={reservation}
          guest={guest}
          onConfirmChange={mocks.onConfirmChange}
          onFreeUpgrade={mocks.onFreeUpgrade}
        />
      );

      const badges = screen.getAllByText('Premium');
      expect(badges.length).toBeGreaterThan(0);
    });

    it('shows premium badge on target room when is_premium is true', () => {
      const mocks = setupMocks();
      render(
        <RoomChangeConfirmDialog
          isOpen={true}
          onClose={mocks.onClose}
          currentRoom={currentRoom}
          targetRoom={targetRoom} // is_premium: true
          reservation={reservation}
          guest={guest}
          onConfirmChange={mocks.onConfirmChange}
          onFreeUpgrade={mocks.onFreeUpgrade}
        />
      );

      const badges = screen.getAllByText('Premium');
      expect(badges.length).toBeGreaterThan(0);
    });
  });

  describe('guest name fallback', () => {
    it('displays guest name when provided', () => {
      const mocks = setupMocks();
      render(
        <RoomChangeConfirmDialog
          isOpen={true}
          onClose={mocks.onClose}
          currentRoom={currentRoom}
          targetRoom={targetRoom}
          reservation={reservation}
          guest={guest}
          onConfirmChange={mocks.onConfirmChange}
          onFreeUpgrade={mocks.onFreeUpgrade}
        />
      );

      expect(screen.getByText(/John Doe/)).toBeInTheDocument();
    });

    it('displays "Guest" when guest is null', () => {
      const mocks = setupMocks();
      render(
        <RoomChangeConfirmDialog
          isOpen={true}
          onClose={mocks.onClose}
          currentRoom={currentRoom}
          targetRoom={targetRoom}
          reservation={reservation}
          guest={null}
          onConfirmChange={mocks.onConfirmChange}
          onFreeUpgrade={mocks.onFreeUpgrade}
        />
      );

      expect(screen.getByText(/Guest/)).toBeInTheDocument();
    });
  });

  describe('free upgrade banner', () => {
    it('shows free upgrade banner only on upgrade', () => {
      const mocks = setupMocks();
      const { rerender } = render(
        <RoomChangeConfirmDialog
          isOpen={true}
          onClose={mocks.onClose}
          currentRoom={currentRoom}
          targetRoom={targetRoom} // upgrade
          reservation={reservation}
          guest={guest}
          onConfirmChange={mocks.onConfirmChange}
          onFreeUpgrade={mocks.onFreeUpgrade}
        />
      );

      expect(screen.getByText(/Free Upgrade:/)).toBeInTheDocument();
      expect(screen.getByText(/Move guest to the better room/)).toBeInTheDocument();

      // Rerender with downgrade
      rerender(
        <RoomChangeConfirmDialog
          isOpen={true}
          onClose={mocks.onClose}
          currentRoom={currentRoom}
          targetRoom={downgradeRoom}
          reservation={reservation}
          guest={guest}
          onConfirmChange={mocks.onConfirmChange}
          onFreeUpgrade={mocks.onFreeUpgrade}
        />
      );

      expect(screen.queryByText(/Free Upgrade:/)).not.toBeInTheDocument();
    });
  });
});
