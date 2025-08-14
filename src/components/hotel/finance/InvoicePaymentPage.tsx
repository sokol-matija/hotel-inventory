import React, { useState } from 'react';
import { useHotel } from '../../../lib/hotel/state/SupabaseHotelContext';
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
  Banknote,
  Building2,
  Globe,
  TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';
import { Invoice, Guest, Room, Reservation } from '../../../lib/hotel/types';
import { generatePDFInvoice, generateInvoiceNumber } from '../../../lib/pdfInvoiceGenerator';
import { SAMPLE_RESERVATIONS } from '../../../lib/hotel/sampleData';
import hotelNotification from '../../../lib/notifications';

export default function InvoicePaymentPage() {
  const { invoices, payments, guests, rooms, getInvoicesByDateRange, getUnpaidInvoices, getPaymentsByMethod } = useHotel();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showInvoiceDetails, setShowInvoiceDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<'invoices' | 'payments'>('invoices');

  // Payment methods configuration
  const paymentMethods = {
    'cash': { icon: Banknote, label: 'Cash', color: 'text-green-600' },
    'card': { icon: CreditCard, label: 'Card', color: 'text-blue-600' },
    'bank_transfer': { icon: Building2, label: 'Bank Transfer', color: 'text-purple-600' },
    'online': { icon: Globe, label: 'Online', color: 'text-orange-600' },
    'other': { icon: Clock, label: 'Other', color: 'text-gray-600' }
  };

  // Filter invoices based on search and status
  const filteredInvoices = invoices.filter(invoice => {
    const guest = guests.find(g => g.id === invoice.guestId);
    // Get room through reservation since invoice no longer has direct roomId
    const reservation = SAMPLE_RESERVATIONS.find(r => r.id === invoice.reservationId);
    const room = reservation ? rooms.find(r => r.id === reservation.roomId) : undefined;
    
    const matchesSearch = !searchTerm || 
      invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      guest?.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      room?.number.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const unpaidInvoices = getUnpaidInvoices();
  const totalRevenue = invoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.totalAmount, 0);

  const statusColors = {
    'draft': 'bg-gray-100 text-gray-800',
    'sent': 'bg-blue-100 text-blue-800',
    'paid': 'bg-green-100 text-green-800',
    'overdue': 'bg-red-100 text-red-800',
    'cancelled': 'bg-gray-100 text-gray-600',
    'pending': 'bg-yellow-100 text-yellow-800',
    'partial': 'bg-blue-100 text-blue-800',
    'refunded': 'bg-red-100 text-red-800'
  };

  const getGuestName = (guestId: string) => {
    return guests.find(g => g.id === guestId)?.fullName || 'Unknown Guest';
  };

  const getRoomNumber = (invoiceId: string) => {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (!invoice) return 'Unknown Room';
    const reservation = SAMPLE_RESERVATIONS.find(r => r.id === invoice.reservationId);
    if (!reservation) return 'Unknown Room';
    return rooms.find(r => r.id === reservation.roomId)?.number || 'Unknown Room';
  };

  const getInvoiceNumber = (invoiceId: string) => {
    return invoices.find(inv => inv.id === invoiceId)?.invoiceNumber || 'Unknown';
  };

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowInvoiceDetails(true);
  };

  const handleDownloadPDF = (invoice: Invoice) => {
    try {
      // Find related reservation
      const reservation = SAMPLE_RESERVATIONS.find(r => r.id === invoice.reservationId);
      const guest = guests.find(g => g.id === invoice.guestId);
      const room = reservation ? rooms.find(r => r.id === reservation.roomId) : undefined;

      if (!reservation || !guest || !room) {
        hotelNotification.error(
          'PDF Generation Failed',
          'Missing reservation, guest, or room data for invoice generation.',
          4000
        );
        return;
      }

      // Generate PDF using existing generator
      generatePDFInvoice({
        reservation,
        guest,
        room,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.issueDate
      });

      hotelNotification.success(
        'PDF Downloaded',
        `Invoice ${invoice.invoiceNumber} has been downloaded successfully.`,
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
  const cashPayments = getPaymentsByMethod('cash').reduce((sum, p) => sum + p.amount, 0);
  const cardPayments = getPaymentsByMethod('card').reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoice & Payment Management</h1>
          <p className="text-gray-600 mt-1">
            Manage invoices, track payments, and download PDFs
          </p>
        </div>
        <div className="flex space-x-3 mt-4 sm:mt-0">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </Button>
          <Button size="sm">
            <FileText className="w-4 h-4 mr-2" />
            New Invoice
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Invoices</p>
                <p className="text-2xl font-bold text-gray-900">{invoices.length}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-600" />
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
              <DollarSign className="w-8 h-8 text-green-600" />
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
              <CreditCard className="w-8 h-8 text-red-600" />
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
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 border-b">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'invoices'
              ? 'border-blue-500 text-blue-600 bg-blue-50'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Invoices ({invoices.length})
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'payments'
              ? 'border-blue-500 text-blue-600 bg-blue-50'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Payments ({payments.length})
        </button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search by invoice number, guest name, or room..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Invoice #</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Guest</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Room</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Amount</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-mono text-sm">{invoice.invoiceNumber}</td>
                      <td className="py-3 px-4">{getGuestName(invoice.guestId)}</td>
                      <td className="py-3 px-4">{getRoomNumber(invoice.id)}</td>
                      <td className="py-3 px-4 font-medium">€{invoice.totalAmount.toFixed(2)}</td>
                      <td className="py-3 px-4">
                        <Badge className={`text-xs ${statusColors[invoice.status as keyof typeof statusColors]}`}>
                          {invoice.status.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {format(invoice.issueDate, 'MMM dd, yyyy')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewInvoice(invoice)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadPDF(invoice)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredInvoices.length === 0 && (
                <div className="text-center py-8 text-gray-500">
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
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Payment ID</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Invoice #</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Amount</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Method</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => {
                    const PaymentIcon = paymentMethods[payment.method as keyof typeof paymentMethods]?.icon || Clock;
                    return (
                      <tr key={payment.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 font-mono text-sm">{payment.id.slice(-8)}</td>
                        <td className="py-3 px-4 font-mono text-sm">{getInvoiceNumber(payment.invoiceId)}</td>
                        <td className="py-3 px-4 font-medium">€{payment.amount.toFixed(2)}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <PaymentIcon className={`w-4 h-4 ${paymentMethods[payment.method as keyof typeof paymentMethods]?.color || 'text-gray-600'}`} />
                            <span className="text-sm">{paymentMethods[payment.method as keyof typeof paymentMethods]?.label || payment.method}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={`text-xs ${statusColors[payment.status as keyof typeof statusColors]}`}>
                            {payment.status.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {format(payment.receivedDate, 'MMM dd, yyyy')}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {payment.referenceNumber || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {payments.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No payments found.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoice Details Dialog */}
      <Dialog open={showInvoiceDetails} onOpenChange={setShowInvoiceDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Invoice Details</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => selectedInvoice && handleDownloadPDF(selectedInvoice)}
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            </DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Invoice Number</label>
                  <p className="font-mono">{selectedInvoice.invoiceNumber}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Status</label>
                  <Badge className={`text-xs ${statusColors[selectedInvoice.status as keyof typeof statusColors]}`}>
                    {selectedInvoice.status.toUpperCase()}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Guest</label>
                  <p>{getGuestName(selectedInvoice.guestId)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Room</label>
                  <p>{getRoomNumber(selectedInvoice.id)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Issue Date</label>
                  <p>{format(selectedInvoice.issueDate, 'MMM dd, yyyy')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Due Date</label>
                  <p>{format(selectedInvoice.dueDate, 'MMM dd, yyyy')}</p>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Financial Breakdown</h4>
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
                  <div className="flex justify-between font-bold border-t pt-2">
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