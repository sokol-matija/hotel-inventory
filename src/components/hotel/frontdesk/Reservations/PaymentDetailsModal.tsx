import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../../ui/dialog';
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
  CheckCircle
} from 'lucide-react';
import { Reservation, Guest, Room, RoomServiceItem } from '../../../../lib/hotel/types';
import { calculatePricing } from '../../../../lib/hotel/pricingCalculator';
import { generatePDFInvoice, generateInvoiceNumber } from '../../../../lib/pdfInvoiceGenerator';
import { useHotel } from '../../../../lib/hotel/state/HotelContext';
import hotelNotification from '../../../../lib/notifications';

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
  room
}: PaymentDetailsModalProps) {
  const { updateReservation, generateInvoice: createInvoice, addPayment } = useHotel();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(reservation.status);

  // Recalculate pricing to get detailed breakdown
  const pricingDetails = calculatePricing(
    reservation.roomId,
    reservation.checkIn,
    reservation.checkOut,
    reservation.adults,
    guest.children,
    {
      hasPets: guest.hasPets,
      needsParking: reservation.parkingFee > 0,
      additionalCharges: reservation.additionalCharges
    }
  );

  const handlePrintInvoice = () => {
    try {
      // Generate unique invoice number
      const invoiceNumber = generateInvoiceNumber(reservation);
      const invoiceDate = new Date();
      
      // Generate PDF invoice
      generatePDFInvoice({
        reservation,
        guest,
        room,
        invoiceNumber,
        invoiceDate
      });
      
      // Show success notification
      hotelNotification.success('Invoice Generated', `PDF invoice saved as Hotel_Porec_Invoice_${invoiceNumber}_${guest.name.replace(/\s+/g, '_')}.pdf`);
    } catch (error) {
      console.error('Error generating PDF invoice:', error);
      hotelNotification.error('PDF Generation Failed', 'There was an error generating the PDF invoice. Please try again.');
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
        console.log('Auto-generating invoice for paid guest...');
        const invoice = await createInvoice(reservation.id);
        
        // Process payment for the full amount
        await addPayment({
          invoiceId: invoice.id,
          amount: invoice.totalAmount + (reservation.additionalCharges || 0),
          method: 'card',
          status: 'paid',
          receivedDate: new Date(),
          processedDate: new Date(),
          processedBy: 'Front Desk Staff',
          notes: `Payment processed via payment breakdown - ${guest.name}`,
          reference: `PAYMENT-${Date.now()}`
        });
        
        hotelNotification.success(
          'Payment Processed & Invoice Created',
          `Payment marked as paid for ${guest.name}. Invoice ${invoice.invoiceNumber} created and available in Finance module.`,
          5000
        );
      } catch (invoiceError) {
        console.error('Failed to generate invoice:', invoiceError);
        hotelNotification.warning(
          'Payment Marked but Invoice Failed',
          `Payment marked as paid for ${guest.name}, but invoice generation failed. Please create manually from Finance module.`,
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
    console.log('Sending reminder email to:', guest.email);
    // TODO: Implement email sending
    alert(`Reminder email would be sent to ${guest.email}`);
  };

  const formatCurrency = (amount: number) => `€${amount.toFixed(2)}`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Calculator className="h-5 w-5" />
            <span>Payment Breakdown - Room {room.number}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Guest and Booking Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Booking Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500">Guest</div>
                  <div className="font-medium">{guest.name}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Room</div>
                  <div className="font-medium">{room.number} - {room.nameEnglish}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Dates</div>
                  <div className="font-medium">
                    {reservation.checkIn.toLocaleDateString()} - {reservation.checkOut.toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Duration</div>
                  <div className="font-medium">{reservation.numberOfNights} nights</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-4 pt-2">
                <div className="flex items-center space-x-1">
                  <Users className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{reservation.numberOfGuests} guests</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">Season {reservation.seasonalPeriod}</span>
                </div>
                {guest.hasPets && (
                  <Badge variant="outline" className="text-xs">🐕 Pet</Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Room Rate Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Room Charges</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium">Base Room Rate</div>
                  <div className="text-sm text-gray-500">
                    {formatCurrency(reservation.baseRoomRate)} × {reservation.numberOfNights} nights
                  </div>
                </div>
                <div className="font-medium">{formatCurrency(reservation.subtotal)}</div>
              </div>

              {reservation.childrenDiscounts > 0 && (
                <div className="flex justify-between items-center text-green-600">
                  <div>
                    <div className="font-medium">Children Discounts</div>
                    <div className="text-sm">Age-based pricing discounts</div>
                  </div>
                  <div className="font-medium">-{formatCurrency(reservation.childrenDiscounts)}</div>
                </div>
              )}

              {reservation.shortStaySuplement > 0 && (
                <div className="flex justify-between items-center text-orange-600">
                  <div>
                    <div className="font-medium">Short Stay Supplement</div>
                    <div className="text-sm">+20% for stays under 3 nights</div>
                  </div>
                  <div className="font-medium">+{formatCurrency(reservation.shortStaySuplement)}</div>
                </div>
              )}

              <hr className="my-3" />
              
              <div className="flex justify-between items-center font-medium">
                <div>Room Subtotal</div>
                <div>{formatCurrency(reservation.subtotal - reservation.childrenDiscounts + reservation.shortStaySuplement)}</div>
              </div>
            </CardContent>
          </Card>

          {/* Croatian Taxes and Fees */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Croatian Taxes & Fees</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium">Tourism Tax</div>
                  <div className="text-sm text-gray-500">
                    {pricingDetails.fees.tourism / (reservation.numberOfGuests * reservation.numberOfNights) === 1.10 ? '€1.10' : '€1.50'} per person per night × {reservation.numberOfGuests} guests × {reservation.numberOfNights} nights
                  </div>
                </div>
                <div className="font-medium">{formatCurrency(reservation.tourismTax)}</div>
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium">VAT (25%)</div>
                  <div className="text-sm text-gray-500">Croatian Value Added Tax</div>
                </div>
                <div className="font-medium">{formatCurrency(reservation.vatAmount)}</div>
              </div>

              {reservation.petFee > 0 && (
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">Pet Fee</div>
                    <div className="text-sm text-gray-500">€20.00 per stay</div>
                  </div>
                  <div className="font-medium">{formatCurrency(reservation.petFee)}</div>
                </div>
              )}

              {reservation.parkingFee > 0 && (
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">Parking Fee</div>
                    <div className="text-sm text-gray-500">€7.00 per night × {reservation.numberOfNights} nights</div>
                  </div>
                  <div className="font-medium">{formatCurrency(reservation.parkingFee)}</div>
                </div>
              )}

              {reservation.additionalCharges > 0 && (
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">Additional Charges</div>
                    <div className="text-sm text-gray-500">Miscellaneous charges</div>
                  </div>
                  <div className="font-medium">{formatCurrency(reservation.additionalCharges)}</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Room Service Items */}
          {reservation.roomServiceItems && reservation.roomServiceItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Room Service</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {reservation.roomServiceItems.map((item, index) => (
                  <div key={item.id} className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">{item.itemName}</div>
                      <div className="text-sm text-gray-500">
                        {item.quantity}x €{item.unitPrice.toFixed(2)} • {item.orderedAt.toLocaleDateString()}
                      </div>
                    </div>
                    <div className="font-medium">{formatCurrency(item.totalPrice)}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Total Amount */}
          <Card className="bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-xl font-bold">Total Amount</div>
                  <div className="text-sm text-gray-600">All taxes and fees included</div>
                </div>
                <div className="text-2xl font-bold text-blue-700">
                  {formatCurrency(reservation.totalAmount)}
                </div>
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
                      Booking made on {reservation.bookingDate.toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Badge
                    variant={paymentStatus === 'checked-out' ? 'default' : 'destructive'}
                  >
                    {paymentStatus === 'checked-out' ? 'PAID' : 'PENDING'}
                  </Badge>
                  
                  {paymentStatus !== 'checked-out' && (
                    <Button
                      onClick={handleMarkAsPaid}
                      disabled={isProcessing}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {isProcessing ? 'Processing...' : 'Mark as Paid'}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
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

            <Button
              onClick={onClose}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <FileText className="h-4 w-4" />
              <span>Close</span>
            </Button>
          </div>

          {/* Croatian Legal Notice */}
          <div className="text-xs text-gray-500 p-3 bg-gray-50 rounded-md">
            <strong>Hotel Porec</strong> • OIB: 87246357068 • 52440 Poreč, Croatia, R Konoba 1<br />
            Phone: +385(0)52/451 611 • Email: hotelporec@pu.t-com.hr<br />
            VAT included at 25% rate. Tourism tax collected per Croatian Law.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}