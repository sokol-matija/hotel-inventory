import { useState } from 'react';
import { X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { Badge } from '../../../ui/badge';
import { ShoppingCart, Plus, Minus, Search, DollarSign } from 'lucide-react';
import { Reservation } from '../../../../lib/hotel/types';
import { formatRoomNumber } from '../../../../lib/hotel/calendarUtils';
import { useRooms } from '../../../../lib/queries/hooks/useRooms';
import {
  useFoodAndBeverageItems,
  useProcessRoomServiceOrder,
} from '../../../../lib/queries/hooks/useRoomService';
import { OrderItem } from '../../../../lib/hotel/orderTypes';

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
  onOrderComplete,
}: HotelOrdersModalProps) {
  const { data: rooms = [] } = useRooms();
  const {
    data: availableItems = [],
    isLoading: isLoadingItems,
    isError: isItemsError,
  } = useFoodAndBeverageItems();
  const processOrder = useProcessRoomServiceOrder();

  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  const addToOrder = (item: (typeof availableItems)[number]) => {
    if (item.price === 0) {
      alert('Please set a price for this item first in the Items section.');
      return;
    }
    const existingOrderItem = orderItems.find((oi) => oi.itemId === item.id);

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

  const calculateOrderTotal = () => {
    const subtotal = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const tax = subtotal * 0.25; // 25% VAT
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const handleAddToRoomBill = () => {
    if (orderItems.length === 0) return;

    const room = rooms.find((r) => r.id === reservation.roomId);
    const totals = calculateOrderTotal();

    processOrder.mutate(
      {
        roomId: reservation.roomId,
        roomNumber: room ? formatRoomNumber(room) : reservation.roomId,
        guestName: reservation.guest?.fullName || 'Unknown Guest',
        reservationId: reservation.id,
        items: orderItems,
        subtotal: totals.subtotal,
        tax: totals.tax,
        totalAmount: totals.total,
        paymentMethod: 'room_bill',
        paymentStatus: 'pending',
        orderStatus: 'pending',
        notes: orderNotes,
        orderedBy: 'Front Desk',
      },
      {
        onSuccess: () => {
          onOrderComplete(orderItems, totals.total);
          setOrderItems([]);
          setSearchTerm('');
          setOrderNotes('');
          onClose();
        },
        onError: (error) => {
          console.error('Error processing room service order:', error);
        },
      }
    );
  };

  const handleClose = () => {
    setOrderItems([]);
    setSearchTerm('');
    setOrderNotes('');
    onClose();
  };

  const filteredItems = availableItems.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totals = calculateOrderTotal();
  const isSubmitting = processOrder.isPending;

  if (!isOpen) return null;

  const room = rooms.find((r) => r.id === reservation.roomId);
  const guest = reservation.guest;

  return (
    <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
      <div className="max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white">
          <div>
            <h2 className="flex items-center text-xl font-semibold">🛎️ Room Service Order</h2>
            <p className="text-sm text-blue-100">
              Room {room ? formatRoomNumber(room) : reservation.roomId} •{' '}
              {guest?.fullName || 'Unknown Guest'}
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
          {/* Left Column - Items Catalog */}
          <div className="flex-1 overflow-y-auto border-r p-6">
            <Card>
              <CardHeader>
                <CardTitle>Food &amp; Beverage Menu</CardTitle>
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
                {isItemsError ? (
                  <div className="py-8 text-center text-red-600">
                    Failed to load menu items. Please close and try again.
                  </div>
                ) : isLoadingItems ? (
                  <div className="py-8 text-center">Loading items...</div>
                ) : filteredItems.length === 0 ? (
                  <div className="py-8 text-center text-gray-500">
                    {searchTerm ? 'No items match your search.' : 'No items currently in stock.'}
                  </div>
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
                          <Plus className="mr-2 h-4 w-4" />
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
          <div className="w-80 bg-gray-50 p-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <ShoppingCart className="h-5 w-5" />
                  <span>Current Order</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {processOrder.isError && (
                  <div className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">
                    Error processing order. Please try again.
                  </div>
                )}

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
                              €{item.price.toFixed(2)} / {item.unit}
                            </p>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                updateOrderItemQuantity(item.itemId, item.quantity - 1)
                              }
                            >
                              <Minus className="h-3 w-3" />
                            </Button>

                            <span className="w-8 text-center text-sm">{item.quantity}</span>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                updateOrderItemQuantity(item.itemId, item.quantity + 1)
                              }
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
                    <div className="space-y-2 border-t pt-3">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal:</span>
                        <span>€{totals.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>VAT (25%):</span>
                        <span>€{totals.tax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-semibold">
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
                        className="w-full rounded-md border border-gray-300 p-2 text-sm"
                        rows={2}
                      />
                    </div>

                    {/* Add to Bill Button */}
                    <Button
                      onClick={handleAddToRoomBill}
                      disabled={orderItems.length === 0 || isSubmitting}
                      className="w-full bg-blue-500 text-white hover:bg-blue-600"
                      size="lg"
                    >
                      <DollarSign className="mr-2 h-4 w-4" />
                      {isSubmitting
                        ? 'Processing...'
                        : `Add to Room Bill (€${totals.total.toFixed(2)})`}
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
