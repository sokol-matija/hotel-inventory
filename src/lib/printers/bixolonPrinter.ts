import { PrintReceiptData } from '../hotel/orderTypes';
import { printWindowsReceipt } from './windowsPrinter';

/**
 * Bixolon Printer Integration
 * 
 * Bixolon printers typically support multiple connection methods:
 * 1. Network (TCP/IP) - Most common for POS systems
 * 2. USB with ESC/POS commands
 * 3. Bluetooth (mobile integration)
 * 4. Serial connection
 * 
 * This implementation provides multiple approaches:
 * - ESC/POS command generation for direct printer communication
 * - Web browser printing with custom formatting
 * - Network printing via fetch API (if printer supports HTTP)
 */

// ESC/POS command constants
const ESC = '\x1B';
const GS = '\x1D';

const ESC_POS_COMMANDS = {
  // Text formatting
  RESET: ESC + '@',
  BOLD_ON: ESC + 'E\x01',
  BOLD_OFF: ESC + 'E\x00',
  UNDERLINE_ON: ESC + '-\x01',
  UNDERLINE_OFF: ESC + '-\x00',
  CENTER: ESC + 'a\x01',
  LEFT: ESC + 'a\x00',
  
  // Font sizes
  NORMAL_TEXT: GS + '!\x00',
  DOUBLE_HEIGHT: GS + '!\x10',
  DOUBLE_WIDTH: GS + '!\x20',
  DOUBLE_SIZE: GS + '!\x30',
  
  // Paper control
  CUT_PAPER: GS + 'V\x42\x00',
  FEED_LINES: (lines: number) => ESC + 'd' + String.fromCharCode(lines),
  
  // Line separators
  LINE_SEPARATOR: '-'.repeat(32),
  DOUBLE_LINE: '='.repeat(32)
};

/**
 * Generate ESC/POS commands for receipt printing
 */
export function generateESCPOSReceipt(data: PrintReceiptData): string {
  const { order, hotelInfo } = data;
  
  let receipt = ESC_POS_COMMANDS.RESET;
  
  // Header
  receipt += ESC_POS_COMMANDS.CENTER;
  receipt += ESC_POS_COMMANDS.DOUBLE_SIZE;
  receipt += hotelInfo.name + '\n';
  receipt += ESC_POS_COMMANDS.NORMAL_TEXT;
  receipt += hotelInfo.address + '\n';
  receipt += 'Tel: ' + hotelInfo.phone + '\n';
  receipt += ESC_POS_COMMANDS.DOUBLE_LINE + '\n';
  
  // Order info
  receipt += ESC_POS_COMMANDS.LEFT;
  receipt += ESC_POS_COMMANDS.BOLD_ON;
  receipt += 'ROOM SERVICE ORDER\n';
  receipt += ESC_POS_COMMANDS.BOLD_OFF;
  receipt += `Order #: ${order.orderNumber}\n`;
  receipt += `Room: ${order.roomNumber}\n`;
  receipt += `Guest: ${order.guestName}\n`;
  receipt += `Date: ${order.orderedAt.toLocaleString()}\n`;
  receipt += ESC_POS_COMMANDS.LINE_SEPARATOR + '\n';
  
  // Items
  receipt += ESC_POS_COMMANDS.BOLD_ON;
  receipt += 'QTY ITEM                    TOTAL\n';
  receipt += ESC_POS_COMMANDS.BOLD_OFF;
  receipt += ESC_POS_COMMANDS.LINE_SEPARATOR + '\n';
  
  order.items.forEach(item => {
    const qty = item.quantity.toString().padEnd(3);
    const itemName = item.itemName.length > 18 
      ? item.itemName.substring(0, 15) + '...' 
      : item.itemName.padEnd(18);
    const total = `€${item.totalPrice.toFixed(2)}`.padStart(7);
    
    receipt += `${qty} ${itemName} ${total}\n`;
  });
  
  receipt += ESC_POS_COMMANDS.LINE_SEPARATOR + '\n';
  
  // Totals
  receipt += `Subtotal:               €${order.subtotal.toFixed(2)}\n`;
  receipt += `VAT (25%):              €${order.tax.toFixed(2)}\n`;
  receipt += ESC_POS_COMMANDS.BOLD_ON;
  receipt += `TOTAL:                  €${order.totalAmount.toFixed(2)}\n`;
  receipt += ESC_POS_COMMANDS.BOLD_OFF;
  
  // Payment info
  receipt += ESC_POS_COMMANDS.LINE_SEPARATOR + '\n';
  receipt += `Payment: ${order.paymentMethod.replace('_', ' ').toUpperCase()}\n`;
  receipt += `Status: ${order.paymentStatus.toUpperCase()}\n`;
  
  // Footer
  if (order.notes) {
    receipt += ESC_POS_COMMANDS.LINE_SEPARATOR + '\n';
    receipt += 'Notes: ' + order.notes + '\n';
  }
  
  receipt += ESC_POS_COMMANDS.DOUBLE_LINE + '\n';
  receipt += ESC_POS_COMMANDS.CENTER;
  receipt += 'Thank you for your stay!\n';
  receipt += 'Enjoy your order!\n';
  
  // Cut paper and feed
  receipt += ESC_POS_COMMANDS.FEED_LINES(3);
  receipt += ESC_POS_COMMANDS.CUT_PAPER;
  
  return receipt;
}

/**
 * Print via network (if Bixolon printer supports HTTP interface)
 * Many modern Bixolon printers have built-in web servers
 */
