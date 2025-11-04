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
  CheckCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { Invoice, Guest, Room, Reservation, Company } from '../../../lib/hotel/types';
import { generatePDFInvoice, generateInvoiceNumber } from '../../../lib/pdfInvoiceGenerator';
import { SAMPLE_RESERVATIONS } from '../../../lib/hotel/sampleData';
import hotelNotification from '../../../lib/notifications';
import { supabase } from '../../../lib/supabase';

export default function InvoiceHistoryPage() {
  const { invoices, guests, rooms, getInvoicesByDateRange, getUnpaidInvoices } = useHotel();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showInvoiceDetails, setShowInvoiceDetails] = useState(false);

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
    'cancelled': 'bg-gray-100 text-gray-600'
  };

  const getGuestName = (guestId: string) => {
    return guests.find(g => g.id === guestId)?.fullName || 'Unknown Guest';
  };

  const getRoomNumber = (invoice: Invoice) => {
    const reservation = SAMPLE_RESERVATIONS.find(r => r.id === invoice.reservationId);
    if (!reservation) return 'Unknown Room';
    return rooms.find(r => r.id === reservation.roomId)?.number || 'Unknown Room';
  };

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowInvoiceDetails(true);
  };

  const handleDownloadPDF = async (invoice: Invoice) => {
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

      // Fetch company data if this is an R1 reservation
      let company: Company | undefined;
      if ((reservation as any).is_r1 && (reservation as any).company_id) {
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('*')
          .eq('id', (reservation as any).company_id)
          .single();

        if (companyData && !companyError) {
          // Transform database format to Company type
          company = {
            id: companyData.id,
            name: companyData.name,
            oib: companyData.oib,
            address: {
              street: companyData.address,
              city: companyData.city,
              postalCode: companyData.postal_code,
              country: companyData.country
            },
            contactPerson: companyData.contact_person,
            email: companyData.email,
            phone: companyData.phone,
            fax: companyData.fax,
            pricingTierId: companyData.pricing_tier_id,
            roomAllocationGuarantee: companyData.room_allocation_guarantee,
            isActive: companyData.is_active,
            notes: companyData.notes,
            createdAt: companyData.created_at,
            updatedAt: companyData.updated_at
          };
        }
      }

      // Generate PDF using existing generator
      generatePDFInvoice({
        reservation,
        guest,
        room,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.issueDate,
        company // Pass company data for R1 billing
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
    return SAMPLE_RESERVATIONS.find(r => r.id === invoice.reservationId);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoice History</h1>
          <p className="text-gray-600 mt-1">
            Manage and track all guest invoices and payments
          </p>
        </div>
        <div className="flex space-x-3 mt-4 sm:mt-0">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
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
                <p className="text-sm font-medium text-gray-600">This Month</p>
                <p className="text-2xl font-bold text-blue-600">
                  {getInvoicesByDateRange(
                    new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                    new Date()
                  ).length}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
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
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Invoice #</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Guest</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Room</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Issue Date</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Amount</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.slice(0, 10).map((invoice) => (
                  <tr key={invoice.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{invoice.invoiceNumber}</td>
                    <td className="py-3 px-4">{getGuestName(invoice.guestId)}</td>
                    <td className="py-3 px-4">{getRoomNumber(invoice)}</td>
                    <td className="py-3 px-4">{format(invoice.issueDate, 'MMM dd, yyyy')}</td>
                    <td className="py-3 px-4 font-medium">€{invoice.totalAmount.toFixed(2)}</td>
                    <td className="py-3 px-4">
                      <Badge className={statusColors[invoice.status]}>
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleViewInvoice(invoice)}
                          className="hover:bg-blue-50"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDownloadPDF(invoice)}
                          className="hover:bg-green-50"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredInvoices.length === 0 && (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No invoices found matching your criteria</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice Details Modal */}
      <Dialog open={showInvoiceDetails} onOpenChange={setShowInvoiceDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Invoice Details - {selectedInvoice?.invoiceNumber}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowInvoiceDetails(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          {selectedInvoice && (
            <div className="space-y-6">
              {/* Invoice Header */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      <span className="font-medium">{format(selectedInvoice.issueDate, 'MMM dd, yyyy')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Due Date:</span>
                      <span className="font-medium">{format(selectedInvoice.dueDate, 'MMM dd, yyyy')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <Badge className={statusColors[selectedInvoice.status]}>
                        {selectedInvoice.status.charAt(0).toUpperCase() + selectedInvoice.status.slice(1)}
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
                      <span className="font-medium">{getGuestName(selectedInvoice.guestId)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Room Number:</span>
                      <span className="font-medium">{getRoomNumber(selectedInvoice)}</span>
                    </div>
                    {(() => {
                      const reservation = getReservationDetails(selectedInvoice);
                      return reservation ? (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Check-in:</span>
                            <span className="font-medium">{format(reservation.checkIn, 'MMM dd, yyyy')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Check-out:</span>
                            <span className="font-medium">{format(reservation.checkOut, 'MMM dd, yyyy')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Nights:</span>
                            <span className="font-medium">
                              {Math.ceil((reservation.checkOut.getTime() - reservation.checkIn.getTime()) / (1000 * 60 * 60 * 24))}
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
                    {(() => {
                      const reservation = getReservationDetails(selectedInvoice);
                      return reservation ? (
                        <>
                          {reservation.petFee > 0 && (
                            <div className="flex justify-between">
                              <span>Pet Fee:</span>
                              <span>€{reservation.petFee.toFixed(2)}</span>
                            </div>
                          )}
                          {reservation.parkingFee > 0 && (
                            <div className="flex justify-between">
                              <span>Parking Fee:</span>
                              <span>€{reservation.parkingFee.toFixed(2)}</span>
                            </div>
                          )}
                          {reservation.additionalCharges > 0 && (
                            <div className="flex justify-between">
                              <span>Additional Charges:</span>
                              <span>€{reservation.additionalCharges.toFixed(2)}</span>
                            </div>
                          )}
                        </>
                      ) : null;
                    })()}
                    <hr className="my-3" />
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total Amount:</span>
                      <span>€{selectedInvoice.totalAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg">
                      <span>Remaining Balance:</span>
                      <span className={selectedInvoice.remainingAmount > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
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
                      {selectedInvoice.payments.map((payment, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                            <div>
                              <p className="font-medium">€{payment.amount.toFixed(2)}</p>
                              <p className="text-sm text-gray-600">
                                {payment.method.charAt(0).toUpperCase() + payment.method.slice(1)} • {format(payment.receivedDate, 'MMM dd, yyyy')}
                              </p>
                              {payment.notes && (
                                <p className="text-xs text-gray-500">{payment.notes}</p>
                              )}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
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
                              className="text-blue-600 hover:underline text-sm"
                            >
                              View Receipt
                            </a>
                          </div>
                        )}
                    </>
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      No fiscal data available for this invoice
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => handleDownloadPDF(selectedInvoice)}
                  className="flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF</span>
                </Button>
                <Button
                  onClick={() => setShowInvoiceDetails(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}