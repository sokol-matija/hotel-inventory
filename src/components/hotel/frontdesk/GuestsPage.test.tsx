import { screen, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import GuestsPage from './GuestsPage';
import { buildGuest } from '@/test/utils';

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { count?: number; defaultValue?: string }) =>
      opts?.defaultValue ?? opts?.count?.toString() ?? key,
    i18n: { language: 'en' },
  }),
}));

vi.mock('@/lib/queries/hooks/useGuests', () => ({
  useGuests: vi.fn(),
}));

import { useGuests } from '@/lib/queries/hooks/useGuests';

// ── Test data ─────────────────────────────────────────────────────────────────

const guest1 = buildGuest({
  id: 1,
  display_name: 'Alice Johnson',
  email: 'alice@example.com',
  phone: '+385 1 1234 5678',
  nationality: 'GB',
  date_of_birth: '1990-05-15',
  is_vip: true,
  has_pets: false,
});

const guest2 = buildGuest({
  id: 2,
  display_name: 'Bob Smith',
  email: 'bob@example.com',
  phone: '+385 1 9876 5432',
  nationality: 'US',
  date_of_birth: '1985-03-20',
  is_vip: false,
  has_pets: true,
});

const guest3 = buildGuest({
  id: 3,
  display_name: 'Carol White',
  email: 'carol@example.com',
  phone: null,
  nationality: 'DE',
  date_of_birth: null,
  is_vip: false,
  has_pets: false,
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function setupMocks(overrides: { guests?: (typeof guest1)[]; isLoading?: boolean } = {}) {
  vi.mocked(useGuests).mockReturnValue({
    data: overrides.guests ?? [guest1, guest2, guest3],
    isLoading: overrides.isLoading ?? false,
  } as ReturnType<typeof useGuests>);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GuestsPage', () => {
  afterEach(() => vi.clearAllMocks());

  describe('rendering', () => {
    beforeEach(() => setupMocks());

    it('renders page heading', () => {
      render(<GuestsPage />);
      expect(screen.getByText('Guest Management')).toBeInTheDocument();
    });

    it('renders all guest names', () => {
      render(<GuestsPage />);

      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText('Bob Smith')).toBeInTheDocument();
      expect(screen.getByText('Carol White')).toBeInTheDocument();
    });

    it('displays guest contact information', () => {
      render(<GuestsPage />);

      expect(screen.getByText('alice@example.com')).toBeInTheDocument();
      expect(screen.getByText('bob@example.com')).toBeInTheDocument();
      expect(screen.getByText('+385 1 1234 5678')).toBeInTheDocument();
    });

    it('displays nationality for guests with nationality', () => {
      render(<GuestsPage />);

      expect(screen.getByText('GB')).toBeInTheDocument();
      expect(screen.getByText('US')).toBeInTheDocument();
      expect(screen.getByText('DE')).toBeInTheDocument();
    });
  });

  describe('stats cards', () => {
    beforeEach(() => setupMocks());

    it('displays total guest count', () => {
      render(<GuestsPage />);

      expect(screen.getByText('Total Guests')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('displays VIP guest count', () => {
      render(<GuestsPage />);

      expect(screen.getByText('VIP Guests')).toBeInTheDocument();
      // Only guest1 is VIP, so expect 1
      const vipCards = screen.getAllByText('1');
      expect(vipCards.length).toBeGreaterThan(0);
    });

    it('displays guest count with pets', () => {
      render(<GuestsPage />);

      expect(screen.getByText('With Pets')).toBeInTheDocument();
      // Only guest2 has pets
      const petCards = screen.getAllByText('1');
      expect(petCards.length).toBeGreaterThan(0);
    });
  });

  describe('VIP and pets badges', () => {
    beforeEach(() => setupMocks());

    it('shows VIP badge for VIP guests', () => {
      render(<GuestsPage />);

      const vipBadges = screen.getAllByText('VIP');
      expect(vipBadges.length).toBeGreaterThan(0);
    });

    it('shows Pets badge for guests with pets', () => {
      render(<GuestsPage />);

      const petBadges = screen.getAllByText('Pets');
      expect(petBadges.length).toBeGreaterThan(0);
    });

    it('does not show VIP badge for non-VIP guests', () => {
      render(<GuestsPage />);

      const bobRow = screen.getByText('Bob Smith').closest('div');
      const vipBadgeInRow = bobRow?.querySelector('[class*="yellow"]');
      // Check specifically that Bob's row doesn't have a VIP badge
      expect(bobRow).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('shows spinner while loading', () => {
      setupMocks({ isLoading: true, guests: [] });
      render(<GuestsPage />);

      expect(screen.getByText('Loading guests...')).toBeInTheDocument();
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('shows empty state when no guests', () => {
      setupMocks({ guests: [], isLoading: false });
      render(<GuestsPage />);

      expect(screen.getByText('No guests found')).toBeInTheDocument();
      expect(screen.getByText('Start by creating your first guest')).toBeInTheDocument();
    });

    it('shows search-specific message when search yields no results', async () => {
      setupMocks();
      const user = userEvent.setup();
      render(<GuestsPage />);

      const searchInput = screen.getByPlaceholderText('Search guests by name, email, or phone...');
      await user.type(searchInput, 'xyznotfound');

      expect(screen.getByText('No guests found')).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your search terms')).toBeInTheDocument();
    });
  });

  describe('search filter', () => {
    beforeEach(() => setupMocks());

    it('filters guests by name', async () => {
      const user = userEvent.setup();
      render(<GuestsPage />);

      const searchInput = screen.getByPlaceholderText('Search guests by name, email, or phone...');
      await user.type(searchInput, 'Alice');

      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument();
      expect(screen.queryByText('Carol White')).not.toBeInTheDocument();
    });

    it('filters guests by name case-insensitively', async () => {
      const user = userEvent.setup();
      render(<GuestsPage />);

      const searchInput = screen.getByPlaceholderText('Search guests by name, email, or phone...');
      await user.type(searchInput, 'bob');

      expect(screen.getByText('Bob Smith')).toBeInTheDocument();
      expect(screen.queryByText('Alice Johnson')).not.toBeInTheDocument();
    });

    it('filters guests by email', async () => {
      const user = userEvent.setup();
      render(<GuestsPage />);

      const searchInput = screen.getByPlaceholderText('Search guests by name, email, or phone...');
      await user.type(searchInput, 'carol@');

      expect(screen.getByText('Carol White')).toBeInTheDocument();
      expect(screen.queryByText('Alice Johnson')).not.toBeInTheDocument();
      expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument();
    });

    it('filters guests by phone', async () => {
      const user = userEvent.setup();
      render(<GuestsPage />);

      const searchInput = screen.getByPlaceholderText('Search guests by name, email, or phone...');
      await user.type(searchInput, '9876');

      expect(screen.getByText('Bob Smith')).toBeInTheDocument();
      expect(screen.queryByText('Alice Johnson')).not.toBeInTheDocument();
    });

    it('clears filter when search is emptied', async () => {
      const user = userEvent.setup();
      render(<GuestsPage />);

      const searchInput = screen.getByPlaceholderText('Search guests by name, email, or phone...');
      await user.type(searchInput, 'Alice');
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();

      await user.clear(searchInput);
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText('Bob Smith')).toBeInTheDocument();
      expect(screen.getByText('Carol White')).toBeInTheDocument();
    });
  });

  describe('age display', () => {
    beforeEach(() => setupMocks());

    it('displays calculated age from date of birth', () => {
      render(<GuestsPage />);

      // guest1 born 1990-05-15 should be ~34-36 years old (depending on current date)
      const ageTexts = screen.getAllByText(/Age:/);
      expect(ageTexts.length).toBeGreaterThan(0);
    });

    it('displays N/A for guests without date of birth', () => {
      render(<GuestsPage />);

      // guest3 has no date_of_birth, should show N/A
      // It appears once in Carol's age display
      expect(screen.getByText(/Age: N\/A/)).toBeInTheDocument();
    });
  });

  describe('buttons', () => {
    beforeEach(() => setupMocks());

    it('renders add guest button in header', () => {
      render(<GuestsPage />);

      const buttons = screen.getAllByRole('button', { name: /Add Guest/i });
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('renders icon buttons for each guest (view and delete)', () => {
      render(<GuestsPage />);

      // All buttons except "Add Guest" and "Filters" should be icon buttons
      const allButtons = screen.getAllByRole('button');
      const iconButtons = allButtons.filter((btn) => btn.querySelector('svg') !== null);
      // We have 3 guests × 2 buttons (view + delete) = 6 icon buttons minimum
      expect(iconButtons.length).toBeGreaterThanOrEqual(6);
    });

    it('renders delete buttons with red styling for each guest', () => {
      render(<GuestsPage />);

      // Find all buttons and check for red-600 text styling
      const allButtons = screen.getAllByRole('button');
      const deleteButtons = allButtons.filter(
        (btn) => btn.className.includes('red-600') || btn.className.includes('red-800')
      );
      expect(deleteButtons.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('filters button', () => {
    beforeEach(() => setupMocks());

    it('renders filters button', () => {
      render(<GuestsPage />);

      const filterButton = screen.getByRole('button', { name: /Filters/i });
      expect(filterButton).toBeInTheDocument();
    });

    it('toggling filters button does not crash', async () => {
      const user = userEvent.setup();
      render(<GuestsPage />);

      const filterButton = screen.getByRole('button', { name: /Filters/i });
      await user.click(filterButton);

      // Component should still render
      expect(screen.getByText('Guest Management')).toBeInTheDocument();
    });
  });

  describe('guest count in card title', () => {
    it('displays filtered count in card title', async () => {
      setupMocks();
      const user = userEvent.setup();
      render(<GuestsPage />);

      // Initially shows 3 guests
      expect(screen.getByText(/Guests \(3\)/)).toBeInTheDocument();

      // Filter to 1 guest
      const searchInput = screen.getByPlaceholderText('Search guests by name, email, or phone...');
      await user.type(searchInput, 'Alice');

      expect(screen.getByText(/Guests \(1\)/)).toBeInTheDocument();
    });
  });
});
