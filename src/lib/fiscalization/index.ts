// Croatian Fiscalization Module
// Entry point for all fiscalization functionality

import { FiscalizationService } from './FiscalizationService';
import { FiscalXMLGenerator } from './xmlGenerator';

// Note: CertificateManager is server-side only (Edge Function)
// Not exported to avoid bundling Node.js dependencies in browser

export { FiscalizationService, FiscalXMLGenerator };

export type {
  FiscalEnvironment,
  FiscalConfiguration,
  FiscalRequest,
  FiscalResponse,
  FiscalInvoiceData,
  FiscalInvoiceItem,
  FiscalStatus,
  ZKIData,
  RacunZahtjev,
  FiskalizacijaOdgovor,
} from './types';

export {
  FISCAL_ENVIRONMENTS,
  HOTEL_FISCAL_CONFIG,
  getCurrentEnvironment,
  CERTIFICATE_EXTRACTION_GUIDE,
  FISCAL_VALIDATION,
  QR_CONFIG,
} from './config';

// Convenience functions to get service instances
export const getFiscalizationService = () => FiscalizationService.getInstance();
export const getXMLGenerator = () => FiscalXMLGenerator.getInstance();

// getCertificateManager removed - certificate operations now in Edge Function