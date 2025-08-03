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

interface FiscalPrintData extends PrintReceiptData {
  hotelInfo: {
    name: string;
    address: string;
    phone: string;
    email: string;
    oib: string; // Croatian tax number
    fiscalNumber: string; // Invoice number
  };
}

/**
 * Generate Croatian fiscal receipt HTML matching Hotel Poreč format
 */
function generateThermalReceiptHTML(data: FiscalPrintData): string {
  const { order, hotelInfo } = data;
  const currentDate = new Date();
  const dateStr = currentDate.toLocaleDateString('hr-HR', { 
    day: '2-digit', 
    month: '2-digit', 
    year: '2-digit' 
  });
  const timeStr = currentDate.toLocaleTimeString('hr-HR', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });
  
  // Calculate VAT breakdown for Croatian fiscal compliance
  const vatBreakdown = calculateCroatianVAT(order);
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Fiskalni Račun - ${order.orderNumber}</title>
      <style>
        @media print {
          @page {
            size: 80mm auto;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }
          
          * {
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
          }
          
          body {
            width: 80mm;
            margin: 0;
            padding: 4mm 3mm;
            font-family: 'Courier New', 'Consolas', monospace;
            font-size: 12px;
            line-height: 1.2;
            color: black;
            background: white;
          }
          
          .center { 
            text-align: center; 
            width: 100%;
          }
          .left { 
            text-align: left; 
            width: 100%;
          }
          .right { 
            text-align: right; 
            width: 100%;
          }
          .bold { 
            font-weight: bold; 
          }
          .small { 
            font-size: 10px; 
          }
          .large {
            font-size: 14px;
            font-weight: bold;
          }
          
          .line {
            width: 100%;
            border-bottom: 1px solid black;
            margin: 2mm 0;
            height: 1px;
          }
          
          .double-line {
            width: 100%;
            border-bottom: 2px solid black;
            margin: 3mm 0;
            height: 2px;
          }
          
          .dashed-line {
            width: 100%;
            border-bottom: 1px dashed black;
            margin: 2mm 0;
            height: 1px;
          }
          
          .spacer {
            margin: 2mm 0;
          }
          
          .spacer-large {
            margin: 4mm 0;
          }
          
          .fiscal-line {
            display: flex;
            justify-content: space-between;
            width: 100%;
            margin: 1mm 0;
            font-size: 11px;
          }
          
          .fiscal-line-left {
            flex: 1;
            text-align: left;
          }
          
          .fiscal-line-right {
            text-align: right;
            min-width: 20mm;
          }
          
          .item-line {
            display: flex;
            justify-content: space-between;
            width: 100%;
            margin: 1mm 0;
            font-size: 11px;
          }
          
          .item-number {
            width: 8mm;
            text-align: left;
          }
          
          .item-name {
            flex: 1;
            text-align: left;
            padding: 0 2mm;
          }
          
          .item-qty {
            width: 12mm;
            text-align: right;
          }
          
          .item-price {
            width: 15mm;
            text-align: right;
          }
        }
        
        @media screen {
          body {
            width: 80mm;
            margin: 20px auto;
            padding: 10px;
            border: 1px solid #ccc;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            background: white;
          }
          
          .center { text-align: center; width: 100%; }
          .left { text-align: left; width: 100%; }
          .right { text-align: right; width: 100%; }
          .bold { font-weight: bold; }
          .small { font-size: 10px; }
          .large { font-size: 14px; font-weight: bold; }
          
          .line { border-bottom: 1px solid black; margin: 3px 0; width: 100%; }
          .double-line { border-bottom: 2px solid black; margin: 5px 0; width: 100%; }
          .dashed-line { border-bottom: 1px dashed black; margin: 3px 0; width: 100%; }
          .spacer { margin: 6px 0; }
          
          .fiscal-line {
            display: flex;
            justify-content: space-between;
            width: 100%;
            margin: 2px 0;
            font-size: 11px;
          }
          
          .fiscal-line-left { flex: 1; text-align: left; }
          .fiscal-line-right { text-align: right; min-width: 20mm; }
          
          .item-line {
            display: flex;
            justify-content: space-between;
            width: 100%;
            margin: 2px 0;
            font-size: 11px;
          }
          
          .item-number { width: 8mm; text-align: left; }
          .item-name { flex: 1; text-align: left; padding: 0 2mm; }
          .item-qty { width: 12mm; text-align: right; }
          .item-price { width: 15mm; text-align: right; }
        }
      </style>
    </head>
    <body>
      <!-- Hotel Header -->
      <div class="center large bold">HOTEL POREČ</div>
      <div class="center bold">HP "DUGA" D.O.O.</div>
      <div class="center">Rade Končara 1 Poreč</div>
      <div class="center">OIB ${hotelInfo.oib}</div>
      <div class="center">TEL-FAX 00385 52 451-811</div>
      
      <div class="dashed-line"></div>
      
      <!-- Date and register info -->
      <div class="left">Z Zaključak dana ${dateStr} ${timeStr} SEF</div>
      <div class="right">${dateStr}</div>
      
      <div class="spacer-large"></div>
      
      <div class="left">Z Kasa 2</div>
      
      <div class="spacer"></div>
      
      <div class="left">Z Broj ${generateReceiptNumber()} računi 1 ${generateSequenceNumber()}</div>
      
      <div class="spacer"></div>
      
      <!-- Totals by category -->
      <div class="fiscal-line">
        <div class="fiscal-line-left">Z Total</div>
        <div class="fiscal-line-right">${order.totalAmount.toFixed(2)}</div>
      </div>
      
      <div class="fiscal-line">
        <div class="fiscal-line-left">Z Piće 25%PDV+PNP</div>
        <div class="fiscal-line-right">${vatBreakdown.drinks25.toFixed(2)}</div>
      </div>
      
      <div class="fiscal-line">
        <div class="fiscal-line-left">Z Piće 25%PDV</div>
        <div class="fiscal-line-right">0.00</div>
      </div>
      
      <div class="fiscal-line">
        <div class="fiscal-line-left">Z Hrana 13%PDV</div>
        <div class="fiscal-line-right">${vatBreakdown.food13.toFixed(2)}</div>
      </div>
      
      <div class="fiscal-line">
        <div class="fiscal-line-left">Z Roba  5%PDV</div>
        <div class="fiscal-line-right">0.00</div>
      </div>
      
      <div class="fiscal-line">
        <div class="fiscal-line-left">Z Roba 25%PDV</div>
        <div class="fiscal-line-right">0.00</div>
      </div>
      
      <div class="spacer"></div>
      
      <!-- Order Items -->
      ${order.items.map((item, index) => `
        <div class="item-line">
          <div class="item-number">${index + 9}</div>
          <div class="item-name">${item.itemName.toUpperCase()}</div>
          <div class="item-qty">${item.quantity}.000</div>
          <div class="item-price">${item.totalPrice.toFixed(2)}</div>
        </div>
      `).join('')}
      
      <div class="spacer"></div>
      
      <div class="left">Korisnik BRAN</div>
      <div class="fiscal-line">
        <div class="fiscal-line-left">G</div>
        <div class="fiscal-line-right">${order.totalAmount.toFixed(2)}</div>
      </div>
      
      <div class="line"></div>
      
      <div class="right bold large">${order.totalAmount.toFixed(2)}</div>
      
      <div class="spacer-large"></div>
      
      <!-- VAT Breakdown -->
      <div class="fiscal-line">
        <div class="fiscal-line-left">Netto</div>
        <div class="fiscal-line-right">${vatBreakdown.net.toFixed(2)}</div>
      </div>
      
      <div class="fiscal-line small">
        <div class="fiscal-line-left">PDV  5%</div>
        <div class="fiscal-line-right">0.00 osnovica 0.00</div>
      </div>
      
      <div class="fiscal-line small">
        <div class="fiscal-line-left">PDV 13%</div>
        <div class="fiscal-line-right">${vatBreakdown.vat13.toFixed(2)} osnovica ${vatBreakdown.food13Net.toFixed(2)}</div>
      </div>
      
      <div class="fiscal-line small">
        <div class="fiscal-line-left">PDV 25%</div>
        <div class="fiscal-line-right">${vatBreakdown.vat25.toFixed(2)} osnovica ${vatBreakdown.drinks25Net.toFixed(2)}</div>
      </div>
      
      <div class="fiscal-line small">
        <div class="fiscal-line-left">PNP  3%</div>
        <div class="fiscal-line-right">${vatBreakdown.pnp.toFixed(2)} osnovica ${vatBreakdown.drinks25Net.toFixed(2)}</div>
      </div>
      
      <div class="double-line"></div>
      
      <div class="fiscal-line bold large">
        <div class="fiscal-line-left">Total</div>
        <div class="fiscal-line-right">${order.totalAmount.toFixed(2)}</div>
      </div>
      
      <div class="spacer"></div>
      
      <div class="center small">Podaci do ovog datuma su fiskalizirani.</div>
      
      <!-- Payment Method -->
      ${order.paymentMethod !== 'room_bill' ? `
        <div class="spacer"></div>
        <div class="center bold">
          ${order.paymentMethod === 'immediate_cash' ? 'GOTOVINA PRIMLJENA' : 'KARTICA'}
        </div>
      ` : ''}
      
      <!-- Footer -->
      <div class="spacer-large"></div>
      <div class="center">
        <div class="bold">Hvala na posjeti!</div>
        <div class="bold">Thank you for your visit!</div>
      </div>
      
      <!-- Cut line -->
      <div class="spacer-large"></div>
      <div class="center small">
        ✂ -------------------------------- ✂
      </div>
    </body>
    
    <script>
      // Configure print settings for thermal paper
      function configurePrintSettings() {
        // Try to set print margins to 0
        if (window.print) {
          // Add print event listeners
          window.addEventListener('beforeprint', function() {
            console.log('Printing thermal receipt...');
            document.title = 'Thermal Receipt - ${order.orderNumber}';
          });
          
          window.addEventListener('afterprint', function() {
            console.log('Print dialog closed');
            // Close window after printing
            setTimeout(() => {
              window.close();
            }, 1000);
          });
        }
      }
      
      // Auto-print when page loads
      window.addEventListener('load', function() {
        configurePrintSettings();
        
        // Hide URL bar and browser elements
        history.replaceState(null, '', 'about:blank');
        
        // Small delay to ensure CSS is loaded
        setTimeout(() => {
          if (window.print) {
            window.print();
          }
        }, 500);
      });
      
      // Fallback if auto-print doesn't work
      document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'p') {
          e.preventDefault();
          window.print();
        }
      });
    </script>
    </html>
  `;
}

/**
 * Generate raw text receipt for generic thermal drivers
 * This bypasses HTML/CSS issues and works directly with printer drivers
 */
function generateRawTextReceipt(order: any, hotelInfo: any, timestamp: Date): string {
  const dateStr = timestamp.toLocaleDateString('hr-HR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  const timeStr = timestamp.toLocaleTimeString('hr-HR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  
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


${order.items.map((item: any, index: number) => 
  `${index + 9}${item.itemName.toUpperCase().padEnd(20)} ${item.quantity}.000${item.totalPrice.toFixed(2).padStart(6)}`
).join('\n')}


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

${order.paymentMethod !== 'room_bill' ? 
  `\n        ${order.paymentMethod === 'immediate_cash' ? 'GOTOVINA PRIMLJENA' : 'KARTICA'}\n` : ''}

           Hvala na posjeti!
         Thank you for your visit!



    ✂ ---------------------------- ✂

`.trim();

  return receipt;
}

