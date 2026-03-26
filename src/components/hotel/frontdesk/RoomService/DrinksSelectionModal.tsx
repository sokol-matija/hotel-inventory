import { useEffect, useMemo, useReducer, useState } from 'react';
import { X, Plus, Minus, Search, ShoppingCart, AlertTriangle } from 'lucide-react';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Badge } from '../../../ui/badge';
import { Skeleton } from '../../../ui/skeleton';
import { OrderItem, OrderValidationResult } from '../../../../lib/hotel/orderTypes';
import {
  validateOrder,
  calculateOrderTotal,
  formatCurrency,
} from '../../../../lib/hotel/orderService';
import { Reservation } from '../../../../lib/hotel/types';
import { formatRoomNumber } from '../../../../lib/hotel/calendarUtils';
import { useRooms } from '../../../../lib/queries/hooks/useRooms';
import {
  useFridgeItems,
  type FridgeInventoryItem,
} from '../../../../lib/queries/hooks/useRoomService';

// ── Inventory reducer ─────────────────────────────────────────────────────────

type InventoryState = {
  availableItems: FridgeInventoryItem[];
  basketQuantities: Record<number, number>;
};

type InventoryAction =
  | { type: 'RESET'; items: FridgeInventoryItem[] }
  | { type: 'ADJUST'; itemId: number; delta: number }
  | { type: 'CLEAR_ITEM'; itemId: number };

