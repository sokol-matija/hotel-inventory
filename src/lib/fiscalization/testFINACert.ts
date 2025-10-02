// Simple FINA Certificate Test using existing fiscalization service
import { CertificateManager } from './certificateManager';
import { FiscalizationService } from './FiscalizationService';
import { getCurrentEnvironment } from './config';

/**
 * Test the FINA certificate with the existing fiscalization service
 */
export function testFINACertificate(): void {
  console.log('🏛️ Testing FINA Certificate with existing fiscalization service');
  console.log('='.repeat(60));

  // Get certificate manager and fiscalization service
  const certManager = CertificateManager.getInstance();
  const fiscalService = FiscalizationService.getInstance();

  // Test certificate passwords
  console.log('\n🔐 Testing certificate passwords...');
  const passwordTest = certManager.testFINACertificate();

  console.log(`Primary password (Marvel247@$&): ${passwordTest.primaryPasswordResult.success ? '✅' : '❌'}`);
  console.log(`Fallback password (Marvel2479@$&(): ${passwordTest.fallbackPasswordResult.success ? '✅' : '❌'}`);

  if (passwordTest.recommendedPassword) {
    console.log(`✅ Recommended password: ${passwordTest.recommendedPassword}`);
  } else {
    console.log('❌ No working password found');
    return;
  }

  // Check current environment
  console.log('\n🌍 Current fiscalization environment:');
  const environment = getCurrentEnvironment();
  console.log(`Mode: ${environment.mode}`);
  console.log(`URL: ${environment.url}`);
  console.log(`OIB: ${environment.oib}`);

  // Check service status
  console.log('\n📊 Fiscalization service status:');
  const serviceStatus = fiscalService.getServiceStatus();
  console.log(`Environment: ${serviceStatus.environment}`);
  console.log(`OIB: ${serviceStatus.oib}`);
  console.log(`Certificate configured: ${serviceStatus.certificateConfigured ? '✅' : '❌'}`);

  if (serviceStatus.validationErrors.length > 0) {
    console.log('\n❌ Validation errors:');
    serviceStatus.validationErrors.forEach(error => console.log(`  - ${error}`));
  }

  // Test invoice generation with sample data
  console.log('\n🧾 Testing sample invoice fiscalization...');

  const sampleInvoice = {
    invoiceNumber: 'HP-2025-000001',
    dateTime: new Date(),
    totalAmount: 150.00,
    vatAmount: 25.00,
    items: [
      {
        name: 'Hotel Room - Test Night',
        quantity: 1,
        unitPrice: 150.00,
        vatRate: 0.25,
        totalAmount: 150.00
      }
    ],
    paymentMethod: 'CARD' as const
  };

  fiscalService.fiscalizeInvoice(sampleInvoice)
    .then(result => {
      console.log('\n📋 Fiscalization test result:');
      console.log(`Success: ${result.success ? '✅' : '❌'}`);

      if (result.success && result.jir) {
        console.log(`JIR: ${result.jir}`);
        console.log(`Receipt URL: ${result.fiscalReceiptUrl}`);
        console.log(`QR Code: ${result.qrCodeData}`);
      } else {
        console.log(`Error: ${result.error}`);
      }

      console.log('\n' + '='.repeat(60));
      console.log('🎉 FINA certificate test completed!');
    })
    .catch(error => {
      console.error('\n❌ Fiscalization test failed:', error);
    });
}

// Run the test if this file is executed directly
if (typeof window !== 'undefined') {
  // Browser environment - can call this from console
  (window as any).testFINACertificate = testFINACertificate;
  console.log('💡 FINA certificate test loaded! Run testFINACertificate() in console to test.');
}