import React from 'react';
import { Badge } from '../../../ui/badge';
import { Button } from '../../../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../ui/dialog';
import { Download, Shield } from 'lucide-react';
import { format } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';
import { getGuestName, getRoomNumber } from '../../../../lib/hotel/invoiceUtils';
import type { InvoiceDetailDialogProps } from './types';

export function InvoiceDetailDialog({
  invoice,
  open,
  onOpenChange,
  guests,
  reservations,
  rooms,
  statusColors,
  onDownloadPDF,
}: InvoiceDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Invoice Details</span>
            <Button variant="outline" size="sm" onClick={() => invoice && onDownloadPDF(invoice)}>
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
          </DialogTitle>
        </DialogHeader>
        {invoice && (
          <div className="space-y-4 pb-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Invoice Number</p>
                <p className="font-mono">{invoice.invoiceNumber}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Status</p>
                <Badge
                  className={`text-xs ${statusColors[invoice.status as keyof typeof statusColors]}`}
                >
                  {invoice.status.toUpperCase()}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Guest</p>
                <p>{getGuestName(invoice.guestId, guests)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Room</p>
                <p>{getRoomNumber(invoice, reservations, rooms)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Issue Date</p>
                <p>{format(invoice.issueDate, 'MMM dd, yyyy')}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Due Date</p>
                <p>{format(invoice.dueDate, 'MMM dd, yyyy')}</p>
              </div>
            </div>

            {/* Fiscal Information Section */}
            {invoice.fiscalData && (
              <div className="border-t pt-4">
                <h4 className="mb-3 flex items-center font-medium text-green-700">
                  <Shield className="mr-2 h-5 w-5" />
                  Croatian Fiscal Information
                </h4>
                <div className="space-y-3 rounded-lg border border-green-200 bg-green-50 p-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      JIR (Unique Invoice Identifier)
                    </p>
                    <p className="font-mono text-sm break-all text-green-800">
                      {invoice.fiscalData.jir}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">ZKI (Security Code)</p>
                    <p className="font-mono text-sm break-all text-green-800">
                      {invoice.fiscalData.zki}
                    </p>
                  </div>
                  {invoice.fiscalData.qrCodeData && (
                    <div>
                      <p className="text-sm font-medium text-gray-600">QR Code</p>
                      <div className="mt-2 inline-block rounded border bg-white p-3">
                        <QRCodeSVG value={invoice.fiscalData.qrCodeData} size={128} />
                      </div>
                      <p className="mt-2 text-xs text-gray-500">Scan to verify fiscalization</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="border-t pt-4">
              <h4 className="mb-2 font-medium">Financial Breakdown</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>
                    {'\u20AC'}
                    {invoice.subtotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>VAT (25%):</span>
                  <span>
                    {'\u20AC'}
                    {invoice.vatAmount.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Tourism Tax:</span>
                  <span>
                    {'\u20AC'}
                    {invoice.tourismTax.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2 font-bold">
                  <span>Total Amount:</span>
                  <span>
                    {'\u20AC'}
                    {invoice.totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
