import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import {
  CreditCard,
  FileText,
  Mail,
  Download,
  Calculator,
  Users,
  Calendar,
  CheckCircle,
  Pencil,
  RefreshCw,
} from 'lucide-react';
import { Skeleton } from '../../../ui/skeleton';
import EditChargesPanel from './EditChargesPanel';
import { Reservation, Guest, Company } from '../../../../lib/hotel/types';
import type { ReservationUpdateInput } from '../../../../lib/queries/hooks/useReservations';
import type { Room } from '../../../../lib/queries/hooks/useRooms';
import { generatePDFInvoice, generateInvoiceNumber } from '../../../../lib/pdfInvoiceGenerator';
import { useUpdateReservation } from '../../../../lib/queries/hooks/useReservations';
import {
  useReservationCharges,
  useReplaceCharges,
} from '../../../../lib/queries/hooks/useReservationCharges';
import hotelNotification from '../../../../lib/notifications';
import { useCompanies } from '../../../../lib/queries/hooks/useCompanies';
import { createInvoice as createInvoiceService } from '../../../../lib/hotel/services/InvoiceService';
import { unifiedPricingService } from '../../../../lib/hotel/services/UnifiedPricingService';

interface PaymentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservation: Reservation;
  guest: Guest;
  room: Room;
}

