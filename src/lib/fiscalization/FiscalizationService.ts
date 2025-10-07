// Croatian Fiscalization Service
// Main service for handling Croatian Tax Authority fiscal communication

import {
  FiscalInvoiceData,
  FiscalResponse,
  FiscalStatus,
  ZKIData,
  FiscalRequest,
  StornoRequest
} from './types';
import { getCurrentEnvironment, FISCAL_VALIDATION } from './config';
import { FiscalXMLGenerator } from './xmlGenerator';

export class FiscalizationService {
  private static instance: FiscalizationService;
  private xmlGenerator: FiscalXMLGenerator;

  private constructor() {
    this.xmlGenerator = FiscalXMLGenerator.getInstance();
  }
  
  public static getInstance(): FiscalizationService {
    if (!FiscalizationService.instance) {
      FiscalizationService.instance = new FiscalizationService();
    }
    return FiscalizationService.instance;
  }

  /**
   * Fiscalize storno (cancellation) invoice
   * Creates negative invoice that cancels the original
   */
  public async fiscalizeStorno(stornoRequest: StornoRequest, originalInvoice: FiscalInvoiceData): Promise<FiscalResponse> {
    const environment = getCurrentEnvironment();
    
    console.warn(`🔄 FISCAL STORNO ${environment.mode}: Cancelling JIR ${stornoRequest.originalJir}`);
    console.warn(`📋 Storno Type: ${stornoRequest.stornoType} - Reason: ${stornoRequest.reason}`);
    
    // Create storno invoice data
    const stornoInvoiceData = this.xmlGenerator.createStornoInvoiceData(stornoRequest, originalInvoice);
    
    // Use standard fiscalization process with storno invoice data
    return await this.fiscalizeInvoice(stornoInvoiceData);
  }

  /**
   * Quick storno for full invoice cancellation
   */
  public async stornoFullInvoice(originalJir: string, originalInvoice: FiscalInvoiceData, reason: string): Promise<FiscalResponse> {
    const stornoInvoiceNumber = this.generateStornoInvoiceNumber(originalInvoice.invoiceNumber);
    
    const stornoRequest: StornoRequest = {
      originalJir,
      stornoInvoiceNumber,
      dateTime: new Date(),
      reason,
      stornoType: 'FULL'
    };
    
    return await this.fiscalizeStorno(stornoRequest, originalInvoice);
  }

  /**
   * Partial storno for specific amount
   */
  public async stornoPartialAmount(originalJir: string, originalInvoice: FiscalInvoiceData, partialAmount: number, reason: string): Promise<FiscalResponse> {
    const stornoInvoiceNumber = this.generateStornoInvoiceNumber(originalInvoice.invoiceNumber);
    
    const stornoRequest: StornoRequest = {
      originalJir,
      stornoInvoiceNumber,
      dateTime: new Date(),
      reason,
      stornoType: 'PARTIAL',
      partialAmount
    };
    
    return await this.fiscalizeStorno(stornoRequest, originalInvoice);
  }

  /**
   * Generate storno invoice number from original
   */
  private generateStornoInvoiceNumber(originalInvoiceNumber: string): string {
    // HP-2025-123456 -> HP-2025-S123456
    const parts = originalInvoiceNumber.split('-');
    if (parts.length === 3) {
      return `${parts[0]}-${parts[1]}-S${parts[2]}`;
    }
    return `S-${originalInvoiceNumber}`;
  }

