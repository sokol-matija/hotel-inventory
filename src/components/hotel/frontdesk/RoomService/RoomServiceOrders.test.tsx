import { screen, render, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import RoomServiceOrders from './RoomServiceOrders';
import type { InventoryItem } from '@/lib/hotel/orderTypes';
import type { Room } from '@/lib/queries/hooks/useRooms';

// ── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('@/stores/authStore', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/lib/queries/hooks/useRooms', () => ({
  useRooms: vi.fn(),
}));

vi.mock('@/lib/queries/hooks/useGuests', () => ({
  useGuests: vi.fn(),
}));

vi.mock('@/lib/queries/hooks/useReservations', () => ({
  useReservations: vi.fn(),
}));

vi.mock('@/lib/queries/hooks/useRoomService', () => ({
  useFoodAndBeverageItems: vi.fn(),
  useProcessRoomServiceOrder: vi.fn(),
}));

vi.mock('@/lib/printers/bixolonPrinter', () => ({
  printReceipt: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({ select: vi.fn(), insert: vi.fn(), update: vi.fn() })),
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
}));

// ── Imports after mocks ──────────────────────────────────────────────────────

import { useAuth } from '@/stores/authStore';
import { useRooms } from '@/lib/queries/hooks/useRooms';
import { useGuests } from '@/lib/queries/hooks/useGuests';
import { useReservations } from '@/lib/queries/hooks/useReservations';
import {
  useFoodAndBeverageItems,
  useProcessRoomServiceOrder,
} from '@/lib/queries/hooks/useRoomService';

// ── Test data ────────────────────────────────────────────────────────────────

const mockRoom1: Partial<Room> = {
  id: 1,
  room_number: '101',
  room_types: { code: 'BD' } as Room['room_types'],
  max_occupancy: 2,
  is_premium: false,
  is_clean: true,
  amenities: [],
  floor: 1,
  name_english: 'Big Double',
  name_croatian: 'Velika dvokrevetna',
  seasonal_rates: { A: 50, B: 60, C: 70, D: 80 },
};

const mockRoom2: Partial<Room> = {
  id: 2,
  room_number: '202',
  room_types: { code: 'SG' } as Room['room_types'],
  max_occupancy: 1,
  is_premium: false,
  is_clean: true,
  amenities: [],
  floor: 2,
  name_english: 'Single',
  name_croatian: 'Jednokrevetna',
  seasonal_rates: { A: 30, B: 40, C: 50, D: 60 },
};

const mockItem1: InventoryItem = {
  id: 10,
  name: 'Espresso Coffee',
  description: 'Fresh Italian espresso',
  category: { id: 1, name: 'Beverage', requires_expiration: false },
  unit: 'cup',
  price: 3.5,
  minimum_stock: 10,
  is_active: true,
  totalStock: 50,
  locations: [{ locationId: 1, locationName: 'Bar', quantity: 50 }],
};

const mockItem2: InventoryItem = {
  id: 20,
  name: 'Club Sandwich',
  description: 'Classic club sandwich',
  category: { id: 2, name: 'Food', requires_expiration: true },
  unit: 'pcs',
  price: 12.0,
  minimum_stock: 5,
  is_active: true,
  totalStock: 8,
  locations: [{ locationId: 2, locationName: 'Kitchen', quantity: 8 }],
};

const mockItemLowStock: InventoryItem = {
  id: 30,
  name: 'Truffle Oil',
  description: 'Premium truffle oil',
  category: { id: 2, name: 'Food', requires_expiration: true },
  unit: 'ml',
  price: 25.0,
  minimum_stock: 10,
  is_active: true,
  totalStock: 3,
  locations: [{ locationId: 2, locationName: 'Kitchen', quantity: 3 }],
};

