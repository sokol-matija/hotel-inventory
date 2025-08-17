import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { Badge } from '../../../ui/badge';
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Search,
  Package,
  AlertTriangle,
  DollarSign
} from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { Reservation } from '../../../../lib/hotel/types';
import { formatRoomNumber } from '../../../../lib/hotel/calendarUtils';
import { useHotel } from '../../../../lib/hotel/state/SupabaseHotelContext';
import { SAMPLE_GUESTS } from '../../../../lib/hotel/sampleData';

interface OrderItem {
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

interface InventoryItem {
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

interface HotelOrdersModalProps {
  reservation: Reservation;
  isOpen: boolean;
  onClose: () => void;
  onOrderComplete: (orderItems: OrderItem[], totalAmount: number) => void;
}

export default function HotelOrdersModal({
  reservation,
  isOpen,
  onClose,
  onOrderComplete
}: HotelOrdersModalProps) {
  const { rooms } = useHotel();
  // State - reusing the same structure as OrdersPage
  const [availableItems, setAvailableItems] = useState<InventoryItem[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Load items when modal opens - using the exact same logic as OrdersPage
  useEffect(() => {
    if (isOpen) {
      loadAvailableItems();
    }
  }, [isOpen]);

  const loadAvailableItems = async () => {
    try {
      setIsLoading(true);
      
      // Fetch items with inventory - reusing existing database structure from OrdersPage
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
        .eq('categories.name', 'Food & Beverage'); // Focus on food & beverage

      if (error) throw error;

      // Transform data - exact same logic as OrdersPage
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

      setAvailableItems(inventoryItems.filter(item => item.totalStock > 0));
    } catch (error) {
      console.error('Error loading items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Order management functions - reusing exact same logic as OrdersPage
  const addToOrder = (item: InventoryItem) => {
    if (item.price === 0) {
      alert('Please set a price for this item first in the Items section.');
      return;
    }
    const existingOrderItem = orderItems.find(oi => oi.itemId === item.id);
    
    if (existingOrderItem) {
      updateOrderItemQuantity(item.id, existingOrderItem.quantity + 1);
    } else {
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
      setOrderItems([...orderItems, newOrderItem]);
    }
  };

  const updateOrderItemQuantity = (itemId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      setOrderItems(orderItems.filter(item => item.itemId !== itemId));
      return;
    }

    setOrderItems(orderItems.map(item => 
      item.itemId === itemId 
        ? { ...item, quantity: newQuantity, totalPrice: item.price * newQuantity }
        : item
    ));
  };

  const removeFromOrder = (itemId: number) => {
    setOrderItems(orderItems.filter(item => item.itemId !== itemId));
  };

  const calculateOrderTotal = () => {
    const subtotal = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const tax = subtotal * 0.25; // 25% VAT
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const handleAddToRoomBill = async () => {
    if (orderItems.length === 0) return;
    
    try {
      setIsLoading(true);
      
      // Deduct inventory (FIFO - oldest expiration first) - same logic as OrdersPage
      for (const orderItem of orderItems) {
        let remainingQuantity = orderItem.quantity;
        
        // Get inventory for this item, sorted by expiration date (FIFO)
        const { data: inventoryRecords } = await supabase
          .from('inventory')
          .select('*')
          .eq('item_id', orderItem.itemId)
          .gt('quantity', 0)
          .order('expiration_date', { ascending: true, nullsFirst: false });

        if (inventoryRecords) {
          for (const record of inventoryRecords) {
            if (remainingQuantity <= 0) break;
            
            const deductQuantity = Math.min(remainingQuantity, record.quantity);
            const newQuantity = record.quantity - deductQuantity;
            
            await supabase
              .from('inventory')
              .update({ 
                quantity: newQuantity,
                updated_at: new Date().toISOString()
              })
              .eq('id', record.id);
            
            remainingQuantity -= deductQuantity;
          }
        }
      }

      const totals = calculateOrderTotal();
      onOrderComplete(orderItems, totals.total);
      
      // Reset and close
      setOrderItems([]);
      setSearchTerm('');
      setOrderNotes('');
      onClose();
    } catch (error) {
      console.error('Error processing room service order:', error);
      alert('Error processing order. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    // Reset everything when closing
    setOrderItems([]);
    setSearchTerm('');
    setOrderNotes('');
    onClose();
  };

  const filteredItems = availableItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totals = calculateOrderTotal();

  if (!isOpen) return null;

  const room = rooms.find(r => r.id === reservation.roomId);
  const guest = SAMPLE_GUESTS.find(g => g.id === reservation.guestId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <div>
            <h2 className="text-xl font-semibold flex items-center">
              🛎️ Room Service Order
            </h2>
            <p className="text-blue-100 text-sm">
              Room {room ? formatRoomNumber(room) : reservation.roomId} • {guest?.fullName || 'Unknown Guest'}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="text-white hover:bg-blue-600"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex h-full max-h-[calc(90vh-80px)]">
          {/* Left Column - Items Catalog - Same layout as OrdersPage */}
          <div className="flex-1 p-6 border-r overflow-y-auto">
            <Card>
              <CardHeader>
                <CardTitle>Food & Beverage Menu</CardTitle>
                <div className="flex items-center space-x-2">
                  <Search className="h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Search items..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">Loading items...</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
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
                          <span className="font-semibold text-blue-600">
                            €{item.price.toFixed(2)} / {item.unit}
                          </span>
                          <span className="text-sm text-gray-500">
                            Stock: {item.totalStock} {item.unit}
                          </span>
                        </div>
                        
                        <Button
                          onClick={() => addToOrder(item)}
                          className="w-full"
                          disabled={item.totalStock === 0 || item.price === 0}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add to Order
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Order Summary - Same layout as OrdersPage */}
          <div className="w-80 p-6 bg-gray-50">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <ShoppingCart className="h-5 w-5" />
                  <span>Current Order</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {orderItems.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    No items in order
                  </div>
                ) : (
                  <>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {orderItems.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-2 border rounded">
                          <div className="flex-1">
                            <h5 className="font-medium text-sm">{item.itemName}</h5>
                            <p className="text-xs text-gray-500">
                              €{item.price.toFixed(2)} / {item.unit}
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

                    {/* Order Totals */}
                    <div className="border-t pt-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal:</span>
                        <span>€{totals.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>VAT (25%):</span>
                        <span>€{totals.tax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-semibold text-lg">
                        <span>Total:</span>
                        <span className="text-blue-600">€{totals.total.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Order Notes */}
                    <div className="space-y-2">
                      <Label>Order Notes</Label>
                      <textarea
                        value={orderNotes}
                        onChange={(e) => setOrderNotes(e.target.value)}
                        placeholder="Special instructions, allergies, etc."
                        className="w-full p-2 border border-gray-300 rounded-md text-sm"
                        rows={2}
                      />
                    </div>

                    {/* Add to Bill Button */}
                    <Button
                      onClick={handleAddToRoomBill}
                      disabled={orderItems.length === 0 || isLoading}
                      className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                      size="lg"
                    >
                      <DollarSign className="h-4 w-4 mr-2" />
                      Add to Room Bill (€{totals.total.toFixed(2)})
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}