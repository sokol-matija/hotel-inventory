import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, Search, ShoppingCart, AlertTriangle } from 'lucide-react';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { Badge } from '../../../ui/badge';
import { 
  InventoryItem, 
  OrderItem, 
  OrderValidationResult 
} from '../../../../lib/hotel/orderTypes';
import { 
  validateOrder,
  calculateOrderTotal,
  formatCurrency
} from '../../../../lib/hotel/orderService';
import { supabase } from '../../../../lib/supabase';
import { Reservation } from '../../../../lib/hotel/types';
import { formatRoomNumber } from '../../../../lib/hotel/calendarUtils';
import { useHotel } from '../../../../lib/hotel/state/SupabaseHotelContext';
import { SAMPLE_GUESTS } from '../../../../lib/hotel/sampleData';

interface DrinksSelectionModalProps {
  reservation: Reservation;
  isOpen: boolean;
  onClose: () => void;
  onOrderComplete: (orderItems: OrderItem[], totalAmount: number) => void;
}

// Enhanced inventory item with live stock and location info
interface FridgeInventoryItem {
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
  inventory: Array<{
    id: number;
    location_id: number;
    quantity: number;
    originalQuantity: number; // Track original quantity for basket calculations
    expiration_date?: string;
    location: {
      id: number;
      name: string;
    };
  }>;
  totalStock: number;
  availableStock: number; // Stock minus basket quantities
}

