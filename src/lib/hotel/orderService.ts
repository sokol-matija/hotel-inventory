import { supabase } from '../supabase';
import { InventoryItem, RoomServiceOrder, OrderItem, OrderValidationResult } from './orderTypes';
import { Room } from './types';

/**
 * Fetch all food and beverage items from inventory
 * Filters by categories that are food/drink related
 */
export async function getFoodAndBeverageItems(): Promise<InventoryItem[]> {
  try {
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
      .in('categories.name', [
        'Food', 'Beverage', 'Drinks', 'Bar', 'Restaurant', 
        'Alcohol', 'Coffee', 'Tea', 'Snacks', 'foodbeverage'
      ]);

    if (error) throw error;

    // Transform the data to match our interface
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

    return inventoryItems.filter(item => item.totalStock > 0); // Only show items in stock
  } catch (error) {
    console.error('Error fetching food and beverage items:', error);
    throw error;
  }
}

/**
 * Validate an order before processing
 */
export function validateOrder(items: OrderItem[]): OrderValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (items.length === 0) {
    errors.push('Order must contain at least one item');
  }

  items.forEach(item => {
    if (item.quantity <= 0) {
      errors.push(`Invalid quantity for ${item.itemName}`);
    }
    
    if (item.quantity > item.availableStock) {
      errors.push(`Insufficient stock for ${item.itemName}. Available: ${item.availableStock}, Requested: ${item.quantity}`);
    }

    if (item.availableStock <= 5) {
      warnings.push(`Low stock warning for ${item.itemName} (${item.availableStock} remaining)`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Generate unique order number
 */
export function generateOrderNumber(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const timeStr = date.toTimeString().slice(0, 8).replace(/:/g, '');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `RS${dateStr}${timeStr}${random}`;
}

/**
 * Calculate order totals
 */
export function calculateOrderTotal(items: OrderItem[], taxRate: number = 0.25): {
  subtotal: number;
  tax: number;
  total: number;
} {
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  return {
    subtotal: Number(subtotal.toFixed(2)),
    tax: Number(tax.toFixed(2)),
    total: Number(total.toFixed(2))
  };
}

/**
 * Process room service order and update inventory
 */
export async function processRoomServiceOrder(order: Omit<RoomServiceOrder, 'id' | 'orderNumber' | 'orderedAt'>): Promise<RoomServiceOrder> {
  try {
    // Validate order first
    const validation = validateOrder(order.items);
    if (!validation.isValid) {
      throw new Error(`Order validation failed: ${validation.errors.join(', ')}`);
    }

    // Generate order ID and number
    const orderId = crypto.randomUUID();
    const orderNumber = generateOrderNumber();
    const orderedAt = new Date();

    // Create the complete order
    const completeOrder: RoomServiceOrder = {
      ...order,
      id: orderId,
      orderNumber,
      orderedAt,
      printedReceipt: false
    };

    // Update inventory quantities
    for (const orderItem of order.items) {
      await reduceInventoryQuantity(orderItem.itemId, orderItem.quantity);
    }

    // TODO: Store order in database (would need to create room_service_orders table)
    // For now, we'll just return the order object

    return completeOrder;
  } catch (error) {
    console.error('Error processing room service order:', error);
    throw error;
  }
}

/**
 * Reduce inventory quantity for an item
 * Uses FIFO approach - reduces from earliest expiration dates first
 */
async function reduceInventoryQuantity(itemId: number, quantityToReduce: number): Promise<void> {
  try {
    // Get all inventory records for this item, ordered by expiration date (FIFO)
    const { data: inventoryRecords, error } = await supabase
      .from('inventory')
      .select('id, quantity, expiration_date, location_id')
      .eq('item_id', itemId)
      .gt('quantity', 0)
      .order('expiration_date', { ascending: true, nullsFirst: false });

    if (error) throw error;

    if (!inventoryRecords || inventoryRecords.length === 0) {
      throw new Error(`No inventory found for item ID ${itemId}`);
    }

    let remainingToReduce = quantityToReduce;

    for (const record of inventoryRecords) {
      if (remainingToReduce <= 0) break;

      const reductionAmount = Math.min(record.quantity, remainingToReduce);
      const newQuantity = record.quantity - reductionAmount;

      // Update the inventory record
      const { error: updateError } = await supabase
        .from('inventory')
        .update({ quantity: newQuantity })
        .eq('id', record.id);

      if (updateError) throw updateError;

      remainingToReduce -= reductionAmount;
    }

    if (remainingToReduce > 0) {
      throw new Error(`Insufficient inventory: Could not reduce ${quantityToReduce} units of item ${itemId}`);
    }
  } catch (error) {
    console.error('Error reducing inventory quantity:', error);
    throw error;
  }
}

/**
 * Get available rooms for room service
 */
export function getAvailableRooms(rooms: Room[]): Room[] {
  // For now, return all rooms. In a real implementation, 
  // you might filter by occupancy status
  return rooms.sort((a, b) => a.number.localeCompare(b.number));
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('hr-HR', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
}