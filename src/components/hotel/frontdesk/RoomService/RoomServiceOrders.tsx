import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { Badge } from '../../../ui/badge';
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Printer, 
  CreditCard, 
  DollarSign, 
  Search,
  Package,
  AlertTriangle
} from 'lucide-react';
import { Room } from '../../../../lib/hotel/types';
import { useHotel } from '../../../../lib/hotel/state/HotelContext';
import { 
  InventoryItem, 
  OrderItem, 
  RoomServiceOrder,
  OrderValidationResult 
} from '../../../../lib/hotel/orderTypes';
import { 
  getFoodAndBeverageItems,
  validateOrder,
  calculateOrderTotal,
  processRoomServiceOrder,
  formatCurrency,
  getAvailableRooms
} from '../../../../lib/hotel/orderService';
import { printReceipt as printBixolonReceipt } from '../../../../lib/printers/bixolonPrinter';
import { HOTEL_POREC } from '../../../../lib/hotel/hotelData';

interface RoomServiceOrdersProps {
  rooms: Room[];
}

export default function RoomServiceOrders({ rooms }: RoomServiceOrdersProps) {
  const { guests } = useHotel();
  
  // State
  const [availableItems, setAvailableItems] = useState<InventoryItem[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'room_bill' | 'immediate_cash' | 'immediate_card'>('room_bill');
  const [orderNotes, setOrderNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [validationResult, setValidationResult] = useState<OrderValidationResult | null>(null);
  const [lastOrder, setLastOrder] = useState<RoomServiceOrder | null>(null);

  // Load food and beverage items on component mount
  useEffect(() => {
    loadFoodAndBeverageItems();
  }, []);

  // Validate order whenever order items change
  useEffect(() => {
    if (orderItems.length > 0) {
      setValidationResult(validateOrder(orderItems));
    } else {
      setValidationResult(null);
    }
  }, [orderItems]);

  const loadFoodAndBeverageItems = async () => {
    try {
      setIsLoading(true);
      const items = await getFoodAndBeverageItems();
      setAvailableItems(items);
    } catch (error) {
      console.error('Error loading food and beverage items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredItems = availableItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToOrder = (item: InventoryItem) => {
    const existingOrderItem = orderItems.find(oi => oi.itemId === item.id);
    
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

  const processOrder = async () => {
    if (!selectedRoom || orderItems.length === 0 || !validationResult?.isValid) {
      return;
    }

    try {
      setIsLoading(true);
      
      const guestName = guests.find(g => g.id === selectedRoom.id)?.name || 'Unknown Guest';
      const totals = calculateOrderTotal(orderItems);

      const orderData: Omit<RoomServiceOrder, 'id' | 'orderNumber' | 'orderedAt'> = {
        roomId: selectedRoom.id,
        roomNumber: selectedRoom.number,
        guestName,
        items: orderItems,
        subtotal: totals.subtotal,
        tax: totals.tax,
        totalAmount: totals.total,
        paymentMethod,
        paymentStatus: paymentMethod === 'room_bill' ? 'pending' : 'paid',
        orderStatus: 'pending',
        notes: orderNotes,
        orderedBy: 'Front Desk Staff', // TODO: Get actual staff member
        printedReceipt: false
      };

      const processedOrder = await processRoomServiceOrder(orderData);
      setLastOrder(processedOrder);
      
      // Reset form
      setOrderItems([]);
      setOrderNotes('');
      setSelectedRoom(null);
      
      // Reload items to update stock quantities
      await loadFoodAndBeverageItems();
      
    } catch (error) {
      console.error('Error processing order:', error);
      alert('Error processing order: ' + error);
    } finally {
      setIsLoading(false);
    }
  };

  const printReceipt = async () => {
    if (lastOrder) {
      try {
        const printData = {
          order: lastOrder,
          hotelInfo: {
            name: HOTEL_POREC.name,
            address: HOTEL_POREC.address,
            phone: HOTEL_POREC.phone,
            email: HOTEL_POREC.email
          },
          timestamp: new Date()
        };

        const success = await printBixolonReceipt(printData);
        if (!success) {
          alert('Printing failed. Please check printer connection.');
        }
      } catch (error) {
        console.error('Print error:', error);
        alert('Printing error: ' + error);
      }
    }
  };

  const totals = calculateOrderTotal(orderItems);
  const availableRooms = getAvailableRooms(rooms);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Left Column - Room Selection & Item Catalog */}
      <div className="lg:col-span-2 space-y-6">
        {/* Room Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5" />
              <span>Room Service Orders</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Select Room</Label>
                <select
                  value={selectedRoom?.id || ''}
                  onChange={(e) => {
                    const room = availableRooms.find(r => r.id === e.target.value);
                    setSelectedRoom(room || null);
                  }}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="">Choose a room...</option>
                  {availableRooms.map(room => (
                    <option key={room.id} value={room.id}>
                      Room {room.number} - {room.type}
                    </option>
                  ))}
                </select>
              </div>
              
              {selectedRoom && (
                <div className="p-3 bg-blue-50 rounded-md">
                  <h4 className="font-medium">Room {selectedRoom.number}</h4>
                  <p className="text-sm text-gray-600">{selectedRoom.type}</p>
                  <p className="text-sm text-gray-600">Max {selectedRoom.maxOccupancy} guests</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Item Catalog */}
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
                        {formatCurrency(item.price)} / {item.unit}
                      </span>
                      <span className="text-sm text-gray-500">
                        Stock: {item.totalStock} {item.unit}
                      </span>
                    </div>
                    
                    <Button
                      onClick={() => addToOrder(item)}
                      disabled={item.totalStock === 0 || !selectedRoom}
                      className="w-full"
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add to Order
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Column - Order Summary */}
      <div className="space-y-6">
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
                {validationResult && (
                  <div className="space-y-2">
                    {validationResult.errors.length > 0 && (
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
                    
                    {validationResult.warnings.length > 0 && (
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
                  </div>
                )}

                {/* Order Totals */}
                <div className="border-t pt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(totals.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>VAT (25%):</span>
                    <span>{formatCurrency(totals.tax)}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Total:</span>
                    <span>{formatCurrency(totals.total)}</span>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full p-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="room_bill">Add to Room Bill</option>
                    <option value="immediate_cash">Immediate Payment - Cash</option>
                    <option value="immediate_card">Immediate Payment - Card</option>
                  </select>
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

                {/* Process Order Button */}
                <Button
                  onClick={processOrder}
                  disabled={!selectedRoom || !validationResult?.isValid || isLoading}
                  className="w-full"
                >
                  {paymentMethod === 'room_bill' ? (
                    <DollarSign className="h-4 w-4 mr-2" />
                  ) : (
                    <CreditCard className="h-4 w-4 mr-2" />
                  )}
                  {isLoading ? 'Processing...' : 'Process Order'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Last Order Summary */}
        {lastOrder && (
          <Card>
            <CardHeader>
              <CardTitle className="text-green-600">Order Completed!</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p><strong>Order #:</strong> {lastOrder.orderNumber}</p>
                <p><strong>Room:</strong> {lastOrder.roomNumber}</p>
                <p><strong>Total:</strong> {formatCurrency(lastOrder.totalAmount)}</p>
                <p><strong>Payment:</strong> {lastOrder.paymentMethod.replace('_', ' ')}</p>
              </div>
              
              <Button
                onClick={printReceipt}
                className="w-full mt-4"
                variant="outline"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print Receipt
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}