export default function DrinksSelectionModal({
  reservation,
  isOpen,
  onClose,
  onOrderComplete
}: DrinksSelectionModalProps) {
  const { rooms } = useHotel();
  const [availableItems, setAvailableItems] = useState<FridgeInventoryItem[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [validationResult, setValidationResult] = useState<OrderValidationResult | null>(null);
  
  // Basket state to track quantity changes before committing
  const [basketQuantities, setBasketQuantities] = useState<Record<number, number>>({});

  // Load drinks when modal opens
  useEffect(() => {
    if (isOpen) {
      loadDrinksItems();
    }
  }, [isOpen]);

  // Validate order whenever items change
  useEffect(() => {
    if (orderItems.length > 0) {
      setValidationResult(validateOrder(orderItems));
    } else {
      setValidationResult(null);
    }
  }, [orderItems]);

  const loadDrinksItems = async () => {
    try {
      setIsLoading(true);
      
      // Fetch beverages from fridge locations (refrigerated locations)
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
            id,
            location_id,
            quantity,
            expiration_date,
            location:locations(id, name, is_refrigerated)
          )
        `)
        .eq('is_active', true)
        .in('categories.name', [
          'Beverage', 'Drinks', 'Bar', 'Restaurant', 
          'Alcohol', 'Coffee', 'Tea', 'Cocktails'
        ]);

      if (error) throw error;

      // Process and filter items from refrigerated locations only
      const fridgeItems: FridgeInventoryItem[] = items
        ?.map(item => {
          // Only include inventory from refrigerated locations
          const fridgeInventory = item.inventory?.filter(inv => 
            (inv.location as any)?.is_refrigerated && inv.quantity > 0
          ) || [];

          if (fridgeInventory.length === 0) return null;

          const totalStock = fridgeInventory.reduce((sum, inv) => sum + (inv.quantity || 0), 0);
          
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
            inventory: fridgeInventory.map(inv => ({
              id: inv.id,
              location_id: inv.location_id,
              quantity: inv.quantity,
              originalQuantity: inv.quantity,
              expiration_date: inv.expiration_date,
              location: {
                id: (inv.location as any).id,
                name: (inv.location as any).name
              }
            })),
            totalStock,
            availableStock: totalStock
          };
        })
        .filter(item => item !== null) as FridgeInventoryItem[];

      setAvailableItems(fridgeItems);
    } catch (error) {
      console.error('Error loading drinks from fridge:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredItems = availableItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Update available stock calculation based on basket quantities
  const updateAvailableStock = () => {
    setAvailableItems(prevItems => 
      prevItems.map(item => {
        const basketQty = basketQuantities[item.id] || 0;
        return {
          ...item,
          availableStock: item.totalStock - basketQty
        };
      })
    );
  };

  // Update available stock whenever basket changes
  useEffect(() => {
    updateAvailableStock();
  }, [basketQuantities]);

  const addToOrder = (item: FridgeInventoryItem) => {
    const existingOrderItem = orderItems.find(oi => oi.itemId === item.id);
    const currentBasketQty = basketQuantities[item.id] || 0;
    
    // Check if we can add more (don't exceed available stock)
    if (currentBasketQty >= item.totalStock) {
      return; // Can't add more than total stock
    }
    
    if (existingOrderItem) {
      // Increase quantity if item already in order
      updateOrderItemQuantity(item.id, existingOrderItem.quantity + 1);
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
        availableStock: item.availableStock
      };
      setOrderItems([...orderItems, newOrderItem]);
    }
    
    // Update basket quantities to reflect the change
    setBasketQuantities(prev => ({
      ...prev,
      [item.id]: currentBasketQty + 1
    }));
  };

  const updateOrderItemQuantity = (itemId: number, newQuantity: number) => {
    const currentOrderItem = orderItems.find(item => item.itemId === itemId);
    if (!currentOrderItem) return;
    
    const currentQuantityDiff = currentOrderItem.quantity;
    const newQuantityDiff = newQuantity;
    const quantityChange = newQuantityDiff - currentQuantityDiff;
    
    const currentBasketQty = basketQuantities[itemId] || 0;
    const newBasketQty = Math.max(0, currentBasketQty + quantityChange);
    
    // Get item to check total stock
    const item = availableItems.find(item => item.id === itemId);
    if (item && newBasketQty > item.totalStock) {
      return; // Can't exceed total stock
    }
    
    if (newQuantity <= 0) {
      setOrderItems(orderItems.filter(item => item.itemId !== itemId));
      // Reset basket quantity for this item
      setBasketQuantities(prev => ({
        ...prev,
        [itemId]: 0
      }));
      return;
    }

    setOrderItems(orderItems.map(item => 
      item.itemId === itemId 
        ? { ...item, quantity: newQuantity, totalPrice: item.price * newQuantity }
        : item
    ));
    
    // Update basket quantities
    setBasketQuantities(prev => ({
      ...prev,
      [itemId]: newBasketQty
    }));
  };

  const removeFromOrder = (itemId: number) => {
    setOrderItems(orderItems.filter(item => item.itemId !== itemId));
    // Reset basket quantity for this item
    setBasketQuantities(prev => ({
      ...prev,
      [itemId]: 0
    }));
  };

  const handleAddToRoomBill = () => {
    if (orderItems.length === 0 || !validationResult?.isValid) return;
    
    const totals = calculateOrderTotal(orderItems);
    onOrderComplete(orderItems, totals.total);
    
    // Reset everything and close
    resetModal();
    onClose();
  };

  // Reset modal state
  const resetModal = () => {
    setOrderItems([]);
    setSearchTerm('');
    setBasketQuantities({});
    setValidationResult(null);
  };

  // Reset when modal closes
  const handleClose = () => {
    resetModal();
    onClose();
  };

  const totals = calculateOrderTotal(orderItems);

  if (!isOpen) return null;

  const room = rooms.find(r => r.id === reservation.roomId);
  const guest = SAMPLE_GUESTS.find(g => g.id === reservation.guestId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-green-500 to-green-600 text-white">
          <div>
            <h2 className="text-xl font-semibold flex items-center">
              🍹 Add Drinks to Room Bill
            </h2>
            <p className="text-green-100 text-sm">
              Room {room ? formatRoomNumber(room) : reservation.roomId} • {guest?.fullName || 'Unknown Guest'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="text-white hover:bg-green-600"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex h-full max-h-[calc(90vh-80px)]">
          {/* Left Column - Drinks Menu */}
          <div className="flex-1 p-6 border-r overflow-y-auto">
            {/* Search */}
            <div className="mb-4">
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search drinks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            {/* Drinks Grid */}
            {isLoading ? (
              <div className="text-center py-8">Loading drinks...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredItems.map(item => (
                  <div key={item.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">{item.name}</h4>
                      <Badge variant="secondary">{item.category.name}</Badge>
                    </div>
                    
                    {item.description && (
                      <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                    )}
                    
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-semibold text-green-600">
                        {formatCurrency(item.price)} / {item.unit}
                      </span>
                      <span className={`text-sm ${item.availableStock > 0 ? 'text-gray-500' : 'text-red-500'}`}>
                        Available: {item.availableStock} / {item.totalStock}
                      </span>
                    </div>
                    
                    <Button
                      onClick={() => addToOrder(item)}
                      disabled={item.availableStock === 0}
                      className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300"
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      {item.availableStock === 0 ? 'Out of Stock' : 'Add to Order'}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column - Order Summary */}
          <div className="w-80 p-6 bg-gray-50">
            <div className="flex items-center space-x-2 mb-4">
              <ShoppingCart className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Order Summary</h3>
            </div>

            {orderItems.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No drinks selected
              </div>
            ) : (
              <div className="space-y-4">
                {/* Order Items */}
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {orderItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-2 bg-white rounded border">
                      <div className="flex-1">
                        <h5 className="font-medium text-sm">{item.itemName}</h5>
                        <p className="text-xs text-gray-500">
                          {formatCurrency(item.price)} / {item.unit}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateOrderItemQuantity(item.itemId, item.quantity - 1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        
                        <span className="w-8 text-center text-sm">{item.quantity}</span>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateOrderItemQuantity(item.itemId, item.quantity + 1)}
                          disabled={item.quantity >= item.availableStock}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromOrder(item.itemId)}
                          className="text-red-500 hover:text-red-700"
                        >
                          ×
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Validation Messages */}
                {validationResult && validationResult.errors.length > 0 && (
                  <div className="p-2 bg-red-50 border border-red-200 rounded text-sm">
                    <div className="flex items-center space-x-1 text-red-700">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-medium">Errors:</span>
                    </div>
                    {validationResult.errors.map((error, index) => (
                      <p key={index} className="text-red-600 text-xs">{error}</p>
                    ))}
                  </div>
                )}

                {validationResult && validationResult.warnings.length > 0 && (
                  <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                    <div className="flex items-center space-x-1 text-yellow-700">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-medium">Warnings:</span>
                    </div>
                    {validationResult.warnings.map((warning, index) => (
                      <p key={index} className="text-yellow-600 text-xs">{warning}</p>
                    ))}
                  </div>
                )}

                {/* Totals */}
                <div className="border-t pt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(totals.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>VAT (25%):</span>
                    <span>{formatCurrency(totals.tax)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total:</span>
                    <span className="text-green-600">{formatCurrency(totals.total)}</span>
                  </div>
                </div>

                {/* Add to Bill Button */}
                <Button
                  onClick={handleAddToRoomBill}
                  disabled={!validationResult?.isValid || isLoading}
                  className="w-full bg-green-500 hover:bg-green-600 text-white"
                  size="lg"
                >
                  Add to Room Bill ({formatCurrency(totals.total)})
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}