import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Eye, Download } from 'lucide-react';
import { format } from 'date-fns';
import { getGuestName, getRoomNumber } from '../../../../lib/hotel/invoiceUtils';
import type { InvoiceTableProps } from './types';

export function InvoiceTable({
  invoices,
  guests,
  reservations,
  rooms,
  statusColors,
  onViewInvoice,
  onDownloadPDF,
}: InvoiceTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoice History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-4 py-3 text-left font-medium text-gray-600">Invoice #</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Guest</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Room</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Amount</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">JIR</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Date</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-sm">{invoice.invoiceNumber}</td>
                  <td className="px-4 py-3">{getGuestName(invoice.guestId, guests)}</td>
                  <td className="px-4 py-3">{getRoomNumber(invoice, reservations, rooms)}</td>
                  <td className="px-4 py-3 font-medium">
                    {'\u20AC'}
                    {invoice.totalAmount.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {invoice.fiscalData?.jir ? (
                      <span className="cursor-help text-green-600" title={invoice.fiscalData.jir}>
                        {invoice.fiscalData.jir.slice(0, 8)}...
                      </span>
                    ) : (
                      <span className="text-gray-400">Not fiscalized</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      className={`text-xs ${statusColors[invoice.status as keyof typeof statusColors]}`}
                    >
                      {invoice.status.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {format(invoice.issueDate, 'MMM dd, yyyy')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <Button variant="outline" size="sm" onClick={() => onViewInvoice(invoice)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => onDownloadPDF(invoice)}>
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {invoices.length === 0 && (
            <div className="py-8 text-center text-gray-500">
              No invoices found matching your criteria.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