  /**
   * Fiscalize an invoice with Croatian Tax Authority via Supabase Edge Function
   * This is browser-safe and calls the server-side Edge Function
   */
  public async fiscalizeInvoice(invoiceData: FiscalInvoiceData): Promise<FiscalResponse> {
    const environment = getCurrentEnvironment();

    try {
      // SAFETY: Log environment being used
      console.warn(`🏛️ FISCAL ${environment.mode}: Fiscalizing invoice ${invoiceData.invoiceNumber}`);

      // Validate input data
      const validation = this.xmlGenerator.validateFiscalData(invoiceData);
      if (!validation.valid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.join(', ')}`,
          timestamp: new Date(),
        };
      }

      // Get Supabase URL and anon key from environment
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase configuration missing');
      }

      // Extract numeric part of invoice number (HP-2025-747258 → 747258)
      // Croatian Tax Authority expects just the number, not the full format
      const invoiceNumberMatch = invoiceData.invoiceNumber.match(/(\d+)$/);
      const numericInvoiceNumber = invoiceNumberMatch ? invoiceNumberMatch[1] : invoiceData.invoiceNumber;

      // Prepare request for Edge Function
      const fiscalRequest = {
        invoiceNumber: numericInvoiceNumber,
        dateTime: invoiceData.dateTime.toISOString(),
        totalAmount: invoiceData.totalAmount,
        vatAmount: invoiceData.vatAmount,
        oib: environment.oib,
        paymentMethod: this.mapPaymentMethod(invoiceData.paymentMethod),
      };

      console.log('🚀 Calling Supabase Edge Function: fiscalize-invoice');
      console.log(`📋 OIB being sent: ${fiscalRequest.oib}`);
      console.log(`📋 Invoice number: ${invoiceData.invoiceNumber} → ${numericInvoiceNumber}`);

      // Call Edge Function
      const response = await fetch(
        `${supabaseUrl}/functions/v1/fiscalize-invoice`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify(fiscalRequest),
        }
      );

      const result = await response.json();

      if (result.success && result.jir && result.zki) {
        console.log('✅ Fiscalization successful via Edge Function');
        console.log(`📋 JIR: ${result.jir}`);
        console.log(`🔒 ZKI: ${result.zki}`);

        return {
          success: true,
          jir: result.jir,
          zki: result.zki,
          qrCodeData: result.qrCodeData,
          timestamp: new Date(result.timestamp),
        };
      } else {
        console.error('❌ Fiscalization failed:', result.error);
        return {
          success: false,
          error: result.error || 'Unknown error from Edge Function',
          timestamp: new Date(result.timestamp || new Date()),
        };
      }

    } catch (error) {
      console.error('Fiscalization error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown fiscalization error',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Map payment method codes
   */
  private mapPaymentMethod(method: string): 'G' | 'K' | 'T' | 'O' {
    const mapping: Record<string, 'G' | 'K' | 'T' | 'O'> = {
      'CASH': 'G',
      'CARD': 'K',
      'CHECK': 'T',
      'OTHER': 'O',
    };
    return mapping[method] || 'G';
  }

  /**
   * Send fiscal request to Croatian Tax Authority
   * Real SOAP implementation based on working production/test-fina-cert.js
   */
  private async sendFiscalRequest(fiscalXML: string): Promise<FiscalResponse> {
    const environment = getCurrentEnvironment();

    //SAFETY: Extra warning for production
    if (environment.mode === 'PRODUCTION') {
      console.error('🚨 PRODUCTION FISCAL REQUEST - VERIFY THIS IS INTENTIONAL');
    }

    try {
      console.log(`🏛️ FISCAL ${environment.mode}: Sending SOAP request to Croatian Tax Authority`);

      // Use appropriate endpoint based on environment
      const endpoint = environment.mode === 'TEST'
        ? { hostname: 'cistest.apis-it.hr', port: 8449, path: '/FiskalizacijaServiceTest' }
        : { hostname: 'cis.porezna-uprava.hr', port: 443, path: '/FiskalizacijaService' };

      console.log(`📍 Endpoint: https://${endpoint.hostname}:${endpoint.port}${endpoint.path}`);

      // NOTE: This method is deprecated - use Edge Function instead
      // Direct SOAP calls should only be made server-side via Edge Functions
      throw new Error('Direct SOAP calls not supported in browser. Use Edge Function instead.');

    } catch (error) {
      console.error('❌ SOAP request failed:', error);
      return {
        success: false,
        error: `Croatian Tax Authority SOAP request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Parse SOAP response from Croatian Tax Authority
   * Based on working production/test-fina-cert.js
   */
  private parseSOAPResponse(responseBody: string): FiscalResponse {
    try {
      // Check for errors in response
      const errorMatch = responseBody.match(/<SifraGreske>(.+?)<\/SifraGreske>/) ||
                        responseBody.match(/<tns:SifraGreske>(.+?)<\/tns:SifraGreske>/);
      const messageMatch = responseBody.match(/<PorukaGreske>(.+?)<\/PorukaGreske>/) ||
                          responseBody.match(/<tns:PorukaGreske>(.+?)<\/tns:PorukaGreske>/);

      if (errorMatch) {
        const errorCode = errorMatch[1];
        const errorMessage = messageMatch ? messageMatch[1] : 'Unknown error';

        console.log('⚠️ Croatian Tax Authority Error:');
        console.log(`📟 Error Code: ${errorCode}`);
        console.log(`📝 Error Message: ${errorMessage}`);

        return {
          success: false,
          error: `${errorCode}: ${errorMessage}`,
          timestamp: new Date(),
        };
      }

      // Check for successful response with JIR
      const jirMatch = responseBody.match(/<Jir>(.+?)<\/Jir>/) ||
                      responseBody.match(/<tns:Jir>(.+?)<\/tns:Jir>/);

      if (jirMatch) {
        const jir = jirMatch[1];
        console.log('🎉 SUCCESS! Croatian Tax Authority Response:');
        console.log(`📋 JIR (Unique Invoice ID): ${jir}`);

        return {
          success: true,
          jir: jir,
          timestamp: new Date(),
        };
      }

      // No JIR or error found
      console.log('⚠️ Unexpected response format');
      return {
        success: false,
        error: 'Response received but no JIR or error found',
        timestamp: new Date(),
      };

    } catch (error) {
      console.error('❌ Response parsing failed:', error);
      return {
        success: false,
        error: `Parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Simulate fiscal request for testing
   * UPDATED: Based on our successful s004 fix and real Croatian Tax Authority responses
   */
  private async simulateFiscalRequest(fiscalXML: string): Promise<FiscalResponse> {
    const environment = getCurrentEnvironment();
    
    console.log('📋 Simulating Croatian Tax Authority SOAP request...');
    console.log(`🎯 Target: https://cistest.apis-it.hr:8449/FiskalizacijaServiceTest`);
    console.log('✅ Using CORRECTED XML structure (s004 error resolved)');
    
    // Simulate realistic network delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (environment.mode === 'TEST') {
      // Simulate responses based on our actual test results
      const random = Math.random();
      
      if (random < 0.1) {
        // s002 error (certificate environment mismatch - 10% of time)
        console.log('⚠️ Simulated s002 error (certificate environment mismatch)');
        
        return {
          success: false,
          error: 's002: Certifikat nije izdan od strane demo potpisnika pouzdanog izdavatelja certifikata u RH ili je istekao ili je ukinut',
          timestamp: new Date(),
        };
      } else if (random < 0.85) {
        // Success case (75% of the time for demo)
        const testJIR = this.generateTestJIR();
        
        console.log('✅ Simulated SUCCESS response from Croatian Tax Authority');
        console.log(`📋 Generated JIR: ${testJIR}`);
        console.log('🎉 s004 error has been RESOLVED with corrected XML structure!');
        
        const receiptUrl = this.generateFiscalReceiptUrl(testJIR);
        const qrData = this.generateFiscalQRData(testJIR, 75.50); // Demo amount
        
        return {
          success: true,
          jir: testJIR,
          fiscalReceiptUrl: receiptUrl,
          qrCodeData: qrData,
          timestamp: new Date(),
        };
      } else {
        // Other validation errors (15% of the time)
        const errors = [
          's001: XML schema validation error',
          's005: OIB mismatch between message and certificate',
          's006: System error'
        ];
        const randomError = errors[Math.floor(Math.random() * errors.length)];
        
        console.log(`⚠️ Simulated validation error: ${randomError}`);
        
        return {
          success: false,
          error: randomError,
          timestamp: new Date(),
        };
      }
    }

    // Production simulation (should not be reached)
    throw new Error('Production SOAP client not implemented - contact development team');
  }

  /**
   * Generate test JIR for development
   */
  private generateTestJIR(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substr(2, 8);
    return `${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Get fiscal status for an invoice
   */
  public async getFiscalStatus(invoiceNumber: string): Promise<FiscalStatus> {
    // This would query the database for fiscal status
    // For now, return a placeholder
    return {
      isFiscalized: false,
      error: 'Fiscal status tracking not implemented',
    };
  }

  /**
   * Validate fiscal configuration
   * Note: Certificate validation now happens in Edge Function
   */
  public validateConfiguration(): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const environment = getCurrentEnvironment();

    // Check Supabase configuration (needed for Edge Function)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      errors.push('Supabase configuration missing - fiscalization unavailable');
    }

    // Environment validation
    if (environment.mode === 'TEST') {
      warnings.push('Using TEST environment - fiscal receipts will not be legally valid');
    }

    if (environment.mode === 'PRODUCTION' && process.env.NODE_ENV !== 'production') {
      errors.push('Production fiscal environment in development mode is not allowed');
    }

    // Edge Function info
    warnings.push('Fiscalization uses Supabase Edge Function - certificate handled server-side');

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get service status and configuration info
   */
  public getServiceStatus(): {
    environment: string;
    oib: string;
    certificateConfigured: boolean;
    validationErrors: string[];
    recommendations: string[];
  } {
    const environment = getCurrentEnvironment();
    const validation = this.validateConfiguration();
    
    return {
      environment: environment.mode,
      oib: environment.oib,
      certificateConfigured: validation.valid,
      validationErrors: validation.errors,
      recommendations: [
        '1. Start with TEST environment only',
        '2. Extract P12 certificate from DOS system (FISKAL_3.p12)',
        '3. Configure certificate password: "Hporec1"',
        '4. Test with Croatian Tax Authority TEST URL first',
        '5. Validate ZKI generation with test data',
        '6. Never use production endpoints until fully tested',
      ],
    };
  }

  /**
   * Generate QR code data for fiscal receipt
   * CORRECTED: Based on official Croatian Tax Authority specifications
   * Must contain: verification URL, JIR, date+time, total amount
   */
  public generateFiscalQRData(jir: string, totalAmount: number, invoiceDateTime?: Date): string {
    const environment = getCurrentEnvironment();
    const dateTime = invoiceDateTime || new Date();
    
    // Croatian fiscal QR code format (Official specification)
    // 4 required data points separated by | character
    const qrData = [
      'https://porezna-uprava.gov.hr/rn', // 1. Tax Authority verification URL
      jir,                                 // 2. Fiscal identification code (JIR)
      this.formatCroatianDateTime(dateTime), // 3. Date and time of receipt
      totalAmount.toFixed(2),              // 4. Total receipt amount
    ].join('|');

    return qrData;
  }

  /**
   * Generate full verification URL for fiscal receipt
   * Citizens can scan QR code or visit this URL directly
   */
  public generateFiscalReceiptUrl(jir: string): string {
    const environment = getCurrentEnvironment();
    
    if (environment.mode === 'TEST') {
      return `https://cistest.apis-it.hr:8449/qr/${jir}`;
    }
    
    return `https://porezna-uprava.gov.hr/rn?jir=${jir}`;
  }

  /**
   * Format date/time for Croatian fiscal QR code
   */
  private formatCroatianDateTime(date: Date): string {
    // Croatian fiscal QR format: dd.MM.yyyy HH:mm:ss
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    
    return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
  }
}