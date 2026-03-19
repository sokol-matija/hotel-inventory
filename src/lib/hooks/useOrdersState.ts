// useOrdersState - State management hook for order operations
// Server state (available items) managed by TanStack Query; order cart state is local

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { OrdersService, InventoryItem, OrderItem } from '../services/OrdersService';
import { useAvailableOrderItems } from '../queries/hooks/useOrders';
import { queryKeys } from '../queries/queryKeys';

export interface OrdersState {
  availableItems: InventoryItem[];
  orderItems: OrderItem[];
  searchTerm: string;
  paymentMethod: 'cash' | 'card';
  orderNotes: string;
  lastOrderNumber: string;
  isLoading: boolean;
  filteredItems: InventoryItem[];
  orderTotals: {
    subtotal: number;
    vat25: number;
    vat13: number;
    pnp: number;
    totalVat: number;
    total: number;
    hasBeverages: boolean;
    hasFood: boolean;
  };
}

export interface OrdersActions {
  loadAvailableItems: () => Promise<void>;
  setSearchTerm: (term: string) => void;
  addToOrder: (item: InventoryItem) => void;
  updateOrderItemQuantity: (itemId: number, newQuantity: number) => void;
  removeFromOrder: (itemId: number) => void;
  clearOrder: () => void;
  setPaymentMethod: (method: 'cash' | 'card') => void;
  setOrderNotes: (notes: string) => void;
  processOrder: () => Promise<void>;
  formatCurrency: (amount: number) => string;
  validateOrder: () => { valid: boolean; errors: string[] };
}

export function useOrdersState(): OrdersState & OrdersActions {
  const ordersService = OrdersService.getInstance();
  const queryClient = useQueryClient();

  // Server state via TQ
  const { data: availableItems = [], isLoading: itemsLoading } = useAvailableOrderItems();

  // Local cart state
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [searchTerm, setSearchTermState] = useState('');
  const [paymentMethod, setPaymentMethodState] = useState<'cash' | 'card'>('cash');
  const [orderNotes, setOrderNotesState] = useState('');
  const [lastOrderNumber, setLastOrderNumber] = useState<string>('');

  // Process order mutation
  const processOrderMutation = useMutation({
    mutationFn: () => ordersService.processOrder(orderItems, paymentMethod, orderNotes),
    onSuccess: (result) => {
      if (result.success && result.orderNumber) {
        setLastOrderNumber(result.orderNumber);
        setOrderItems([]);
        setOrderNotesState('');
        queryClient.invalidateQueries({ queryKey: queryKeys.orders.availableItems() });
        queryClient.invalidateQueries({ queryKey: queryKeys.locations.withStats() });

        if (result.printSuccess) {
          alert(`Order ${result.orderNumber} processed successfully and sent to printer!`);
        } else {
          alert(
            `Order ${result.orderNumber} processed but printing failed. Please try printing again.`
          );
        }
      } else {
        alert(`Error processing order: ${result.error}`);
      }
    },
    onError: (error) => {
      alert('Error processing order: ' + error);
    },
  });

  // Computed state
  const filteredItems = ordersService.filterItems(availableItems, searchTerm);
  const orderTotals = ordersService.calculateOrderTotal(orderItems);
  const isLoading = itemsLoading || processOrderMutation.isPending;

  const loadAvailableItems = (): Promise<void> =>
    queryClient.invalidateQueries({ queryKey: queryKeys.orders.availableItems() });

  const addToOrder = (item: InventoryItem): void => {
    const result = ordersService.addToOrder(item, orderItems);
    if (result.success && result.updatedOrderItems) {
      setOrderItems(result.updatedOrderItems);
    } else if (result.error) {
      alert(result.error);
    }
  };

  const updateOrderItemQuantity = (itemId: number, newQuantity: number): void => {
    setOrderItems(ordersService.updateOrderItemQuantity(orderItems, itemId, newQuantity));
  };

  const removeFromOrder = (itemId: number): void => {
    setOrderItems(ordersService.removeFromOrder(orderItems, itemId));
  };

  const clearOrder = (): void => {
    setOrderItems([]);
    setOrderNotesState('');
  };

  const processOrder = async (): Promise<void> => {
    processOrderMutation.mutate();
  };

  return {
    availableItems,
    orderItems,
    searchTerm,
    paymentMethod,
    orderNotes,
    lastOrderNumber,
    isLoading,
    filteredItems,
    orderTotals,
    loadAvailableItems,
    setSearchTerm: setSearchTermState,
    addToOrder,
    updateOrderItemQuantity,
    removeFromOrder,
    clearOrder,
    setPaymentMethod: setPaymentMethodState,
    setOrderNotes: setOrderNotesState,
    processOrder,
    formatCurrency: (amount: number) => ordersService.formatCurrency(amount),
    validateOrder: () => ordersService.validateOrder(orderItems),
  };
}