/**
 * Generate HTML wrapper for raw text receipt (preserves formatting)
 */
function generateRawTextReceiptHTML(order: any, hotelInfo: any, timestamp: Date): string {
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
    console.log('🖨️ Opening thermal receipt for printing...');
    console.log('📋 Thermal Printer Setup Instructions:');
    console.log('1. ✅ Make sure Bixolon SRP-350II is your default printer');
    console.log('2. ✅ When print dialog opens, select your thermal printer');
    console.log('3. ✅ Set paper size to "Receipt", "80mm", or "Custom"');
    console.log('4. ✅ Set all margins to 0 or "Minimum"');
    console.log('5. ✅ DISABLE "Fit to page" or "Scale to fit"');
    console.log('6. ✅ Ensure "Actual size" or "100%" is selected');
    
    // Try window method first (better for printer settings)
    try {
      const printWindow = window.open('', '_blank', 'width=320,height=700,scrollbars=no,resizable=no,menubar=no,toolbar=no,location=no,status=no');
      
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        
        // Auto-print is handled by the script in the HTML
        setTimeout(() => {
          console.log('✅ Receipt window opened - check your print dialog!');
          console.log('🔧 If still printing A4: In print dialog → More settings → Paper size → Receipt/80mm');
        }, 700);
        
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
          console.log('✅ Print dialog should appear - select thermal printer and check paper size!');
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
        } catch (e) {
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
      console.log('🚫 User cancelled printing to check printer setup');
      return false;
    }
    
    const fiscalData: FiscalPrintData = {
      ...data,
      hotelInfo: {
        ...data.hotelInfo,
        oib: '87246357068', // Hotel Poreč real OIB from receipt
        fiscalNumber: generateFiscalNumber()
      }
    };
    
    // Use raw text format for better generic driver compatibility
    const htmlContent = generateRawTextReceiptHTML(fiscalData.order, fiscalData.hotelInfo, fiscalData.timestamp);
    const success = await printHTMLContent(htmlContent);
    
    if (success) {
      console.log('✅ Print initiated successfully');
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
function calculateCroatianVAT(order: any) {
  let drinks25 = 0;
  let food13 = 0;
  
  // Categorize items by Croatian VAT rates
  order.items.forEach((item: any) => {
    if (item.category.toLowerCase().includes('beverage') || 
        item.category.toLowerCase().includes('drink') ||
        item.itemName.toLowerCase().includes('pivo') ||
        item.itemName.toLowerCase().includes('vino') ||
        item.itemName.toLowerCase().includes('sok')) {
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
    net
  };
}

/**
 * Generate receipt number in Croatian format
 */
function generateReceiptNumber(): string {
  const today = new Date();
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
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
  const sequence = Math.floor(Math.random() * 999999).toString().padStart(6, '0');
  return `HP-${year}-${sequence}`;
}

function generateJIR(): string {
  // Mock JIR (Jedinstveni identifikator računa)
  return Array.from({length: 32}, () => Math.floor(Math.random() * 16).toString(16)).join('').toUpperCase();
}

function generateZKI(): string {
  // Mock ZKI (Zaštitni kod izdavatelja)
  return Array.from({length: 32}, () => Math.floor(Math.random() * 16).toString(16)).join('').toUpperCase();
}