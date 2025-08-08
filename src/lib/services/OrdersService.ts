// OrdersService - Business logic for order management
// Handles inventory loading, order processing, VAT calculations, and FIFO inventory deduction

import { supabase } from '../supabase';
import { printWindowsReceipt } from '../printers/windowsPrinter';

export interface OrderItem {
  id: string;
  itemId: number;
  itemName: string;
  category: string;
  price: number;
  quantity: number;
  totalPrice: number;
  unit: string;
  availableStock: number;
}

export interface InventoryItem {
  id: number;
  name: string;
  description?: string;
  category: {
    id: number;
    name: string;
    requires_expiration: boolean;
  };
  unit: string;
  price: number;
  minimum_stock: number;
  is_active: boolean;
  totalStock: number;
  locations: Array<{
    locationId: number;
    locationName: string;
    quantity: number;
    expiration_date?: string;
  }>;
}

export interface VATCalculation {
  drinks25: number;
  food13: number;
  net: number;
  vat25: number;
  vat13: number;
  pnp: number;
  totalVat: number;
  total: number;
  hasBeverages: boolean;
  hasFood: boolean;
}

export interface OrderTotals {
  subtotal: number;
  vat25: number;
  vat13: number;
  pnp: number;
  totalVat: number;
  total: number;
  hasBeverages: boolean;
  hasFood: boolean;
}

export interface OrderProcessingResult {
  success: boolean;
  orderNumber?: string;
  error?: string;
  printSuccess?: boolean;
}

export class OrdersService {
  private static instance: OrdersService;
  
  private constructor() {}
  
  public static getInstance(): OrdersService {
    if (!OrdersService.instance) {
      OrdersService.instance = new OrdersService();
    }
    return OrdersService.instance;
  }

  /**
   * Load available items with inventory from database
   */
  async loadAvailableItems(): Promise<InventoryItem[]> {
    try {
      // Fetch items with inventory - focus on Food & Beverage items
      const { data: items, error } = await supabase
        .from('items')
        .select(`
          id,
          name,
          description,
          unit,
          price,
          minimum_stock,
          is_active,
          category:categories(id, name, requires_expiration),
          inventory(
            location_id,
            quantity,
            expiration_date,
            location:locations(id, name)
          )
        `)
        .eq('is_active', true)
        .eq('categories.name', 'Food & Beverage');

      if (error) throw error;

      // Transform and filter data
      const inventoryItems: InventoryItem[] = items?.map(item => {
        const totalStock = item.inventory?.reduce((sum, inv) => sum + (inv.quantity || 0), 0) || 0;
        
        return {
          id: item.id,
          name: item.name,
          description: item.description,
          category: {
            id: (item.category as any).id,
            name: (item.category as any).name,
            requires_expiration: (item.category as any).requires_expiration
          },
          unit: item.unit,
          price: item.price || 0,
          minimum_stock: item.minimum_stock,
          is_active: item.is_active,
          totalStock,
          locations: item.inventory?.map(inv => ({
            locationId: inv.location_id,
            locationName: (inv.location as any)?.name || 'Unknown',
            quantity: inv.quantity || 0,
            expiration_date: inv.expiration_date
          })) || []
        };
      }) || [];

      // Only return items that are in stock
      return inventoryItems.filter(item => item.totalStock > 0);
    } catch (error) {
      console.error('Error loading available items:', error);
      throw new Error('Failed to load available items');
    }
  }

  /**
   * Filter items based on search term
   */
  filterItems(items: InventoryItem[], searchTerm: string): InventoryItem[] {
    if (!searchTerm.trim()) return items;
    
    const lowercaseSearch = searchTerm.toLowerCase();
    return items.filter(item =>
      item.name.toLowerCase().includes(lowercaseSearch) ||
      item.category.name.toLowerCase().includes(lowercaseSearch)
    );
  }

