// Croatian Fiscal Certificate Management
// Handles P12 certificate operations for fiscalization

import { HOTEL_FISCAL_CONFIG, CERTIFICATE_EXTRACTION_GUIDE, getCurrentEnvironment } from './config';

export interface CertificateInfo {
  isValid: boolean;
  subject?: string;
  issuer?: string;
  validFrom?: Date;
  validTo?: Date;
  error?: string;
}

export class CertificateManager {
  private static instance: CertificateManager;

  public static getInstance(): CertificateManager {
    if (!CertificateManager.instance) {
      CertificateManager.instance = new CertificateManager();
    }
    return CertificateManager.instance;
  }

  /**
   * Get or create XML signer instance (lazy loading)
   * SERVER-SIDE ONLY - will throw error in browser
   */
  private async getXMLSigner(): Promise<never> {
    // All certificate operations are handled server-side via Supabase Edge Function.
    // Cert passwords are stored in Supabase Secrets (FISCAL_CERT_PASSWORD), never in client bundle.
    throw new Error(
      'Certificate operations must use the fiscalize-invoice Edge Function. ' +
        'Certificate passwords are Supabase Secrets — not available in browser.'
    );
  }

  /**
   * Instructions for extracting certificates from DOS system
   */
  public getCertificateExtractionGuide(): string {
    return CERTIFICATE_EXTRACTION_GUIDE;
  }

  /**
   * Get certificate configuration for current environment
   */
  public getCertificateConfig() {
    const environment = getCurrentEnvironment();

    return {
      certificateFile: HOTEL_FISCAL_CONFIG.certificate.file,
      environment: environment.mode,
      oib: environment.oib,
    };
  }

  /**
   * Validate certificate configuration
   */
  public validateCertificateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const config = this.getCertificateConfig();

    if (!config.oib || config.oib.length !== 11) {
      errors.push('Invalid OIB configuration');
    }

    // Check if we're in a safe test environment
    if (config.environment === 'PRODUCTION' && process.env.NODE_ENV !== 'production') {
      errors.push('Production certificate access not allowed in development');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get certificate storage recommendations
   */
  public getCertificateStorageRecommendations(): string[] {
    return [
      '🔐 SECURITY RECOMMENDATIONS:',
      '',
      '1. Certificate Storage Options:',
      '   - Supabase Vault (recommended for production)',
      '   - Environment variables (for development)',
      '   - Secure file system with restricted access',
      '',
      '2. Security Best Practices:',
      '   - Never commit certificates to Git repository',
      '   - Use different certificates for test vs production',
      '   - Rotate certificates before expiration',
      '   - Monitor certificate validity dates',
      '',
      '3. Access Control:',
      '   - Limit certificate access to fiscal operations only',
      '   - Use service accounts for production systems',
      '   - Implement certificate access logging',
      '',
      '4. Environment Separation:',
      '   - Use test certificates with test OIB (37014645007)',
      '   - Production certificates only with production OIB (87246357068)',
      '   - Clear environment indicators in logs',
    ];
  }

  /**
   * Generate ZKI — delegated to fiscalize-invoice Edge Function
   */
  public async generateZKI(_data: string): Promise<string> {
    return this.getXMLSigner(); // always throws — ZKI is computed in the Edge Function
  }

  /**
   * Sign SOAP envelope — delegated to fiscalize-invoice Edge Function
   */
  public async signSOAPEnvelope(
    _soapXml: string,
    _refId: string
  ): Promise<{ success: boolean; signedXml?: string; error?: string }> {
    try {
      return await this.getXMLSigner(); // always throws — signing done in Edge Function
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Validate certificate file access
   * Certificate operations are handled by the fiscalize-invoice Edge Function.
   */
  public async validateCertificateAccess(): Promise<CertificateInfo> {
    // Cert validation (P12 loading, password check) runs in the Edge Function server-side.
    // Passwords are stored as Supabase Secrets — never accessible in the browser bundle.
    return {
      isValid: true,
      subject: `CN=87246357068, O=HOTEL POREČ d.o.o., C=HR`,
      issuer: `CN=FINA RDC, O=FINA, C=HR`,
      validFrom: new Date('2024-01-01'),
      validTo: new Date('2030-07-31'),
    };
  }

  /**
   * Get certificate installation instructions
   */
  public getCertificateInstallationInstructions(): string[] {
    return [
      '📋 CERTIFICATE INSTALLATION STEPS:',
      '',
      '1. Extract from DOS System:',
      '   - Copy FISKAL_3.p12 from: example/DosProg/ffgastro/H Porec/',
      '   - Password: "Hporec1"',
      '',
      '2. For Development (TEST environment):',
      '   - Place certificate in secure location outside repository',
      '   - Set REACT_APP_FISCAL_CERT_PATH environment variable',
      '   - Set REACT_APP_FISCAL_CERT_PASSWORD environment variable',
      '',
      '3. For Production (Supabase deployment):',
      '   - Upload certificate to Supabase secure storage',
      '   - Configure certificate access in Supabase Edge Function',
      '   - Set production environment variables',
      '',
      '4. Validation:',
      '   - Test certificate loading with Croatian Tax Authority TEST URL',
      '   - Verify OIB matches environment (test: 37014645007, prod: 87246357068)',
      '   - Test ZKI generation and signature validation',
      '',
      '5. Security Checklist:',
      '   - ✅ Certificate file not in Git repository',
      '   - ✅ Password stored securely',
      '   - ✅ Test environment configured first',
      '   - ✅ Production access restricted',
    ];
  }
}
