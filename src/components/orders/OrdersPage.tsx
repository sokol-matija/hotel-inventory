import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
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
  Receipt
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { printWindowsReceipt } from '@/lib/printers/windowsPrinter';
import { useTranslation } from 'react-i18next';

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

export default function OrdersPage() {
  const { t } = useTranslation();
  
  // State
  const [availableItems, setAvailableItems] = useState<InventoryItem[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [orderNotes, setOrderNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastOrderNumber, setLastOrderNumber] = useState<string>('');

  // Load items on component mount
  useEffect(() => {
    loadAvailableItems();
  }, []);

  const loadAvailableItems = async () => {
    try {
      setIsLoading(true);
      
      // Fetch items with inventory - reusing your existing database structure
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

      // Transform data
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
          price: item.price || 0, // Default to 0 if no price set
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

      // Only show items in stock
      setAvailableItems(inventoryItems.filter(item => item.totalStock > 0));
    } catch (error) {
      console.error('Error loading items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredItems = availableItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
    const tax = subtotal * 0.25; // 25% VAT for Croatia
    const total = subtotal + tax;
    
    return { subtotal, tax, total };
  };

  const processOrder = async () => {
    if (orderItems.length === 0) {
      alert('Please add items to the order first.');
      return;
    }

    try {
      setIsLoading(true);
      
      // Generate order number
      const orderNumber = `ORDER-${Date.now()}`;
      const totals = calculateOrderTotal();

      // Create order data for printing
      const orderData = {
        order: {
          id: crypto.randomUUID(),
          orderNumber,
          roomId: 'INVENTORY', // Required field
          roomNumber: 'INVENTORY', // Since this is from inventory, not room service
          guestName: 'Staff Order',
          orderedAt: new Date(),
          items: orderItems,
          subtotal: totals.subtotal,
          tax: totals.tax,
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

      // Deduct inventory (FIFO - oldest expiration first)
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

      // Print receipt
      const printSuccess = await printWindowsReceipt(orderData);
      
      if (printSuccess) {
        setLastOrderNumber(orderNumber);
        // Reset form
        setOrderItems([]);
        setOrderNotes('');
        // Reload items to update stock quantities
        await loadAvailableItems();
        alert(`Order ${orderNumber} processed successfully and sent to printer!`);
      } else {
        alert(`Order ${orderNumber} processed but printing failed. Please try printing again.`);
      }
      
    } catch (error) {
      console.error('Error processing order:', error);
      alert('Error processing order: ' + error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => `€${amount.toFixed(2)}`;
  const totals = calculateOrderTotal();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create Order</h1>
          <p className="text-gray-600">Create orders from your inventory and print receipts</p>
        </div>
        
        {lastOrderNumber && (
          <div className="text-right">
            <p className="text-sm text-gray-500">Last Order:</p>
            <p className="font-mono text-green-600">{lastOrderNumber}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Item Catalog */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Available Items</CardTitle>
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
                          {item.price > 0 ? formatCurrency(item.price) : 'No price set'} / {item.unit}
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

        {/* Right Column - Order Cart & Processing */}
        <div className="space-y-6">
          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ShoppingCart className="h-5 w-5" />
                <span>Order Items ({orderItems.length})</span>
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
                          
                          <span className="w-16 text-right text-sm font-medium">
                            {formatCurrency(item.totalPrice)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Order Totals */}
                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(totals.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>VAT (25%):</span>
                      <span>{formatCurrency(totals.tax)}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>Total:</span>
                      <span>{formatCurrency(totals.total)}</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Payment & Processing */}
          {orderItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Process Order</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Payment Method</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <Button
                      variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                      onClick={() => setPaymentMethod('cash')}
                      className="flex items-center space-x-2"
                    >
                      <DollarSign className="h-4 w-4" />
                      <span>Cash</span>
                    </Button>
                    <Button
                      variant={paymentMethod === 'card' ? 'default' : 'outline'}
                      onClick={() => setPaymentMethod('card')}
                      className="flex items-center space-x-2"
                    >
                      <CreditCard className="h-4 w-4" />
                      <span>Card</span>
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Order Notes (Optional)</Label>
                  <Input
                    id="notes"
                    placeholder="Add notes..."
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                  />
                </div>

                <Button
                  onClick={processOrder}
                  disabled={isLoading || orderItems.length === 0}
                  className="w-full"
                >
                  <Receipt className="h-4 w-4 mr-2" />
                  {isLoading ? 'Processing...' : 'Process Order & Print Receipt'}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}