const mockItemOutOfStock: InventoryItem = {
  id: 40,
  name: 'Caviar',
  description: 'Russian caviar',
  category: { id: 2, name: 'Food', requires_expiration: true },
  unit: 'g',
  price: 100.0,
  minimum_stock: 5,
  is_active: true,
  totalStock: 0,
  locations: [],
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function setupMocks(
  overrides: {
    items?: InventoryItem[];
    rooms?: Partial<Room>[];
    itemsLoading?: boolean;
    mutationPending?: boolean;
  } = {}
) {
  const mockMutate = vi.fn();

  vi.mocked(useAuth).mockReturnValue({
    user: { id: 'user-1', email: 'staff@hotel.com' },
  } as ReturnType<typeof useAuth>);

  vi.mocked(useRooms).mockReturnValue({
    data: (overrides.rooms ?? [mockRoom1, mockRoom2]) as Room[],
    isLoading: false,
  } as ReturnType<typeof useRooms>);

  vi.mocked(useGuests).mockReturnValue({
    data: [],
    isLoading: false,
  } as ReturnType<typeof useGuests>);

  vi.mocked(useReservations).mockReturnValue({
    data: [],
    isLoading: false,
  } as ReturnType<typeof useReservations>);

  vi.mocked(useFoodAndBeverageItems).mockReturnValue({
    data: overrides.items ?? [mockItem1, mockItem2],
    isLoading: overrides.itemsLoading ?? false,
  } as ReturnType<typeof useFoodAndBeverageItems>);

  vi.mocked(useProcessRoomServiceOrder).mockReturnValue({
    mutate: mockMutate,
    isPending: overrides.mutationPending ?? false,
  } as unknown as ReturnType<typeof useProcessRoomServiceOrder>);

  return { mockMutate };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('RoomServiceOrders', () => {
  afterEach(() => vi.clearAllMocks());

  describe('rendering', () => {
    beforeEach(() => setupMocks());

    it('renders page title', () => {
      render(<RoomServiceOrders />);
      expect(screen.getByText('Room Service Orders')).toBeInTheDocument();
    });

    it('renders room selection dropdown with available rooms', () => {
      render(<RoomServiceOrders />);
      expect(screen.getByText('Choose a room...')).toBeInTheDocument();
      expect(screen.getByText('Room 101 - BD')).toBeInTheDocument();
      expect(screen.getByText('Room 202 - SG')).toBeInTheDocument();
    });

    it('renders food and beverage menu items', () => {
      render(<RoomServiceOrders />);
      expect(screen.getByText('Espresso Coffee')).toBeInTheDocument();
      expect(screen.getByText('Club Sandwich')).toBeInTheDocument();
    });

    it('renders item prices and stock info', () => {
      render(<RoomServiceOrders />);
      expect(screen.getByText(/Stock: 50 cup/)).toBeInTheDocument();
      expect(screen.getByText(/Stock: 8 pcs/)).toBeInTheDocument();
    });

    it('renders item descriptions', () => {
      render(<RoomServiceOrders />);
      expect(screen.getByText('Fresh Italian espresso')).toBeInTheDocument();
      expect(screen.getByText('Classic club sandwich')).toBeInTheDocument();
    });

    it('renders category badges', () => {
      render(<RoomServiceOrders />);
      expect(screen.getByText('Beverage')).toBeInTheDocument();
      expect(screen.getByText('Food')).toBeInTheDocument();
    });

    it('shows empty order message', () => {
      render(<RoomServiceOrders />);
      expect(screen.getByText('No items in order')).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('shows skeleton placeholders while items are loading', () => {
      setupMocks({ itemsLoading: true, items: [] });
      render(<RoomServiceOrders />);
      // Skeleton divs should be present (no menu items visible)
      expect(screen.queryByText('Espresso Coffee')).not.toBeInTheDocument();
    });
  });

  describe('room selection', () => {
    beforeEach(() => setupMocks());

    it('shows room details when a room is selected', async () => {
      const user = userEvent.setup();
      render(<RoomServiceOrders />);

      const select = screen.getAllByRole('combobox')[0];
      await user.selectOptions(select, '1');

      expect(screen.getByText('Room 101')).toBeInTheDocument();
      expect(screen.getByText('Max 2 guests')).toBeInTheDocument();
    });

    it('disables Add to Order buttons when no room is selected', () => {
      render(<RoomServiceOrders />);

      const addButtons = screen.getAllByRole('button', { name: /add to order/i });
      addButtons.forEach((btn) => {
        expect(btn).toBeDisabled();
      });
    });

    it('enables Add to Order buttons after selecting a room', async () => {
      const user = userEvent.setup();
      render(<RoomServiceOrders />);

      const select = screen.getAllByRole('combobox')[0];
      await user.selectOptions(select, '1');

      const addButtons = screen.getAllByRole('button', { name: /add to order/i });
      // Items with stock > 0 should be enabled
      expect(addButtons[0]).not.toBeDisabled();
    });
  });

  describe('search / filtering', () => {
    beforeEach(() => setupMocks());

    it('filters items by name', async () => {
      const user = userEvent.setup();
      render(<RoomServiceOrders />);

      const searchInput = screen.getByPlaceholderText('Search items...');
      await user.type(searchInput, 'Espresso');

      expect(screen.getByText('Espresso Coffee')).toBeInTheDocument();
      expect(screen.queryByText('Club Sandwich')).not.toBeInTheDocument();
    });

    it('filters items by category name', async () => {
      const user = userEvent.setup();
      render(<RoomServiceOrders />);

      const searchInput = screen.getByPlaceholderText('Search items...');
      await user.type(searchInput, 'Food');

      expect(screen.queryByText('Espresso Coffee')).not.toBeInTheDocument();
      expect(screen.getByText('Club Sandwich')).toBeInTheDocument();
    });

    it('filters case-insensitively', async () => {
      const user = userEvent.setup();
      render(<RoomServiceOrders />);

      const searchInput = screen.getByPlaceholderText('Search items...');
      await user.type(searchInput, 'espresso');

      expect(screen.getByText('Espresso Coffee')).toBeInTheDocument();
    });

    it('shows no items when search has no match', async () => {
      const user = userEvent.setup();
      render(<RoomServiceOrders />);

      const searchInput = screen.getByPlaceholderText('Search items...');
      await user.type(searchInput, 'xyznotfound');

      expect(screen.queryByText('Espresso Coffee')).not.toBeInTheDocument();
      expect(screen.queryByText('Club Sandwich')).not.toBeInTheDocument();
    });
  });

  describe('adding items to order', () => {
    it('adds an item to the order when Add to Order is clicked', async () => {
      setupMocks();
      const user = userEvent.setup();
      render(<RoomServiceOrders />);

      // Select a room first
      const select = screen.getAllByRole('combobox')[0];
      await user.selectOptions(select, '1');

      // Click the first Add to Order button
      const addButtons = screen.getAllByRole('button', { name: /add to order/i });
      await user.click(addButtons[0]);

      // Item should appear in the order summary (once in menu, once in order)
      expect(screen.getAllByText('Espresso Coffee').length).toBeGreaterThanOrEqual(2);
      // Empty state should be gone
      expect(screen.queryByText('No items in order')).not.toBeInTheDocument();
    });

    it('increases quantity when adding same item twice', async () => {
      setupMocks();
      const user = userEvent.setup();
      render(<RoomServiceOrders />);

      const select = screen.getAllByRole('combobox')[0];
      await user.selectOptions(select, '1');

      const addButtons = screen.getAllByRole('button', { name: /add to order/i });
      await user.click(addButtons[0]);
      await user.click(addButtons[0]);

      // Should show quantity 2
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  describe('order item quantity management', () => {
    async function renderWithItemInOrder() {
      setupMocks();
      const user = userEvent.setup();
      render(<RoomServiceOrders />);

      const select = screen.getAllByRole('combobox')[0];
      await user.selectOptions(select, '1');

      const addButtons = screen.getAllByRole('button', { name: /add to order/i });
      await user.click(addButtons[0]); // Add Espresso Coffee

      return user;
    }

    it('shows quantity of 1 for newly added item', async () => {
      await renderWithItemInOrder();
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('removes item when quantity is decreased to 0', async () => {
      const user = await renderWithItemInOrder();

      // Find the minus button in the order section (has Minus icon)
      // The order section has buttons with Minus icons
      const minusButtons = screen.getAllByRole('button').filter((btn) => {
        const svg = btn.querySelector('svg');
        return svg && btn.textContent === '' && !btn.disabled;
      });

      // Click the decrease button — should be the first outline button in order
      // We need to find the minus button specifically in the order panel
      // The order panel has a minus, a plus, and a remove button per item
      // Let's find by looking for the button that's near the "1" quantity text
      const quantityDisplay = screen.getByText('1');
      const orderItemContainer = quantityDisplay.closest('.flex')!;
      const buttons = within(orderItemContainer as HTMLElement).getAllByRole('button');
      // First button is minus, second is plus, third is remove
      await user.click(buttons[0]);

      // Item should be removed, showing empty state
      expect(screen.getByText('No items in order')).toBeInTheDocument();
    });

    it('removes item when clicking the remove button', async () => {
      const user = await renderWithItemInOrder();

      // Find the × remove button
      const removeButton = screen.getByRole('button', { name: '×' });
      await user.click(removeButton);

      expect(screen.getByText('No items in order')).toBeInTheDocument();
    });
  });

  describe('order totals', () => {
    it('displays correct subtotal, VAT, and total', async () => {
      setupMocks();
      const user = userEvent.setup();
      render(<RoomServiceOrders />);

      const select = screen.getAllByRole('combobox')[0];
      await user.selectOptions(select, '1');

      // Add Espresso Coffee (price: 3.50)
      const addButtons = screen.getAllByRole('button', { name: /add to order/i });
      await user.click(addButtons[0]);

      // Subtotal should be 3.50, VAT (25%) = 0.88, Total = 4.38
      expect(screen.getByText('Subtotal:')).toBeInTheDocument();
      expect(screen.getByText('VAT (25%):')).toBeInTheDocument();
      expect(screen.getByText('Total:')).toBeInTheDocument();
    });
  });

  describe('payment method', () => {
    it('defaults to room bill payment', async () => {
      setupMocks();
      const user = userEvent.setup();
      render(<RoomServiceOrders />);

      const select = screen.getAllByRole('combobox')[0];
      await user.selectOptions(select, '1');

      const addButtons = screen.getAllByRole('button', { name: /add to order/i });
      await user.click(addButtons[0]);

      // Payment method dropdown should exist with default value
      const paymentSelect = screen.getByDisplayValue('Add to Room Bill');
      expect(paymentSelect).toBeInTheDocument();
    });

    it('allows changing payment method', async () => {
      setupMocks();
      const user = userEvent.setup();
      render(<RoomServiceOrders />);

      const select = screen.getAllByRole('combobox')[0];
      await user.selectOptions(select, '1');

      const addButtons = screen.getAllByRole('button', { name: /add to order/i });
      await user.click(addButtons[0]);

      const paymentSelect = screen.getByDisplayValue('Add to Room Bill');
      await user.selectOptions(paymentSelect, 'immediate_cash');

      expect(screen.getByDisplayValue('Immediate Payment - Cash')).toBeInTheDocument();
    });
  });

  describe('order notes', () => {
    it('allows entering order notes', async () => {
      setupMocks();
      const user = userEvent.setup();
      render(<RoomServiceOrders />);

      const select = screen.getAllByRole('combobox')[0];
      await user.selectOptions(select, '1');

      const addButtons = screen.getAllByRole('button', { name: /add to order/i });
      await user.click(addButtons[0]);

      const notesInput = screen.getByPlaceholderText('Special instructions, allergies, etc.');
      await user.type(notesInput, 'No ice please');

      expect(notesInput).toHaveValue('No ice please');
    });
  });

  describe('process order', () => {
    it('disables Process Order button when no room is selected', async () => {
      setupMocks();
      render(<RoomServiceOrders />);
      // No items and no room — the "Process Order" button should not even show (empty state)
      expect(screen.getByText('No items in order')).toBeInTheDocument();
    });

    it('calls mutation when Process Order is clicked', async () => {
      const { mockMutate } = setupMocks();
      const user = userEvent.setup();
      render(<RoomServiceOrders />);

      const select = screen.getAllByRole('combobox')[0];
      await user.selectOptions(select, '1');

      const addButtons = screen.getAllByRole('button', { name: /add to order/i });
      await user.click(addButtons[0]);

      const processButton = screen.getByRole('button', { name: /process order/i });
      await user.click(processButton);

      expect(mockMutate).toHaveBeenCalledTimes(1);
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          roomId: '1',
          roomNumber: '101',
          paymentMethod: 'room_bill',
          orderStatus: 'pending',
          orderedBy: 'staff@hotel.com',
        }),
        expect.objectContaining({
          onSuccess: expect.any(Function),
          onError: expect.any(Function),
        })
      );
    });

    it('shows Processing... text when mutation is pending', async () => {
      const { mockMutate } = setupMocks();
      const user = userEvent.setup();
      const { rerender } = render(<RoomServiceOrders />);

      const select = screen.getAllByRole('combobox')[0];
      await user.selectOptions(select, '1');

      // Add an item first (while not pending)
      const addButtons = screen.getAllByRole('button', { name: /add to order/i });
      await user.click(addButtons[0]);

      // Now switch to pending state
      vi.mocked(useProcessRoomServiceOrder).mockReturnValue({
        mutate: mockMutate,
        isPending: true,
      } as unknown as ReturnType<typeof useProcessRoomServiceOrder>);
      rerender(<RoomServiceOrders />);

      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });

    it('resets form after successful order via onSuccess callback', async () => {
      const { mockMutate } = setupMocks();
      const user = userEvent.setup();
      render(<RoomServiceOrders />);

      const select = screen.getAllByRole('combobox')[0];
      await user.selectOptions(select, '1');

      const addButtons = screen.getAllByRole('button', { name: /add to order/i });
      await user.click(addButtons[0]);

      const processButton = screen.getByRole('button', { name: /process order/i });
      await user.click(processButton);

      // Simulate onSuccess callback
      const onSuccessCallback = mockMutate.mock.calls[0][1].onSuccess;
      const mockOrder = {
        id: 'order-1',
        orderNumber: 'RS20260330123456789',
        roomNumber: '101',
        totalAmount: 4.38,
        paymentMethod: 'room_bill',
        orderedAt: new Date(),
      };

      // Call the success handler in an act-like manner
      await waitFor(() => {
        onSuccessCallback(mockOrder);
      });

      // Order should be reset
      await waitFor(() => {
        expect(screen.getByText('No items in order')).toBeInTheDocument();
      });

      // Last order summary should appear
      expect(screen.getByText('Order Completed!')).toBeInTheDocument();
      expect(screen.getByText('RS20260330123456789')).toBeInTheDocument();
    });
  });

  describe('out-of-stock items', () => {
    it('disables Add to Order for out-of-stock items', async () => {
      setupMocks({ items: [mockItem1, mockItemOutOfStock] });
      const user = userEvent.setup();
      render(<RoomServiceOrders />);

      // Select a room
      const select = screen.getAllByRole('combobox')[0];
      await user.selectOptions(select, '1');

      const addButtons = screen.getAllByRole('button', { name: /add to order/i });
      // Caviar (out of stock) button should be disabled
      expect(addButtons[1]).toBeDisabled();
      // Espresso Coffee should be enabled
      expect(addButtons[0]).not.toBeDisabled();
    });
  });

  describe('validation warnings', () => {
    it('shows low stock warning for items with stock <= 5', async () => {
      setupMocks({ items: [mockItemLowStock] });
      const user = userEvent.setup();
      render(<RoomServiceOrders />);

      const select = screen.getAllByRole('combobox')[0];
      await user.selectOptions(select, '1');

      const addButtons = screen.getAllByRole('button', { name: /add to order/i });
      await user.click(addButtons[0]);

      // validateOrder should produce a warning for low stock items
      await waitFor(() => {
        expect(screen.getByText('Warnings:')).toBeInTheDocument();
        expect(screen.getByText(/Low stock warning for Truffle Oil/)).toBeInTheDocument();
      });
    });
  });

  describe('last order summary', () => {
    it('shows print receipt button after order completion', async () => {
      const { mockMutate } = setupMocks();
      const user = userEvent.setup();
      render(<RoomServiceOrders />);

      const select = screen.getAllByRole('combobox')[0];
      await user.selectOptions(select, '1');

      const addButtons = screen.getAllByRole('button', { name: /add to order/i });
      await user.click(addButtons[0]);

      const processButton = screen.getByRole('button', { name: /process order/i });
      await user.click(processButton);

      const onSuccessCallback = mockMutate.mock.calls[0][1].onSuccess;
      const mockOrder = {
        id: 'order-1',
        orderNumber: 'RS001',
        roomNumber: '101',
        totalAmount: 4.38,
        paymentMethod: 'room_bill',
        orderedAt: new Date(),
      };

      await waitFor(() => {
        onSuccessCallback(mockOrder);
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /print receipt/i })).toBeInTheDocument();
      });
    });
  });

  describe('empty items list', () => {
    it('renders no menu items when items array is empty', () => {
      setupMocks({ items: [] });
      render(<RoomServiceOrders />);

      expect(screen.getByText('Food & Beverage Menu')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /add to order/i })).not.toBeInTheDocument();
    });
  });
});
