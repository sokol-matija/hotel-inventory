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
 * Generate Windows-optimized thermal receipt HTML
 */
function generateThermalReceiptHTML(data: FiscalPrintData): string {
  const { order, hotelInfo } = data;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Fiscal Receipt - ${order.orderNumber}</title>
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
            font-size: 11px;
            line-height: 1.1;
            color: black;
            background: white;
          }
          
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .large { font-size: 14px; font-weight: bold; }
          .small { font-size: 9px; }
          
          .separator { 
            border-top: 1px dashed black; 
            margin: 2mm 0;
            width: 100%;
          }
          
          .double-separator { 
            border-top: 2px solid black; 
            margin: 3mm 0;
            width: 100%;
          }
          
          .item-row {
            display: flex;
            justify-content: space-between;
            margin: 1mm 0;
            font-size: 10px;
          }
          
          .item-name {
            flex: 1;
            padding-right: 2mm;
          }
          
          .item-qty {
            width: 15mm;
            text-align: center;
          }
          
          .item-price {
            width: 20mm;
            text-align: right;
          }
          
          .total-row {
            display: flex;
            justify-content: space-between;
            font-weight: bold;
            margin: 1mm 0;
          }
          
          .fiscal-info {
            font-size: 9px;
            margin: 2mm 0;
          }
          
          .qr-placeholder {
            width: 25mm;
            height: 25mm;
            border: 1px solid black;
            margin: 2mm auto;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 8px;
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
            background: white;
          }
          
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .large { font-size: 14px; font-weight: bold; }
          .small { font-size: 9px; }
          
          .separator { 
            border-top: 1px dashed black; 
            margin: 5px 0;
          }
          
          .double-separator { 
            border-top: 2px solid black; 
            margin: 8px 0;
          }
          
          .item-row, .total-row {
            display: flex;
            justify-content: space-between;
            margin: 2px 0;
          }
          
          .qr-placeholder {
            width: 60px;
            height: 60px;
            border: 1px solid black;
            margin: 10px auto;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 8px;
          }
        }
      </style>
    </head>
    <body>
      <!-- Hotel Header -->
      <div class="center large">${hotelInfo.name}</div>
      <div class="center small">${hotelInfo.address}</div>
      <div class="center small">Tel: ${hotelInfo.phone}</div>
      <div class="center small">Email: ${hotelInfo.email}</div>
      <div class="center small bold">OIB: ${hotelInfo.oib}</div>
      
      <div class="double-separator"></div>
      
      <!-- Receipt Type -->
      <div class="center bold">FISKALNI RAČUN</div>
      <div class="center bold">FISCAL RECEIPT</div>
      <div class="center small">ROOM SERVICE / USLUGA SOBE</div>
      
      <div class="separator"></div>
      
      <!-- Order Info -->
      <div class="fiscal-info">
        <div>Račun br./Invoice No: <span class="bold">${hotelInfo.fiscalNumber}</span></div>
        <div>Narudžba/Order: <span class="bold">${order.orderNumber}</span></div>
        <div>Soba/Room: <span class="bold">${order.roomNumber}</span></div>
        <div>Gost/Guest: <span class="bold">${order.guestName}</span></div>
        <div>Datum/Date: <span class="bold">${order.orderedAt.toLocaleDateString('hr-HR')}</span></div>
        <div>Vrijeme/Time: <span class="bold">${order.orderedAt.toLocaleTimeString('hr-HR')}</span></div>
      </div>
      
      <div class="separator"></div>
      
      <!-- Items Header -->
      <div class="item-row bold small">
        <span class="item-name">STAVKA/ITEM</span>
        <span class="item-qty">KOL/QTY</span>
        <span class="item-price">UKUPNO/TOTAL</span>
      </div>
      
      <div class="separator"></div>
      
      <!-- Order Items -->
      ${order.items.map(item => `
        <div class="item-row">
          <span class="item-name">${item.itemName}</span>
          <span class="item-qty">${item.quantity}x</span>
          <span class="item-price">€${item.totalPrice.toFixed(2)}</span>
        </div>
        <div class="item-row small">
          <span class="item-name">  @€${item.price.toFixed(2)}/${item.unit}</span>
          <span class="item-qty"></span>
          <span class="item-price"></span>
        </div>
      `).join('')}
      
      <div class="separator"></div>
      
      <!-- Totals -->
      <div class="total-row">
        <span>Neto/Subtotal:</span>
        <span>€${order.subtotal.toFixed(2)}</span>
      </div>
      
      <div class="total-row">
        <span>PDV 25%/VAT 25%:</span>
        <span>€${order.tax.toFixed(2)}</span>
      </div>
      
      <div class="double-separator"></div>
      
      <div class="total-row large">
        <span>UKUPNO/TOTAL:</span>
        <span>€${order.totalAmount.toFixed(2)}</span>
      </div>
      
      <div class="separator"></div>
      
      <!-- Payment Info -->
      <div class="fiscal-info">
        <div>Način plaćanja/Payment:</div>
        <div class="bold center">
          ${order.paymentMethod === 'room_bill' ? 'RAČUN SOBE / ROOM BILL' :
            order.paymentMethod === 'immediate_cash' ? 'GOTOVINA / CASH' :
            'KARTICA / CARD'}
        </div>
        <div>Status: <span class="bold">${order.paymentStatus.toUpperCase()}</span></div>
      </div>
      
      ${order.notes ? `
        <div class="separator"></div>
        <div class="fiscal-info">
          <div>Napomene/Notes:</div>
          <div class="small">${order.notes}</div>
        </div>
      ` : ''}
      
      <div class="separator"></div>
      
      <!-- QR Code Placeholder -->
      <div class="qr-placeholder">
        QR KOD<br>
        FISKALNI<br>
        BROJ
      </div>
      
      <!-- Footer -->
      <div class="center small">
        <div>Hvala na posjeti!</div>
        <div>Thank you for your visit!</div>
        <div class="bold">Hotel Poreč</div>
      </div>
      
      <div class="center small fiscal-info">
        <div>Fiskalizovano sa: FINA</div>
        <div>JIR: ${generateJIR()}</div>
        <div>ZKI: ${generateZKI()}</div>
      </div>
      
      <!-- Cut line -->
      <div style="margin-top: 5mm; text-align: center; font-size: 8px;">
        ✂ ---------------------------------- ✂
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
        oib: '12345678901', // Hotel Poreč OIB
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