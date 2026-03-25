import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { CreditCard, Banknote, Building2, Globe, TrendingUp, Clock } from 'lucide-react';
import { useInvoices } from '../../../lib/queries/hooks/useInvoices';
import { Payment } from '../../../lib/hotel/types';
import { format } from 'date-fns';

export default function PaymentTrackingPage() {
  const { data: invoices = [] } = useInvoices();
  const payments: Payment[] = []; // payments not loaded from DB
  const getPaymentsByMethod = (method: string) => payments.filter((p) => p.method === method);

  const paymentMethods = {
    cash: { icon: Banknote, label: 'Cash', color: 'text-green-600' },
    card: { icon: CreditCard, label: 'Card', color: 'text-blue-600' },
    bank_transfer: { icon: Building2, label: 'Bank Transfer', color: 'text-purple-600' },
    online: { icon: Globe, label: 'Online', color: 'text-orange-600' },
    'booking-com': { icon: Globe, label: 'Booking.com', color: 'text-blue-500' },
    other: { icon: Clock, label: 'Other', color: 'text-gray-600' },
  };

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    partial: 'bg-blue-100 text-blue-800',
    paid: 'bg-green-100 text-green-800',
    refunded: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-600',
  };

  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const cashPayments = getPaymentsByMethod('cash').reduce((sum, p) => sum + p.amount, 0);
  const cardPayments = getPaymentsByMethod('card').reduce((sum, p) => sum + p.amount, 0);

  const getInvoiceNumber = (invoiceId: number) => {
    return invoices.find((inv) => inv.id === invoiceId)?.invoiceNumber || 'Unknown';
  };

  return (
    <div className="mx-auto max-w-7xl p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Tracking</h1>
          <p className="mt-1 text-gray-600">
            Monitor and manage all payments across different methods
          </p>
        </div>
        <Button size="sm">
          <CreditCard className="mr-2 h-4 w-4" />
          Record Payment
        </Button>
      </div>

      {/* Payment Method Stats */}
      <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Cash Payments</p>
                <p className="text-2xl font-bold text-green-600">€{cashPayments.toFixed(2)}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {getPaymentsByMethod('cash').length} transactions
                </p>
              </div>
              <Banknote className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Card Payments</p>
                <p className="text-2xl font-bold text-blue-600">€{cardPayments.toFixed(2)}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {getPaymentsByMethod('card').length} transactions
                </p>
              </div>
              <CreditCard className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Received</p>
                <p className="text-2xl font-bold text-purple-600">€{totalPaid.toFixed(2)}</p>
                <p className="mt-1 text-xs text-gray-500">{payments.length} total payments</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Payments */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Payment ID</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Invoice</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Method</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Amount</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.slice(0, 10).map((payment) => {
                  const methodInfo = paymentMethods[payment.method as keyof typeof paymentMethods];
                  if (!methodInfo) return null;
                  const Icon = methodInfo.icon;

                  return (
                    <tr key={payment.id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-sm">{payment.id.slice(-8)}</td>
                      <td className="px-4 py-3">{getInvoiceNumber(payment.invoiceId)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <Icon className={`h-4 w-4 ${methodInfo.color}`} />
                          <span>{methodInfo.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium">€{payment.amount.toFixed(2)}</td>
                      <td className="px-4 py-3">{format(payment.receivedDate, 'MMM dd, yyyy')}</td>
                      <td className="px-4 py-3">
                        <Badge className={statusColors[payment.status]}>
                          {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="sm">
                          View Details
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {payments.length === 0 && (
            <div className="py-8 text-center">
              <CreditCard className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <p className="text-gray-500">No payments recorded yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
