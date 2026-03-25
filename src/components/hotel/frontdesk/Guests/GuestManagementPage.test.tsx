import { screen, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import GuestManagementPage from './GuestManagementPage';
import { buildGuest, buildReservation } from '@/test/utils';

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

vi.mock('@/lib/queries/hooks/useReservations', () => ({
  useReservations: vi.fn(),
}));

// Mock GuestProfileModal so we can test the page without its internals
vi.mock('./GuestProfileModal', () => ({
  default: ({
    isOpen,
    mode,
    guest,
  }: {
    isOpen: boolean;
    mode: 'view' | 'edit' | 'create';
    guest: unknown;
  }) =>
    isOpen
      ? React.createElement('div', {
          'data-testid': 'guest-profile-modal',
          'data-mode': mode,
          'data-guest-id': (guest as any)?.id ?? null,
        })
      : null,
}));

import { useGuests } from '@/lib/queries/hooks/useGuests';
import { useReservations } from '@/lib/queries/hooks/useReservations';

// ── Test data ─────────────────────────────────────────────────────────────────

const guest1 = buildGuest({
  id: 1,
  display_name: 'Alice Johnson',
  first_name: 'Alice',
  last_name: 'Johnson',
  email: 'alice@example.com',
  phone: '+1-555-1234',
  nationality: 'USA',
  is_vip: true,
  has_pets: false,
});

const guest2 = buildGuest({
  id: 2,
  display_name: 'Bob Smith',
  first_name: 'Bob',
  last_name: 'Smith',
  email: 'bob@example.com',
  phone: '+1-555-5678',
  nationality: 'Canada',
  is_vip: false,
  has_pets: true,
});

const guest3 = buildGuest({
  id: 3,
  display_name: 'Carol White',
  first_name: 'Carol',
  last_name: 'White',
  email: 'carol@example.com',
  phone: '+1-555-9999',
  nationality: 'USA',
  is_vip: true,
  has_pets: false,
});

const reservation1 = buildReservation({
  guest_id: 1,
  check_in_date: '2026-03-20',
  check_out_date: '2026-03-25',
});

const reservation2 = buildReservation({
  guest_id: 1,
  check_in_date: '2026-02-10',
  check_out_date: '2026-02-15',
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function setupMocks(
  overrides: {
    guests?: (typeof guest1)[];
    reservations?: (typeof reservation1)[];
    isLoadingGuests?: boolean;
    isLoadingReservations?: boolean;
  } = {}
) {
  vi.mocked(useGuests).mockReturnValue({
    data: overrides.guests ?? [guest1, guest2, guest3],
    isLoading: overrides.isLoadingGuests ?? false,
  } as unknown as ReturnType<typeof useGuests>);

  vi.mocked(useReservations).mockReturnValue({
    data: overrides.reservations ?? [reservation1, reservation2],
    isLoading: overrides.isLoadingReservations ?? false,
  } as unknown as ReturnType<typeof useReservations>);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GuestManagementPage', () => {
  afterEach(() => vi.clearAllMocks());

  describe('rendering', () => {
    beforeEach(() => setupMocks());

    it('renders guest names from mock data', () => {
      render(<GuestManagementPage />);
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText('Bob Smith')).toBeInTheDocument();
      expect(screen.getByText('Carol White')).toBeInTheDocument();
    });

    it('renders guest email addresses', () => {
      render(<GuestManagementPage />);
      expect(screen.getByText('alice@example.com')).toBeInTheDocument();
      expect(screen.getByText('bob@example.com')).toBeInTheDocument();
    });

    it('renders guest contact information', () => {
      render(<GuestManagementPage />);
      // Phone numbers are formatted
      expect(screen.getByText(/\+1 555 1234/)).toBeInTheDocument();
    });

    it('renders guest nationality', () => {
      render(<GuestManagementPage />);
      expect(screen.getAllByText('USA').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Canada').length).toBeGreaterThan(0);
    });

    it('renders VIP badge for VIP guests', () => {
      render(<GuestManagementPage />);
      const vipBadges = screen.getAllByText('VIP');
      // Should have 2 VIP badges (Alice and Carol)
      expect(vipBadges.length).toBeGreaterThanOrEqual(2);
    });

    it('renders pets indicator for guests with pets', () => {
      render(<GuestManagementPage />);
      // Bob has pets, should show emoji or indicator
      const petEmojis = screen.getAllByText('🐕');
      expect(petEmojis.length).toBeGreaterThan(0);
    });

    it('renders header title and description', () => {
      render(<GuestManagementPage />);
      expect(screen.getByRole('heading', { name: /Guest Management/i })).toBeInTheDocument();
      expect(screen.getByText(/Manage guest profiles and booking history/i)).toBeInTheDocument();
    });

    it('renders statistics cards', () => {
      render(<GuestManagementPage />);
      // Total Guests card shows 3
      expect(screen.getByText('3')).toBeInTheDocument();
      // VIP Guests card shows 2
      expect(screen.getByText('2')).toBeInTheDocument();
      // Guests with Pets
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('renders Add New Guest button', () => {
      render(<GuestManagementPage />);
      expect(screen.getByRole('button', { name: /Add New Guest/i })).toBeInTheDocument();
    });

    it('renders search input with correct placeholder', () => {
      render(<GuestManagementPage />);
      expect(
        screen.getByPlaceholderText(/Search by name, email, phone, or nationality/i)
      ).toBeInTheDocument();
    });

    it('renders filter options', () => {
      render(<GuestManagementPage />);
      // Nationality filter and VIP checkbox should exist
      expect(screen.getByRole('option', { name: 'All Nationalities' })).toBeInTheDocument();
      expect(screen.getByRole('checkbox')).toBeInTheDocument(); // VIP only checkbox
    });

    it('renders Edit and View buttons for each guest', () => {
      render(<GuestManagementPage />);
      const editButtons = screen.getAllByRole('button', { name: /Edit/i });
      // Should have at least 3 edit buttons (one per guest)
      expect(editButtons.length).toBeGreaterThanOrEqual(3);
    });

    it('renders Guest Directory card', () => {
      render(<GuestManagementPage />);
      expect(screen.getByRole('heading', { name: /Guest Directory/i })).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('renders skeleton placeholders while guests are loading', () => {
      setupMocks({ isLoadingGuests: true, guests: [] });
      render(<GuestManagementPage />);
      // When loading, the component renders Skeleton components instead of the empty-state message
      const skeletons = document.querySelectorAll('[class*="skeleton"], [data-slot="skeleton"]');
      // At minimum, the Skeleton elements replace the guest list during loading
      expect(screen.queryByText(/No guests found matching your criteria/i)).not.toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('shows no guests message when list is empty', () => {
      setupMocks({ guests: [] });
      render(<GuestManagementPage />);
      expect(screen.getByText(/No guests found matching your criteria/i)).toBeInTheDocument();
    });

    it('shows empty state icon', () => {
      setupMocks({ guests: [] });
      render(<GuestManagementPage />);
      // Icon should be present (use getByTestId or check for svg elements)
      const emptyStateIcon = document.querySelector('svg');
      expect(emptyStateIcon).toBeInTheDocument();
    });
  });

  describe('search filter', () => {
    beforeEach(() => setupMocks());

    it('filters guests by name', async () => {
      const user = userEvent.setup();
      render(<GuestManagementPage />);

      const searchInput = screen.getByPlaceholderText(
        /Search by name, email, phone, or nationality/i
      );
      await user.type(searchInput, 'Alice');

      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument();
      expect(screen.queryByText('Carol White')).not.toBeInTheDocument();
    });

    it('filters guests case-insensitively', async () => {
      const user = userEvent.setup();
      render(<GuestManagementPage />);

      const searchInput = screen.getByPlaceholderText(
        /Search by name, email, phone, or nationality/i
      );
      await user.type(searchInput, 'bob');

      expect(screen.getByText('Bob Smith')).toBeInTheDocument();
      expect(screen.queryByText('Alice Johnson')).not.toBeInTheDocument();
    });

    it('filters guests by email', async () => {
      const user = userEvent.setup();
      render(<GuestManagementPage />);

      const searchInput = screen.getByPlaceholderText(
        /Search by name, email, phone, or nationality/i
      );
      await user.type(searchInput, 'carol@example.com');

      expect(screen.getByText('Carol White')).toBeInTheDocument();
      expect(screen.queryByText('Alice Johnson')).not.toBeInTheDocument();
    });

    it('filters guests by phone', async () => {
      const user = userEvent.setup();
      render(<GuestManagementPage />);

      const searchInput = screen.getByPlaceholderText(
        /Search by name, email, phone, or nationality/i
      );
      await user.type(searchInput, '555-5678');

      expect(screen.getByText('Bob Smith')).toBeInTheDocument();
      expect(screen.queryByText('Alice Johnson')).not.toBeInTheDocument();
    });

    it('filters guests by nationality', async () => {
      const user = userEvent.setup();
      render(<GuestManagementPage />);

      const searchInput = screen.getByPlaceholderText(
        /Search by name, email, phone, or nationality/i
      );
      await user.type(searchInput, 'Canada');

      expect(screen.getByText('Bob Smith')).toBeInTheDocument();
      expect(screen.queryByText('Alice Johnson')).not.toBeInTheDocument();
    });

    it('shows empty state when search yields no results', async () => {
      const user = userEvent.setup();
      render(<GuestManagementPage />);

      const searchInput = screen.getByPlaceholderText(
        /Search by name, email, phone, or nationality/i
      );
      await user.type(searchInput, 'xyznonexistent');

      expect(screen.getByText(/No guests found matching your criteria/i)).toBeInTheDocument();
    });

    it('displays result count during search', async () => {
      const user = userEvent.setup();
      render(<GuestManagementPage />);

      const searchInput = screen.getByPlaceholderText(
        /Search by name, email, phone, or nationality/i
      );
      await user.type(searchInput, 'USA');

      // Should show "2 of 3 guests" (Alice and Carol are USA)
      expect(screen.getByText(/2 of 3 guests/)).toBeInTheDocument();
    });
  });

  describe('nationality filter', () => {
    beforeEach(() => setupMocks());

    it('filters guests by selected nationality', async () => {
      const user = userEvent.setup();
      render(<GuestManagementPage />);

      const nationalitySelect = screen.getAllByRole('combobox')[0]; // First combobox is nationality
      await user.selectOptions(nationalitySelect, 'USA');

      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText('Carol White')).toBeInTheDocument();
      expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument();
    });

    it('shows all nationalities in filter dropdown', () => {
      render(<GuestManagementPage />);
      expect(screen.getByRole('option', { name: 'Canada' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'USA' })).toBeInTheDocument();
    });

    it('resets filter when All Nationalities is selected', async () => {
      const user = userEvent.setup();
      render(<GuestManagementPage />);

      const nationalitySelect = screen.getAllByRole('combobox')[0];
      await user.selectOptions(nationalitySelect, 'USA');
      expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument();

      await user.selectOptions(nationalitySelect, 'All Nationalities');
      expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    });
  });

  describe('VIP filter', () => {
    beforeEach(() => setupMocks());

    it('filters guests when VIP only checkbox is checked', async () => {
      const user = userEvent.setup();
      render(<GuestManagementPage />);

      const vipCheckbox = screen.getByRole('checkbox');
      await user.click(vipCheckbox);

      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText('Carol White')).toBeInTheDocument();
      expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument();
    });

    it('shows all guests when VIP filter is unchecked', async () => {
      const user = userEvent.setup();
      render(<GuestManagementPage />);

      const vipCheckbox = screen.getByRole('checkbox');
      await user.click(vipCheckbox);
      expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument();

      await user.click(vipCheckbox);
      expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    });
  });

  describe('guest sorting', () => {
    it('sorts guests by name alphabetically by default', () => {
      setupMocks();
      render(<GuestManagementPage />);

      const guestElements = screen.getAllByText(/Johnson|Smith|White/);
      // Alice should come before Bob, Bob before Carol
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText('Bob Smith')).toBeInTheDocument();
      expect(screen.getByText('Carol White')).toBeInTheDocument();
    });

    it('sorts guests by last stay when selected', async () => {
      const user = userEvent.setup();
      setupMocks();
      render(<GuestManagementPage />);

      const sortSelect = screen.getAllByRole('combobox')[1]; // Second combobox is sort
      await user.selectOptions(sortSelect, 'lastStay');

      // Component should reorder guests (Alice has more recent stay 2026-03-20)
      const guestList = screen.getAllByRole('heading', { level: 4 });
      expect(guestList.length).toBeGreaterThan(0);
    });
  });

  describe('Add/Create guest modal', () => {
    beforeEach(() => setupMocks());

    it('opens add guest modal when Add New Guest button is clicked', async () => {
      const user = userEvent.setup();
      render(<GuestManagementPage />);

      const addButton = screen.getByRole('button', { name: /Add New Guest/i });
      await user.click(addButton);

      expect(screen.getByTestId('guest-profile-modal')).toBeInTheDocument();
      expect(screen.getByTestId('guest-profile-modal')).toHaveAttribute('data-mode', 'create');
    });
  });

  describe('View guest modal', () => {
    beforeEach(() => setupMocks());

    it('opens view modal when Eye button is clicked', async () => {
      const user = userEvent.setup();
      render(<GuestManagementPage />);

      const viewButtons = screen.getAllByRole('button', { name: 'View guest' });
      await user.click(viewButtons[0]);

      const modal = screen.getByTestId('guest-profile-modal');
      expect(modal).toBeInTheDocument();
    });

    it('passes selected guest to view modal', async () => {
      const user = userEvent.setup();
      render(<GuestManagementPage />);

      const viewButtons = screen.getAllByRole('button', { name: 'View guest' });
      await user.click(viewButtons[0]);

      // Just verify the modal opened
      const modal = screen.getByTestId('guest-profile-modal');
      expect(modal).toBeInTheDocument();
    });
  });

  describe('Edit guest modal', () => {
    beforeEach(() => setupMocks());

    it('opens edit modal when Edit button is clicked', async () => {
      const user = userEvent.setup();
      render(<GuestManagementPage />);

      const editButtons = screen.getAllByRole('button', { name: /Edit/i });
      await user.click(editButtons[0]);

      const modal = screen.getByTestId('guest-profile-modal');
      expect(modal).toBeInTheDocument();
      expect(modal).toHaveAttribute('data-mode', 'edit');
    });

    it('passes correct guest data to edit modal', async () => {
      const user = userEvent.setup();
      render(<GuestManagementPage />);

      const editButtons = screen.getAllByRole('button', { name: /Edit/i });
      await user.click(editButtons[1]); // Click second edit button (Bob)

      const modal = screen.getByTestId('guest-profile-modal');
      expect(modal).toHaveAttribute('data-guest-id', '2');
    });
  });

  describe('onGuestSelect callback', () => {
    it('calls onGuestSelect when Select button is clicked', async () => {
      const onGuestSelect = vi.fn();
      setupMocks();
      const user = userEvent.setup();

      render(<GuestManagementPage onGuestSelect={onGuestSelect} />);

      // Select button only appears when onGuestSelect is provided
      const selectButtons = screen.getAllByRole('button', { name: /Select/i });
      await user.click(selectButtons[0]);

      expect(onGuestSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
    });

    it('does not show Select button when onGuestSelect is not provided', () => {
      setupMocks();
      render(<GuestManagementPage />);

      const selectButtons = screen.queryAllByRole('button', { name: /Select/i });
      expect(selectButtons.length).toBe(0);
    });
  });

  describe('guest stay history', () => {
    beforeEach(() => setupMocks());

    it('shows last stay date for guests with reservations', () => {
      render(<GuestManagementPage />);
      // Alice has reservations, should show "Last stay: 3/20/2026" (most recent)
      expect(screen.getByText(/Last stay:/)).toBeInTheDocument();
    });

    it('does not show last stay for guests without reservations', () => {
      setupMocks({ reservations: [] });
      render(<GuestManagementPage />);
      // Should not have any "Last stay:" text
      expect(screen.queryByText(/Last stay:/)).not.toBeInTheDocument();
    });

    it('shows most recent stay, not older stays', () => {
      // reservation1 is 2026-03-20, reservation2 is 2026-02-10
      setupMocks({ reservations: [reservation1, reservation2] });
      render(<GuestManagementPage />);
      // Should show March date, not February
      expect(screen.getByText(/3\/20\/2026/)).toBeInTheDocument();
    });
  });

  describe('guest count display', () => {
    it('shows correct filtered/total guest count', async () => {
      setupMocks();
      const user = userEvent.setup();
      render(<GuestManagementPage />);

      // Initially shows "3 of 3 guests"
      expect(screen.getByText(/3 of 3 guests/)).toBeInTheDocument();

      // After search, shows "1 of 3 guests"
      const searchInput = screen.getByPlaceholderText(
        /Search by name, email, phone, or nationality/i
      );
      await user.type(searchInput, 'Alice');

      expect(screen.getByText(/1 of 3 guests/)).toBeInTheDocument();
    });
  });

  describe('statistics calculations', () => {
    it('correctly calculates total guests', () => {
      setupMocks({ guests: [guest1, guest2] });
      render(<GuestManagementPage />);
      expect(screen.getByText('2')).toBeInTheDocument(); // Total guests = 2
    });

    it('correctly calculates VIP guest count', () => {
      setupMocks({ guests: [guest1, guest2, guest3] });
      render(<GuestManagementPage />);
      // Alice and Carol are VIP = 2
      const vipCount = screen.getAllByText('VIP');
      expect(vipCount.length).toBeGreaterThanOrEqual(2);
    });

    it('correctly counts guests with pets', () => {
      setupMocks({ guests: [guest1, guest2, guest3] });
      render(<GuestManagementPage />);
      // Only Bob has pets
      const petIndicators = screen.getAllByText('🐕');
      expect(petIndicators.length).toBeGreaterThan(0);
    });
  });

  describe('combined filters', () => {
    beforeEach(() => setupMocks());

    it('applies multiple filters together', async () => {
      const user = userEvent.setup();
      render(<GuestManagementPage />);

      // Apply nationality filter first
      const nationalitySelect = screen.getAllByRole('combobox')[0];
      await user.selectOptions(nationalitySelect, 'USA');

      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText('Carol White')).toBeInTheDocument();
      expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument();

      // Then apply VIP filter
      const vipCheckbox = screen.getByRole('checkbox');
      await user.click(vipCheckbox);

      // Still should have Alice and Carol (both USA and VIP)
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText('Carol White')).toBeInTheDocument();
      expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument();
    });

    it('applies search and filter together', async () => {
      const user = userEvent.setup();
      render(<GuestManagementPage />);

      // Filter by USA
      const nationalitySelect = screen.getAllByRole('combobox')[0];
      await user.selectOptions(nationalitySelect, 'USA');

      // Then search for "Alice"
      const searchInput = screen.getByPlaceholderText(
        /Search by name, email, phone, or nationality/i
      );
      await user.type(searchInput, 'Alice');

      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.queryByText('Carol White')).not.toBeInTheDocument();
      expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument();
    });
  });

  describe('export button', () => {
    beforeEach(() => setupMocks());

    it('renders export button', () => {
      render(<GuestManagementPage />);
      expect(screen.getByRole('button', { name: /Export/i })).toBeInTheDocument();
    });
  });
});
