#!/usr/bin/env node

/**
 * Invoice Number Format Validation Test
 * Tests that the invoice number generator creates Croatian fiscal compliant format
 */

console.log('\n🧾 INVOICE NUMBER FORMAT VALIDATION TEST');
console.log('=' .repeat(55));

// Mock reservation data
const mockReservations = [
  { id: 'res-hp-2025-001234' },
  { id: 'booking-123456' },
  { id: 'abc-def-999' },
  { id: 'short-1' },
  { id: 'reservation-very-long-id-789456123' }
];

// Mock the function logic (same as in pdfInvoiceGenerator.ts)
function generateInvoiceNumber(reservation) {
  const year = new Date().getFullYear();
  
  // Generate 6-digit sequential number from reservation ID
  const numericId = reservation.id.replace(/[^0-9]/g, ''); // Extract only numbers
  let sequentialNumber;
  
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

// Croatian fiscal validation regex (from xmlGenerator.ts)
const fiscalFormatRegex = /^HP-\d{4}-\d{6}$/;

console.log('📋 Testing Invoice Number Generation:');
console.log('─'.repeat(55));

mockReservations.forEach((reservation, index) => {
  const invoiceNumber = generateInvoiceNumber(reservation);
  const isValid = fiscalFormatRegex.test(invoiceNumber);
  
  console.log(`\n${index + 1}. Reservation ID: ${reservation.id}`);
  console.log(`   Generated: ${invoiceNumber}`);
  console.log(`   Valid: ${isValid ? '✅ YES' : '❌ NO'}`);
  
  if (!isValid) {
    console.log(`   ❌ ERROR: Does not match Croatian fiscal format HP-YYYY-XXXXXX`);
  }
});

console.log('\n🏛️ Croatian Fiscal Format Requirements:');
console.log('─'.repeat(55));
console.log('   Pattern: HP-YYYY-XXXXXX');
console.log('   HP = Hotel Porec prefix');
console.log('   YYYY = Current year (4 digits)');
console.log('   XXXXXX = Sequential number (6 digits)');
console.log('   Example: HP-2025-123456');

console.log('\n✅ All generated invoice numbers should match this format');
console.log(`Generated at: ${new Date().toLocaleString()}`);
console.log('');