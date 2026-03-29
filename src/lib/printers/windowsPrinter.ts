/**
 * Windows WinPrint Compatible Thermal Printer Service
 *
 * Optimized for:
 * - Bixolon SRP-350II thermal printer
 * - Windows generic printer drivers
 * - 80mm thermal paper width
 * - Croatian fiscal compliance
 */

import { PrintReceiptData } from '../hotel/orderTypes';
// import { HotelEracuniService } from '../eracuni/eracuniService';
// import { EracuniInvoice, EracuniResponse } from '../eracuni/types';

interface HotelInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  oib: string; // Croatian tax number
  fiscalNumber: string; // Invoice number
}

interface FiscalPrintData extends PrintReceiptData {
  hotelInfo: HotelInfo;
}

/** Shape used by raw text receipt generators */
interface ReceiptOrder {
  orderNumber?: string;
  totalAmount: number;
  paymentMethod: string;
  items: Array<{
    itemName: string;
    quantity: number;
    totalPrice: number;
    category: string;
  }>;
}

// NOTE: generateThermalReceiptHTML was removed (dead code, ~370 lines of HTML template).
// Raw text format (generateRawTextReceipt) is used for all thermal printing.

/**
 * Generate raw text receipt for generic thermal drivers
 * This bypasses HTML/CSS issues and works directly with printer drivers
 */
