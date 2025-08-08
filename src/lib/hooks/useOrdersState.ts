// useOrdersState - State management hook for order operations
// Consolidates all state management from OrdersPage into reusable hook

import { useState, useEffect } from 'react';
import { OrdersService, InventoryItem, OrderItem } from '../services/OrdersService';

export interface OrdersState {
  // Data state
  availableItems: InventoryItem[];
  orderItems: OrderItem[];
  searchTerm: string;
  paymentMethod: 'cash' | 'card';
  orderNotes: string;
  lastOrderNumber: string;
  
  // UI state
  isLoading: boolean;
  
  // Computed state
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
  // Data loading
  loadAvailableItems: () => Promise<void>;
  
  // Search and filtering
  setSearchTerm: (term: string) => void;
  
  // Order management
  addToOrder: (item: InventoryItem) => void;
  updateOrderItemQuantity: (itemId: number, newQuantity: number) => void;
  removeFromOrder: (itemId: number) => void;
  clearOrder: () => void;
  
  // Payment processing
  setPaymentMethod: (method: 'cash' | 'card') => void;
  setOrderNotes: (notes: string) => void;
  processOrder: () => Promise<void>;
  
  // Utility functions
  formatCurrency: (amount: number) => string;
  validateOrder: () => { valid: boolean; errors: string[] };
}

export function useOrdersState(): OrdersState & OrdersActions {
  const ordersService = OrdersService.getInstance();
  
  // Core state
  const [availableItems, setAvailableItems] = useState<InventoryItem[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [orderNotes, setOrderNotes] = useState('');
  const [lastOrderNumber, setLastOrderNumber] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Computed state - filtered items
  const filteredItems = ordersService.filterItems(availableItems, searchTerm);
  
  // Computed state - order totals
  const orderTotals = ordersService.calculateOrderTotal(orderItems);
  
  // Load available items on mount
  useEffect(() => {
    loadAvailableItems();
  }, []);
  
  const loadAvailableItems = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const items = await ordersService.loadAvailableItems();
      setAvailableItems(items);
    } catch (error) {
      console.error('Error loading items:', error);
      alert('Error loading available items. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const addToOrder = (item: InventoryItem): void => {
    const result = ordersService.addToOrder(item, orderItems);
    
    if (result.success && result.updatedOrderItems) {
      setOrderItems(result.updatedOrderItems);
    } else if (result.error) {
      alert(result.error);
    }
  };
  
  const updateOrderItemQuantity = (itemId: number, newQuantity: number): void => {
    const updatedItems = ordersService.updateOrderItemQuantity(orderItems, itemId, newQuantity);
    setOrderItems(updatedItems);
  };
  
  const removeFromOrder = (itemId: number): void => {
    const updatedItems = ordersService.removeFromOrder(orderItems, itemId);
    setOrderItems(updatedItems);
  };
  
  const clearOrder = (): void => {
    setOrderItems([]);
    setOrderNotes('');
  };
  
  const processOrder = async (): Promise<void> => {
    try {
      setIsLoading(true);
      
      const result = await ordersService.processOrder(orderItems, paymentMethod, orderNotes);
      
      if (result.success && result.orderNumber) {
        setLastOrderNumber(result.orderNumber);
        
        // Reset form
        clearOrder();
        
        // Reload items to update stock quantities
        await loadAvailableItems();
        
        if (result.printSuccess) {
          alert(`Order ${result.orderNumber} processed successfully and sent to printer!`);
        } else {
          alert(`Order ${result.orderNumber} processed but printing failed. Please try printing again.`);
        }
      } else {
        alert(`Error processing order: ${result.error}`);
      }
    } catch (error) {
      console.error('Error processing order:', error);
      alert('Error processing order: ' + error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const formatCurrency = (amount: number): string => {
    return ordersService.formatCurrency(amount);
  };
  
  const validateOrder = (): { valid: boolean; errors: string[] } => {
    return ordersService.validateOrder(orderItems);
  };
  
  // Return combined state and actions
  return {
    // State
    availableItems,
    orderItems,
    searchTerm,
    paymentMethod,
    orderNotes,
    lastOrderNumber,
    isLoading,
    filteredItems,
    orderTotals,
    
    // Actions
    loadAvailableItems,
    setSearchTerm,
    addToOrder,
    updateOrderItemQuantity,
    removeFromOrder,
    clearOrder,
    setPaymentMethod,
    setOrderNotes,
    processOrder,
    formatCurrency,
    validateOrder
  };
}