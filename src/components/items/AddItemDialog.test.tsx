import { screen, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import AddItemDialog from './AddItemDialog';

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

vi.mock('@/lib/queries/hooks/useItems', () => ({
  useCategories: vi.fn(),
  useCreateItem: vi.fn(),
}));

import { useCategories, useCreateItem } from '@/lib/queries/hooks/useItems';

// ── Helpers ───────────────────────────────────────────────────────────────────

const categories = [
  { id: 1, name: 'Beverages', requires_expiration: false, created_at: '2026-01-01T00:00:00Z' },
  { id: 2, name: 'Dairy', requires_expiration: true, created_at: '2026-01-01T00:00:00Z' },
];

function renderDialog(props: Partial<React.ComponentProps<typeof AddItemDialog>> = {}) {
  const defaults = {
    isOpen: true,
    onClose: vi.fn(),
    onItemAdded: vi.fn(),
  };
  return render(<AddItemDialog {...defaults} {...props} />);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AddItemDialog', () => {
  let mockMutate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockMutate = vi.fn();
    vi.mocked(useCategories).mockReturnValue({
      data: categories,
      isLoading: false,
    } as unknown as ReturnType<typeof useCategories>);
    vi.mocked(useCreateItem).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    } as unknown as ReturnType<typeof useCreateItem>);
  });

  afterEach(() => vi.clearAllMocks());

  it('renders the dialog when isOpen is true', () => {
    renderDialog();
    expect(screen.getByRole('button', { name: /items\.addItem/i })).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    const { container } = renderDialog({ isOpen: false });
    expect(container).toBeEmptyDOMElement();
  });

  it('renders category options from hook', () => {
    renderDialog();
    expect(screen.getByRole('option', { name: 'Beverages' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Dairy' })).toBeInTheDocument();
  });

  it('shows validation error when name is empty on submit', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole('button', { name: /items\.addItem/i }));

    expect(screen.getByText('validation.nameRequired')).toBeInTheDocument();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('shows validation error when category is not selected', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByLabelText(/items\.itemName/i), 'Coffee');
    await user.click(screen.getByRole('button', { name: /items\.addItem/i }));

    expect(screen.getByText('validation.categoryRequired')).toBeInTheDocument();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('calls mutate with correct data on valid submit', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByLabelText(/items\.itemName/i), 'Coffee');
    await user.selectOptions(screen.getByRole('combobox', { name: /common\.category/i }), '1');
    await user.click(screen.getByRole('button', { name: /items\.addItem/i }));

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Coffee', category_id: 1 }),
      expect.any(Object)
    );
  });

  it('shows expiration warning for perishable category', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.selectOptions(screen.getByRole('combobox', { name: /common\.category/i }), '2');

    expect(screen.getByText('items.expirationWarning')).toBeInTheDocument();
  });

  it('calls onClose when cancel is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderDialog({ onClose });

    await user.click(screen.getByRole('button', { name: /common\.cancel/i }));

    expect(onClose).toHaveBeenCalled();
  });

  it('disables submit button while pending', () => {
    vi.mocked(useCreateItem).mockReturnValue({
      mutate: mockMutate,
      isPending: true,
    } as unknown as ReturnType<typeof useCreateItem>);

    renderDialog();

    expect(screen.getByRole('button', { name: /common\.adding/i })).toBeDisabled();
  });
});