  /**
   * Add item to order or update existing quantity
   */
  addToOrder(item: InventoryItem, currentOrderItems: OrderItem[]): {
    success: boolean;
    updatedOrderItems?: OrderItem[];
    error?: string;
  } {
    if (item.price === 0) {
      return {
        success: false,
        error: 'Please set a price for this item first in the Items section.'
      };
    }

    const existingOrderItem = currentOrderItems.find(oi => oi.itemId === item.id);
    
    if (existingOrderItem) {
      // Update existing item quantity
      const updatedOrderItems = this.updateOrderItemQuantity(
        currentOrderItems, 
        item.id, 
        existingOrderItem.quantity + 1
      );
      return { success: true, updatedOrderItems };
    } else {
      // Add new item to order
      const newOrderItem: OrderItem = {
        id: crypto.randomUUID(),
        itemId: item.id,
        itemName: item.name,
        category: item.category.name,
        price: item.price,
        quantity: 1,
        totalPrice: item.price,
        unit: item.unit,
        availableStock: item.totalStock
      };
      
      return {
        success: true,
        updatedOrderItems: [...currentOrderItems, newOrderItem]
      };
    }
  }

  /**
   * Update order item quantity
   */
  updateOrderItemQuantity(
    orderItems: OrderItem[], 
    itemId: number, 
    newQuantity: number
  ): OrderItem[] {
    if (newQuantity <= 0) {
      return orderItems.filter(item => item.itemId !== itemId);
    }

    return orderItems.map(item => 
      item.itemId === itemId 
        ? { ...item, quantity: newQuantity, totalPrice: item.price * newQuantity }
        : item
    );
  }

  /**
   * Remove item from order
   */
  removeFromOrder(orderItems: OrderItem[], itemId: number): OrderItem[] {
    return orderItems.filter(item => item.itemId !== itemId);
  }

  /**
   * Calculate Croatian VAT with PNP tourism tax
   */
  calculateCroatianVAT(orderItems: OrderItem[]): VATCalculation {
    let drinks25 = 0;
    let food13 = 0;
    
    // Categorize items by Croatian VAT rates
    orderItems.forEach((item) => {
      const isAlcoholOrBeverage = (
        item.category.toLowerCase().includes('beverage') || 
        item.category.toLowerCase().includes('drink') ||
        item.itemName.toLowerCase().includes('pivo') ||
        item.itemName.toLowerCase().includes('vino') ||
        item.itemName.toLowerCase().includes('sok') ||
        item.itemName.toLowerCase().includes('jana')
      );
      
      if (isAlcoholOrBeverage) {
        drinks25 += item.totalPrice;
      } else {
        food13 += item.totalPrice;
      }
    });
    
    // Croatian tax calculation (reverse VAT calculation)
    const drinks25Net = drinks25 / 1.28; // Remove 25% VAT + 3% PNP
    const food13Net = food13 / 1.13; // Remove 13% VAT
    
    const vat25 = drinks25Net * 0.25;
    const vat13 = food13Net * 0.13;
    const pnp = drinks25Net * 0.03; // 3% PNP tourism tax on beverages
    
    const net = drinks25Net + food13Net;
    const totalVat = vat25 + vat13;
    const total = net + totalVat + pnp;
    
    return {
      drinks25,
      food13,
      net,
      vat25,
      vat13,
      pnp,
      totalVat,
      total,
      hasBeverages: drinks25 > 0,
      hasFood: food13 > 0
    };
  }

  /**
   * Calculate order totals
   */
  calculateOrderTotal(orderItems: OrderItem[]): OrderTotals {
    const croatianVat = this.calculateCroatianVAT(orderItems);
    
    return {
      subtotal: croatianVat.net,
      vat25: croatianVat.vat25,
      vat13: croatianVat.vat13,
      pnp: croatianVat.pnp,
      totalVat: croatianVat.totalVat,
      total: croatianVat.total,
      hasBeverages: croatianVat.hasBeverages,
      hasFood: croatianVat.hasFood
    };
  }

  /**
   * Generate unique order number
   */
  generateOrderNumber(): string {
    return `ORDER-${Date.now()}`;
  }

