import { useState, useEffect } from 'react';
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
  AlertTriangle,
} from 'lucide-react';
import type { Room } from '../../../../lib/queries/hooks/useRooms';
import { useRooms } from '../../../../lib/queries/hooks/useRooms';
import { useGuests } from '../../../../lib/queries/hooks/useGuests';
import {
  InventoryItem,
  OrderItem,
  RoomServiceOrder,
  OrderValidationResult,
} from '../../../../lib/hotel/orderTypes';
import {
  validateOrder,
  calculateOrderTotal,
  formatCurrency,
  getAvailableRooms,
} from '../../../../lib/hotel/orderService';
import {
  useFoodAndBeverageItems,
  useProcessRoomServiceOrder,
} from '../../../../lib/queries/hooks/useRoomService';
import { useReservations } from '../../../../lib/queries/hooks/useReservations';
import { printReceipt as printBixolonReceipt } from '../../../../lib/printers/bixolonPrinter';
import { HOTEL_POREC } from '../../../../lib/hotel/hotelData';
import { useAuth } from '../../../../stores/authStore';

export default function RoomServiceOrders() {
  const { user } = useAuth();
  const { data: rooms = [] } = useRooms();
  const { data: guests = [] } = useGuests();
  const { data: reservations = [] } = useReservations();
  const { data: availableItems = [], isLoading: itemsLoading } = useFoodAndBeverageItems();
  const processOrderMutation = useProcessRoomServiceOrder();
  const isLoading = itemsLoading || processOrderMutation.isPending;

  // State
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<
    'room_bill' | 'immediate_cash' | 'immediate_card'
  >('room_bill');
  const [orderNotes, setOrderNotes] = useState('');
  const [validationResult, setValidationResult] = useState<OrderValidationResult | null>(null);
  const [lastOrder, setLastOrder] = useState<RoomServiceOrder | null>(null);

  // Validate order whenever order items change
  useEffect(() => {
    if (orderItems.length > 0) {
      setValidationResult(validateOrder(orderItems));
    } else {
      setValidationResult(null);
    }
  }, [orderItems]);

  const filteredItems = availableItems.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToOrder = (item: InventoryItem) => {
    const existingOrderItem = orderItems.find((oi) => oi.itemId === item.id);

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
        availableStock: item.totalStock,
      };
      setOrderItems([...orderItems, newOrderItem]);
    }
  };

  const updateOrderItemQuantity = (itemId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      setOrderItems(orderItems.filter((item) => item.itemId !== itemId));
      return;
    }

    setOrderItems(
      orderItems.map((item) =>
        item.itemId === itemId
          ? { ...item, quantity: newQuantity, totalPrice: item.price * newQuantity }
          : item
      )
    );
  };

  const removeFromOrder = (itemId: number) => {
    setOrderItems(orderItems.filter((item) => item.itemId !== itemId));
  };

  const processOrder = () => {
    if (!selectedRoom || orderItems.length === 0 || !validationResult?.isValid) return;

    const activeReservation = reservations.find(
      (r) => r.roomId === selectedRoom.id.toString() && r.status === 'checked-in'
    );
    const guestName =
      activeReservation?.guest?.fullName ||
      guests.find((g) => g.id === activeReservation?.guestId)?.fullName ||
      'Unknown Guest';
    const totals = calculateOrderTotal(orderItems);

    const orderData: Omit<RoomServiceOrder, 'id' | 'orderNumber' | 'orderedAt'> = {
      roomId: selectedRoom.id.toString(),
      roomNumber: selectedRoom.room_number,
      guestName,
      items: orderItems,
      subtotal: totals.subtotal,
      tax: totals.tax,
      totalAmount: totals.total,
      paymentMethod,
      paymentStatus: paymentMethod === 'room_bill' ? 'pending' : 'paid',
      orderStatus: 'pending',
      notes: orderNotes,
      orderedBy: user?.email || 'Front Desk Staff',
      printedReceipt: false,
    };

    processOrderMutation.mutate(orderData, {
      onSuccess: (processedOrder) => {
        setLastOrder(processedOrder);
        setOrderItems([]);
        setOrderNotes('');
        setSelectedRoom(null);
      },
      onError: (error) => {
        console.error('Error processing order:', error);
        alert('Error processing order: ' + error);
      },
    });
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
            email: HOTEL_POREC.email,
          },
          timestamp: new Date(),
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
    <div className="grid h-full grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Left Column - Room Selection & Item Catalog */}
      <div className="space-y-6 lg:col-span-2">
        {/* Room Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Package className="h-5 w-5" />
              <span>Room Service Orders</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label>Select Room</Label>
                <select
                  value={selectedRoom?.id || ''}
                  onChange={(e) => {
                    const room = availableRooms.find((r) => r.id === Number(e.target.value));
                    setSelectedRoom(room || null);
                  }}
                  className="w-full rounded-md border border-gray-300 p-2"
                >
                  <option value="">Choose a room...</option>
                  {availableRooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      Room {room.room_number} - {room.room_types?.code ?? ''}
                    </option>
                  ))}
                </select>
              </div>

              {selectedRoom && (
                <div className="rounded-md bg-blue-50 p-3">
                  <h4 className="font-medium">Room {selectedRoom.room_number}</h4>
                  <p className="text-sm text-gray-600">{selectedRoom.room_types?.code ?? ''}</p>
                  <p className="text-sm text-gray-600">Max {selectedRoom.max_occupancy} guests</p>
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
              <div className="py-8 text-center">Loading items...</div>
            ) : (
              <div className="grid max-h-96 grid-cols-1 gap-4 overflow-y-auto md:grid-cols-2">
                {filteredItems.map((item) => (
                  <div key={item.id} className="rounded-lg border p-4 hover:bg-gray-50">
                    <div className="mb-2 flex items-start justify-between">
                      <h4 className="font-medium">{item.name}</h4>
                      <Badge variant="secondary">{item.category.name}</Badge>
                    </div>

                    {item.description && (
                      <p className="mb-2 text-sm text-gray-600">{item.description}</p>
                    )}

                    <div className="mb-3 flex items-center justify-between">
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
                      <Plus className="mr-1 h-4 w-4" />
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
              <div className="py-8 text-center text-gray-500">No items in order</div>
            ) : (
              <>
                <div className="max-h-64 space-y-3 overflow-y-auto">
                  {orderItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded border p-2"
                    >
                      <div className="flex-1">
                        <h5 className="text-sm font-medium">{item.itemName}</h5>
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
                      <div className="rounded border border-red-200 bg-red-50 p-2 text-sm">
                        <div className="flex items-center space-x-1 text-red-700">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="font-medium">Errors:</span>
                        </div>
                        {validationResult.errors.map((error) => (
                          <p key={error} className="text-xs text-red-600">
                            {error}
                          </p>
                        ))}
                      </div>
                    )}

                    {validationResult.warnings.length > 0 && (
                      <div className="rounded border border-yellow-200 bg-yellow-50 p-2 text-sm">
                        <div className="flex items-center space-x-1 text-yellow-700">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="font-medium">Warnings:</span>
                        </div>
                        {validationResult.warnings.map((warning) => (
                          <p key={warning} className="text-xs text-yellow-600">
                            {warning}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Order Totals */}
                <div className="space-y-2 border-t pt-3">
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
                    onChange={(e) =>
                      setPaymentMethod(
                        e.target.value as 'room_bill' | 'immediate_cash' | 'immediate_card'
                      )
                    }
                    className="w-full rounded-md border border-gray-300 p-2 text-sm"
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
                    className="w-full rounded-md border border-gray-300 p-2 text-sm"
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
                    <DollarSign className="mr-2 h-4 w-4" />
                  ) : (
                    <CreditCard className="mr-2 h-4 w-4" />
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
                <p>
                  <strong>Order #:</strong> {lastOrder.orderNumber}
                </p>
                <p>
                  <strong>Room:</strong> {lastOrder.roomNumber}
                </p>
                <p>
                  <strong>Total:</strong> {formatCurrency(lastOrder.totalAmount)}
                </p>
                <p>
                  <strong>Payment:</strong> {lastOrder.paymentMethod.replace('_', ' ')}
                </p>
              </div>

              <Button onClick={printReceipt} className="mt-4 w-full" variant="outline">
                <Printer className="mr-2 h-4 w-4" />
                Print Receipt
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
