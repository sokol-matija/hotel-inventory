import { Reservation } from './types';

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

export interface RoomServiceOrder {
  id: string;
  orderNumber: string;
  roomId: string;
  roomNumber: string;
  guestName: string;
  reservationId?: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  totalAmount: number;
  paymentMethod: 'room_bill' | 'immediate_cash' | 'immediate_card';
  paymentStatus: 'pending' | 'paid' | 'failed';
  orderStatus: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  notes: string;
  orderedBy: string; // Staff member name
  orderedAt: Date;
  deliveredAt?: Date;
  printedReceipt: boolean;
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
  totalStock: number; // Sum of all inventory quantities across locations
  locations: Array<{
    locationId: number;
    locationName: string;
    quantity: number;
    expiration_date?: string;
  }>;
}

export interface OrderValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface PrintReceiptData {
  order: RoomServiceOrder;
  hotelInfo: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };
  timestamp: Date;
}