function inventoryReducer(state: InventoryState, action: InventoryAction): InventoryState {
  switch (action.type) {
    case 'RESET':
      return { availableItems: action.items, basketQuantities: {} };
    case 'ADJUST': {
      const newQty = Math.max(0, (state.basketQuantities[action.itemId] ?? 0) + action.delta);
      return {
        basketQuantities: { ...state.basketQuantities, [action.itemId]: newQty },
        availableItems: state.availableItems.map((item) =>
          item.id === action.itemId ? { ...item, availableStock: item.totalStock - newQty } : item
        ),
      };
    }
    case 'CLEAR_ITEM': {
      return {
        basketQuantities: { ...state.basketQuantities, [action.itemId]: 0 },
        availableItems: state.availableItems.map((item) =>
          item.id === action.itemId ? { ...item, availableStock: item.totalStock } : item
        ),
      };
    }
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

interface DrinksSelectionModalProps {
  reservation: Reservation;
  isOpen: boolean;
  onClose: () => void;
  onOrderComplete: (orderItems: OrderItem[], totalAmount: number) => void;
}

export default function DrinksSelectionModal({
  reservation,
  isOpen,
  onClose,
  onOrderComplete,
}: DrinksSelectionModalProps) {
  const { data: rooms = [] } = useRooms();
  const { data: fridgeItemsData = [], isLoading } = useFridgeItems(isOpen);

  const [{ availableItems, basketQuantities }, dispatch] = useReducer(inventoryReducer, {
    availableItems: [],
    basketQuantities: {},
  });
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Derived: validation (no useState/useEffect needed)
  const validationResult = useMemo<OrderValidationResult | null>(
    () => (orderItems.length > 0 ? validateOrder(orderItems) : null),
    [orderItems]
  );

  // Derived: filtered items
  const filteredItems = useMemo(
    () =>
      availableItems.filter(
        (item) =>
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.category.name.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [availableItems, searchTerm]
  );

  // Reset when modal opens or fresh data arrives
  useEffect(() => {
    if (isOpen) {
      dispatch({ type: 'RESET', items: fridgeItemsData });
      setOrderItems([]);
      setSearchTerm('');
    }
  }, [isOpen, fridgeItemsData]);

  const addToOrder = (item: FridgeInventoryItem) => {
    const currentBasketQty = basketQuantities[item.id] ?? 0;
    if (currentBasketQty >= item.totalStock) return;

    const existing = orderItems.find((oi) => oi.itemId === item.id);
    if (existing) {
      setOrderItems((prev) =>
        prev.map((oi) =>
          oi.itemId === item.id
            ? { ...oi, quantity: oi.quantity + 1, totalPrice: oi.price * (oi.quantity + 1) }
            : oi
        )
      );
    } else {
      setOrderItems((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          itemId: item.id,
          itemName: item.name,
          category: item.category.name,
          price: item.price,
          quantity: 1,
          totalPrice: item.price,
          unit: item.unit,
          availableStock: item.availableStock,
        },
      ]);
    }
    dispatch({ type: 'ADJUST', itemId: item.id, delta: 1 });
  };

  const updateOrderItemQuantity = (itemId: number, newQuantity: number) => {
    const current = orderItems.find((item) => item.itemId === itemId);
    if (!current) return;

    const delta = newQuantity - current.quantity;
    const newBasketQty = (basketQuantities[itemId] ?? 0) + delta;
    const inventoryItem = availableItems.find((item) => item.id === itemId);
    if (inventoryItem && newBasketQty > inventoryItem.totalStock) return;

    if (newQuantity <= 0) {
      setOrderItems((prev) => prev.filter((item) => item.itemId !== itemId));
      dispatch({ type: 'CLEAR_ITEM', itemId });
      return;
    }

    setOrderItems((prev) =>
      prev.map((item) =>
        item.itemId === itemId
          ? { ...item, quantity: newQuantity, totalPrice: item.price * newQuantity }
          : item
      )
    );
    dispatch({ type: 'ADJUST', itemId, delta });
  };

  const removeFromOrder = (itemId: number) => {
    setOrderItems((prev) => prev.filter((item) => item.itemId !== itemId));
    dispatch({ type: 'CLEAR_ITEM', itemId });
  };

  const handleAddToRoomBill = () => {
    if (orderItems.length === 0 || !validationResult?.isValid) return;
    const totals = calculateOrderTotal(orderItems);
    onOrderComplete(orderItems, totals.total);
    onClose();
  };

  const handleClose = () => {
    setOrderItems([]);
    setSearchTerm('');
    dispatch({ type: 'RESET', items: fridgeItemsData });
    onClose();
  };

  const totals = calculateOrderTotal(orderItems);

  if (!isOpen) return null;

  const room = rooms.find((r) => r.id === reservation.room_id);
  const guestDisplayName =
    reservation.guests?.full_name ||
    `${reservation.guests?.first_name ?? ''} ${reservation.guests?.last_name ?? ''}`.trim() ||
    'Unknown Guest';

  return (
    <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b bg-gradient-to-r from-green-500 to-green-600 p-6 text-white">
          <div>
            <h2 className="flex items-center text-xl font-semibold">🍹 Add Drinks to Room Bill</h2>
            <p className="text-sm text-green-100">
              Room {room ? formatRoomNumber(room) : reservation.room_id} • {guestDisplayName}
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
          <div className="flex-1 overflow-y-auto border-r p-6">
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

            {isLoading ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-lg border p-4">
                    <div className="mb-2 flex items-start justify-between">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                    <Skeleton className="mb-3 h-4 w-full" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                      <span className="font-semibold text-green-600">
                        {formatCurrency(item.price)} / {item.unit}
                      </span>
                      <span
                        className={`text-sm ${item.availableStock > 0 ? 'text-gray-500' : 'text-red-500'}`}
                      >
                        Available: {item.availableStock} / {item.totalStock}
                      </span>
                    </div>

                    <Button
                      onClick={() => addToOrder(item)}
                      disabled={item.availableStock === 0}
                      className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300"
                      size="sm"
                    >
                      <Plus className="mr-1 h-4 w-4" />
                      {item.availableStock === 0 ? 'Out of Stock' : 'Add to Order'}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column - Order Summary */}
          <div className="w-80 bg-gray-50 p-6">
            <div className="mb-4 flex items-center space-x-2">
              <ShoppingCart className="h-5 w-5" />
              <h3 className="text-lg font-semibold">Order Summary</h3>
            </div>

            {orderItems.length === 0 ? (
              <div className="py-8 text-center text-gray-500">No drinks selected</div>
            ) : (
              <div className="space-y-4">
                <div className="max-h-64 space-y-3 overflow-y-auto">
                  {orderItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded border bg-white p-2"
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

                {validationResult && validationResult.errors.length > 0 && (
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

                {validationResult && validationResult.warnings.length > 0 && (
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

                <div className="space-y-2 border-t pt-3">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(totals.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>VAT (25%):</span>
                    <span>{formatCurrency(totals.tax)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total:</span>
                    <span className="text-green-600">{formatCurrency(totals.total)}</span>
                  </div>
                </div>

                <Button
                  onClick={handleAddToRoomBill}
                  disabled={!validationResult?.isValid || isLoading}
                  className="w-full bg-green-500 text-white hover:bg-green-600"
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
