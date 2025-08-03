// FINA SOAP Client for Croatian E-Računi Submission
// Hotel Porec Implementation

import { EracuniInvoice, EracuniResponse, HOTEL_POREC_CONFIG } from './types';

export class FinaSoapClient {
  private config = HOTEL_POREC_CONFIG;
  private certificateLoaded = false;

  async submitInvoice(invoice: EracuniInvoice, xmlContent: string): Promise<EracuniResponse> {
    try {
      // Check if we're in demo mode
      if (this.config.environment === 'demo') {
        return this.simulateDemoSubmission(invoice);
      }

      // Production SOAP submission
      const soapEnvelope = this.createSoapEnvelope(xmlContent, invoice);
      const response = await this.sendSoapRequest(soapEnvelope);
      
      return this.parseSoapResponse(response);
      
    } catch (error) {
      return {
        success: false,
        message: `FINA submission failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
        error_code: 'SOAP_ERROR'
      };
    }
  }

  async testConnection(): Promise<EracuniResponse> {
    try {
      if (this.config.environment === 'demo') {
        return {
          success: true,
          message: 'Demo connection successful - FINA test environment ready',
          timestamp: new Date().toISOString()
        };
      }

      // Test with FINA EchoMsg service
      const echoMessage = 'Hotel Porec Connection Test';
      const soapEnvelope = this.createEchoSoapEnvelope(echoMessage);
      const response = await this.sendSoapRequest(soapEnvelope);
      
      if (response.includes(echoMessage)) {
        return {
          success: true,
          message: 'FINA connection test successful',
          timestamp: new Date().toISOString()
        };
      } else {
        return {
          success: false,
          message: 'FINA connection test failed - unexpected response',
          timestamp: new Date().toISOString(),
          error_code: 'CONNECTION_TEST_FAILED'
        };
      }
      
    } catch (error) {
      return {
        success: false,
        message: `FINA connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
        error_code: 'CONNECTION_ERROR'
      };
    }
  }

  private async simulateDemoSubmission(invoice: EracuniInvoice): Promise<EracuniResponse> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    // Simulate random responses for testing
    const isSuccess = Math.random() > 0.1; // 90% success rate in demo
    
    if (isSuccess) {
      return {
        success: true,
        message: 'Invoice successfully submitted to FINA (DEMO)',
        jir: this.generateMockJIR(),
        zki: this.generateMockZKI(),
        response_id: `demo-${Date.now()}`,
        timestamp: new Date().toISOString()
      };
    } else {
      return {
        success: false,
        message: 'Demo submission failed - simulated error for testing',
        error_code: 'DEMO_ERROR',
        timestamp: new Date().toISOString()
      };
    }
  }

  private createSoapEnvelope(xmlContent: string, invoice: EracuniInvoice): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:erac="http://www.fina.hr/eracun">
  <soap:Header>
    <erac:Authentication>
      <erac:Certificate>${this.getCertificateData()}</erac:Certificate>
      <erac:Timestamp>${new Date().toISOString()}</erac:Timestamp>
    </erac:Authentication>
  </soap:Header>
  <soap:Body>
    <erac:SubmitInvoice>
      <erac:InvoiceData>
        <erac:InvoiceNumber>${invoice.invoice_number}</erac:InvoiceNumber>
        <erac:OIB>${this.config.company_oib}</erac:OIB>
        <erac:XMLContent><![CDATA[${xmlContent}]]></erac:XMLContent>
      </erac:InvoiceData>
    </erac:SubmitInvoice>
  </soap:Body>
</soap:Envelope>`;
  }

  private createEchoSoapEnvelope(message: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:erac="http://www.fina.hr/eracun">
  <soap:Header>
    <erac:Authentication>
      <erac:Certificate>${this.getCertificateData()}</erac:Certificate>
      <erac:Timestamp>${new Date().toISOString()}</erac:Timestamp>
    </erac:Authentication>
  </soap:Header>
  <soap:Body>
    <erac:EchoMsg>
      <erac:Message>${message}</erac:Message>
    </erac:EchoMsg>
  </soap:Body>
</soap:Envelope>`;
  }

  private async sendSoapRequest(soapEnvelope: string): Promise<string> {
    const response = await fetch(this.config.fina_endpoint_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': 'SubmitInvoice',
        'Accept': 'text/xml'
      },
      body: soapEnvelope
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.text();
  }

  private parseSoapResponse(responseXml: string): EracuniResponse {
    try {
      // Basic XML parsing for SOAP response
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(responseXml, 'text/xml');
      
      // Check for SOAP fault
      const soapFault = xmlDoc.getElementsByTagName('soap:Fault')[0];
      if (soapFault) {
        const faultString = soapFault.getElementsByTagName('faultstring')[0]?.textContent || 'Unknown SOAP fault';
        return {
          success: false,
          message: `SOAP Fault: ${faultString}`,
          timestamp: new Date().toISOString(),
          error_code: 'SOAP_FAULT'
        };
      }

      // Extract success response data
      const jirElement = xmlDoc.getElementsByTagName('erac:JIR')[0];
      const zkiElement = xmlDoc.getElementsByTagName('erac:ZKI')[0];
      const responseIdElement = xmlDoc.getElementsByTagName('erac:ResponseID')[0];

      if (jirElement && zkiElement) {
        return {
          success: true,
          message: 'Invoice successfully submitted to FINA',
          jir: jirElement.textContent || '',
          zki: zkiElement.textContent || '',
          response_id: responseIdElement?.textContent || '',
          timestamp: new Date().toISOString()
        };
      } else {
        return {
          success: false,
          message: 'Invalid response from FINA - missing required fields',
          timestamp: new Date().toISOString(),
          error_code: 'INVALID_RESPONSE'
        };
      }
      
    } catch (error) {
      return {
        success: false,
        message: `Failed to parse FINA response: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
        error_code: 'PARSE_ERROR'
      };
    }
  }

  private getCertificateData(): string {
    if (this.config.environment === 'demo') {
      return 'DEMO_CERTIFICATE_DATA';
    }
    
    // In production, this would load the actual FINA certificate
    // For now, return placeholder
    return 'PRODUCTION_CERTIFICATE_PLACEHOLDER';
  }

  private generateMockJIR(): string {
    // Generate a mock JIR (32 characters)
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private generateMockZKI(): string {
    // Generate a mock ZKI (32 characters)
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  setCertificate(certificateData: string): void {
    // In production, this would handle certificate installation
    this.certificateLoaded = true;
    console.log('Certificate loaded for FINA communication');
  }

  getConnectionStatus(): { connected: boolean; environment: string; certificateLoaded: boolean } {
    return {
      connected: true, // In demo mode, always connected
      environment: this.config.environment,
      certificateLoaded: this.certificateLoaded
    };
  }
}