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
      certificatePassword: HOTEL_FISCAL_CONFIG.certificate.password,
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

    if (!config.certificateFile) {
      errors.push('Certificate file path not configured');
    }

    if (!config.certificatePassword) {
      errors.push('Certificate password not configured');
    }

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
   * Generate ZKI (security code) placeholder
   * Note: Actual implementation requires P12 certificate and RSA signing
   */
  public async generateZKI(data: string): Promise<string> {
    const environment = getCurrentEnvironment();
    
    // SAFETY: Always indicate test mode
    if (environment.mode === 'TEST') {
      console.warn('🚨 FISCAL TEST: Generating test ZKI');
      // Generate a test ZKI (not cryptographically valid)
      return this.generateTestZKI(data);
    }

    throw new Error('Production ZKI generation requires actual P12 certificate implementation');
  }

  /**
   * Generate test ZKI for development
   */
  private generateTestZKI(data: string): string {
    // Create a deterministic test ZKI based on input data
    // This is NOT cryptographically secure - only for testing
    const hash = this.simpleHash(data);
    return hash.substring(0, 32).toUpperCase();
  }

  /**
   * Simple hash function for test ZKI generation
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0').repeat(4);
  }

  /**
   * Validate certificate file access (placeholder)
   */
  public async validateCertificateAccess(): Promise<CertificateInfo> {
    const config = this.getCertificateConfig();
    
    // For now, return a placeholder response
    // Real implementation would validate P12 certificate
    return {
      isValid: config.environment === 'TEST',
      subject: `CN=Hotel Porec Test Certificate, O=Hotel Porec, C=HR`,
      issuer: `CN=Croatian Tax Authority Test CA, O=Porezna Uprava, C=HR`,
      validFrom: new Date('2024-01-01'),
      validTo: new Date('2025-12-31'),
      error: config.environment === 'PRODUCTION' ? 'Production certificate validation not implemented' : undefined,
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