export default function PaymentDetailsModal({
  isOpen,
  onClose,
  reservation,
  guest,
  room,
}: PaymentDetailsModalProps) {
  const addPayment = async (_payment: unknown) => {
    // Payment management not yet implemented — payments table integration pending
    console.warn('addPayment: not yet connected to DB');
  };
  const updateReservationMutation = useUpdateReservation();
  const updateReservation = async (id: number, updates: ReservationUpdateInput) => {
    await updateReservationMutation.mutateAsync({ id, updates });
  };
  const replaceChargesMutation = useReplaceCharges();
  const [isGeneratingCharges, setIsGeneratingCharges] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleGenerateCharges = async () => {
    try {
      setIsGeneratingCharges(true);
      const adults = reservation.adults ?? 1;
      const childrenCount = reservation.children_count ?? 0;
      const guestEntries = [
        ...Array(adults)
          .fill(null)
          .map(() => ({ name: guest.display_name, type: 'adult' as const })),
        ...Array(childrenCount)
          .fill(null)
          .map((_, i) => ({ name: `Child ${i + 1}`, type: 'child' as const })),
      ];
      const generated = await unifiedPricingService.generateCharges({
        roomId: room.id.toString(),
        checkIn: new Date(reservation.check_in_date),
        checkOut: new Date(reservation.check_out_date),
        guests: guestEntries,
        hasPets: reservation.has_pets ?? false,
        parkingRequired: reservation.parking_required ?? false,
      });
      await replaceChargesMutation.mutateAsync({
        reservationId: reservation.id as number,
        charges: generated.map((c) => ({
          charge_type: c.chargeType,
          description: c.description,
          quantity: c.quantity,
          unit_price: c.unitPrice,
          total: c.total,
          vat_rate: c.vatRate ?? 0.13,
          sort_order: c.sortOrder ?? 0,
        })),
      });
      hotelNotification.success(
        'Charges Generated',
        'Price breakdown has been calculated and saved.'
      );
    } catch (err) {
      console.error('Failed to generate charges:', err);
      hotelNotification.error('Failed', 'Could not calculate charges. Please add them manually.');
    } finally {
      setIsGeneratingCharges(false);
    }
  };
  const [paymentStatus, setPaymentStatus] = useState(reservation.reservation_statuses?.code ?? '');
  const [isEditMode, setIsEditMode] = useState(false);

  // Fetch charges from reservation_charges table
  const { data: charges = [], isLoading: chargesLoading } = useReservationCharges(reservation.id);
  const { data: companies = [] } = useCompanies();

  // Derive grand total from charges
  const grandTotal = charges.reduce((sum, c) => sum + c.total, 0);

  const handlePrintInvoice = async () => {
    try {
      setIsProcessing(true);

      // Generate unique invoice number
      const invoiceNumber = generateInvoiceNumber(reservation);
      const invoiceDate = new Date();

      // Resolve company from TQ cache (no extra fetch needed)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const reservationExt = reservation as any;
      const company: Company | undefined =
        reservationExt.is_r1 && reservationExt.company_id
          ? companies.find((c) => c.id === Number(reservationExt.company_id))
          : undefined;

      // Generate PDF invoice with charges
      generatePDFInvoice({
        reservation,
        guest,
        room,
        invoiceNumber,
        invoiceDate,
        company,
        charges,
      });

      // Show success notification
      const invoiceType = company ? 'R1 Company Invoice' : 'Invoice';
      hotelNotification.success(
        `${invoiceType} Generated`,
        `PDF invoice saved as Hotel_Porec_Invoice_${invoiceNumber}_${guest.display_name.replace(/\s+/g, '_')}.pdf`
      );
    } catch (error) {
      console.error('Error generating PDF invoice:', error);
      hotelNotification.error(
        'PDF Generation Failed',
        'There was an error generating the PDF invoice. Please try again.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMarkAsPaid = async () => {
    try {
      setIsProcessing(true);

      // Update reservation status to checked-out (indicating payment complete)
      await updateReservation(reservation.id, { status: 'checked-out' });
      setPaymentStatus('checked-out');

      // Automatically generate invoice when payment is marked as paid
      try {
        const guestIdNum = guest.id;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const reservationExt = reservation as any;
        const invoice = await createInvoiceService(reservation.id, {
          isR1: reservationExt.is_r1 ?? false,
          companyId: reservationExt.company_id ? Number(reservationExt.company_id) : undefined,
          guestId: guestIdNum,
        });

        // Process payment for the full amount
        await addPayment({
          invoiceId: invoice.id,
          amount: grandTotal,
          currency: 'EUR',
          method: 'card',
          status: 'paid',
          receivedDate: new Date(),
          processedDate: new Date(),
          processedBy: 'Front Desk Staff',
          notes: `Payment processed via payment breakdown - ${guest.display_name}`,
          referenceNumber: `PAYMENT-${Date.now()}`,
        });

        hotelNotification.success(
          'Payment Processed & Invoice Created',
          `Payment marked as paid for ${guest.display_name}. Invoice ${invoice.invoiceNumber} created and available in Finance module.`,
          5000
        );
      } catch (invoiceError) {
        console.error('Failed to generate invoice:', invoiceError);
        hotelNotification.warning(
          'Payment Marked but Invoice Failed',
          `Payment marked as paid for ${guest.display_name}, but invoice generation failed. Please create manually from Finance module.`,
          4000
        );
      }
    } catch (error) {
      console.error('Failed to update payment status:', error);
      hotelNotification.error(
        'Failed to Update Payment',
        'Unable to mark payment as paid. Please try again.',
        3000
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendEmail = () => {
    // TODO: Implement email sending
    alert(`Reminder email would be sent to ${guest.email}`);
  };

  const formatCurrency = (amount: number) => `€${amount.toFixed(2)}`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Calculator className="h-5 w-5" />
            <span>Payment Breakdown - Room {room.room_number}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Guest and Booking Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Booking Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <div className="text-sm text-gray-500">Guest</div>
                  <div className="font-medium">{guest.display_name}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Room</div>
                  <div className="font-medium">
                    {room.room_number} - {room.name_english}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Dates</div>
                  <div className="font-medium">
                    {new Date(reservation.check_in_date).toLocaleDateString()} -{' '}
                    {new Date(reservation.check_out_date).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Duration</div>
                  <div className="font-medium">{reservation.number_of_nights ?? 1} nights</div>
                </div>
              </div>

              <div className="flex items-center space-x-4 pt-2">
                <div className="flex items-center space-x-1">
                  <Users className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">
                    {reservation.number_of_guests ?? reservation.adults} guests
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{reservation.number_of_nights ?? 1} nights</span>
                </div>
                {guest.has_pets && (
                  <Badge variant="outline" className="text-xs">
                    Pet
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Charges Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Charges</CardTitle>
                {!isEditMode && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 text-xs text-gray-600"
                    onClick={() => setIsEditMode(true)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit Bill
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isEditMode ? (
                <EditChargesPanel
                  reservationId={reservation.id as number}
                  onClose={() => setIsEditMode(false)}
                />
              ) : chargesLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between gap-4">
                      <Skeleton className="h-5 flex-1" />
                      <Skeleton className="h-5 w-10" />
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                  ))}
                </div>
              ) : charges.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-6">
                  <p className="text-sm text-gray-500">No charges recorded for this reservation.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateCharges}
                    disabled={isGeneratingCharges}
                    className="flex items-center gap-1.5"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${isGeneratingCharges ? 'animate-spin' : ''}`}
                    />
                    {isGeneratingCharges ? 'Calculating...' : 'Calculate charges'}
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-500">
                        <th className="pb-2 font-medium">Description</th>
                        <th className="pb-2 text-right font-medium">Qty</th>
                        <th className="pb-2 text-right font-medium">Unit Price</th>
                        <th className="pb-2 text-right font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {charges.map((charge) => (
                        <tr key={charge.id}>
                          <td className="py-2">{charge.description}</td>
                          <td className="py-2 text-right">{charge.quantity}</td>
                          <td className="py-2 text-right">{formatCurrency(charge.unitPrice)}</td>
                          <td className="py-2 text-right font-medium">
                            {formatCurrency(charge.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Total Amount */}
          <Card className="bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xl font-bold">Total Amount</div>
                  <div className="text-sm text-gray-600">All taxes and fees included</div>
                </div>
                <div className="text-2xl font-bold text-blue-700">{formatCurrency(grandTotal)}</div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Payment Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <CreditCard className="h-5 w-5 text-gray-500" />
                  <div>
                    <div className="font-medium">
                      {paymentStatus === 'checked-out' ? 'Payment Complete' : 'Payment Pending'}
                    </div>
                    <div className="text-sm text-gray-500">
                      Booking made on{' '}
                      {new Date(reservation.booking_date ?? Date.now()).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Badge variant={paymentStatus === 'checked-out' ? 'default' : 'destructive'}>
                    {paymentStatus === 'checked-out' ? 'PAID' : 'PENDING'}
                  </Badge>

                  {paymentStatus !== 'checked-out' && (
                    <Button
                      onClick={handleMarkAsPaid}
                      disabled={isProcessing}
                      size="sm"
                      className="bg-green-600 text-white hover:bg-green-700"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      {isProcessing ? 'Processing...' : 'Mark as Paid'}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              onClick={handlePrintInvoice}
              className="flex items-center space-x-2"
              variant="default"
            >
              <Download className="h-4 w-4" />
              <span>Print PDF Invoice</span>
            </Button>

            <Button
              onClick={handleSendEmail}
              className="flex items-center space-x-2"
              variant="outline"
            >
              <Mail className="h-4 w-4" />
              <span>Send Reminder Email</span>
            </Button>

            <Button onClick={onClose} variant="outline" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Close</span>
            </Button>
          </div>

          {/* Croatian Legal Notice */}
          <div className="rounded-md bg-gray-50 p-3 text-xs text-gray-500">
            <strong>Hotel Porec</strong> • OIB: 87246357068 • 52440 Porec, Croatia, R Konoba 1<br />
            Phone: +385(0)52/451 611 • Email: hotelporec@pu.t-com.hr
            <br />
            VAT included at 13% rate for accommodation. Tourism tax collected per Croatian Law.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
