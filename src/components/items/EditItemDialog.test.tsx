import { screen, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import EditItemDialog from './EditItemDialog';
import { buildItemWithCategory } from '@/test/utils';
import type { ItemWithCategory } from '@/lib/queries/hooks/useItems';

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

vi.mock('@/lib/queries/hooks/useItems', () => ({
  useCategories: vi.fn(),
  useUpdateItem: vi.fn(),
}));

import { useCategories, useUpdateItem } from '@/lib/queries/hooks/useItems';

// ── Test data ─────────────────────────────────────────────────────────────────

const categories = [
  { id: 1, name: 'Beverages', requires_expiration: false, created_at: '2026-01-01T00:00:00Z' },
  { id: 2, name: 'Dairy', requires_expiration: true, created_at: '2026-01-01T00:00:00Z' },
];

const testItem: ItemWithCategory = buildItemWithCategory({
  id: 10,
  name: 'Coffee',
  unit: 'kg',
  minimum_stock: 5,
  price: 12.5,
  description: 'Good coffee',
  category_id: 1,
  category: { id: 1, name: 'Beverages', requires_expiration: false },
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderDialog(props: Partial<React.ComponentProps<typeof EditItemDialog>> = {}) {
  const defaults = {
    isOpen: true,
    onClose: vi.fn(),
    onItemUpdated: vi.fn(),
    item: testItem,
  };
  return render(<EditItemDialog {...defaults} {...props} />);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('EditItemDialog', () => {
  let mockMutate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockMutate = vi.fn();
    vi.mocked(useCategories).mockReturnValue({
      data: categories,
      isLoading: false,
    } as unknown as ReturnType<typeof useCategories>);
    vi.mocked(useUpdateItem).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateItem>);
  });

  afterEach(() => vi.clearAllMocks());

  it('pre-fills item name from prop', () => {
    renderDialog();
    // Label is rendered as the i18n key "items.itemName *" since t() returns the key
    const nameInput = screen.getByLabelText(/items\.itemName/i);
    expect(nameInput).toHaveValue('Coffee');
  });

  it('pre-fills unit from prop', () => {
    renderDialog();
    const unitInput = screen.getByLabelText(/unit/i);
    expect(unitInput).toHaveValue('kg');
  });

  it('pre-fills minimum stock from prop', () => {
    renderDialog();
    // Label is rendered as the i18n key "common.minStock *" since t() returns the key
    const minStockInput = screen.getByLabelText(/common\.minStock/i);
    expect(minStockInput).toHaveValue(5);
  });

  it('pre-fills price from prop', () => {
    renderDialog();
    const priceInput = screen.getByLabelText(/price/i);
    expect(priceInput).toHaveValue(12.5);
  });

  it('calls mutate with correct id and data on submit', async () => {
    const user = userEvent.setup();
    renderDialog();

    // Clear and retype name
    const nameInput = screen.getByLabelText(/items\.itemName/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Updated Coffee');

    await user.click(screen.getByRole('button', { name: /items\.updateItem/i }));

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 10,
        data: expect.objectContaining({ name: 'Updated Coffee' }),
        oldData: expect.objectContaining({ name: 'Coffee' }),
      }),
      expect.any(Object)
    );
  });

  it('calls onClose when cancel is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderDialog({ onClose });

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onClose).toHaveBeenCalled();
  });

  it('disables submit button while update is pending', () => {
    vi.mocked(useUpdateItem).mockReturnValue({
      mutate: mockMutate,
      isPending: true,
    } as unknown as ReturnType<typeof useUpdateItem>);

    renderDialog();

    expect(screen.getByRole('button', { name: /updating/i })).toBeDisabled();
  });

  it('hides category select while categories are loading', () => {
    vi.mocked(useCategories).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as unknown as ReturnType<typeof useCategories>);

    renderDialog();

    // Skeleton replaces the Select — category combobox should not be visible
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    // Loading text should also be gone (we removed the Loader2 spinner)
    expect(screen.queryByText('common.loadingCategories')).not.toBeInTheDocument();
  });
});
