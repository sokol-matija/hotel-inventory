import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Reservation, Guest, Room } from './hotel/types';
import { format } from 'date-fns';

// Hotel Porec Contact Information (from HOTEL_MANAGEMENT_SPECS.md)
const HOTEL_INFO = {
  name: 'Hotel Porec',
  address: '52440 Porec, Croatia, R Konoba 1',
  phone: '+385(0)52/451 611',
  fax: '+385(0)52/433 462',
  email: 'hotelporec@pu.t-com.hr',
  website: 'www.hotelporec.com',
  taxId: '87246357068'
};

interface InvoiceData {
  reservation: Reservation;
  guest: Guest;
  room: Room;
  invoiceNumber: string;
  invoiceDate: Date;
}

export function generatePDFInvoice(data: InvoiceData): void {
  const { reservation, guest, room, invoiceNumber, invoiceDate } = data;
  
  // Create new PDF document
  const doc = new jsPDF();
  
  // Set font
  doc.setFont('helvetica');
  
  // Header - Hotel Logo Area (simplified text logo)
  doc.setFontSize(24);
  doc.setTextColor(41, 98, 146); // Blue color
  doc.text('HOTEL POREC', 20, 25);
  
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text('Croatia • Istria • Luxury Accommodation', 20, 32);
  
  // Hotel Contact Information (Right side)
  doc.setFontSize(9);
  doc.text(HOTEL_INFO.address, 140, 20);
  doc.text(`Phone: ${HOTEL_INFO.phone}`, 140, 26);
  doc.text(`Email: ${HOTEL_INFO.email}`, 140, 32);
  doc.text(`Website: ${HOTEL_INFO.website}`, 140, 38);
  doc.text(`Tax ID (OIB): ${HOTEL_INFO.taxId}`, 140, 44);
  
  // Invoice Title
  doc.setFontSize(18);
  doc.setTextColor(41, 98, 146);
  doc.text('INVOICE', 20, 60);
  
  // Invoice Details
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(`Invoice Number: ${invoiceNumber}`, 20, 70);
  doc.text(`Invoice Date: ${format(invoiceDate, 'dd.MM.yyyy')}`, 20, 76);
  doc.text(`Booking Reference: ${reservation.id.substring(0, 8).toUpperCase()}`, 20, 82);
  
  // Guest Information
  doc.setFontSize(12);
  doc.setTextColor(41, 98, 146);
  doc.text('BILL TO:', 20, 95);
  
  doc.setFontSize(10);  
  doc.setTextColor(0, 0, 0);
  doc.text(guest.name, 20, 105);
  doc.text(`Email: ${guest.email}`, 20, 111);
  doc.text(`Phone: ${guest.phone}`, 20, 117);
  doc.text(`Nationality: ${guest.nationality}`, 20, 123);
  
  // Booking Details
  doc.setFontSize(12);
  doc.setTextColor(41, 98, 146);
  doc.text('BOOKING DETAILS:', 110, 95);
  
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(`Room: ${room.number} - ${room.nameEnglish}`, 110, 105);
  doc.text(`Check-in: ${format(reservation.checkIn, 'dd.MM.yyyy')}`, 110, 111);
  doc.text(`Check-out: ${format(reservation.checkOut, 'dd.MM.yyyy')}`, 110, 117);
  doc.text(`Duration: ${reservation.numberOfNights} nights`, 110, 123);
  doc.text(`Guests: ${reservation.numberOfGuests} (${reservation.adults} adults${reservation.children.length > 0 ? `, ${reservation.children.length} children` : ''})`, 110, 129);
  
  // Line separator
  doc.setLineWidth(0.5);
  doc.setDrawColor(41, 98, 146);
  doc.line(20, 140, 190, 140);
  
  // Prepare invoice line items
  const lineItems = [];
  
  // Room charges
  lineItems.push([
    'Room Accommodation',
    `${room.nameEnglish} - Season ${reservation.seasonalPeriod}`,
    `${reservation.numberOfNights}`,
    `€${reservation.baseRoomRate.toFixed(2)}`,
    `€${reservation.subtotal.toFixed(2)}`
  ]);
  
  // Children discounts
  if (reservation.childrenDiscounts > 0) {
    lineItems.push([
      'Children Discounts',
      'Age-based pricing (0-3: Free, 3-7: -50%, 7-14: -20%)',
      '1',
      `-€${reservation.childrenDiscounts.toFixed(2)}`,
      `-€${reservation.childrenDiscounts.toFixed(2)}`
    ]);
  }
  
  // Short stay supplement
  if (reservation.shortStaySuplement > 0) {
    lineItems.push([
      'Short Stay Supplement',
      '+20% for stays under 3 nights',
      '1',
      `€${reservation.shortStaySuplement.toFixed(2)}`,
      `€${reservation.shortStaySuplement.toFixed(2)}`
    ]);
  }
  
  // Tourism tax
  const tourismTaxRate = reservation.tourismTax / (reservation.numberOfGuests * reservation.numberOfNights);
  lineItems.push([
    'Tourism Tax',
    `€${tourismTaxRate.toFixed(2)} per person per night (Croatian Law)`,
    `${reservation.numberOfGuests * reservation.numberOfNights}`,
    `€${tourismTaxRate.toFixed(2)}`,
    `€${reservation.tourismTax.toFixed(2)}`
  ]);
  
  // Pet fee
  if (reservation.petFee > 0) {
    lineItems.push([
      'Pet Fee',
      'Pet accommodation fee per stay',
      '1',
      `€${reservation.petFee.toFixed(2)}`,
      `€${reservation.petFee.toFixed(2)}`
    ]);
  }
  
  // Parking fee
  if (reservation.parkingFee > 0) {
    lineItems.push([
      'Parking Fee',
      `€7.00 per night`,
      `${reservation.numberOfNights}`,
      '€7.00',
      `€${reservation.parkingFee.toFixed(2)}`
    ]);
  }
  
  // Additional charges
  if (reservation.additionalCharges > 0) {
    lineItems.push([
      'Additional Services',
      'Room service, extras',
      '1',
      `€${reservation.additionalCharges.toFixed(2)}`,
      `€${reservation.additionalCharges.toFixed(2)}`
    ]);
  }
  
  // Subtotal before VAT
  const subtotalBeforeVAT = reservation.totalAmount - reservation.vatAmount;
  lineItems.push([
    '',
    '',
    '',
    'Subtotal:',
    `€${subtotalBeforeVAT.toFixed(2)}`
  ]);
  
  // VAT
  lineItems.push([
    'VAT (25%)',
    'Croatian Value Added Tax',
    '1',
    `€${reservation.vatAmount.toFixed(2)}`,
    `€${reservation.vatAmount.toFixed(2)}`
  ]);
  
  // Generate the table
  autoTable(doc, {
    startY: 150,
    head: [['Service', 'Description', 'Qty', 'Rate', 'Amount']],
    body: lineItems,
    theme: 'grid',
    headStyles: {
      fillColor: [41, 98, 146],
      textColor: 255,
      fontSize: 10,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 9,
      textColor: 50
    },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 70 },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 25, halign: 'right' },
      4: { cellWidth: 25, halign: 'right' }
    },
    foot: [[
      { content: 'TOTAL AMOUNT', colSpan: 4, styles: { fontStyle: 'bold', fontSize: 12, fillColor: [240, 248, 255] } },
      { content: `€${reservation.totalAmount.toFixed(2)}`, styles: { fontStyle: 'bold', fontSize: 12, fillColor: [240, 248, 255] } }
    ]],
    footStyles: {
      fillColor: [240, 248, 255],
      textColor: [41, 98, 146],
      fontSize: 12,
      fontStyle: 'bold'
    }
  });
  
  // Get the final Y position after the table
  const finalY = (doc as any).lastAutoTable.finalY || 200;
  
  // Payment information
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text('Payment Status:', 20, finalY + 20);
  if (reservation.status === 'incomplete-payment') {
    doc.setTextColor(220, 38, 127); // Red for pending
  } else {
    doc.setTextColor(34, 197, 94); // Green for paid
  }
  doc.text(reservation.status === 'incomplete-payment' ? 'PAYMENT PENDING' : 'PAID IN FULL', 55, finalY + 20);
  
  // Legal footer
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  const footerY = finalY + 35;
  
  doc.text('This invoice is issued in accordance with Croatian tax regulations.', 20, footerY);
  doc.text('VAT is included at the standard rate of 25%. Tourism tax collected per Croatian Law on Tourism.', 20, footerY + 6);
  doc.text(`Hotel Porec • OIB: ${HOTEL_INFO.taxId} • ${HOTEL_INFO.address}`, 20, footerY + 12);
  doc.text(`Thank you for choosing Hotel Porec. We look forward to welcoming you back!`, 20, footerY + 18);
  
  // Generate filename and save
  const filename = `Hotel_Porec_Invoice_${invoiceNumber}_${guest.name.replace(/\s+/g, '_')}.pdf`;
  doc.save(filename);
}

// Utility function to generate invoice number
export function generateInvoiceNumber(reservation: Reservation): string {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const bookingId = reservation.id.substring(0, 6).toUpperCase();
  return `HP-${year}${month}-${bookingId}`;
}