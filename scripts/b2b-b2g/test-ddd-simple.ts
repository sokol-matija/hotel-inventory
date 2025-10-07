/**
 * Simplified DDD test - Generate invoices without sending to Tax Authority
 */

import { DDDInvoicesAPI } from '../src/lib/fiscalization/ddd-invoices-api';

const HOTEL_CONFIG = {
  apiKey: '603e5ce1-e6ce-4622-9a0e-ba3cd097a5f5',
  sellerOib: '87246357068',
  sellerName: 'Hotel Porec',
  sellerAddress: 'Rade Koncara 1',
  sellerCity: 'Porec',
  sellerPostCode: '52440'
};

async function testB2BInvoiceGeneration() {
  console.log('\n🧪 Test: B2B Invoice Generation (No TAP submission)\n');
  console.log('━'.repeat(60));

  const ddd = new DDDInvoicesAPI(HOTEL_CONFIG);

  // Create invoice with Steps: 35 (lock) + 50 (UBL) + 85 (PDF)
  // Skip Step 70 (send to TAP) since that requires Tax Authority endpoint config

  const apiUrl = 'https://api.dddinvoices.com/api/service';

  const response = await fetch(`${apiUrl}/EUeInvoices.DDDI_Save`, {
    method: 'POST',
    headers: {
      'Authorization': `IoT ${HOTEL_CONFIG.apiKey}:EUeInvoices`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      Complexity: 'Minimal',
      Steps: [35, 50, 85], // Lock + UBL + PDF (skip TAP submission)
      ReturnDoc: ['PDFP', 'XMLS'],
      Object: {
        Invoice: {
          BuyerLegalForm: 'LegalEntity',
          BuyerTypeCode: 'Domestic',
          BuyerCountryCode: 'HR',
          BuyerTaxNum: '12345678901',
          BuyerName: 'Travel Agency Zagreb',
          BuyerPostCode: '10000',
          BuyerStreet: 'Ilica 123',
          BuyerCity: 'Zagreb',
          BuyerRegNum: null,
          BuyerId: null,
          BuyerIsBudget: false,
          BuyerBudgetNum: null,
          DocNumber: null,
          DocIssueDate: null,
          DocDueDate: null,
          DocTotalAmount: 1695.00,
          DocTotalVatAmount: 195.00,
          DocTotalVatAmountCC: 195.00,
          DocStartDate: new Date().toISOString(),
          DocEndDate: new Date().toISOString(),
          DocDeliveryDate: new Date().toISOString(),
          DocCurrencyCode: 'EUR',
          DocExchangeRate: 1.0,
          DocAllowPercent: 0,
          DocSigner: null,
          DocNote: 'Test B2B invoice for Hotel Porec',
          DocBuyerOrderRef: null,
          OriginalInvNumber: null,
          OriginalInvIssueDate: null,
          DocTypeCode: 'INVOICE',
          DocSaleTypeCode: 'Wholesale',
          DocPaymentTypeCode: 'NONCASH',
          OperatorFISCRegistration: null,
          PDFOriginal: null,
          _details: {
            Items: [
              {
                ItemName: 'Hotel Accommodation - 5 rooms x 3 nights',
                ItemQuantity: 15,
                ItemUmcCode: 'piece',
                ItemNetPrice: 100.00,
                ItemRetailPrice: null,
                ItemAllowancePercent: 0,
                ItemVatRate: 0,
                ItemVatCode: '13',
                ItemExciseAmount: 0
              }
            ],
            Payments: [
              {
                PayCode: 'CREDITTRANSFER',
                PayNumber: null,
                PayAmount: 0,
                PayPayeeAccountType: null,
                PayNetworkProvider: null,
                PayCardHolderOrReference: null,
                PayDocDate: null
              }
            ]
          }
        }
      }
    })
  });

  const result = await response.json();

  if (result.Status === 'OK' && result.Result.Status === 'OK') {
    console.log('✅ SUCCESS!');
    console.log(`📋 Invoice ID: ${result.Result.Result.Id}`);
    console.log(`📄 PDF: ${result.Result.ReturnDoc.PDFP}`);
    console.log(`📄 XML: ${result.Result.ReturnDoc.XMLS}`);
    console.log('\n💡 Invoice generated successfully!');
    console.log('   (Not sent to Tax Authority - that requires TAP endpoint config)');
  } else {
    console.log('❌ FAILED');
    console.log(JSON.stringify(result, null, 2));
  }
}

testB2BInvoiceGeneration();
