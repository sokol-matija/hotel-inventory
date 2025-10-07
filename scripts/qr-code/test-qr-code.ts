/**
 * Test QR Code Generation for Croatian Fiscal Receipts
 */

import {
  generateQRCodeDataURL,
  generateQRCodeBuffer,
  saveQRCodeToFile,
  generateQRCodeSVG
} from '../src/lib/fiscalization/qr-code-generator';
import fs from 'fs';

async function testQRCodeGeneration() {
  console.log('\n🧪 Testing QR Code Generation for Fiscal Receipts\n');
  console.log('='.repeat(60));

  // Sample fiscal receipt data (from your working B2C system)
  const receiptData = {
    jir: '0be276fe-86b8-4bd0-b6e1-14118c9d55c1',
    zki: '985f2b1dc08438b3331fc9b2b22e2df9',
    oib: '87246357068',
    dateTime: new Date(),
    totalAmount: 125.50,
    invoiceNumber: '941060',
    businessSpace: 'POSL1',
    cashRegister: '2'
  };

  console.log('\n📋 Receipt Data:');
  console.log(`   JIR: ${receiptData.jir}`);
  console.log(`   ZKI: ${receiptData.zki}`);
  console.log(`   OIB: ${receiptData.oib}`);
  console.log(`   Amount: ${receiptData.totalAmount} EUR`);

  // Test 1: Generate QR Code as Data URL (for web/React)
  console.log('\n✅ Test 1: Generate Data URL (for <img> tags)');
  const dataURL = await generateQRCodeDataURL(receiptData, {
    format: 'structured',
    size: 200
  });
  console.log(`   Data URL length: ${dataURL.length} characters`);
  console.log(`   Usage: <img src="${dataURL.substring(0, 50)}..." />`);

  // Test 2: Save QR Code to file
  console.log('\n✅ Test 2: Save QR Code to PNG file');
  await saveQRCodeToFile(receiptData, '/tmp/fiscal-receipt-qr.png', {
    format: 'structured',
    size: 300
  });
  console.log('   Saved to: /tmp/fiscal-receipt-qr.png');

  const fileStats = fs.statSync('/tmp/fiscal-receipt-qr.png');
  console.log(`   File size: ${fileStats.size} bytes`);

  // Test 3: Generate as Buffer (for PDF generation)
  console.log('\n✅ Test 3: Generate as Buffer (for PDFs)');
  const buffer = await generateQRCodeBuffer(receiptData, {
    format: 'structured',
    size: 200
  });
  console.log(`   Buffer size: ${buffer.length} bytes`);
  console.log('   Can be embedded in PDF invoices');

  // Test 4: Generate as SVG (scalable)
  console.log('\n✅ Test 4: Generate as SVG (scalable)');
  const svg = await generateQRCodeSVG(receiptData, {
    format: 'structured',
    size: 200
  });
  console.log(`   SVG length: ${svg.length} characters`);
  console.log('   Perfect for print receipts (scales to any size)');

  console.log('\n' + '='.repeat(60));
  console.log('🎉 QR Code Generation Working!');
  console.log('\n💡 Next steps:');
  console.log('   1. Add QR code to your receipt PDF');
  console.log('   2. Display QR code in React component');
  console.log('   3. Print QR code on thermal printer receipts');
  console.log('\n📱 Customer scans QR code to verify receipt with Tax Authority');
  console.log('='.repeat(60) + '\n');
}

testQRCodeGeneration().catch(console.error);