  /**
   * Deduct inventory using FIFO (First In, First Out) method
   */
  private async deductInventoryFIFO(orderItems: OrderItem[]): Promise<void> {
    for (const orderItem of orderItems) {
      let remainingQuantity = orderItem.quantity;
      
      // Get inventory for this item, sorted by expiration date (FIFO)
      const { data: inventoryRecords, error } = await supabase
        .from('inventory')
        .select('*')
        .eq('item_id', orderItem.itemId)
        .gt('quantity', 0)
        .order('expiration_date', { ascending: true, nullsFirst: false });

      if (error) throw error;

      if (inventoryRecords) {
        for (const record of inventoryRecords) {
          if (remainingQuantity <= 0) break;
          
          const deductQuantity = Math.min(remainingQuantity, record.quantity);
          const newQuantity = record.quantity - deductQuantity;
          
          const { error: updateError } = await supabase
            .from('inventory')
            .update({ 
              quantity: newQuantity,
              updated_at: new Date().toISOString()
            })
            .eq('id', record.id);
          
          if (updateError) throw updateError;
          
          remainingQuantity -= deductQuantity;
        }
      }

      if (remainingQuantity > 0) {
        throw new Error(`Insufficient stock for ${orderItem.itemName}. Missing ${remainingQuantity} ${orderItem.unit}.`);
      }
    }
  }

  /**
   * Process complete order (deduct inventory, print receipt)
   */
  async processOrder(
    orderItems: OrderItem[],
    paymentMethod: 'cash' | 'card',
    orderNotes: string
  ): Promise<OrderProcessingResult> {
    if (orderItems.length === 0) {
      return {
        success: false,
        error: 'Please add items to the order first.'
      };
    }

    try {
      const orderNumber = this.generateOrderNumber();
      const totals = this.calculateOrderTotal(orderItems);

      // Create order data for printing
      const orderData = {
        order: {
          id: crypto.randomUUID(),
          orderNumber,
          roomId: 'INVENTORY',
          roomNumber: 'INVENTORY',
          guestName: 'Staff Order',
          orderedAt: new Date(),
          items: orderItems,
          subtotal: totals.subtotal,
          tax: totals.totalVat + totals.pnp,
          totalAmount: totals.total,
          paymentMethod: (paymentMethod === 'cash' ? 'immediate_cash' : 'immediate_card') as 'immediate_cash' | 'immediate_card',
          paymentStatus: 'paid' as const,
          orderStatus: 'delivered' as const,
          notes: orderNotes,
          orderedBy: 'Inventory Staff',
          deliveredAt: new Date(),
          printedReceipt: false
        },
        hotelInfo: {
          name: 'Hotel Poreč',
          address: 'Rade Končara 1 Poreč',
          phone: '00385 52 451-811',
          email: 'hotelporec@pu.t-com.hr',
          oib: '87246357068',
          fiscalNumber: `HP-${new Date().getFullYear()}-${Math.floor(Math.random() * 999999).toString().padStart(6, '0')}`
        },
        timestamp: new Date()
      };

      // Deduct inventory using FIFO method
      await this.deductInventoryFIFO(orderItems);

      // Print receipt
      const printSuccess = await printWindowsReceipt(orderData);
      
      return {
        success: true,
        orderNumber,
        printSuccess
      };
      
    } catch (error) {
      console.error('Error processing order:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Format currency amount for display
   */
  formatCurrency(amount: number): string {
    return `€${amount.toFixed(2)}`;
  }

  /**
   * Validate order before processing
   */
  validateOrder(orderItems: OrderItem[]): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    if (orderItems.length === 0) {
      errors.push('Order must contain at least one item');
    }
    
    orderItems.forEach(item => {
      if (item.price <= 0) {
        errors.push(`${item.itemName} has no price set`);
      }
      
      if (item.quantity > item.availableStock) {
        errors.push(`${item.itemName}: Requested ${item.quantity} but only ${item.availableStock} available`);
      }
    });
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}