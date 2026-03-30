import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { Banknote, CreditCard, Building2, Globe, Clock } from 'lucide-react';
import { format } from 'date-fns';
import type { PaymentTableProps } from './types';

// Payment methods configuration
const paymentMethods = {
  cash: { icon: Banknote, label: 'Cash', color: 'text-green-600' },
  card: { icon: CreditCard, label: 'Card', color: 'text-blue-600' },
  bank_transfer: { icon: Building2, label: 'Bank Transfer', color: 'text-purple-600' },
  online: { icon: Globe, label: 'Online', color: 'text-orange-600' },
  other: { icon: Clock, label: 'Other', color: 'text-gray-600' },
};

export function PaymentTable({ payments, statusColors, getInvoiceNumber }: PaymentTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payment History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-4 py-3 text-left font-medium text-gray-600">Payment ID</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Invoice #</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Amount</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Method</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Reference</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => {
                const PaymentIcon =
                  paymentMethods[payment.method as keyof typeof paymentMethods]?.icon || Clock;
                return (
                  <tr key={payment.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-sm">{payment.id.slice(-8)}</td>
                    <td className="px-4 py-3 font-mono text-sm">
                      {getInvoiceNumber(payment.invoiceId)}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {'\u20AC'}
                      {payment.amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <PaymentIcon
                          className={`h-4 w-4 ${paymentMethods[payment.method as keyof typeof paymentMethods]?.color || 'text-gray-600'}`}
                        />
                        <span className="text-sm">
                          {paymentMethods[payment.method as keyof typeof paymentMethods]?.label ||
                            payment.method}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        className={`text-xs ${statusColors[payment.status as keyof typeof statusColors]}`}
                      >
                        {payment.status.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {format(payment.receivedDate, 'MMM dd, yyyy')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {payment.referenceNumber || '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {payments.length === 0 && (
            <div className="py-8 text-center text-gray-500">No payments found.</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
