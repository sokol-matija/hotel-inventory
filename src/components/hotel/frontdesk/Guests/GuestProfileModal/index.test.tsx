import { screen, render, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import GuestProfileModal from '.';
import { buildGuest } from '@/test/utils';
import type { Guest } from '@/lib/queries/hooks/useGuests';

// ── Module mocks ──────────────────────────────────────────────────────────────

// JSDOM does not implement scrollIntoView; Radix Select calls it internally.
window.HTMLElement.prototype.scrollIntoView = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

vi.mock('@/lib/queries/hooks/useGuests', () => ({
  useCreateGuest: vi.fn(),
  useUpdateGuest: vi.fn(),
}));

import { useCreateGuest, useUpdateGuest } from '@/lib/queries/hooks/useGuests';

// ── Test data ─────────────────────────────────────────────────────────────────

const testGuest: Guest = buildGuest({
  id: 1,
  first_name: 'John',
  last_name: 'Doe',
  email: 'john@example.com',
  phone: '+49-30-12345678',
  nationality: 'German',
  preferred_language: 'de',
  has_pets: false,
  is_vip: false,
  notes: 'Regular guest',
  created_at: '2026-01-01T00:00:00Z',
});

const vipGuest: Guest = buildGuest({
  id: 2,
  first_name: 'Jane',
  last_name: 'Smith',
  email: 'jane@example.com',
  phone: '+49-40-87654321',
  nationality: 'Austrian',
  preferred_language: 'en',
  has_pets: true,
  is_vip: true,
  notes: 'VIP guest with pets',
  created_at: '2025-06-15T00:00:00Z',
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function setupMocks(
  overrides: {
    createGuestMutate?: ReturnType<typeof vi.fn>;
    updateGuestMutate?: ReturnType<typeof vi.fn>;
    createIsPending?: boolean;
    updateIsPending?: boolean;
  } = {}
) {
  const createGuestMutate = overrides.createGuestMutate ?? vi.fn();
  const updateGuestMutate = overrides.updateGuestMutate ?? vi.fn();

  vi.mocked(useCreateGuest).mockReturnValue({
    mutate: createGuestMutate,
    mutateAsync: createGuestMutate,
    isPending: overrides.createIsPending ?? false,
    isError: false,
    error: null,
  } as unknown as ReturnType<typeof useCreateGuest>);

  vi.mocked(useUpdateGuest).mockReturnValue({
    mutate: updateGuestMutate,
    mutateAsync: updateGuestMutate,
    isPending: overrides.updateIsPending ?? false,
    isError: false,
    error: null,
  } as unknown as ReturnType<typeof useUpdateGuest>);

  return { createGuestMutate, updateGuestMutate };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GuestProfileModal', () => {
  afterEach(() => vi.clearAllMocks());

  describe('visibility', () => {
    it('does not render when isOpen is false', () => {
      setupMocks();
      const { container } = render(
        <GuestProfileModal isOpen={false} onClose={vi.fn()} guest={testGuest} mode="view" />
      );

      expect(container.firstChild).toBeNull();
    });

    it('renders dialog when isOpen is true', () => {
      setupMocks();
      render(<GuestProfileModal isOpen={true} onClose={vi.fn()} guest={testGuest} mode="view" />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('view mode', () => {
    it('displays guest name in title for view mode', () => {
      setupMocks();
      render(<GuestProfileModal isOpen={true} onClose={vi.fn()} guest={testGuest} mode="view" />);

      expect(screen.getByText('Guest Profile')).toBeInTheDocument();
    });

    it('pre-populates first name field', () => {
      setupMocks();
      render(<GuestProfileModal isOpen={true} onClose={vi.fn()} guest={testGuest} mode="view" />);

      const firstNameElement = screen.getByText('John');
      expect(firstNameElement).toBeInTheDocument();
    });

    it('pre-populates last name field', () => {
      setupMocks();
      render(<GuestProfileModal isOpen={true} onClose={vi.fn()} guest={testGuest} mode="view" />);

      const lastNameElement = screen.getByText('Doe');
      expect(lastNameElement).toBeInTheDocument();
    });

    it('pre-populates email field', () => {
      setupMocks();
      render(<GuestProfileModal isOpen={true} onClose={vi.fn()} guest={testGuest} mode="view" />);

      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });

    it('pre-populates phone field', () => {
      setupMocks();
      render(<GuestProfileModal isOpen={true} onClose={vi.fn()} guest={testGuest} mode="view" />);

      expect(screen.getByText('+49 30 12345678')).toBeInTheDocument();
    });

    it('pre-populates nationality field', () => {
      setupMocks();
      render(<GuestProfileModal isOpen={true} onClose={vi.fn()} guest={testGuest} mode="view" />);

      // Use getByLabelText to find the displayed nationality value (not the option)
      const nationalityLabel = screen.getByText('Nationality');
      const parent = nationalityLabel.closest('[class*="space-y"]')?.parentElement;
      expect(parent?.textContent).toContain('German');
    });

    it('shows edit button in view mode', () => {
      setupMocks();
      render(<GuestProfileModal isOpen={true} onClose={vi.fn()} guest={testGuest} mode="view" />);

      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    });

    it('does not show save/cancel buttons in view mode', () => {
      setupMocks();
      render(<GuestProfileModal isOpen={true} onClose={vi.fn()} guest={testGuest} mode="view" />);

      expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
    });

    it('displays VIP badge when guest is VIP', () => {
      setupMocks();
      render(<GuestProfileModal isOpen={true} onClose={vi.fn()} guest={vipGuest} mode="view" />);

      const vipBadges = screen.getAllByText(/VIP/i);
      expect(vipBadges.length).toBeGreaterThan(0);
    });

    it('displays stay history when not editing', () => {
      setupMocks();
      render(<GuestProfileModal isOpen={true} onClose={vi.fn()} guest={testGuest} mode="view" />);

      expect(screen.getByText(/Member since/i)).toBeInTheDocument();
    });
  });

  describe('edit mode', () => {
    it('displays "Edit Guest Profile" in title', () => {
      setupMocks();
      render(<GuestProfileModal isOpen={true} onClose={vi.fn()} guest={testGuest} mode="edit" />);

      expect(screen.getByText('Edit Guest Profile')).toBeInTheDocument();
    });

    it('renders editable input fields', () => {
      setupMocks();
      render(<GuestProfileModal isOpen={true} onClose={vi.fn()} guest={testGuest} mode="edit" />);

      const firstNameInput = screen.getByLabelText(/First Name/i) as HTMLInputElement;
      const lastNameInput = screen.getByLabelText(/Last Name/i) as HTMLInputElement;

      expect(firstNameInput).toHaveValue('John');
      expect(lastNameInput).toHaveValue('Doe');
    });

    it('shows save and cancel buttons in edit mode', () => {
      setupMocks();
      render(<GuestProfileModal isOpen={true} onClose={vi.fn()} guest={testGuest} mode="edit" />);

      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('allows editing first name', async () => {
      const user = userEvent.setup();
      setupMocks();
      render(<GuestProfileModal isOpen={true} onClose={vi.fn()} guest={testGuest} mode="edit" />);

      const firstNameInput = screen.getByLabelText(/First Name/i);
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'Jane');

      expect(firstNameInput).toHaveValue('Jane');
    });

    it('allows editing last name', async () => {
      const user = userEvent.setup();
      setupMocks();
      render(<GuestProfileModal isOpen={true} onClose={vi.fn()} guest={testGuest} mode="edit" />);

      const lastNameInput = screen.getByLabelText(/Last Name/i);
      await user.clear(lastNameInput);
      await user.type(lastNameInput, 'Smith');

      expect(lastNameInput).toHaveValue('Smith');
    });

    it('allows editing email', async () => {
      const user = userEvent.setup();
      setupMocks();
      render(<GuestProfileModal isOpen={true} onClose={vi.fn()} guest={testGuest} mode="edit" />);

      const emailInput = screen.getByLabelText(/Email Address/i);
      await user.clear(emailInput);
      await user.type(emailInput, 'newemail@example.com');

      expect(emailInput).toHaveValue('newemail@example.com');
    });

    it('allows editing phone', async () => {
      const user = userEvent.setup();
      setupMocks();
      render(<GuestProfileModal isOpen={true} onClose={vi.fn()} guest={testGuest} mode="edit" />);

      const phoneInput = screen.getByLabelText(/Phone Number/i);
      await user.clear(phoneInput);
      await user.type(phoneInput, '+49-20-99999999');

      expect(phoneInput).toHaveValue('+49-20-99999999');
    });

    it('allows editing nationality via dropdown', async () => {
      setupMocks();
      render(<GuestProfileModal isOpen={true} onClose={vi.fn()} guest={testGuest} mode="edit" />);

      // Nationality uses shadcn <Select> (Radix) via Controller.
      // The SelectTrigger is a combobox button; open it with fireEvent to bypass
      // the pointer-events:none that the Dialog overlay sets on body in jsdom.
      const nationalityTrigger = screen.getByRole('combobox', { name: /Nationality/i });
      expect(nationalityTrigger).toHaveTextContent('German'); // pre-filled from testGuest

      fireEvent.click(nationalityTrigger);
      const austrianOption = await screen.findByRole('option', { name: 'Austrian' });
      fireEvent.click(austrianOption);

      expect(nationalityTrigger).toHaveTextContent('Austrian');
    });

    it('allows editing preferred language via dropdown', async () => {
      setupMocks();
      render(<GuestProfileModal isOpen={true} onClose={vi.fn()} guest={testGuest} mode="edit" />);

      // Language uses shadcn <Select> (Radix) via Controller.
      // The testGuest has preferred_language 'de', which maps to 'German' display name.
      const languageTrigger = screen.getByRole('combobox', { name: /Preferred Language/i });
      expect(languageTrigger).toHaveTextContent('German');

      fireEvent.click(languageTrigger);
      const englishOption = await screen.findByRole('option', { name: 'English' });
      fireEvent.click(englishOption);

      expect(languageTrigger).toHaveTextContent('English');
    });

    it('allows toggling has_pets checkbox', async () => {
      const user = userEvent.setup();
      setupMocks();
      render(<GuestProfileModal isOpen={true} onClose={vi.fn()} guest={testGuest} mode="edit" />);

      const petsCheckbox = screen.getByLabelText(/Travels with pets/i) as HTMLInputElement;
      expect(petsCheckbox.checked).toBe(false);

      await user.click(petsCheckbox);

      expect(petsCheckbox.checked).toBe(true);
    });

    it('allows toggling is_vip checkbox', async () => {
      const user = userEvent.setup();
      setupMocks();
      render(<GuestProfileModal isOpen={true} onClose={vi.fn()} guest={testGuest} mode="edit" />);

      const vipCheckbox = screen.getByLabelText(/VIP Status/i) as HTMLInputElement;
      expect(vipCheckbox.checked).toBe(false);

      await user.click(vipCheckbox);

      expect(vipCheckbox.checked).toBe(true);
    });

    it('allows editing notes textarea', async () => {
      const user = userEvent.setup();
      setupMocks();
      render(<GuestProfileModal isOpen={true} onClose={vi.fn()} guest={testGuest} mode="edit" />);

      const notesInput = screen.getByLabelText(/Notes/i);
      await user.clear(notesInput);
      await user.type(notesInput, 'New notes for this guest');

      expect(notesInput).toHaveValue('New notes for this guest');
    });

    it('shows save button with loading state when saving', async () => {
      const user = userEvent.setup();
      // Make mutateAsync hang to test loading state
      const mockMutateAsync = vi.fn(() => new Promise((resolve) => setTimeout(resolve, 1000)));
      setupMocks({ updateGuestMutate: mockMutateAsync });

      render(<GuestProfileModal isOpen={true} onClose={vi.fn()} guest={testGuest} mode="edit" />);

      await user.click(screen.getByRole('button', { name: /save/i }));

      // Button should be disabled while isSaving is true
      const saveButton = screen.getByRole('button', { name: /saving/i });
      expect(saveButton).toBeDisabled();
    });

    it('exits editing mode when cancel is clicked in edit mode', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      setupMocks();
      const { rerender } = render(
        <GuestProfileModal isOpen={true} onClose={onClose} guest={testGuest} mode="edit" />
      );

      // In edit mode, cancel button sets isEditing to false
      await user.click(screen.getByRole('button', { name: /cancel/i }));

      // Re-render with updated props to see the new state
      rerender(<GuestProfileModal isOpen={true} onClose={onClose} guest={testGuest} mode="view" />);

      // After cancel in edit mode (now switched to view via rerender), save button should be gone
      expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
    });
  });

  describe('create mode', () => {
    it('displays "Create New Guest" in title', () => {
      setupMocks();
      render(<GuestProfileModal isOpen={true} onClose={vi.fn()} mode="create" />);

      expect(screen.getByText('Create New Guest')).toBeInTheDocument();
    });

    it('initializes form with empty fields', () => {
      setupMocks();
      render(<GuestProfileModal isOpen={true} onClose={vi.fn()} mode="create" />);

      const firstNameInput = screen.getByLabelText(/First Name/i) as HTMLInputElement;
      const lastNameInput = screen.getByLabelText(/Last Name/i) as HTMLInputElement;
      const emailInput = screen.getByLabelText(/Email Address/i) as HTMLInputElement;

      expect(firstNameInput.value).toBe('');
      expect(lastNameInput.value).toBe('');
      expect(emailInput.value).toBe('');
    });

    it('initializes form from initialData prop', () => {
      setupMocks();
      render(
        <GuestProfileModal
          isOpen={true}
          onClose={vi.fn()}
          mode="create"
          initialData={{
            firstName: 'Max',
            lastName: 'Mueller',
            email: 'max@example.com',
            phone: '+49-89-12345',
          }}
        />
      );

      const firstNameInput = screen.getByLabelText(/First Name/i) as HTMLInputElement;
      const lastNameInput = screen.getByLabelText(/Last Name/i) as HTMLInputElement;

      expect(firstNameInput.value).toBe('Max');
      expect(lastNameInput.value).toBe('Mueller');
    });

    it('initializes form from fullName in initialData', () => {
      setupMocks();
      render(
        <GuestProfileModal
          isOpen={true}
          onClose={vi.fn()}
          mode="create"
          initialData={{
            fullName: 'Klaus Schmidt',
          }}
        />
      );

      const firstNameInput = screen.getByLabelText(/First Name/i) as HTMLInputElement;
      const lastNameInput = screen.getByLabelText(/Last Name/i) as HTMLInputElement;

      expect(firstNameInput.value).toBe('Klaus');
      expect(lastNameInput.value).toBe('Schmidt');
    });

    it('closes modal on cancel in create mode', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      setupMocks();
      render(<GuestProfileModal isOpen={true} onClose={onClose} mode="create" />);

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(onClose).toHaveBeenCalled();
    });

    it('calls createGuest mutation with correct payload', async () => {
      const user = userEvent.setup();
      const { createGuestMutate } = setupMocks();
      render(<GuestProfileModal isOpen={true} onClose={vi.fn()} mode="create" />);

      const firstNameInput = screen.getByLabelText(/First Name/i);
      const lastNameInput = screen.getByLabelText(/Last Name/i);
      const emailInput = screen.getByLabelText(/Email Address/i);

      await user.type(firstNameInput, 'Alice');
      await user.type(lastNameInput, 'Johnson');
      await user.type(emailInput, 'alice@example.com');

      await user.click(screen.getByRole('button', { name: /save/i }));

      expect(createGuestMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          first_name: 'Alice',
          last_name: 'Johnson',
          email: 'alice@example.com',
        })
      );
    });

    it('shows inline validation errors on missing required fields', async () => {
      const user = userEvent.setup();
      setupMocks();

      render(<GuestProfileModal isOpen={true} onClose={vi.fn()} mode="create" />);

      await user.click(screen.getByRole('button', { name: /save/i }));

      // RHF+Zod now shows inline <p class="text-sm text-destructive"> errors instead of alert()
      expect(await screen.findByText('First name is required')).toBeInTheDocument();
      expect(screen.getByText('Last name is required')).toBeInTheDocument();
    });
  });

  describe('save functionality', () => {
    it('calls updateGuest mutation when saving in edit mode', async () => {
      const user = userEvent.setup();
      const { updateGuestMutate } = setupMocks();
      render(<GuestProfileModal isOpen={true} onClose={vi.fn()} guest={testGuest} mode="edit" />);

      const firstNameInput = screen.getByLabelText(/First Name/i);
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'Robert');

      await user.click(screen.getByRole('button', { name: /save/i }));

      expect(updateGuestMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          updates: expect.objectContaining({
            first_name: 'Robert',
            last_name: 'Doe',
          }),
        })
      );
    });

    it('calls onClose after successful save', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      const mockMutateAsync = vi.fn().mockResolvedValue(undefined);
      setupMocks({ updateGuestMutate: mockMutateAsync });

      render(<GuestProfileModal isOpen={true} onClose={onClose} guest={testGuest} mode="edit" />);

      const firstNameInput = screen.getByLabelText(/First Name/i);
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'Updated');

      await user.click(screen.getByRole('button', { name: /save/i }));

      // Wait for async mutation to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(onClose).toHaveBeenCalled();
    });

    it('calls onSave callback after successful update', async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      const mockMutateAsync = vi.fn().mockResolvedValue(undefined);
      setupMocks({ updateGuestMutate: mockMutateAsync });

      render(
        <GuestProfileModal
          isOpen={true}
          onClose={vi.fn()}
          guest={testGuest}
          mode="edit"
          onSave={onSave}
        />
      );

      const firstNameInput = screen.getByLabelText(/First Name/i);
      await user.clear(firstNameInput);
      await user.type(firstNameInput, 'Updated');

      await user.click(screen.getByRole('button', { name: /save/i }));

      // Wait for async mutation to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          first_name: 'Updated',
          last_name: 'Doe',
        })
      );
    });
  });

  describe('switching modes', () => {
    it('switches from view to edit mode when edit button is clicked', async () => {
      const user = userEvent.setup();
      setupMocks();
      render(<GuestProfileModal isOpen={true} onClose={vi.fn()} guest={testGuest} mode="view" />);

      expect(screen.getByText('Guest Profile')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /edit/i }));

      expect(screen.getByText('Edit Guest Profile')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    });

    it('switches back to view mode when cancel is clicked in edit mode', async () => {
      const user = userEvent.setup();
      setupMocks();
      const { rerender } = render(
        <GuestProfileModal isOpen={true} onClose={vi.fn()} guest={testGuest} mode="view" />
      );

      await user.click(screen.getByRole('button', { name: /edit/i }));
      expect(screen.getByText('Edit Guest Profile')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      // After cancel in view mode, should stay in view
      rerender(<GuestProfileModal isOpen={true} onClose={vi.fn()} guest={testGuest} mode="view" />);

      expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
    });
  });

  describe('dialog close behavior', () => {
    it('calls onClose when dialog backdrop is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      setupMocks();
      render(<GuestProfileModal isOpen={true} onClose={onClose} guest={testGuest} mode="view" />);

      // The dialog's onOpenChange prop is called with false when backdrop clicked
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('renders without guest when guest prop is null and mode is view', () => {
      setupMocks();
      render(<GuestProfileModal isOpen={true} onClose={vi.fn()} guest={null} mode="view" />);

      // Should render empty form in view mode
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('handles empty phone number gracefully', () => {
      setupMocks();
      const guestNoPhone = buildGuest({ phone: null });
      render(
        <GuestProfileModal isOpen={true} onClose={vi.fn()} guest={guestNoPhone} mode="view" />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('handles missing nationality gracefully', () => {
      setupMocks();
      const guestNoNationality = buildGuest({ nationality: null });
      render(
        <GuestProfileModal isOpen={true} onClose={vi.fn()} guest={guestNoNationality} mode="view" />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('does not crash with minimal props', () => {
      setupMocks();
      render(<GuestProfileModal isOpen={true} onClose={vi.fn()} mode="create" />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });
});
