import React, { useState } from 'react';
import { useInvoices } from '../../../lib/queries/hooks/useInvoices';
import { useGuests } from '../../../lib/queries/hooks/useGuests';
import { useRooms } from '../../../lib/queries/hooks/useRooms';
import { useReservations } from '../../../lib/queries/hooks/useReservations';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import {
  DollarSign,
  FileText,
  Search,
  Filter,
  Download,
  Eye,
  CreditCard,
  Clock,
  Banknote,
  Building2,
  Globe,
  TrendingUp,
  Shield,
} from 'lucide-react';
import { format } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';
import { Invoice, Company, Payment } from '../../../lib/hotel/types';
import { generatePDFInvoice } from '../../../lib/pdfInvoiceGenerator';
import hotelNotification from '../../../lib/notifications';
import { supabase } from '../../../lib/supabase';

export default function InvoicePaymentPage() {
  const { data: invoices = [], isLoading: invoicesLoading, isError: invoicesError } = useInvoices();
  const { data: guests = [], isLoading: guestsLoading, isError: guestsError } = useGuests();
  const { data: rooms = [], isLoading: roomsLoading, isError: roomsError } = useRooms();
  const {
    data: reservations = [],
    isLoading: reservationsLoading,
    isError: reservationsError,
  } = useReservations();
  const payments: Payment[] = []; // payments not loaded from DB

  const isLoading = invoicesLoading || guestsLoading || roomsLoading || reservationsLoading;
  const isError = invoicesError || guestsError || roomsError || reservationsError;

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showInvoiceDetails, setShowInvoiceDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<'invoices' | 'payments'>('invoices');

  const getUnpaidInvoices = () => invoices.filter((inv) => inv.status !== 'paid');

  if (isLoading) {
    return <div className="flex items-center justify-center p-8 text-gray-500">Loading...</div>;
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center p-8 text-red-500">
        Failed to load invoice data. Please try again.
      </div>
    );
  }

  // Payment methods configuration
  const paymentMethods = {
    cash: { icon: Banknote, label: 'Cash', color: 'text-green-600' },
    card: { icon: CreditCard, label: 'Card', color: 'text-blue-600' },
    bank_transfer: { icon: Building2, label: 'Bank Transfer', color: 'text-purple-600' },
    online: { icon: Globe, label: 'Online', color: 'text-orange-600' },
    other: { icon: Clock, label: 'Other', color: 'text-gray-600' },
  };

  // Filter invoices based on search and status
  const filteredInvoices = invoices.filter((invoice) => {
    const guest = guests.find((g) => g.id === invoice.guestId);
    // Get room through reservation - use real reservations from context
    const reservation = reservations.find((r) => r.id === invoice.reservationId);
    const room = reservation ? rooms.find((r) => r.id === reservation.roomId) : undefined;

    const matchesSearch =
      !searchTerm ||
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      guest?.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      room?.number.includes(searchTerm);

    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const unpaidInvoices = getUnpaidInvoices();
  const totalRevenue = invoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.totalAmount, 0);

  const statusColors = {
    draft: 'bg-gray-100 text-gray-800',
    sent: 'bg-blue-100 text-blue-800',
    paid: 'bg-green-100 text-green-800',
    overdue: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-600',
    pending: 'bg-yellow-100 text-yellow-800',
    partial: 'bg-blue-100 text-blue-800',
    refunded: 'bg-red-100 text-red-800',
  };

  const getGuestName = (guestId: string) => {
    return guests.find((g) => g.id === guestId)?.fullName || 'Unknown Guest';
  };

  const getRoomNumber = (invoiceId: string) => {
    const invoice = invoices.find((inv) => inv.id === invoiceId);
    if (!invoice) return 'Unknown Room';
    const reservation = reservations.find((r) => r.id === invoice.reservationId);
    if (!reservation) return 'Unknown Room';
    return rooms.find((r) => r.id === reservation.roomId)?.number || 'Unknown Room';
  };

  const getInvoiceNumber = (invoiceId: string) => {
    return invoices.find((inv) => inv.id === invoiceId)?.invoiceNumber || 'Unknown';
  };

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowInvoiceDetails(true);
  };

  const handleDownloadPDF = async (invoice: Invoice) => {
    try {
      // Use reservation data from invoice (loaded via JOIN)
      const reservation = invoice.reservation;
      const guest = invoice.guest;
      const room = reservation ? rooms.find((r) => r.id === reservation.roomId) : undefined;

      if (!reservation || !guest || !room) {
        hotelNotification.error(
          'PDF Generation Failed',
          'Missing reservation, guest, or room data for invoice generation.',
          4000
        );
        return;
      }

      // Fetch company data if this is an R1 reservation
      let company: Company | undefined;
      if (reservation.isR1Bill && reservation.companyId) {
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('*')
          .eq('id', Number(reservation.companyId))
          .single();

        if (companyData && !companyError) {
          // Transform database format to Company type
          company = {
            id: String(companyData.id),
            name: companyData.name,
            oib: companyData.oib ?? '',
            address: {
              street: companyData.address ?? '',
              city: companyData.city ?? '',
              postalCode: companyData.postal_code ?? '',
              country: companyData.country ?? '',
            },
            contactPerson: companyData.contact_person ?? '',
            email: companyData.email ?? '',
            phone: companyData.phone ?? '',
            fax: companyData.fax ?? undefined,
            pricingTierId:
              companyData.pricing_tier_id != null ? String(companyData.pricing_tier_id) : undefined,
            roomAllocationGuarantee: companyData.room_allocation_guarantee ?? undefined,
            isActive: companyData.is_active ?? false,
            notes: companyData.notes ?? '',
            createdAt: new Date(companyData.created_at ?? Date.now()),
            updatedAt: new Date(companyData.updated_at ?? Date.now()),
          };
        }
      }

      // Generate PDF with EXISTING fiscal data (never regenerate JIR/ZKI)
      generatePDFInvoice({
        reservation,
        guest,
        room,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.issueDate,
        jir: invoice.fiscalData?.jir,
        zki: invoice.fiscalData?.zki,
        qrCodeData: invoice.fiscalData?.qrCodeData,
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

  // Payment calculations
  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <div className="mx-auto max-w-7xl p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoice & Payment Management</h1>
          <p className="mt-1 text-gray-600">Manage invoices, track payments, and download PDFs</p>
        </div>
        <div className="mt-4 flex space-x-3 sm:mt-0">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export Data
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
                <p className="text-sm font-medium text-gray-600">Total Payments</p>
                <p className="text-2xl font-bold text-blue-600">€{totalPaid.toFixed(2)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 flex space-x-1 border-b">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'invoices'
              ? 'border-blue-500 bg-blue-50 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Invoices ({invoices.length})
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'payments'
              ? 'border-blue-500 bg-blue-50 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Payments ({payments.length})
        </button>
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

      {/* Content based on active tab */}
      {activeTab === 'invoices' ? (
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
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-sm">{invoice.invoiceNumber}</td>
                      <td className="px-4 py-3">{getGuestName(invoice.guestId)}</td>
                      <td className="px-4 py-3">{getRoomNumber(invoice.id)}</td>
                      <td className="px-4 py-3 font-medium">€{invoice.totalAmount.toFixed(2)}</td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {invoice.fiscalData?.jir ? (
                          <span
                            className="cursor-help text-green-600"
                            title={invoice.fiscalData.jir}
                          >
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
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewInvoice(invoice)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadPDF(invoice)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredInvoices.length === 0 && (
                <div className="py-8 text-center text-gray-500">
                  No invoices found matching your criteria.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
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
                        <td className="px-4 py-3 font-medium">€{payment.amount.toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-2">
                            <PaymentIcon
                              className={`h-4 w-4 ${paymentMethods[payment.method as keyof typeof paymentMethods]?.color || 'text-gray-600'}`}
                            />
                            <span className="text-sm">
                              {paymentMethods[payment.method as keyof typeof paymentMethods]
                                ?.label || payment.method}
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
      )}

      {/* Invoice Details Dialog */}
      <Dialog open={showInvoiceDetails} onOpenChange={setShowInvoiceDetails}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Invoice Details</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => selectedInvoice && handleDownloadPDF(selectedInvoice)}
              >
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
            </DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4 pb-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Invoice Number</p>
                  <p className="font-mono">{selectedInvoice.invoiceNumber}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Status</p>
                  <Badge
                    className={`text-xs ${statusColors[selectedInvoice.status as keyof typeof statusColors]}`}
                  >
                    {selectedInvoice.status.toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Guest</p>
                  <p>{getGuestName(selectedInvoice.guestId)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Room</p>
                  <p>{getRoomNumber(selectedInvoice.id)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Issue Date</p>
                  <p>{format(selectedInvoice.issueDate, 'MMM dd, yyyy')}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Due Date</p>
                  <p>{format(selectedInvoice.dueDate, 'MMM dd, yyyy')}</p>
                </div>
              </div>

              {/* Fiscal Information Section */}
              {selectedInvoice.fiscalData && (
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
                        {selectedInvoice.fiscalData.jir}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">ZKI (Security Code)</p>
                      <p className="font-mono text-sm break-all text-green-800">
                        {selectedInvoice.fiscalData.zki}
                      </p>
                    </div>
                    {selectedInvoice.fiscalData.qrCodeData && (
                      <div>
                        <p className="text-sm font-medium text-gray-600">QR Code</p>
                        <div className="mt-2 inline-block rounded border bg-white p-3">
                          <QRCodeSVG value={selectedInvoice.fiscalData.qrCodeData} size={128} />
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
                  <div className="flex justify-between border-t pt-2 font-bold">
                    <span>Total Amount:</span>
                    <span>€{selectedInvoice.totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
