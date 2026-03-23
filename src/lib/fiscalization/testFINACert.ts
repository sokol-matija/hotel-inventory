// Simple FINA Certificate Test using existing fiscalization service
import { FiscalizationService } from './FiscalizationService';
import { getCurrentEnvironment } from './config';

/**
 * Test the FINA certificate with the existing fiscalization service.
 * Note: Certificate passwords are stored as Supabase Secrets — all signing
 * is handled by the fiscalize-invoice Edge Function, not in the browser.
 */
export function testFINACertificate(): void {
  const fiscalService = FiscalizationService.getInstance();

  // Check current environment
  getCurrentEnvironment();

  // Check service status
  const serviceStatus = fiscalService.getServiceStatus();

  if (serviceStatus.validationErrors.length > 0) {
    serviceStatus.validationErrors.forEach((_error) => {});
  }

  // Test invoice generation with sample data

  const sampleInvoice = {
    invoiceNumber: 'HP-2025-000001',
    dateTime: new Date(),
    totalAmount: 150.0,
    vatAmount: 25.0,
    items: [
      {
        name: 'Hotel Room - Test Night',
        quantity: 1,
        unitPrice: 150.0,
        vatRate: 0.25,
        totalAmount: 150.0,
      },
    ],
    paymentMethod: 'CARD' as const,
  };

  fiscalService
    .fiscalizeInvoice(sampleInvoice)
    .then((result) => {
      void result;
    })
    .catch((error) => {
      console.error('\n❌ Fiscalization test failed:', error);
    });
}

// Run the test if this file is executed directly
if (typeof window !== 'undefined') {
  // Browser environment - can call this from console
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).testFINACertificate = testFINACertificate;
}
