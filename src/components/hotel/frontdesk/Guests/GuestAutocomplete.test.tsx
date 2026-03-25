import { screen, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import GuestAutocomplete from './GuestAutocomplete';
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
  display_name: 'John Smith',
  email: 'john@example.com',
  phone: '+385-1-2345678',
  nationality: 'Croatian',
  is_vip: false,
  has_pets: false,
});

const guest2 = buildGuest({
  id: 2,
  display_name: 'Maria Garcia',
  email: 'maria@example.com',
  phone: '+34-9-1234567',
  nationality: 'Spanish',
  is_vip: true,
  has_pets: true,
});

const guest3 = buildGuest({
  id: 3,
  display_name: 'Hans Mueller',
  email: 'hans@example.com',
  phone: '+49-30-12345678',
  nationality: 'German',
  is_vip: false,
  has_pets: false,
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function setupMocks(overrides: { guests?: (typeof guest1)[]; isLoading?: boolean } = {}) {
  const mockOnGuestSelect = vi.fn();
  const mockOnCreateNew = vi.fn();

  vi.mocked(useGuests).mockReturnValue({
    data: overrides.guests ?? [guest1, guest2, guest3],
    isLoading: overrides.isLoading ?? false,
  } as unknown as ReturnType<typeof useGuests>);

  return { mockOnGuestSelect, mockOnCreateNew };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GuestAutocomplete', () => {
  afterEach(() => vi.clearAllMocks());

  describe('rendering', () => {
    beforeEach(() => setupMocks());

    it('renders the search input field', () => {
      const { mockOnGuestSelect, mockOnCreateNew } = setupMocks();
      render(<GuestAutocomplete onGuestSelect={mockOnGuestSelect} onCreateNew={mockOnCreateNew} />);

      expect(
        screen.getByPlaceholderText(/search guests by name, email, or phone/i)
      ).toBeInTheDocument();
    });

    it('uses custom placeholder when provided', () => {
      const { mockOnGuestSelect, mockOnCreateNew } = setupMocks();
      render(
        <GuestAutocomplete
          onGuestSelect={mockOnGuestSelect}
          onCreateNew={mockOnCreateNew}
          placeholder="Find a guest..."
        />
      );

      expect(screen.getByPlaceholderText('Find a guest...')).toBeInTheDocument();
    });

    it('does not show dropdown when input is empty', () => {
      const { mockOnGuestSelect, mockOnCreateNew } = setupMocks();
      render(<GuestAutocomplete onGuestSelect={mockOnGuestSelect} onCreateNew={mockOnCreateNew} />);

      expect(
        screen.queryByRole('button', { name: /create new guest profile/i })
      ).not.toBeInTheDocument();
    });
  });

  describe('searching and filtering', () => {
    it('shows guest suggestions when typing in search field', async () => {
      const user = userEvent.setup();
      const { mockOnGuestSelect, mockOnCreateNew } = setupMocks();

      render(<GuestAutocomplete onGuestSelect={mockOnGuestSelect} onCreateNew={mockOnCreateNew} />);

      const input = screen.getByPlaceholderText(/search guests by name/i);
      await user.type(input, 'John');

      expect(screen.getByText('John Smith')).toBeInTheDocument();
    });

    it('filters guests by email', async () => {
      const user = userEvent.setup();
      const { mockOnGuestSelect, mockOnCreateNew } = setupMocks();

      render(<GuestAutocomplete onGuestSelect={mockOnGuestSelect} onCreateNew={mockOnCreateNew} />);

      const input = screen.getByPlaceholderText(/search guests by name/i);
      await user.type(input, 'maria@example.com');

      expect(screen.getByText('Maria Garcia')).toBeInTheDocument();
      expect(screen.queryByText('John Smith')).not.toBeInTheDocument();
    });

    it('filters guests by phone number', async () => {
      const user = userEvent.setup();
      const { mockOnGuestSelect, mockOnCreateNew } = setupMocks();

      render(<GuestAutocomplete onGuestSelect={mockOnGuestSelect} onCreateNew={mockOnCreateNew} />);

      const input = screen.getByPlaceholderText(/search guests by name/i);
      await user.type(input, '+49-30');

      expect(screen.getByText('Hans Mueller')).toBeInTheDocument();
      expect(screen.queryByText('John Smith')).not.toBeInTheDocument();
    });

    it('filters guests by nationality', async () => {
      const user = userEvent.setup();
      const { mockOnGuestSelect, mockOnCreateNew } = setupMocks();

      render(<GuestAutocomplete onGuestSelect={mockOnGuestSelect} onCreateNew={mockOnCreateNew} />);

      const input = screen.getByPlaceholderText(/search guests by name/i);
      await user.type(input, 'Spanish');

      expect(screen.getByText('Maria Garcia')).toBeInTheDocument();
    });

    it('performs case-insensitive search', async () => {
      const user = userEvent.setup();
      const { mockOnGuestSelect, mockOnCreateNew } = setupMocks();

      render(<GuestAutocomplete onGuestSelect={mockOnGuestSelect} onCreateNew={mockOnCreateNew} />);

      const input = screen.getByPlaceholderText(/search guests by name/i);
      await user.type(input, 'hans');

      expect(screen.getByText('Hans Mueller')).toBeInTheDocument();
    });
  });

  describe('guest selection', () => {
    it('calls onGuestSelect when a guest is clicked', async () => {
      const user = userEvent.setup();
      const { mockOnGuestSelect, mockOnCreateNew } = setupMocks();

      render(<GuestAutocomplete onGuestSelect={mockOnGuestSelect} onCreateNew={mockOnCreateNew} />);

      const input = screen.getByPlaceholderText(/search guests by name/i);
      await user.type(input, 'John');

      const guestOption = screen.getByRole('button', { name: /John Smith/i });
      await user.click(guestOption);

      expect(mockOnGuestSelect).toHaveBeenCalledWith(guest1);
    });

    it('closes dropdown after selecting a guest', async () => {
      const user = userEvent.setup();
      const { mockOnGuestSelect, mockOnCreateNew } = setupMocks();

      render(<GuestAutocomplete onGuestSelect={mockOnGuestSelect} onCreateNew={mockOnCreateNew} />);

      const input = screen.getByPlaceholderText(/search guests by name/i);
      await user.type(input, 'John');
      await user.click(screen.getByRole('button', { name: /John Smith/i }));

      expect(
        screen.queryByRole('button', { name: /create new guest profile/i })
      ).not.toBeInTheDocument();
    });

    it('updates input field with selected guest display name', async () => {
      const user = userEvent.setup();
      const { mockOnGuestSelect, mockOnCreateNew } = setupMocks();

      render(<GuestAutocomplete onGuestSelect={mockOnGuestSelect} onCreateNew={mockOnCreateNew} />);

      const input = screen.getByPlaceholderText(/search guests by name/i) as HTMLInputElement;
      await user.type(input, 'John');
      await user.click(screen.getByRole('button', { name: /John Smith/i }));

      expect(input.value).toBe('John Smith');
    });
  });

  describe('keyboard navigation', () => {
    it('navigates through suggestions with arrow down', async () => {
      const user = userEvent.setup();
      const { mockOnGuestSelect, mockOnCreateNew } = setupMocks();

      render(<GuestAutocomplete onGuestSelect={mockOnGuestSelect} onCreateNew={mockOnCreateNew} />);

      const input = screen.getByPlaceholderText(/search guests by name/i);
      await user.type(input, 'a');
      await user.keyboard('{ArrowDown}');

      // First guest should be highlighted (blue-50 background)
      const firstGuestButton = screen.getByRole('button', { name: /John Smith/i });
      expect(firstGuestButton).toHaveClass('bg-blue-50');
    });

    it('navigates backwards with arrow up', async () => {
      const user = userEvent.setup();
      const { mockOnGuestSelect, mockOnCreateNew } = setupMocks();

      render(<GuestAutocomplete onGuestSelect={mockOnGuestSelect} onCreateNew={mockOnCreateNew} />);

      const input = screen.getByPlaceholderText(/search guests by name/i);
      await user.type(input, 'a');
      // Move down twice to highlight second guest, then up once to go back to first
      await user.keyboard('{ArrowDown}{ArrowDown}{ArrowUp}');

      // First guest should be highlighted
      const firstGuestButton = screen.getByRole('button', { name: /John Smith/i });
      expect(firstGuestButton).toHaveClass('bg-blue-50');
    });

    it('selects highlighted guest with Enter key', async () => {
      const user = userEvent.setup();
      const { mockOnGuestSelect, mockOnCreateNew } = setupMocks();

      render(<GuestAutocomplete onGuestSelect={mockOnGuestSelect} onCreateNew={mockOnCreateNew} />);

      const input = screen.getByPlaceholderText(/search guests by name/i);
      await user.type(input, 'Maria');
      await user.keyboard('{ArrowDown}');
      await user.keyboard('{Enter}');

      expect(mockOnGuestSelect).toHaveBeenCalledWith(guest2);
    });

    it('closes dropdown with Escape key', async () => {
      const user = userEvent.setup();
      const { mockOnGuestSelect, mockOnCreateNew } = setupMocks();

      render(<GuestAutocomplete onGuestSelect={mockOnGuestSelect} onCreateNew={mockOnCreateNew} />);

      const input = screen.getByPlaceholderText(/search guests by name/i);
      await user.type(input, 'John');
      await user.keyboard('{Escape}');

      expect(
        screen.queryByRole('button', { name: /create new guest profile/i })
      ).not.toBeInTheDocument();
    });
  });

  describe('create new guest', () => {
    it('shows "Create new guest profile" option when dropdown is open', async () => {
      const user = userEvent.setup();
      const { mockOnGuestSelect, mockOnCreateNew } = setupMocks();

      render(<GuestAutocomplete onGuestSelect={mockOnGuestSelect} onCreateNew={mockOnCreateNew} />);

      const input = screen.getByPlaceholderText(/search guests by name/i);
      await user.type(input, 'test');

      expect(screen.getByRole('button', { name: /create new guest profile/i })).toBeInTheDocument();
    });

    it('calls onCreateNew when create button is clicked', async () => {
      const user = userEvent.setup();
      const { mockOnGuestSelect, mockOnCreateNew } = setupMocks();

      render(<GuestAutocomplete onGuestSelect={mockOnGuestSelect} onCreateNew={mockOnCreateNew} />);

      const input = screen.getByPlaceholderText(/search guests by name/i);
      await user.type(input, 'New Person');
      await user.click(screen.getByRole('button', { name: /create new guest profile/i }));

      expect(mockOnCreateNew).toHaveBeenCalled();
    });

    it('closes dropdown after clicking create new guest', async () => {
      const user = userEvent.setup();
      const { mockOnGuestSelect, mockOnCreateNew } = setupMocks();

      render(<GuestAutocomplete onGuestSelect={mockOnGuestSelect} onCreateNew={mockOnCreateNew} />);

      const input = screen.getByPlaceholderText(/search guests by name/i);
      await user.type(input, 'New Person');
      await user.click(screen.getByRole('button', { name: /create new guest profile/i }));

      expect(
        screen.queryByRole('button', { name: /create new guest profile/i })
      ).not.toBeInTheDocument();
    });

    it('shows search query in create button description', async () => {
      const user = userEvent.setup();
      const { mockOnGuestSelect, mockOnCreateNew } = setupMocks();

      render(<GuestAutocomplete onGuestSelect={mockOnGuestSelect} onCreateNew={mockOnCreateNew} />);

      const input = screen.getByPlaceholderText(/search guests by name/i);
      await user.type(input, 'TestQuery');

      expect(screen.getByText(/for "TestQuery"/i)).toBeInTheDocument();
    });
  });

  describe('selected guest display', () => {
    it('displays selected guest card when selectedGuest prop is provided', () => {
      const { mockOnGuestSelect, mockOnCreateNew } = setupMocks();

      render(
        <GuestAutocomplete
          onGuestSelect={mockOnGuestSelect}
          onCreateNew={mockOnCreateNew}
          selectedGuest={guest2}
        />
      );

      expect(screen.getByText('Maria Garcia')).toBeInTheDocument();
      expect(screen.getByText('maria@example.com')).toBeInTheDocument();
      expect(screen.getByText(/Spanish/i)).toBeInTheDocument();
    });

    it('shows VIP badge when guest is VIP', () => {
      const { mockOnGuestSelect, mockOnCreateNew } = setupMocks();

      render(
        <GuestAutocomplete
          onGuestSelect={mockOnGuestSelect}
          onCreateNew={mockOnCreateNew}
          selectedGuest={guest2}
        />
      );

      const vipBadges = screen.getAllByText('VIP');
      expect(vipBadges.length).toBeGreaterThan(0);
    });

    it('shows pet indicator when guest has pets', async () => {
      const user = userEvent.setup();
      const { mockOnGuestSelect, mockOnCreateNew } = setupMocks();

      render(<GuestAutocomplete onGuestSelect={mockOnGuestSelect} onCreateNew={mockOnCreateNew} />);

      const input = screen.getByPlaceholderText(/search guests by name/i);
      await user.type(input, 'Maria');

      expect(screen.getByText('🐕')).toBeInTheDocument();
    });

    it('clears selection when clear button is clicked', async () => {
      const user = userEvent.setup();
      const { mockOnGuestSelect, mockOnCreateNew } = setupMocks();

      render(
        <GuestAutocomplete
          onGuestSelect={mockOnGuestSelect}
          onCreateNew={mockOnCreateNew}
          selectedGuest={guest2}
        />
      );

      const clearButton = screen.getByRole('button', { name: '' });
      await user.click(clearButton);

      expect(mockOnGuestSelect).toHaveBeenCalledWith(null);
    });
  });

  describe('empty state', () => {
    it('shows no results when search query does not match any guests', async () => {
      const user = userEvent.setup();
      const { mockOnGuestSelect, mockOnCreateNew } = setupMocks();

      render(<GuestAutocomplete onGuestSelect={mockOnGuestSelect} onCreateNew={mockOnCreateNew} />);

      const input = screen.getByPlaceholderText(/search guests by name/i);
      await user.type(input, 'xyznotfound');

      // Dropdown should not show any guests
      expect(screen.queryByText('John Smith')).not.toBeInTheDocument();
      expect(screen.queryByText('Maria Garcia')).not.toBeInTheDocument();
    });

    it('handles empty guest list gracefully', () => {
      const { mockOnGuestSelect, mockOnCreateNew } = setupMocks({ guests: [] });

      render(<GuestAutocomplete onGuestSelect={mockOnGuestSelect} onCreateNew={mockOnCreateNew} />);

      expect(screen.getByPlaceholderText(/search guests by name/i)).toBeInTheDocument();
    });

    it('does not crash when searching with empty guest list', async () => {
      const user = userEvent.setup();
      const { mockOnGuestSelect, mockOnCreateNew } = setupMocks({ guests: [] });

      render(<GuestAutocomplete onGuestSelect={mockOnGuestSelect} onCreateNew={mockOnCreateNew} />);

      const input = screen.getByPlaceholderText(/search guests by name/i);
      await user.type(input, 'search');

      expect(input).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('handles loading state gracefully', () => {
      const { mockOnGuestSelect, mockOnCreateNew } = setupMocks({ isLoading: true });

      render(<GuestAutocomplete onGuestSelect={mockOnGuestSelect} onCreateNew={mockOnCreateNew} />);

      expect(screen.getByPlaceholderText(/search guests by name/i)).toBeInTheDocument();
    });
  });

  describe('custom styling', () => {
    it('applies custom className to root element', () => {
      const { mockOnGuestSelect, mockOnCreateNew } = setupMocks();

      const { container } = render(
        <GuestAutocomplete
          onGuestSelect={mockOnGuestSelect}
          onCreateNew={mockOnCreateNew}
          className="custom-class"
        />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });
  });
});
