/**
 * QR Code Generator for Croatian Fiscal Receipts
 *
 * Generates QR codes containing JIR, ZKI, and receipt verification data
 * as required by Croatian fiscalization law.
 */

import QRCode from 'qrcode';

export interface FiscalReceiptData {
  jir: string;          // Jedinstveni Identifikator Računa (from Tax Authority)
  zki: string;          // Zaštitni Kod Izdavatelja (security code)
  oib: string;          // Seller's OIB
  dateTime: Date;       // Receipt date/time
  totalAmount: number;  // Total amount
  invoiceNumber: string; // Invoice/receipt number
  businessSpace: string; // Poslovni prostor
  cashRegister: string;  // Naplatni uređaj
}

/**
 * Generate QR code data string according to Croatian format
 *
 * Format options:
 * 1. Verification URL (for TEST environment)
 * 2. Structured data (for PRODUCTION)
 */
export function generateQRCodeData(
  receiptData: FiscalReceiptData,
  format: 'url' | 'structured' = 'structured',
  environment: 'test' | 'production' = 'test'
): string {

  if (format === 'url') {
    // Format: Verification URL
    // TEST: https://cistest.apis-it.hr/provjera?...
    // PROD: https://porezna-uprava.hr/rn?...

    const baseUrl = environment === 'test'
      ? 'https://cistest.apis-it.hr/provjera'
      : 'https://porezna-uprava.hr/rn';

    const dateTimeStr = receiptData.dateTime.toISOString()
      .replace('T', ' ')
      .substring(0, 19); // Format: YYYY-MM-DD HH:mm:ss

    return `${baseUrl}?jir=${receiptData.jir}&datv=${encodeURIComponent(dateTimeStr)}&izn=${receiptData.totalAmount.toFixed(2)}`;

  } else {
    // Format: Structured data (recommended for production)
    // Each line contains one piece of information
    return [
      `JIR: ${receiptData.jir}`,
      `ZKI: ${receiptData.zki}`,
      `OIB: ${receiptData.oib}`,
      `Datum: ${formatCroatianDateTime(receiptData.dateTime)}`,
      `Broj: ${receiptData.invoiceNumber}`,
      `Prostor: ${receiptData.businessSpace}`,
      `Uređaj: ${receiptData.cashRegister}`,
      `Iznos: ${receiptData.totalAmount.toFixed(2)} EUR`
    ].join('\n');
  }
}

/**
 * Format date/time in Croatian format: DD.MM.YYYY HH:mm:ss
 */
function formatCroatianDateTime(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
}

/**
 * Generate QR code as Data URL (base64 PNG)
 * Can be used in <img src="..."> tags or embedded in PDFs
 */
export async function generateQRCodeDataURL(
  receiptData: FiscalReceiptData,
  options: {
    format?: 'url' | 'structured';
    environment?: 'test' | 'production';
    size?: number; // Width/height in pixels
    margin?: number; // Margin in modules
  } = {}
): Promise<string> {
  const {
    format = 'structured',
    environment = 'test',
    size = 200,
    margin = 2
  } = options;

  const qrData = generateQRCodeData(receiptData, format, environment);

  return await QRCode.toDataURL(qrData, {
    width: size,
    margin: margin,
    errorCorrectionLevel: 'M', // Medium error correction
    type: 'image/png'
  });
}

/**
 * Generate QR code as PNG buffer
 * Can be saved to file or sent over network
 */
export async function generateQRCodeBuffer(
  receiptData: FiscalReceiptData,
  options: {
    format?: 'url' | 'structured';
    environment?: 'test' | 'production';
    size?: number;
    margin?: number;
  } = {}
): Promise<Buffer> {
  const {
    format = 'structured',
    environment = 'test',
    size = 200,
    margin = 2
  } = options;

  const qrData = generateQRCodeData(receiptData, format, environment);

  return await QRCode.toBuffer(qrData, {
    width: size,
    margin: margin,
    errorCorrectionLevel: 'M',
    type: 'png'
  });
}

/**
 * Save QR code to file
 */
export async function saveQRCodeToFile(
  receiptData: FiscalReceiptData,
  filePath: string,
  options: {
    format?: 'url' | 'structured';
    environment?: 'test' | 'production';
    size?: number;
    margin?: number;
  } = {}
): Promise<void> {
  const {
    format = 'structured',
    environment = 'test',
    size = 200,
    margin = 2
  } = options;

  const qrData = generateQRCodeData(receiptData, format, environment);

  await QRCode.toFile(filePath, qrData, {
    width: size,
    margin: margin,
    errorCorrectionLevel: 'M',
    type: 'png'
  });
}

/**
 * Generate QR code as SVG string
 * Useful for scalable receipts
 */
export async function generateQRCodeSVG(
  receiptData: FiscalReceiptData,
  options: {
    format?: 'url' | 'structured';
    environment?: 'test' | 'production';
    size?: number;
    margin?: number;
  } = {}
): Promise<string> {
  const {
    format = 'structured',
    environment = 'test',
    size = 200,
    margin = 2
  } = options;

  const qrData = generateQRCodeData(receiptData, format, environment);

  return await QRCode.toString(qrData, {
    type: 'svg',
    width: size,
    margin: margin,
    errorCorrectionLevel: 'M'
  });
}
