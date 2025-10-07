/**
 * Test script for DDD Invoices API
 *
 * Usage: npx tsx scripts/test-ddd-invoices.ts
 */

import { DDDInvoicesAPI } from '../src/lib/fiscalization/ddd-invoices-api';

// Hotel Porec Configuration
const HOTEL_CONFIG = {
  apiKey: '603e5ce1-e6ce-4622-9a0e-ba3cd097a5f5',
  sellerOib: '87246357068',
  sellerName: 'Hotel Porec',
  sellerAddress: 'Rade Koncara 1',
  sellerCity: 'Porec',
  sellerPostCode: '52440'
};

async function testB2CReceipt() {
  console.log('\n🧪 Test 1: B2C Receipt (Cash Register)\n');
  console.log('━'.repeat(60));

  const ddd = new DDDInvoicesAPI(HOTEL_CONFIG);

  // For B2C, use createInvoice with minimal customer info
  const result = await ddd.createInvoice({
    invoiceType: 'b2c',
    customer: {
      name: 'Guest John Doe',
      address: 'Hotel Guest',
      city: 'Porec',
      postCode: '52440',
      country: 'HR'
    },
    items: [
      {
        name: 'Hotel Accommodation - 3 nights',
        description: 'Double room with sea view',
        quantity: 3,
        unitPrice: 120.00,
        vatRate: 13
      },
      {
        name: 'Breakfast',
        description: 'Continental breakfast',
        quantity: 6,
        unitPrice: 12.00,
        vatRate: 13
      }
    ],
    paymentType: 'Cash',
    currency: 'EUR'
  });

  if (result.success) {
    console.log('✅ SUCCESS!');
    console.log(`📋 Invoice ID: ${result.invoiceId}`);
    console.log(`📄 PDF: ${result.pdfUrl}`);
    console.log(`📄 XML: ${result.xmlUrl}`);
  } else {
    console.log('❌ FAILED');
    console.log(`Error: ${result.error}`);
  }
}

async function testB2BInvoice() {
  console.log('\n🧪 Test 2: B2B Invoice (Corporate Client)\n');
  console.log('━'.repeat(60));

  const ddd = new DDDInvoicesAPI(HOTEL_CONFIG);

  const result = await ddd.createB2BInvoice(
    {
      oib: '12345678901', // Test OIB
      name: 'Travel Agency Zagreb',
      address: 'Ilica 123',
      city: 'Zagreb',
      postCode: '10000',
      country: 'HR',
      email: 'info@travelagency.hr'
    },
    [
      {
        name: 'Corporate Booking - 5 rooms x 3 nights',
        description: 'Group reservation',
        quantity: 15,
        unitPrice: 100.00,
        vatRate: 13
      }
    ],
    'BankTransfer',
    'INV-2025-001'
  );

  if (result.success) {
    console.log('✅ SUCCESS!');
    console.log(`📋 Invoice ID: ${result.invoiceId}`);
    console.log(`📄 PDF: ${result.pdfUrl}`);
    console.log(`📄 XML: ${result.xmlUrl}`);
  } else {
    console.log('❌ FAILED');
    console.log(`Error: ${result.error}`);
  }
}

async function testB2GInvoice() {
  console.log('\n🧪 Test 3: B2G Invoice (Government Entity)\n');
  console.log('━'.repeat(60));

  const ddd = new DDDInvoicesAPI(HOTEL_CONFIG);

  const result = await ddd.createB2GInvoice(
    {
      oib: '98765432109', // Test government OIB
      name: 'Croatian Ministry of Health',
      address: 'Ksaver 200',
      city: 'Zagreb',
      postCode: '10000',
      country: 'HR',
      email: 'procurement@mzh.hr'
    },
    [
      {
        name: 'Conference Venue',
        description: 'Medical conference - 2 days',
        quantity: 2,
        unitPrice: 800.00,
        vatRate: 25
      },
      {
        name: 'Catering Services',
        description: 'Lunch for 50 participants',
        quantity: 2,
        unitPrice: 500.00,
        vatRate: 13
      }
    ],
    'BankTransfer',
    'GOV-2025-001'
  );

  if (result.success) {
    console.log('✅ SUCCESS!');
    console.log(`📋 Invoice ID: ${result.invoiceId}`);
    console.log(`📄 PDF: ${result.pdfUrl}`);
    console.log(`📄 XML: ${result.xmlUrl}`);
  } else {
    console.log('❌ FAILED');
    console.log(`Error: ${result.error}`);
  }
}

async function runAllTests() {
  console.log('\n');
  console.log('═'.repeat(60));
  console.log('   DDD INVOICES API - TEST SUITE');
  console.log('   Hotel Porec - Croatian Fiscalization 2.0');
  console.log('═'.repeat(60));

  try {
    await testB2CReceipt();
    await testB2BInvoice();
    await testB2GInvoice();

    console.log('\n');
    console.log('═'.repeat(60));
    console.log('   TEST SUITE COMPLETED');
    console.log('═'.repeat(60));
    console.log('\n');

  } catch (error) {
    console.error('\n💥 Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests
runAllTests();
