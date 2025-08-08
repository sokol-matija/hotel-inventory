import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  CreditCard, 
  DollarSign, 
  Search,
  Receipt
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useOrdersState } from '@/lib/hooks/useOrdersState';

export default function OrdersPage() {
  const { t } = useTranslation();
  
  // Use consolidated state management hook
  const {
    // State
    availableItems,
    orderItems,
    searchTerm,
    paymentMethod,
    orderNotes,
    lastOrderNumber,
    isLoading,
    filteredItems,
    orderTotals: totals,
    
    // Actions
    setSearchTerm,
    addToOrder,
    updateOrderItemQuantity,
    removeFromOrder,
    setPaymentMethod,
    setOrderNotes,
    processOrder,
    formatCurrency
  } = useOrdersState();

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

                  {/* Order Totals - Croatian Tax Breakdown */}
                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Net (Netto):</span>
                      <span>{formatCurrency(totals.subtotal)}</span>
                    </div>
                    
                    {/* Show VAT breakdown only for applicable categories */}
                    {totals.hasFood && totals.vat13 > 0 && (
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>VAT 13% (Food):</span>
                        <span>{formatCurrency(totals.vat13)}</span>
                      </div>
                    )}
                    
                    {totals.hasBeverages && totals.vat25 > 0 && (
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>VAT 25% (Beverages):</span>
                        <span>{formatCurrency(totals.vat25)}</span>
                      </div>
                    )}
                    
                    {/* Show PNP only for beverages */}
                    {totals.hasBeverages && totals.pnp > 0 && (
                      <div className="flex justify-between text-sm text-orange-600 font-medium">
                        <span>PNP 3% (Tourism Tax):</span>
                        <span>{formatCurrency(totals.pnp)}</span>
                      </div>
                    )}
                    
                    {/* Total VAT combined */}
                    {totals.totalVat > 0 && (
                      <div className="flex justify-between text-sm border-t pt-2">
                        <span>Total VAT + PNP:</span>
                        <span>{formatCurrency(totals.totalVat + totals.pnp)}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between font-bold text-lg border-t pt-2">
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