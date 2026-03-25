import { screen, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import AddLocationDialog from './AddLocationDialog';

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

vi.mock('@/lib/queries/hooks/useLocations', () => ({
  useCreateLocation: vi.fn(),
}));

// Radix UI Select doesn't work in jsdom — replace with native HTML equivalents
vi.mock('@/components/ui/select', () => ({
  Select: ({
    children,
    onValueChange,
    value,
  }: {
    children: React.ReactNode;
    onValueChange?: (v: string) => void;
    value?: string;
  }) =>
    React.createElement(
      'select',
      {
        value,
        onChange: (e: React.ChangeEvent<HTMLSelectElement>) => onValueChange?.(e.target.value),
        'data-testid': 'location-type-select',
      },
      children
    ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
  SelectContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) =>
    React.createElement('option', { value }, children),
  SelectValue: ({ placeholder }: { placeholder?: string }) =>
    React.createElement('option', { value: '', disabled: true }, placeholder),
}));

import { useCreateLocation } from '@/lib/queries/hooks/useLocations';

// ── Helpers ───────────────────────────────────────────────────────────────────

function renderDialog(props: Partial<React.ComponentProps<typeof AddLocationDialog>> = {}) {
  const defaults = {
    isOpen: true,
    onClose: vi.fn(),
    onLocationAdded: vi.fn(),
  };
  return render(<AddLocationDialog {...defaults} {...props} />);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AddLocationDialog', () => {
  let mockMutate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockMutate = vi.fn();
    vi.mocked(useCreateLocation).mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    } as unknown as ReturnType<typeof useCreateLocation>);
  });

  afterEach(() => vi.clearAllMocks());

  it('renders the dialog when isOpen is true', () => {
    renderDialog();
    expect(screen.getByRole('button', { name: /add location/i })).toBeInTheDocument();
  });

  it('calls mutate with correct data on valid submit', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByLabelText(/locations\.locationName/i), 'Main Kitchen');
    await user.selectOptions(screen.getByTestId('location-type-select'), 'kitchen');
    await user.click(screen.getByRole('button', { name: /add location/i }));

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Main Kitchen', type: 'kitchen' }),
      expect.any(Object)
    );
  });

  it('auto-sets is_refrigerated for refrigerator type', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByLabelText(/locations\.locationName/i), 'Walk-in Fridge');
    await user.selectOptions(screen.getByTestId('location-type-select'), 'refrigerator');

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
    expect(checkbox).toBeDisabled();
  });

  it('auto-sets is_refrigerated for freezer type', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByLabelText(/locations\.locationName/i), 'Freezer');
    await user.selectOptions(screen.getByTestId('location-type-select'), 'freezer');

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
    expect(checkbox).toBeDisabled();
  });

  it('does not auto-set is_refrigerated for storage type', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.selectOptions(screen.getByTestId('location-type-select'), 'storage');

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
    expect(checkbox).not.toBeDisabled();
  });

  it('calls onClose when cancel is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderDialog({ onClose });

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onClose).toHaveBeenCalled();
  });

  it('disables submit button while pending', () => {
    vi.mocked(useCreateLocation).mockReturnValue({
      mutate: mockMutate,
      isPending: true,
    } as unknown as ReturnType<typeof useCreateLocation>);

    renderDialog();

    expect(screen.getByRole('button', { name: /adding/i })).toBeDisabled();
  });
});
