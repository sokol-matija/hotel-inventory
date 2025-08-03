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
            margin: 0;
            padding: 0;
          }
          
          body {
            width: 80mm;
            margin: 0;
            padding: 2mm;
            font-family: 'Courier New', 'Consolas', monospace;
            font-size: 10px;
            line-height: 1.0;
            color: black;
            background: white;
          }
          
          .center { text-align: center; }
          .left { text-align: left; }
          .right { text-align: right; }
          .bold { font-weight: bold; }
          .small { font-size: 9px; }
          
          .line {
            border-bottom: 1px solid black;
            margin: 1mm 0;
          }
          
          .spacer {
            margin: 2mm 0;
          }
          
          .fiscal-line {
            display: flex;
            justify-content: space-between;
            margin: 0.5mm 0;
            font-size: 9px;
          }
        }
        
        @media screen {
          body {
            width: 80mm;
            margin: 20px auto;
            padding: 10px;
            border: 1px solid #ccc;
            font-family: 'Courier New', monospace;
            font-size: 10px;
            background: white;
          }
          
          .center { text-align: center; }
          .left { text-align: left; }
          .right { text-align: right; }
          .bold { font-weight: bold; }
          .small { font-size: 9px; }
          
          .line {
            border-bottom: 1px solid black;
            margin: 3px 0;
          }
          
          .spacer {
            margin: 6px 0;
          }
          
          .fiscal-line {
            display: flex;
            justify-content: space-between;
            margin: 1px 0;
            font-size: 9px;
          }
        }
      </style>
    </head>
    <body>
      <!-- Hotel Header - Exact format from your receipt -->
      <div class="center bold">HOTEL POREČ</div>
      <div class="center">HP "DUGA" D.O.O.</div>
      <div class="center">Rade Končara 1 Poreč</div>
      <div class="center">OIB ${hotelInfo.oib}</div>
      <div class="center">TEL-FAX 00385 52 451-811</div>
      
      <div class="spacer"></div>
      
      <!-- Date and register info -->
      <div class="left">Z Zaključak dana ${dateStr} ${timeStr} SEF</div>
      <div class="right">${dateStr}</div>
      
      <div class="spacer"></div>
      
      <div class="left">Z Kasa 2</div>
      
      <div class="spacer"></div>
      
      <div class="left">Z Broj ${generateReceiptNumber()} računi 1 ${generateSequenceNumber()}</div>
      
      <div class="spacer"></div>
      
      <!-- Totals by category -->
      <div class="fiscal-line">
        <span>Z Total</span>
        <span>${order.totalAmount.toFixed(2)}</span>
      </div>
      
      <div class="fiscal-line">
        <span>Z Piće 25%PDV+PNP</span>
        <span>${vatBreakdown.drinks25.toFixed(2)}</span>
      </div>
      
      <div class="fiscal-line">
        <span>Z Piće 25%PDV</span>
        <span>0.00</span>
      </div>
      
      <div class="fiscal-line">
        <span>Z Hrana 13%PDV</span>
        <span>${vatBreakdown.food13.toFixed(2)}</span>
      </div>
      
      <div class="fiscal-line">
        <span>Z Roba  5%PDV</span>
        <span>0.00</span>
      </div>
      
      <div class="fiscal-line">
        <span>Z Roba 25%PDV</span>
        <span>0.00</span>
      </div>
      
      <div class="spacer"></div>
      
      <!-- Order Items -->
      ${order.items.map((item, index) => `
        <div class="fiscal-line">
          <span>${index + 9}</span>
          <span>${item.itemName.toUpperCase()}</span>
          <span>${item.quantity}.000</span>
          <span>${item.totalPrice.toFixed(2)}</span>
        </div>
      `).join('')}
      
      <div class="spacer"></div>
      
      <div class="left">Korisnik BRAN</div>
      <div class="fiscal-line">
        <span>G</span>
        <span>${order.totalAmount.toFixed(2)}</span>
      </div>
      
      <div class="line"></div>
      
      <div class="right bold">${order.totalAmount.toFixed(2)}</div>
      
      <div class="spacer"></div>
      
      <!-- VAT Breakdown -->
      <div class="fiscal-line">
        <span>Netto</span>
        <span>${vatBreakdown.net.toFixed(2)}</span>
      </div>
      
      <div class="fiscal-line">
        <span>PDV  5%</span>
        <span>0.00 osnovica</span>
        <span>0.00</span>
      </div>
      
      <div class="fiscal-line">
        <span>PDV 13%</span>
        <span>${vatBreakdown.vat13.toFixed(2)} osnovica</span>
        <span>${vatBreakdown.food13Net.toFixed(2)}</span>
      </div>
      
      <div class="fiscal-line">
        <span>PDV 25%</span>
        <span>${vatBreakdown.vat25.toFixed(2)} osnovica</span>
        <span>${vatBreakdown.drinks25Net.toFixed(2)}</span>
      </div>
      
      <div class="fiscal-line">
        <span>PNP  3%</span>
        <span>${vatBreakdown.pnp.toFixed(2)} osnovica</span>
        <span>${vatBreakdown.drinks25Net.toFixed(2)}</span>
      </div>
      
      <div class="line"></div>
      
      <div class="fiscal-line bold">
        <span>Total</span>
        <span>${order.totalAmount.toFixed(2)}</span>
      </div>
      
      <div class="spacer"></div>
      
      <div class="center small">Podaci do ovog datuma su fiskalizirani.</div>
      
      <!-- Payment Method -->
      ${order.paymentMethod !== 'room_bill' ? `
        <div class="spacer"></div>
        <div class="center">
          ${order.paymentMethod === 'immediate_cash' ? 'GOTOVINA PRIMLJENA' : 'KARTICA'}
        </div>
      ` : ''}
      
      <!-- Footer -->
      <div class="spacer"></div>
      <div class="center small">
        <div>Hvala na posjeti!</div>
        <div>Thank you for your visit!</div>
      </div>
    </body>
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
 * Print using Windows-optimized browser printing
 */
function printHTMLContent(htmlContent: string): Promise<boolean> {
  return new Promise((resolve) => {
    // Create hidden iframe for printing
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
          resolve(false);
        }
      } catch (error) {
        console.error('Print error:', error);
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
    const htmlContent = generateThermalReceiptHTML(data);
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
    const fiscalData: FiscalPrintData = {
      ...data,
      hotelInfo: {
        ...data.hotelInfo,
        oib: '87246357068', // Hotel Poreč real OIB from receipt
        fiscalNumber: generateFiscalNumber()
      }
    };
    
    const htmlContent = generateThermalReceiptHTML(fiscalData);
    return await printHTMLContent(htmlContent);
  } catch (error) {
    console.error('Windows receipt print error:', error);
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