export async function printViaNetwork(
  printerIP: string, 
  data: PrintReceiptData,
  port: number = 9100
): Promise<boolean> {
  try {
    const escposData = generateESCPOSReceipt(data);
    
    // Try HTTP interface first (some Bixolon models support this)
    try {
      const response = await fetch(`http://${printerIP}/print`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
        },
        body: escposData
      });
      
      if (response.ok) {
        return true;
      }
    } catch (httpError) {
      console.log('HTTP interface not available, trying raw TCP...');
    }
    
    // Fallback: Raw TCP socket (requires server-side proxy in production)
    // This would typically need a WebSocket or server-side component
    console.warn('Raw TCP printing requires server-side implementation');
    return false;
    
  } catch (error) {
    console.error('Network printing failed:', error);
    return false;
  }
}

/**
 * Print via browser (fallback method)
 * Uses CSS @media print rules to format for small receipt printers
 */
export function printViaBrowser(data: PrintReceiptData): void {
  const { order, hotelInfo } = data;
  
  // Create a hidden iframe for printing
  const printFrame = document.createElement('iframe');
  printFrame.style.display = 'none';
  document.body.appendChild(printFrame);
  
  const printDocument = printFrame.contentDocument || printFrame.contentWindow?.document;
  if (!printDocument) {
    console.error('Could not access print frame document');
    return;
  }
  
  // Generate HTML receipt with CSS for thermal printer formatting
  const receiptHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Receipt</title>
      <style>
        @media print {
          @page {
            size: 80mm auto;
            margin: 0;
          }
          
          body {
            width: 80mm;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.2;
            margin: 0;
            padding: 2mm;
          }
          
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .large { font-size: 16px; }
          .separator { 
            border-top: 1px dashed #000; 
            margin: 2mm 0;
          }
          
          .item-line {
            display: flex;
            justify-content: space-between;
            margin: 1mm 0;
          }
          
          .total-line {
            display: flex;
            justify-content: space-between;
            font-weight: bold;
          }
        }
        
        /* Hide everything on screen */
        @media screen {
          body { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="center bold large">${hotelInfo.name}</div>
      <div class="center">${hotelInfo.address}</div>
      <div class="center">Tel: ${hotelInfo.phone}</div>
      
      <div class="separator"></div>
      
      <div class="center bold">ROOM SERVICE ORDER</div>
      <div>Order #: ${order.orderNumber}</div>
      <div>Room: ${order.roomNumber}</div>
      <div>Guest: ${order.guestName}</div>
      <div>Date: ${order.orderedAt.toLocaleString()}</div>
      
      <div class="separator"></div>
      
      <div class="bold">QTY ITEM                    TOTAL</div>
      
      ${order.items.map(item => `
        <div class="item-line">
          <span>${item.quantity}x ${item.itemName}</span>
          <span>€${item.totalPrice.toFixed(2)}</span>
        </div>
      `).join('')}
      
      <div class="separator"></div>
      
      <div class="item-line">
        <span>Subtotal:</span>
        <span>€${order.subtotal.toFixed(2)}</span>
      </div>
      <div class="item-line">
        <span>VAT (25%):</span>
        <span>€${order.tax.toFixed(2)}</span>
      </div>
      <div class="total-line">
        <span>TOTAL:</span>
        <span>€${order.totalAmount.toFixed(2)}</span>
      </div>
      
      <div class="separator"></div>
      
      <div>Payment: ${order.paymentMethod.replace('_', ' ').toUpperCase()}</div>
      <div>Status: ${order.paymentStatus.toUpperCase()}</div>
      
      ${order.notes ? `
        <div class="separator"></div>
        <div>Notes: ${order.notes}</div>
      ` : ''}
      
      <div class="separator"></div>
      
      <div class="center">Thank you for your stay!</div>
      <div class="center">Enjoy your order!</div>
    </body>
    </html>
  `;
  
  printDocument.open();
  printDocument.write(receiptHTML);
  printDocument.close();
  
  // Wait for content to load, then print
  setTimeout(() => {
    if (printFrame.contentWindow) {
      printFrame.contentWindow.print();
    }
    
    // Clean up after printing
    setTimeout(() => {
      document.body.removeChild(printFrame);
    }, 1000);
  }, 500);
}

/**
 * Main print function - tries multiple methods
 */
export async function printReceipt(
  data: PrintReceiptData,
  options: {
    printerIP?: string;
    preferredMethod?: 'network' | 'browser' | 'escpos' | 'windows';
  } = {}
): Promise<boolean> {
  const { printerIP, preferredMethod = 'windows' } = options;
  
  try {
    // Try Windows WinPrint first (best for thermal printers)
    if (preferredMethod === 'windows' || !printerIP) {
      const windowsSuccess = await printWindowsReceipt(data);
      if (windowsSuccess) {
        return true;
      }
    }
    
    // Try network printing if IP is provided
    if (printerIP && (preferredMethod === 'network' || preferredMethod === 'escpos')) {
      const networkSuccess = await printViaNetwork(printerIP, data);
      if (networkSuccess) {
        return true;
      }
    }
    
    // Fallback to basic browser printing
    printViaBrowser(data);
    return true;
    
  } catch (error) {
    console.error('All printing methods failed:', error);
    return false;
  }
}

/**
 * Test printer connectivity
 */
export async function testPrinter(printerIP?: string): Promise<{
  success: boolean;
  method: string;
  message: string;
}> {
  if (printerIP) {
    try {
      const response = await fetch(`http://${printerIP}/status`, {
        method: 'GET',
        timeout: 3000
      } as RequestInit);
      
      if (response.ok) {
        return {
          success: true,
          method: 'network',
          message: 'Printer connected via network'
        };
      }
    } catch (error) {
      return {
        success: false,
        method: 'network',
        message: 'Network printer not accessible'
      };
    }
  }
  
  // Browser printing is always available
  return {
    success: true,
    method: 'browser',
    message: 'Browser printing available'
  };
}