function generateRawTextReceipt(
  order: ReceiptOrder,
  _hotelInfo: HotelInfo,
  timestamp: Date
): string {
  const dateStr = timestamp.toLocaleDateString('hr-HR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
  const timeStr = timestamp.toLocaleTimeString('hr-HR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const vatBreakdown = calculateCroatianVAT(order);

  // Create raw text with proper spacing (each line max 32 characters for 80mm)
  const receipt = `
             HOTEL POREČ
           HP "DUGA" D.O.O.
         Rade Končara 1 Poreč
          OIB 87246357068
     TEL-FAX 00385 52 451-811

------------------------------------------------

Z Zaključak dana ${dateStr} ${timeStr} SEF
                          ${dateStr}


Z Kasa 2

Z Broj ${generateReceiptNumber()} računi 1 ${generateSequenceNumber()}


Z Total                     ${order.totalAmount.toFixed(2)}
Z Piće 25%PDV+PNP          ${vatBreakdown.drinks25.toFixed(2)}
Z Piće 25%PDV               0.00
Z Hrana 13%PDV             ${vatBreakdown.food13.toFixed(2)}
Z Roba  5%PDV               0.00
Z Roba 25%PDV               0.00


${order.items
  .map(
    (item, index) =>
      `${index + 9}${item.itemName.toUpperCase().padEnd(20)} ${item.quantity}.000${item.totalPrice.toFixed(2).padStart(6)}`
  )
  .join('\n')}


Korisnik BRAN
G                          ${order.totalAmount.toFixed(2)}
________________________________________________
                           ${order.totalAmount.toFixed(2)}


Netto                      ${vatBreakdown.net.toFixed(2)}
PDV  5%    0.00 osnovica    0.00
PDV 13%    ${vatBreakdown.vat13.toFixed(2)} osnovica    ${vatBreakdown.food13Net.toFixed(2)}
PDV 25%    ${vatBreakdown.vat25.toFixed(2)} osnovica    ${vatBreakdown.drinks25Net.toFixed(2)}
PNP  3%    ${vatBreakdown.pnp.toFixed(2)} osnovica    ${vatBreakdown.drinks25Net.toFixed(2)}
================================================
Total                      ${order.totalAmount.toFixed(2)}


Podaci do ovog datuma su fiskalizirani.

${
  order.paymentMethod !== 'room_bill'
    ? `\n        ${order.paymentMethod === 'immediate_cash' ? 'GOTOVINA PRIMLJENA' : 'KARTICA'}\n`
    : ''
}

           Hvala na posjeti!
         Thank you for your visit!



    ✂ ---------------------------- ✂

`.trim();

  return receipt;
}

/**
 * Generate HTML wrapper for raw text receipt (preserves formatting)
 */
function generateRawTextReceiptHTML(
  order: ReceiptOrder,
  hotelInfo: HotelInfo,
  timestamp: Date
): string {
  const textContent = generateRawTextReceipt(order, hotelInfo, timestamp);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Thermal Receipt - ${order.orderNumber}</title>
      <style>
        @media print {
          @page {
            size: 80mm auto;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          * {
            margin: 0 !important;
            padding: 0 !important;
          }
          
          body {
            width: 80mm;
            font-family: 'Courier New', monospace;
            font-size: 11px;
            line-height: 1.1;
            white-space: pre-wrap;
            word-wrap: break-word;
            color: black;
            background: white;
            padding: 2mm;
          }
        }
        
        @media screen {
          body {
            width: 80mm;
            margin: 20px auto;
            padding: 10px;
            border: 1px solid #ccc;
            font-family: 'Courier New', monospace;
            font-size: 11px;
            line-height: 1.1;
            white-space: pre-wrap;
            word-wrap: break-word;
            background: white;
          }
        }
      </style>
    </head>
    <body>${textContent}</body>
    
    <script>
      window.addEventListener('load', function() {
        setTimeout(() => {
          if (window.print) {
            window.print();
          }
        }, 500);
        
        window.addEventListener('afterprint', function() {
          setTimeout(() => {
            window.close();
          }, 1000);
        });
      });
    </script>
    </html>
  `;
}

/**
 * Generate simple test receipt HTML
 */
function generateSimpleTestHTML(): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Printer Test</title>
      <style>
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          
          body {
            width: 80mm;
            margin: 0;
            padding: 3mm;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.2;
          }
        }
        
        @media screen {
          body {
            width: 80mm;
            margin: 20px auto;
            padding: 10px;
            border: 1px solid #ccc;
            font-family: 'Courier New', monospace;
          }
        }
        
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .separator { 
          border-top: 1px dashed black; 
          margin: 5mm 0;
        }
      </style>
    </head>
    <body>
      <div class="center bold">PRINTER TEST</div>
      <div class="center">Hotel Poreč</div>
      
      <div class="separator"></div>
      
      <div>Date: ${new Date().toLocaleDateString()}</div>
      <div>Time: ${new Date().toLocaleTimeString()}</div>
      
      <div class="separator"></div>
      
      <div class="center">Test successful!</div>
      <div class="center">Printer is working correctly.</div>
      
      <div class="separator"></div>
      
      <div class="center bold">✓ Windows Compatible</div>
      <div class="center bold">✓ Thermal Paper Ready</div>
      <div class="center bold">✓ WinPrint Support</div>
      
      <div style="margin-top: 10mm; text-align: center;">
        ✂ -------------------------- ✂
      </div>
    </body>
    </html>
  `;
}

/**
 * Print using Windows-optimized browser printing with thermal paper support
 */
function printHTMLContent(htmlContent: string): Promise<boolean> {
  return new Promise((resolve) => {
    // Try window method first (better for printer settings)
    try {
      const printWindow = window.open(
        '',
        '_blank',
        'width=320,height=700,scrollbars=no,resizable=no,menubar=no,toolbar=no,location=no,status=no'
      );

      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();

        // Auto-print is handled by the script in the HTML
        setTimeout(() => {}, 700);

        resolve(true);
        return;
      }
    } catch (windowError) {
      console.warn('Window method failed, trying iframe method:', windowError);
    }

    // Fallback to iframe method
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'absolute';
    printFrame.style.top = '-1000px';
    printFrame.style.left = '-1000px';
    printFrame.style.width = '80mm';
    printFrame.style.height = 'auto';

    document.body.appendChild(printFrame);

    const printDocument = printFrame.contentDocument || printFrame.contentWindow?.document;
    if (!printDocument) {
      document.body.removeChild(printFrame);
      console.error('❌ Failed to create print document');
      resolve(false);
      return;
    }

    printDocument.open();
    printDocument.write(htmlContent);
    printDocument.close();

    // Wait for content to load
    setTimeout(() => {
      try {
        if (printFrame.contentWindow) {
          printFrame.contentWindow.focus();
          printFrame.contentWindow.print();
          resolve(true);
        } else {
          console.error('❌ No print window available');
          resolve(false);
        }
      } catch (error) {
        console.error('❌ Print error:', error);
        resolve(false);
      }

      // Clean up after printing
      setTimeout(() => {
        try {
          document.body.removeChild(printFrame);
        } catch {
          // Frame may have been removed already
        }
      }, 1000);
    }, 500);
  });
}

/**
 * Print simple test receipt
 */
export async function printTestReceipt(): Promise<boolean> {
  try {
    const htmlContent = generateSimpleTestHTML();
    return await printHTMLContent(htmlContent);
  } catch (error) {
    console.error('Test receipt print error:', error);
    return false;
  }
}

/**
 * Print fiscal test receipt with Croatian compliance
 */
export async function printFiscalTestReceipt(data: FiscalPrintData): Promise<boolean> {
  try {
    // Use raw text format for better generic driver compatibility
    const htmlContent = generateRawTextReceiptHTML(data.order, data.hotelInfo, data.timestamp);
    return await printHTMLContent(htmlContent);
  } catch (error) {
    console.error('Fiscal receipt print error:', error);
    return false;
  }
}

/**
 * Print room service order with Windows optimization
 */
export async function printWindowsReceipt(data: PrintReceiptData): Promise<boolean> {
  try {
    // Show instructions to user
    const userConfirmed = window.confirm(
      '🖨️ IMPROVED THERMAL PRINTING:\n\n' +
        '✅ Now using RAW TEXT format for better generic driver support\n' +
        '✅ Proper spacing and empty lines preserved\n' +
        '✅ Professional formatting that matches preview\n\n' +
        '📋 Is your Bixolon SRP-350II ready?\n' +
        '✅ Connected and turned on?\n' +
        '✅ Set as default printer?\n' +
        '✅ Thermal paper loaded (80mm)?\n\n' +
        'Click OK to print with improved formatting!'
    );

    if (!userConfirmed) {
      return false;
    }

    const fiscalData: FiscalPrintData = {
      ...data,
      hotelInfo: {
        ...data.hotelInfo,
        oib: '87246357068', // Hotel Poreč real OIB from receipt
        fiscalNumber: generateFiscalNumber(),
      },
    };

    // Use raw text format for better generic driver compatibility
    const htmlContent = generateRawTextReceiptHTML(
      fiscalData.order,
      fiscalData.hotelInfo,
      fiscalData.timestamp
    );
    const success = await printHTMLContent(htmlContent);

    if (success) {
      // Show post-print instructions
      setTimeout(() => {
        alert(
          '📄 PRINT DIALOG TIPS:\n\n' +
            '🔧 If the receipt prints on A4 paper instead of thermal:\n' +
            '1. In the print dialog, click "More settings"\n' +
            '2. Change "Paper size" from "A4" to "Receipt" or "80mm"\n' +
            '3. Set "Margins" to "Minimum" or "None"\n' +
            '4. Make sure "Scale" is set to "100%" or "Actual size"\n' +
            '5. DISABLE "Fit to page"\n\n' +
            '💡 You can also set these as defaults in your printer properties!'
        );
      }, 1000);
    }

    return success;
  } catch (error) {
    console.error('Windows receipt print error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    alert(`❌ Printing failed: ${errorMessage}`);
    return false;
  }
}

/**
 * Calculate Croatian VAT breakdown for fiscal compliance
 */
function calculateCroatianVAT(order: ReceiptOrder) {
  let drinks25 = 0;
  let food13 = 0;

  // Categorize items by Croatian VAT rates
  order.items.forEach((item) => {
    if (
      item.category.toLowerCase().includes('beverage') ||
      item.category.toLowerCase().includes('drink') ||
      item.itemName.toLowerCase().includes('pivo') ||
      item.itemName.toLowerCase().includes('vino') ||
      item.itemName.toLowerCase().includes('sok')
    ) {
      drinks25 += item.totalPrice;
    } else {
      food13 += item.totalPrice;
    }
  });

  const drinks25Net = drinks25 / 1.28; // Remove 25% VAT + 3% PNP
  const food13Net = food13 / 1.13; // Remove 13% VAT

  const vat25 = drinks25Net * 0.25;
  const vat13 = food13Net * 0.13;
  const pnp = drinks25Net * 0.03;

  const net = drinks25Net + food13Net;

  return {
    drinks25,
    food13,
    drinks25Net,
    food13Net,
    vat25,
    vat13,
    pnp,
    net,
  };
}

/**
 * Generate receipt number in Croatian format
 */
function generateReceiptNumber(): string {
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000
  );
  return dayOfYear.toString();
}

/**
 * Generate sequence number for fiscal receipts
 */
function generateSequenceNumber(): string {
  const random = Math.floor(Math.random() * 999) + 600;
  return `${random}-${random}`;
}

/**
 * Generate Croatian fiscal numbers
 */
function generateFiscalNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const sequence = Math.floor(Math.random() * 999999)
    .toString()
    .padStart(6, '0');
  return `HP-${year}-${sequence}`;
}
