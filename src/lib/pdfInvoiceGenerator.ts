import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Reservation, Guest, Room, Company, ReservationCharge } from './hotel/types';
import { format } from 'date-fns';
import * as QRCode from 'qrcode';
import { convertToDisplayName } from './hotel/countryCodeUtils';

// Hotel Porec Contact Information (from HOTEL_MANAGEMENT_SPECS.md)
const HOTEL_INFO = {
  name: 'Hotel Porec',
  address: '52440 Porec, Croatia, R Konoba 1',
  phone: '+385(0)52/451 611',
  fax: '+385(0)52/433 462',
  email: 'hotelporec@pu.t-com.hr',
  website: 'www.hotelporec.com',
  taxId: '87246357068',
};

interface InvoiceData {
  reservation: Reservation;
  guest: Guest;
  room: Room;
  invoiceNumber: string;
  invoiceDate: Date;
  company?: Company; // Company for R1 billing (optional)
  charges?: ReservationCharge[]; // Line-item charges from reservation_charges table
  // Croatian Fiscal Receipt data
  jir?: string; // Jedinstveni identifikator racuna (unique invoice identifier)
  zki?: string; // Zastitni kod izdavatelja (security code of issuer)
  qrCodeData?: string; // QR code data string for verification
}

// Croatian Fiscal Receipt Requirements
interface CroatianFiscalData {
  jir: string;
  zki: string;
  qrCodeData: string;
  fiscalReceiptUrl: string;
  fiscalizationDateTime: Date;
}

