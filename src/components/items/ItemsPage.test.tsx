import { screen, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import ItemsPage from './ItemsPage';
import { buildItemWithCategory, buildCategory } from '@/test/utils';

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { count?: number; defaultValue?: string }) =>
      opts?.defaultValue ?? opts?.count?.toString() ?? key,
    i18n: { language: 'en' },
  }),
}));

vi.mock('@/stores/authStore', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/lib/queries/hooks/useItems', () => ({
  useItemsWithCounts: vi.fn(),
  useCategories: vi.fn(),
  useDeleteItem: vi.fn(),
}));

// ItemsPage uses useQueryClient directly
vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQueryClient: vi.fn(() => ({ invalidateQueries: vi.fn() })),
  };
});

// Mock dialogs so we can test the page without their internals
vi.mock('./AddItemDialog', () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? React.createElement('div', { 'data-testid': 'add-item-dialog' }) : null,
}));

vi.mock('./EditItemDialog', () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? React.createElement('div', { 'data-testid': 'edit-item-dialog' }) : null,
}));

import { useAuth } from '@/stores/authStore';
import { useItemsWithCounts, useCategories, useDeleteItem } from '@/lib/queries/hooks/useItems';

// ── Test data ─────────────────────────────────────────────────────────────────

const catBeverages = buildCategory({ id: 1, name: 'Beverages' });
const catDairy = buildCategory({ id: 2, name: 'Dairy' });

