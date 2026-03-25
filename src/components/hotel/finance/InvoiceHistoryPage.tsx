import React, { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useInvoices } from '../../../lib/queries/hooks/useInvoices';
import { useGuests } from '../../../lib/queries/hooks/useGuests';
import { useRooms } from '../../../lib/queries/hooks/useRooms';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import {
  Calendar,
  DollarSign,
  FileText,
  Search,
  Filter,
  Download,
  Eye,
  CreditCard,
  X,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { Invoice, Company } from '../../../lib/hotel/types';
import {
  INVOICE_STATUS_COLORS,
  getGuestName,
  getRoomNumber,
  filterInvoices,
  getTotalRevenue,
  getUnpaidInvoices,
} from '../../../lib/hotel/invoiceUtils';
import { generatePDFInvoice } from '../../../lib/pdfInvoiceGenerator';
import { useReservations } from '../../../lib/queries/hooks/useReservations';
import hotelNotification from '../../../lib/notifications';
import { useCompanies } from '../../../lib/queries/hooks/useCompanies';

export default function InvoiceHistoryPage() {
  const { data: invoices = [], isLoading: invoicesLoading, isError: invoicesError } = useInvoices();
  const { data: guests = [], isLoading: guestsLoading, isError: guestsError } = useGuests();
  const { data: rooms = [], isLoading: roomsLoading, isError: roomsError } = useRooms();
  const {
    data: reservations = [],
    isLoading: reservationsLoading,
    isError: reservationsError,
  } = useReservations();
  const { data: companies = [] } = useCompanies();

  const isLoading = invoicesLoading || guestsLoading || roomsLoading || reservationsLoading;
  const isError = invoicesError || guestsError || roomsError || reservationsError;

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showInvoiceDetails, setShowInvoiceDetails] = useState(false);

  const getInvoicesByDateRange = (start: Date, end: Date) =>
    invoices.filter((inv) => inv.issueDate >= start && inv.issueDate <= end);

  if (isLoading) {
    return (
      <div className="space-y-3 p-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center p-8 text-red-500">
        Failed to load invoice data. Please try again.
      </div>
    );
  }

  const filteredInvoices = filterInvoices(
    invoices,
    guests,
    reservations,
    rooms,
    searchTerm,
    statusFilter
  );
  const unpaidInvoices = getUnpaidInvoices(invoices);
  const totalRevenue = getTotalRevenue(invoices);
  const statusColors = INVOICE_STATUS_COLORS;

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowInvoiceDetails(true);
  };

  const handleDownloadPDF = async (invoice: Invoice) => {
    try {
      // Find related reservation
      const reservation = reservations.find((r) => r.id === invoice.reservationId);
      const guest = guests.find((g) => g.id === invoice.guestId);
      const room = reservation ? rooms.find((r) => r.id === reservation.room_id) : undefined;

      if (!reservation || !guest || !room) {
        hotelNotification.error(
          'PDF Generation Failed',
          'Missing reservation, guest, or room data for invoice generation.',
          4000
        );
        return;
      }

      // Resolve company from TQ cache (no extra fetch needed)
      const company: Company | undefined =
        reservation.is_r1 && reservation.company_id
          ? companies.find((c) => c.id === Number(reservation.company_id))
          : undefined;

      // Generate PDF using existing generator
      generatePDFInvoice({
        reservation,
        guest,
        room,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.issueDate,
        company, // Pass company data for R1 billing
      });

      const invoiceType = company ? 'R1 Company Invoice' : 'Invoice';
      hotelNotification.success(
        'PDF Downloaded',
        `${invoiceType} ${invoice.invoiceNumber} has been downloaded successfully.`,
        3000
      );
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      hotelNotification.error(
        'PDF Generation Failed',
        'An error occurred while generating the PDF. Please try again.',
        4000
      );
    }
  };

  const getReservationDetails = (invoice: Invoice) => {
    return reservations.find((r) => r.id === invoice.reservationId);
  };

  return (
    <div className="mx-auto max-w-7xl p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoice History</h1>
          <p className="mt-1 text-gray-600">Manage and track all guest invoices and payments</p>
        </div>
        <div className="mt-4 flex space-x-3 sm:mt-0">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button size="sm">
            <FileText className="mr-2 h-4 w-4" />
            New Invoice
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Invoices</p>
                <p className="text-2xl font-bold text-gray-900">{invoices.length}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">€{totalRevenue.toFixed(2)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Unpaid Invoices</p>
                <p className="text-2xl font-bold text-red-600">{unpaidInvoices.length}</p>
              </div>
              <CreditCard className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">This Month</p>
                <p className="text-2xl font-bold text-blue-600">
                  {
                    getInvoicesByDateRange(
                      new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                      new Date()
                    ).length
                  }
                </p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by invoice number, guest name, or room..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 py-2 pr-4 pl-10 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoice List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Invoice #</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Guest</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Room</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Issue Date</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Amount</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.slice(0, 10).map((invoice) => (
                  <tr key={invoice.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{invoice.invoiceNumber}</td>
                    <td className="px-4 py-3">{getGuestName(invoice.guestId, guests)}</td>
                    <td className="px-4 py-3">{getRoomNumber(invoice, reservations, rooms)}</td>
                    <td className="px-4 py-3">{format(invoice.issueDate, 'MMM dd, yyyy')}</td>
                    <td className="px-4 py-3 font-medium">€{invoice.totalAmount.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <Badge className={statusColors[invoice.status]}>
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewInvoice(invoice)}
                          className="hover:bg-blue-50"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadPDF(invoice)}
                          className="hover:bg-green-50"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredInvoices.length === 0 && (
            <div className="py-8 text-center">
              <FileText className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <p className="text-gray-500">No invoices found matching your criteria</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice Details Modal */}
      <Dialog open={showInvoiceDetails} onOpenChange={setShowInvoiceDetails}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Invoice Details - {selectedInvoice?.invoiceNumber}</span>
              <Button variant="ghost" size="sm" onClick={() => setShowInvoiceDetails(false)}>
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-6">
              {/* Invoice Header */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Invoice Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Invoice Number:</span>
                      <span className="font-medium">{selectedInvoice.invoiceNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Issue Date:</span>
                      <span className="font-medium">
                        {format(selectedInvoice.issueDate, 'MMM dd, yyyy')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Due Date:</span>
                      <span className="font-medium">
                        {format(selectedInvoice.dueDate, 'MMM dd, yyyy')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <Badge className={statusColors[selectedInvoice.status]}>
                        {selectedInvoice.status.charAt(0).toUpperCase() +
                          selectedInvoice.status.slice(1)}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Guest & Room Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Guest Name:</span>
                      <span className="font-medium">
                        {getGuestName(selectedInvoice.guestId, guests)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Room Number:</span>
                      <span className="font-medium">
                        {getRoomNumber(selectedInvoice, reservations, rooms)}
                      </span>
                    </div>
                    {(() => {
                      const reservation = getReservationDetails(selectedInvoice);
                      return reservation ? (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Check-in:</span>
                            <span className="font-medium">
                              {format(new Date(reservation.check_in_date), 'MMM dd, yyyy')}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Check-out:</span>
                            <span className="font-medium">
                              {format(new Date(reservation.check_out_date), 'MMM dd, yyyy')}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Nights:</span>
                            <span className="font-medium">
                              {Math.ceil(
                                (new Date(reservation.check_out_date).getTime() -
                                  new Date(reservation.check_in_date).getTime()) /
                                  (1000 * 60 * 60 * 24)
                              )}
                            </span>
                          </div>
                        </>
                      ) : null;
                    })()}
                  </CardContent>
                </Card>
              </div>

              {/* Charges Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Charges Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Room Charges (Subtotal):</span>
                      <span>€{selectedInvoice.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>VAT (25%):</span>
                      <span>€{selectedInvoice.vatAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tourism Tax:</span>
                      <span>€{selectedInvoice.tourismTax.toFixed(2)}</span>
                    </div>
                    {/* Per-charge breakdown is available in EditChargesPanel via reservation_charges */}
                    <hr className="my-3" />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total Amount:</span>
                      <span>€{selectedInvoice.totalAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg">
                      <span>Remaining Balance:</span>
                      <span
                        className={
                          selectedInvoice.remainingAmount > 0
                            ? 'font-medium text-red-600'
                            : 'text-green-600'
                        }
                      >
                        €{selectedInvoice.remainingAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment History */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Payment History</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedInvoice.payments && selectedInvoice.payments.length > 0 ? (
                    <div className="space-y-3">
                      {selectedInvoice.payments.map((payment) => (
                        <div
                          key={payment.id}
                          className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
                        >
                          <div className="flex items-center space-x-3">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            <div>
                              <p className="font-medium">€{payment.amount.toFixed(2)}</p>
                              <p className="text-sm text-gray-600">
                                {payment.method.charAt(0).toUpperCase() + payment.method.slice(1)} •{' '}
                                {format(payment.receivedDate, 'MMM dd, yyyy')}
                              </p>
                              {payment.notes && (
                                <p className="text-xs text-gray-500">{payment.notes}</p>
                              )}
                            </div>
                          </div>
                          <Badge variant="outline" className="border-green-600 text-green-600">
                            {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-6 text-center">
                      <Clock className="mx-auto mb-3 h-12 w-12 text-gray-400" />
                      <p className="text-gray-500">No payments recorded for this invoice</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Croatian Fiscal Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Croatian Fiscal Compliance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selectedInvoice.fiscalData ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Hotel OIB:</span>
                        <span className="font-medium">{selectedInvoice.fiscalData.oib}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">JIR (Unique Receipt ID):</span>
                        <span className="font-mono text-sm">{selectedInvoice.fiscalData.jir}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">ZKI (Security Code):</span>
                        <span className="font-mono text-sm">{selectedInvoice.fiscalData.zki}</span>
                      </div>
                      {selectedInvoice.fiscalData.fiscalReceiptUrl && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Fiscal Receipt:</span>
                          <a
                            href={selectedInvoice.fiscalData.fiscalReceiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline"
                          >
                            View Receipt
                          </a>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="py-4 text-center text-gray-500">
                      No fiscal data available for this invoice
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 border-t pt-4">
                <Button
                  variant="outline"
                  onClick={() => handleDownloadPDF(selectedInvoice)}
                  className="flex items-center space-x-2"
                >
                  <Download className="h-4 w-4" />
                  <span>Download PDF</span>
                </Button>
                <Button onClick={() => setShowInvoiceDetails(false)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
