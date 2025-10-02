// Croatian Fiscalization Configuration
// Based on DOS system config.xml analysis

import { FiscalEnvironment, FiscalConfiguration } from './types';

// SAFETY: Default to TEST environment to prevent accidental production usage
export const FISCAL_ENVIRONMENTS: Record<string, FiscalEnvironment> = {
  TEST: {
    mode: 'TEST',
    url: 'https://cistest.apis-it.hr:8449/FiskalizacijaServiceTest',
    oib: '37014645007', // Test OIB from DOS system
  },
  PRODUCTION: {
    mode: 'PRODUCTION', 
    url: 'https://cis.porezna-uprava.hr:8449/FiskalizacijaService',
    oib: '87246357068', // Hotel Porec real OIB
  }
};

// Hotel Porec Configuration (from DOS config.xml)
export const HOTEL_FISCAL_CONFIG: FiscalConfiguration = {
  hotelOib: '87246357068',
  businessSpaceCode: 'POSL1',
  cashRegisterCode: '2',
  address: {
    street: 'Rade Končara',
    houseNumber: '1',
    postalCode: '52440',
    city: 'Poreč',
    municipality: 'Poreč',
  },
  workingHours: '0-24',
  certificate: {
    file: process.env.REACT_APP_FISCAL_CERT_FILE || '87246357068.49208351934.A.1.p12', // New FINA certificate
    password: process.env.REACT_APP_FISCAL_CERT_PASSWORD || 'Marvel247@$&', // New certificate password
    passwordBackup: process.env.REACT_APP_FISCAL_CERT_PASSWORD_BACKUP || 'Marvel2479@$&(', // Backup password
    path: process.env.REACT_APP_FISCAL_CERT_PATH || '.certificates/87246357068.49208351934.A.1.p12',
  },
};

// SAFETY: Force TEST mode in development
export function getCurrentEnvironment(): FiscalEnvironment {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const forceTest = process.env.REACT_APP_FISCAL_FORCE_TEST === 'true';
  
  // SAFETY CHECK: Always use TEST in development or when forced
  if (isDevelopment || forceTest) {
    console.warn('🚨 FISCAL SAFETY: Using TEST environment');
    return FISCAL_ENVIRONMENTS.TEST;
  }
  
  // Production environment (requires explicit flag)
  const allowProduction = process.env.REACT_APP_FISCAL_ALLOW_PRODUCTION === 'true';
  if (allowProduction) {
    console.warn('⚠️ FISCAL WARNING: Using PRODUCTION environment');
    return FISCAL_ENVIRONMENTS.PRODUCTION;
  }
  
  // Default safety fallback
  console.warn('🚨 FISCAL SAFETY: Defaulting to TEST environment');
  return FISCAL_ENVIRONMENTS.TEST;
}

// Certificate extraction instructions
export const CERTIFICATE_EXTRACTION_GUIDE = `
CERTIFICATE EXTRACTION FROM DOS SYSTEM:

1. **Locate Certificate Files:**
   - Path: example/DosProg/ffgastro/H Porec/
   - Files: FISKAL 1.P12, FISKAL 2.p12, FISKAL_3.p12
   - Use: FISKAL_3.p12 (most recent)

2. **Certificate Password:**
   - Password: "Hporec1" 
   - (From base64 encoded "SHBvcmVjMQ==" in config.xml)

3. **For Development/Testing:**
   - Copy FISKAL_3.p12 to secure location
   - Store password in environment variables
   - Use Croatian Tax Authority TEST environment

4. **Security Considerations:**
   - Never commit certificates to repository
   - Store in Supabase secure storage or environment variables
   - Use certificate validation before fiscal operations
   
5. **Testing Approach:**
   - Always start with TEST OIB: 37014645007
   - Use TEST URL: https://cistest.apis-it.hr:8449/FiskalizacijaServiceTest
   - Validate with Croatian Tax Authority test system first
`;

// Fiscal validation rules
export const FISCAL_VALIDATION = {
  OIB_LENGTH: 11,
  INVOICE_NUMBER_PATTERN: /^HP-\d{4}-\d{6}$/, // HP-YYYY-XXXXXX format
  MAX_AMOUNT: 999999.99,
  MIN_AMOUNT: 0.01,
  REQUIRED_FIELDS: [
    'oib',
    'dateTime', 
    'businessSpaceCode',
    'cashRegisterCode',
    'invoiceNumber',
    'totalAmount'
  ] as const,
};

// QR Code configuration (from DOS config.xml)
export const QR_CONFIG = {
  type: 1,
  format: 0,
  size: 120,
  factor: 1,
  horizontalOffset: 0,
};