const item1 = buildItemWithCategory({
  id: 1,
  name: 'Coffee',
  category_id: 1,
  category: { id: 1, name: 'Beverages', requires_expiration: false },
  total_quantity: 20,
  inventory_count: 2,
  minimum_stock: 5,
});
const item2 = buildItemWithCategory({
  id: 2,
  name: 'Milk',
  category_id: 2,
  category: { id: 2, name: 'Dairy', requires_expiration: true },
  total_quantity: 3,
  inventory_count: 1,
  minimum_stock: 10,
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function setupMocks(overrides: { items?: (typeof item1)[]; isLoading?: boolean } = {}) {
  const mockMutate = vi.fn();
  vi.mocked(useAuth).mockReturnValue({ user: { id: 'user-1' } } as ReturnType<typeof useAuth>);
  vi.mocked(useItemsWithCounts).mockReturnValue({
    data: overrides.items ?? [item1, item2],
    isLoading: overrides.isLoading ?? false,
  } as unknown as ReturnType<typeof useItemsWithCounts>);
  vi.mocked(useCategories).mockReturnValue({
    data: [catBeverages, catDairy],
  } as unknown as ReturnType<typeof useCategories>);
  vi.mocked(useDeleteItem).mockReturnValue({
    mutate: mockMutate,
    isPending: false,
  } as unknown as ReturnType<typeof useDeleteItem>);
  return { mockMutate };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ItemsPage', () => {
  afterEach(() => vi.clearAllMocks());

  describe('rendering', () => {
    beforeEach(() => setupMocks());

    it('renders item names', () => {
      render(<ItemsPage />);
      expect(screen.getByText('Coffee')).toBeInTheDocument();
      expect(screen.getByText('Milk')).toBeInTheDocument();
    });

    it('renders category filter options', () => {
      render(<ItemsPage />);
      expect(screen.getByRole('option', { name: 'Beverages' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Dairy' })).toBeInTheDocument();
    });

    it('shows low stock warning badge for items below minimum', () => {
      render(<ItemsPage />);
      // item2 has total_quantity 3 <= minimum_stock 10
      const badges = screen.getAllByText(/lowStock/i);
      expect(badges.length).toBeGreaterThan(0);
    });
  });

  describe('loading state', () => {
    it('shows spinner while loading', () => {
      setupMocks({ isLoading: true, items: [] });
      render(<ItemsPage />);
      // Spinner is a div with animate-spin class — check it exists
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('unauthenticated', () => {
    it('shows login message when user is null', () => {
      vi.mocked(useAuth).mockReturnValue({ user: null } as unknown as ReturnType<typeof useAuth>);
      vi.mocked(useItemsWithCounts).mockReturnValue({
        data: [],
        isLoading: false,
      } as unknown as ReturnType<typeof useItemsWithCounts>);
      vi.mocked(useCategories).mockReturnValue({
        data: [],
      } as unknown as ReturnType<typeof useCategories>);
      vi.mocked(useDeleteItem).mockReturnValue({
        mutate: vi.fn(),
        isPending: false,
      } as unknown as ReturnType<typeof useDeleteItem>);

      render(<ItemsPage />);
      expect(screen.getByText(/logged in/i)).toBeInTheDocument();
    });
  });

  describe('search filter', () => {
    beforeEach(() => setupMocks());

    it('filters items by name', async () => {
      const user = userEvent.setup();
      render(<ItemsPage />);

      await user.type(screen.getByRole('textbox'), 'Coffee');

      expect(screen.getByText('Coffee')).toBeInTheDocument();
      expect(screen.queryByText('Milk')).not.toBeInTheDocument();
    });

    it('filters items case-insensitively', async () => {
      const user = userEvent.setup();
      render(<ItemsPage />);

      await user.type(screen.getByRole('textbox'), 'milk');

      expect(screen.queryByText('Coffee')).not.toBeInTheDocument();
      expect(screen.getByText('Milk')).toBeInTheDocument();
    });
  });

  describe('category filter', () => {
    beforeEach(() => setupMocks());

    it('filters items by category', async () => {
      const user = userEvent.setup();
      render(<ItemsPage />);

      await user.selectOptions(screen.getByRole('combobox'), 'Beverages');

      expect(screen.getByText('Coffee')).toBeInTheDocument();
      expect(screen.queryByText('Milk')).not.toBeInTheDocument();
    });
  });

  describe('add item dialog', () => {
    it('opens add dialog when add button is clicked', async () => {
      setupMocks();
      const user = userEvent.setup();
      render(<ItemsPage />);

      await user.click(screen.getByRole('button', { name: /items\.addItem/i }));

      expect(screen.getByTestId('add-item-dialog')).toBeInTheDocument();
    });
  });

  describe('delete item', () => {
    it('calls delete mutation after confirmation', async () => {
      const { mockMutate } = setupMocks();
      const user = userEvent.setup();
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(<ItemsPage />);

      // Click the first delete button (trash icon)
      const deleteButtons = screen.getAllByRole('button', { name: '' });
      // Find trash buttons — they have no text label, filter by test data
      const trashButtons = deleteButtons.filter((btn) => btn.querySelector('svg') !== null);
      // The edit and delete buttons are paired per card; delete is the last one per card
      // More robust: find by clicking all outline buttons and checking mutate call
      await user.click(trashButtons[1]); // second button = delete for first item

      expect(mockMutate).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
    });

    it('does not call delete mutation when confirmation is cancelled', async () => {
      const { mockMutate } = setupMocks();
      const user = userEvent.setup();
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(<ItemsPage />);

      const deleteButtons = screen.getAllByRole('button', { name: '' });
      const trashButtons = deleteButtons.filter((btn) => btn.querySelector('svg') !== null);
      await user.click(trashButtons[1]);

      expect(mockMutate).not.toHaveBeenCalled();
    });
  });

  describe('empty state', () => {
    it('shows no items message when list is empty', () => {
      setupMocks({ items: [] });
      render(<ItemsPage />);
      expect(screen.getByText('items.noItemsYet')).toBeInTheDocument();
    });

    it('shows no results message when search yields empty', async () => {
      setupMocks();
      const user = userEvent.setup();
      render(<ItemsPage />);

      await user.type(screen.getByRole('textbox'), 'xyznotfound');

      expect(screen.getByText('items.noItemsFound')).toBeInTheDocument();
    });
  });
});