export async function generatePDFInvoice(data: InvoiceData): Promise<void> {
  const { reservation, guest, room, invoiceNumber, invoiceDate, jir, zki, qrCodeData, charges } =
    data;

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

  // Billing Information - Show Company or Guest
  doc.setFontSize(12);
  doc.setTextColor(41, 98, 146);
  doc.text(data.company ? 'BILL TO (COMPANY - R1):' : 'BILL TO:', 20, 95);

  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);

  if (data.company) {
    // Company billing (R1)
    doc.text(data.company.name, 20, 105);
    doc.text(`OIB: ${data.company.oib}`, 20, 111);
    doc.text(data.company.address.street, 20, 117);
    const countryName = convertToDisplayName(data.company.address.country);
    doc.text(
      `${data.company.address.postalCode} ${data.company.address.city}, ${countryName}`,
      20,
      123
    );
    if (data.company.contactPerson) {
      doc.text(`Contact: ${data.company.contactPerson}`, 20, 129);
    }
    doc.text(`Email: ${data.company.email}`, 20, 135);

    // Show guest info separately with smaller font
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Guest: ${guest.fullName}`, 110, 95);
    if (guest.phone) {
      doc.text(`Phone: ${guest.phone}`, 110, 101);
    }
  } else {
    // Individual guest billing
    doc.text(guest.fullName, 20, 105);
    doc.text(`Email: ${guest.email}`, 20, 111);
    if (guest.phone) {
      doc.text(`Phone: ${guest.phone}`, 20, 117);
    }
    if (guest.nationality) {
      doc.text(`Nationality: ${guest.nationality}`, 20, 123);
    }
  }

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
  doc.text(
    `Guests: ${reservation.numberOfGuests} (${reservation.adults} adults${reservation.children.length > 0 ? `, ${reservation.children.length} children` : ''})`,
    110,
    129
  );

  // Line separator
  doc.setLineWidth(0.5);
  doc.setDrawColor(41, 98, 146);
  doc.line(20, 140, 190, 140);

  // Prepare invoice line items from charges
  const lineItems: string[][] = [];

  if (charges && charges.length > 0) {
    // Use reservation_charges as the source of truth
    for (const charge of charges) {
      lineItems.push([
        charge.description,
        '',
        `${charge.quantity}`,
        `€${charge.unitPrice.toFixed(2)}`,
        `€${charge.total.toFixed(2)}`,
      ]);
    }
  }

  // Compute grand total from charges
  const grandTotal =
    charges && charges.length > 0
      ? charges.reduce((sum, c) => sum + c.total, 0)
      : reservation.totalAmount;

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
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 9,
      textColor: 50,
    },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 35 },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 25, halign: 'right' },
      4: { cellWidth: 25, halign: 'right' },
    },
    foot: [
      [
        {
          content: 'TOTAL AMOUNT',
          colSpan: 4,
          styles: { fontStyle: 'bold', fontSize: 12, fillColor: [240, 248, 255] },
        },
        {
          content: `€${grandTotal.toFixed(2)}`,
          styles: { fontStyle: 'bold', fontSize: 12, fillColor: [240, 248, 255] },
        },
      ],
    ],
    footStyles: {
      fillColor: [240, 248, 255],
      textColor: [41, 98, 146],
      fontSize: 12,
      fontStyle: 'bold',
    },
  });

  // Get the final Y position after the table
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  doc.text(
    reservation.status === 'incomplete-payment' ? 'PAYMENT PENDING' : 'PAID IN FULL',
    55,
    finalY + 20
  );

  // Croatian Fiscal Receipt Information (if fiscalized)
  let qrCodeYPosition = finalY + 20;

  if (jir && zki && qrCodeData) {
    // Fiscal Receipt Header
    doc.setFontSize(12);
    doc.setTextColor(41, 98, 146);
    doc.text('CROATIAN FISCAL RECEIPT', 20, finalY + 15);

    // Fiscal data
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(`JIR (Unique Invoice ID): ${jir}`, 20, finalY + 25);
    doc.text(`ZKI (Security Code): ${zki}`, 20, finalY + 31);
    doc.text(`Fiscalization Date: ${format(invoiceDate, 'dd.MM.yyyy HH:mm:ss')}`, 20, finalY + 37);

    // Generate QR code
    try {
      const qrCodeImage = await QRCode.toDataURL(qrCodeData, {
        errorCorrectionLevel: 'L', // Minimum error correction as per Croatian specs
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
        width: 150, // Minimum 2x2cm at 300dpi ~= 236x236px, we use 150 for PDF
      });

      // Add QR code to PDF (Right side, 2x2cm minimum size)
      const qrSize = 40; // 2cm at 72dpi PDF resolution
      doc.addImage(qrCodeImage, 'PNG', 140, finalY + 20, qrSize, qrSize);

      // QR Code instructions
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text('Scan QR code to verify', 140, finalY + 65);
      doc.text('receipt authenticity', 140, finalY + 69);
      doc.text('with Croatian Tax Authority', 140, finalY + 73);

      qrCodeYPosition = finalY + 80;
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      qrCodeYPosition = finalY + 45;
    }
  }

  // Legal footer
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  const footerY = qrCodeYPosition + 10;

  doc.text('This invoice is issued in accordance with Croatian tax regulations.', 20, footerY);
  doc.text(
    'VAT is included at 13% for accommodation. Tourism tax collected per Croatian Law on Tourism.',
    20,
    footerY + 6
  );

  // Croatian fiscal compliance notice
  if (jir && zki) {
    doc.setTextColor(41, 98, 146);
    doc.text(
      'FISCALIZED - This receipt is registered with Croatian Tax Authority',
      20,
      footerY + 12
    );
    doc.setTextColor(100, 100, 100);
    doc.text(
      'Citizens can verify this receipt at: https://porezna-uprava.gov.hr/rn',
      20,
      footerY + 18
    );
  } else {
    doc.setTextColor(220, 38, 127);
    doc.text('NOT FISCALIZED - This is a pro forma invoice only', 20, footerY + 12);
  }

  doc.setTextColor(100, 100, 100);
  doc.text(`Hotel Porec • OIB: ${HOTEL_INFO.taxId} • ${HOTEL_INFO.address}`, 20, footerY + 24);
  doc.text(
    `Thank you for choosing Hotel Porec. We look forward to welcoming you back!`,
    20,
    footerY + 30
  );

  // Generate filename and save
  const fiscalSuffix = jir ? `_FISCAL_${jir.substring(0, 8)}` : '_PROFORMA';
  const filename = `Hotel_Porec_Invoice_${invoiceNumber}${fiscalSuffix}_${guest.fullName.replace(/\s+/g, '_')}.pdf`;
  doc.save(filename);
}

/**
 * Generate Croatian fiscal thermal receipt
 * Compatible with thermal printers and Croatian Tax Authority requirements
 */
export async function generateThermalReceipt(
  data: InvoiceData,
  fiscalData?: CroatianFiscalData
): Promise<string> {
  const { reservation, guest, room, invoiceNumber, invoiceDate, charges } = data;

  // Thermal receipt width: 48 characters (standard 80mm thermal paper)
  const width = 48;
  const line = '='.repeat(width);
  const halfLine = '-'.repeat(width);

  let receipt = '';

  // Header
  receipt += centerText('HOTEL POREC', width) + '\n';
  receipt += centerText('Croatia • Istria', width) + '\n';
  receipt += centerText(HOTEL_INFO.address, width) + '\n';
  receipt += centerText(`Tel: ${HOTEL_INFO.phone}`, width) + '\n';
  receipt += centerText(`OIB: ${HOTEL_INFO.taxId}`, width) + '\n';
  receipt += line + '\n';

  // Invoice information
  if (fiscalData) {
    receipt += centerText('FISCAL RECEIPT', width) + '\n';
    receipt += centerText('(Croatian Tax Authority)', width) + '\n';
  } else {
    receipt += centerText('PRO FORMA INVOICE', width) + '\n';
  }
  receipt += halfLine + '\n';

  receipt += `Invoice: ${invoiceNumber}\n`;
  receipt += `Date: ${format(invoiceDate, 'dd.MM.yyyy HH:mm:ss')}\n`;
  receipt += `Booking: ${reservation.id.substring(0, 8).toUpperCase()}\n`;
  receipt += `Guest: ${guest.fullName}\n`;
  receipt += `Room: ${room.number} - ${room.nameEnglish}\n`;
  receipt += `Check-in: ${format(reservation.checkIn, 'dd.MM.yyyy')}\n`;
  receipt += `Check-out: ${format(reservation.checkOut, 'dd.MM.yyyy')}\n`;
  receipt += `Nights: ${reservation.numberOfNights}\n`;
  receipt += `Guests: ${reservation.numberOfGuests}\n`;
  receipt += halfLine + '\n';

  // Items from charges
  const addItem = (name: string, qty: number, rate: number, amount: number) => {
    receipt += `${name}\n`;
    receipt += `  ${qty} x €${rate.toFixed(2)} = €${amount.toFixed(2)}\n`;
  };

  if (charges && charges.length > 0) {
    for (const charge of charges) {
      addItem(charge.description, charge.quantity, charge.unitPrice, charge.total);
    }
  }

  receipt += halfLine + '\n';

  // Grand total from charges
  const grandTotal =
    charges && charges.length > 0
      ? charges.reduce((sum, c) => sum + c.total, 0)
      : reservation.totalAmount;

  receipt += line + '\n';
  receipt += `TOTAL:           €${grandTotal.toFixed(2)}\n`;
  receipt += line + '\n';

  // Payment status
  receipt += `Payment: ${reservation.status === 'incomplete-payment' ? 'PENDING' : 'PAID IN FULL'}\n`;
  receipt += halfLine + '\n';

  // Croatian Fiscal Information
  if (fiscalData) {
    receipt += centerText('CROATIAN FISCAL DATA', width) + '\n';
    receipt += `JIR: ${fiscalData.jir}\n`;
    receipt += `ZKI: ${fiscalData.zki}\n`;
    receipt += `Fiscal Date: ${format(fiscalData.fiscalizationDateTime, 'dd.MM.yyyy HH:mm:ss')}\n`;
    receipt += halfLine + '\n';

    // QR Code data (for manual verification)
    receipt += centerText('QR CODE DATA:', width) + '\n';
    receipt += `${fiscalData.qrCodeData}\n`;
    receipt += halfLine + '\n';

    receipt += centerText('Scan QR code above or visit:', width) + '\n';
    receipt += centerText('porezna-uprava.gov.hr/rn', width) + '\n';
    receipt += centerText('to verify receipt authenticity', width) + '\n';
    receipt += halfLine + '\n';

    receipt += centerText('FISCALIZED', width) + '\n';
    receipt += centerText('Croatian Tax Authority', width) + '\n';
  } else {
    receipt += centerText('NOT FISCALIZED', width) + '\n';
    receipt += centerText('Pro forma invoice only', width) + '\n';
  }

  receipt += halfLine + '\n';

  // Footer
  receipt += centerText('Thank you for staying', width) + '\n';
  receipt += centerText('at Hotel Porec!', width) + '\n';
  receipt += centerText('www.hotelporec.com', width) + '\n';
  receipt += line + '\n';

  return receipt;
}

/**
 * Generate Croatian fiscal receipt with full compliance
 * Combines fiscalization data with receipt generation
 */
export async function generateFiscalizedPDFInvoice(
  invoiceData: InvoiceData,
  fiscalData: CroatianFiscalData
): Promise<void> {
  const enhancedInvoiceData: InvoiceData = {
    ...invoiceData,
    jir: fiscalData.jir,
    zki: fiscalData.zki,
    qrCodeData: fiscalData.qrCodeData,
  };

  await generatePDFInvoice(enhancedInvoiceData);
}

// Helper function to center text in thermal receipt
function centerText(text: string, width: number): string {
  if (text.length >= width) return text;
  const padding = Math.floor((width - text.length) / 2);
  return ' '.repeat(padding) + text;
}

// Utility function to generate invoice number
export function generateInvoiceNumber(reservation: Reservation): string {
  const year = new Date().getFullYear();

  // Generate 6-digit sequential number from reservation ID
  // Extract numeric parts and ensure 6 digits for Croatian fiscal format
  const numericId = reservation.id.replace(/[^0-9]/g, ''); // Extract only numbers
  let sequentialNumber: string;

  if (numericId.length >= 6) {
    sequentialNumber = numericId.substring(0, 6);
  } else {
    // Pad with timestamp-based digits if reservation ID doesn't have enough numbers
    const timestampSuffix = Date.now().toString().slice(-6);
    sequentialNumber = (numericId + timestampSuffix).substring(0, 6);
  }

  // Croatian fiscal format: HP-YYYY-XXXXXX (Hotel Porec - Year - 6 digits)
  return `HP-${year}-${sequentialNumber}`;
}
