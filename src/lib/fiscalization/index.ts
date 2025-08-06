// Croatian Fiscalization Module
// Entry point for all fiscalization functionality

import { FiscalizationService } from './FiscalizationService';
import { FiscalXMLGenerator } from './xmlGenerator';
import { CertificateManager } from './certificateManager';

export { FiscalizationService, FiscalXMLGenerator, CertificateManager };

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
export const getCertificateManager = () => CertificateManager.getInstance();
export const getXMLGenerator = () => FiscalXMLGenerator.getInstance();