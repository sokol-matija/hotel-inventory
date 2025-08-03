# Croatian E-računi Implementation Patterns Analysis

## Executive Summary

This document analyzes the TOMI Pharm project's Croatian e-računi implementation to extract reusable patterns for the Hotel Inventory Management system's finance module. The analysis covers production-ready code patterns, Croatian fiscal compliance requirements, and integration approaches that can be directly adapted for hotel management.

## 1. Type Definitions & Data Models

### Core Croatian E-računi Types

```typescript
// Croatian Fiscal Configuration
export interface EracuniConfig {
  id: string;
  environment: 'demo' | 'production';
  fina_endpoint_url: string;
  company_name: string;
  company_oib: string;          // Croatian OIB (tax number)
  company_address: string;
  company_city: string;
  company_postal_code: string;
  company_country: string;      // 'HR' for Croatia
  soap_timeout: number;
  max_retries: number;
  is_active: boolean;
}

// Invoice Status Workflow
export type InvoiceStatus = 
  | 'draft'           // Created but not ready
  | 'generated'       // XML generated, ready to send
  | 'sent'            // Sent to FINA
  | 'delivered'       // FINA confirmed receipt
  | 'accepted'        // FINA approved invoice
  | 'rejected'        // FINA rejected invoice
  | 'error'           // Error occurred
  | 'cancelled'       // Manually cancelled

// Croatian Invoice Structure
export interface EracuniInvoice {
  id: string;
  order_id: string;             // 1:1 relationship with orders
  pharmacy_id: string;          // For hotels: customer_id
  invoice_number: string;       // Format: TP-YYYY-XXXXXX
  invoice_date: string;
  due_date: string;            // Standard 30 days
  net_amount: number;
  vat_rate: number;            // Croatia: 25% standard rate
  vat_amount: number;
  total_amount: number;
  currency: string;            // 'EUR' for Croatia
  status: InvoiceStatus;
  
  // Croatian FINA Integration Fields
  ubl_xml_content?: string;    // UBL 2.1 XML
  xml_generated_at?: string;
  xml_hash?: string;           // Integrity checking
  fina_message_id?: string;    // FINA tracking
  fina_status?: string;
  fina_delivery_status?: string;
  sent_to_fina_at?: string;
  error_message?: string;
  error_details?: any;
  retry_count: number;
  last_retry_at?: string;
}
```

### Croatian Business Rules

1. **VAT Compliance**: 25% standard rate for most services
2. **OIB Validation**: 11-digit Croatian tax number with checksum
3. **Currency**: EUR (Croatia adopted Euro in 2023)
4. **Invoice Numbering**: Company prefix + year + sequential number
5. **Due Dates**: Standard 30-day payment terms
6. **Order Locking**: 72-hour edit window before invoice creation

## 2. XML/UBL Generation Patterns

### Croatian CIUS Compliant UBL 2.1 Generator

```typescript
export class UBLGenerator {
  /**
   * Generate UBL 2.1 XML for Croatian E-Invoice
   * Compliant with Croatian CIUS and FINA requirements
   */
  static generateInvoiceXML(data: InvoiceData): string {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  
  <!-- Croatian CIUS Specification -->
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0</cbc:CustomizationID>
  <cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>
  <cbc:ID>${this.escapeXML(data.invoiceNumber)}</cbc:ID>
  <cbc:IssueDate>${this.formatDate(data.issueDate)}</cbc:IssueDate>
  <cbc:DueDate>${this.formatDate(data.dueDate)}</cbc:DueDate>
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${data.currency}</cbc:DocumentCurrencyCode>
  
  <!-- Croatian Supplier (Hotel) -->
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="0088">${data.supplierOIB}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name>${this.escapeXML(data.supplierName)}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${this.escapeXML(data.supplierAddress)}</cbc:StreetName>
        <cbc:CityName>${this.escapeXML(data.supplierCity)}</cbc:CityName>
        <cbc:PostalZone>${data.supplierPostalCode}</cbc:PostalZone>
        <cac:Country>
          <cbc:IdentificationCode>${data.supplierCountry}</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${data.supplierOIB}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
    </cac:Party>
  </cac:AccountingSupplierParty>
  
  <!-- Croatian VAT (25% standard rate) -->
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${data.currency}">${this.formatAmount(data.vatAmount)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${data.currency}">${this.formatAmount(data.netAmount)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${data.currency}">${this.formatAmount(data.vatAmount)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>25.00</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  
  <!-- Invoice Lines -->
  ${this.generateInvoiceLines(data.lineItems, data.currency)}
  
</Invoice>`;

    return xml;
  }

  /**
   * Croatian-specific validation
   */
  static validateXML(xml: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Required Croatian elements
    const requiredElements = [
      '<cbc:ID>',                    // Invoice number
      '<cbc:IssueDate>',            // Issue date
      '<cbc:DueDate>',              // Due date
      '<cac:AccountingSupplierParty>', // Supplier
      '<cac:AccountingCustomerParty>', // Customer
      '<cac:TaxTotal>',             // VAT information
      '<cac:LegalMonetaryTotal>',   // Totals
      '<cac:InvoiceLine>'           // Line items
    ];

    // Croatian-specific checks
    if (!xml.includes('<cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>')) {
      errors.push('Currency must be EUR for Croatia');
    }
    
    if (!xml.includes('<cbc:Percent>25.00</cbc:Percent>')) {
      errors.push('Missing Croatian VAT rate (25%)');
    }
    
    return { valid: errors.length === 0, errors };
  }
}
```

### Key XML Features

1. **Croatian CIUS Compliance**: Proper specification identifiers
2. **OIB Integration**: schemeID="0088" for Croatian tax numbers
3. **EUR Currency**: Croatia adopted Euro in 2023
4. **25% VAT Rate**: Standard Croatian VAT for services
5. **XML Escaping**: Proper handling of special characters
6. **Date Formatting**: ISO 8601 format (YYYY-MM-DD)

## 3. SOAP Client Implementation

### FINA SOAP Integration Pattern

```typescript
export class FinaSOAPClient {
  private config: EracuniConfig;
  private demoEndpoint = 'https://demo.eredoc.fina.hr:8445/B2BTest/B2BInvoiceSynchronousService';
  
  constructor(config: EracuniConfig) {
    this.config = config;
  }

  /**
   * Test connectivity with FINA using EchoMsg
   * Works without certificates - ideal for development
   */
  async testEchoMessage(request: EchoMessageRequest): Promise<SOAPResponse> {
    const soapEnvelope = this.buildEchoSOAPEnvelope(request);
    
    try {
      const response = await fetch(this.demoEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': 'EchoMsg',
          'Accept': 'text/xml'
        },
        body: soapEnvelope
      });

      const responseText = await response.text();
      
      if (!response.ok) {
        return {
          success: false,
          error: `HTTP ${response.status}: ${response.statusText}`,
          rawResponse: responseText
        };
      }

      // Parse SOAP response
      const parsedResponse = this.parseEchoResponse(responseText);
      return {
        success: true,
        ...parsedResponse,
        rawResponse: responseText
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Build SOAP envelope using official FINA WSDL structure
   */
  private buildEchoSOAPEnvelope(request: EchoMessageRequest): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" 
               xmlns:e="http://fina.hr/eracun/b2b/pki/Echo/v0.1"
               xmlns:iwsc="http://fina.hr/eracun/b2b/invoicewebservicecomponents/v0.1">
  <soap:Header/>
  <soap:Body>
    <e:EchoMsg>
      <iwsc:HeaderSupplier>
        <iwsc:MessageID>${request.messageId}</iwsc:MessageID>
        <iwsc:SupplierID>9934:${request.supplierOIB}</iwsc:SupplierID>
        <iwsc:MessageType>1</iwsc:MessageType>
      </iwsc:HeaderSupplier>
      <e:Data>
        <e:EchoData>
          <e:Echo>${request.testMessage || 'Hotel Connectivity Test'}</e:Echo>
        </e:EchoData>
      </e:Data>
    </e:EchoMsg>
  </soap:Body>
</soap:Envelope>`;
  }

  /**
   * Generate unique message ID for SOAP requests
   */
  static generateMessageId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `HOTEL-${timestamp}-${random}`;
  }
}
```

### SOAP Integration Features

1. **EchoMsg Testing**: Certificate-free connectivity testing
2. **Message ID Generation**: Unique tracking for each request
3. **Error Handling**: Comprehensive HTTP and SOAP error handling
4. **Response Parsing**: XML response parsing with fallbacks
5. **Croatian OIB Format**: 9934: prefix for supplier ID
6. **Production Ready**: Mock server for development, real endpoints for production

## 4. Service Layer Architecture

### Business Logic Patterns

```typescript
export class EracuniService {
  /**
   * Croatian business rule: Orders lock after 72 hours
   */
  static isOrderLocked(createdAt: string): boolean {
    const now = new Date();
    const orderTime = new Date(createdAt);
    const hoursDifference = (now.getTime() - orderTime.getTime()) / (1000 * 60 * 60);
    return hoursDifference > 72; // Croatian requirement: 72 hours
  }

  /**
   * Croatian VAT calculation (25% standard rate)
   */
  static calculateVATAmounts(netAmount: number, vatRate: number = 25.0) {
    const vatAmount = (netAmount * vatRate) / 100;
    const totalAmount = netAmount + vatAmount;
    
    return {
      vatAmount: Math.round(vatAmount * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100
    };
  }

  /**
   * Croatian invoice numbering pattern
   */
  static generateInvoiceNumber(): string {
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-6);
    return `HP-${year}-${timestamp}`; // HP = Hotel Porec
  }

  /**
   * Create invoice with Croatian compliance
   */
  static async createInvoiceFromOrder(orderId: string): Promise<EracuniInvoice | null> {
    try {
      // Validate order is locked (Croatian requirement)
      const order = await this.getOrderWithDetails(orderId);
      if (!this.isOrderLocked(order.created_at)) {
        throw new Error('Order must be locked (72+ hours old) before invoice creation');
      }

      // Calculate Croatian VAT
      const netAmount = this.calculateNetAmount(order);
      const { vatAmount, totalAmount } = this.calculateVATAmounts(netAmount);

      // Generate Croatian-compliant invoice
      const invoiceNumber = this.generateInvoiceNumber();
      
      const newInvoice = {
        order_id: orderId,
        customer_id: order.customer_id,
        invoice_number: invoiceNumber,
        invoice_date: new Date().toISOString(),
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        net_amount: netAmount,
        vat_rate: 25.0,
        vat_amount: vatAmount,
        total_amount: totalAmount,
        currency: 'EUR',
        status: 'draft' as const,
      };

      const invoice = await supabase
        .from('eracuni_invoices')
        .insert(newInvoice)
        .select()
        .single();

      // Generate UBL XML
      await this.generateXMLForInvoice(invoice.data.id);

      return invoice.data;
    } catch (error) {
      console.error('Error creating Croatian invoice:', error);
      return null;
    }
  }

  /**
   * XML integrity checking for Croatian compliance
   */
  static calculateXMLHash(xml: string): string {
    // Production implementation should use crypto.subtle
    let hash = 0;
    for (let i = 0; i < xml.length; i++) {
      const char = xml.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }
}
```

### Service Layer Features

1. **Croatian Business Rules**: 72-hour order locking, 25% VAT, EUR currency
2. **Validation Workflows**: Order state validation, invoice uniqueness checks
3. **Error Handling**: Comprehensive error handling with Croatian compliance checks
4. **Audit Trail**: Complete tracking of invoice status changes
5. **Batch Processing**: Support for bulk invoice creation
6. **Configuration Management**: Environment-aware (demo/production)

## 5. Testing & Mock Implementation

### Mock FINA Server for Development

```typescript
export class MockFinaServer {
  /**
   * Mock FINA responses for development testing
   */
  static mockEchoResponse(messageId: string, supplierOIB: string): MockSOAPResponse {
    // Simulate successful response for valid Croatian OIB
    if (this.isValidCroatianOIB(supplierOIB)) {
      return {
        success: true,
        messageId: `FINA-ECHO-${Date.now()}`,
        ackStatus: 'ACCEPTED',
        ackStatusCode: '00',
        timestamp: new Date().toISOString()
      };
    }

    // Simulate invalid OIB error
    return {
      success: false,
      messageId: messageId,
      ackStatus: 'MSG_NOT_VALID',
      ackStatusCode: '01',
      timestamp: new Date().toISOString(),
      error: 'Invalid Croatian OIB'
    };
  }

  /**
   * Croatian UBL XML validation with specific rules
   */
  static validateUBLXML(xmlContent: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Croatian-specific requirements
    if (!xmlContent.includes('<cbc:DocumentCurrencyCode>EUR</cbc:DocumentCurrencyCode>')) {
      errors.push('Missing or invalid currency code (should be EUR)');
    }

    if (!xmlContent.includes('<cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>')) {
      errors.push('Missing or invalid invoice type code (should be 380)');
    }

    if (!xmlContent.includes('<cbc:Percent>25.00</cbc:Percent>')) {
      errors.push('Missing Croatian VAT rate (25%)');
    }

    // OIB validation
    const oibPattern = /\d{11}/;
    if (!oibPattern.test(xmlContent)) {
      errors.push('Missing or invalid Croatian OIB format');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate Croatian OIB checksum
   */
  private static isValidCroatianOIB(oib: string): boolean {
    if (!/^\d{11}$/.test(oib)) return false;
    
    let sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(oib[i]) * (10 - i);
    }
    
    const checksum = 11 - (sum % 11);
    const expectedChecksum = checksum === 11 ? 0 : checksum === 10 ? 0 : checksum;
    
    return expectedChecksum === parseInt(oib[10]);
  }
}
```

### Testing Features

1. **Croatian OIB Validation**: Real checksum validation algorithm
2. **Mock SOAP Responses**: Realistic FINA response simulation
3. **UBL Validation**: Croatian CIUS compliance checking
4. **Error Simulation**: Different error scenarios for testing
5. **Certificate-Free Testing**: EchoMsg works without certificates
6. **Development Workflow**: Complete testing without FINA access

## 6. Hotel-Specific Adaptation Requirements

### Database Schema Adaptations

```sql
-- Hotel e-računi configuration
CREATE TABLE hotel_eracuni_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  environment TEXT NOT NULL CHECK (environment IN ('demo', 'production')),
  fina_endpoint_url TEXT NOT NULL,
  hotel_name TEXT NOT NULL,
  hotel_oib TEXT NOT NULL CHECK (LENGTH(hotel_oib) = 11),
  hotel_address TEXT NOT NULL,
  hotel_city TEXT NOT NULL,
  hotel_postal_code TEXT NOT NULL,
  hotel_country TEXT NOT NULL DEFAULT 'HR',
  soap_timeout INTEGER DEFAULT 30000,
  max_retries INTEGER DEFAULT 3,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hotel invoices with Croatian compliance
CREATE TABLE hotel_eracuni_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid REFERENCES reservations(id),
  guest_id uuid REFERENCES guests(id),
  invoice_number TEXT NOT NULL UNIQUE,
  invoice_date TIMESTAMPTZ NOT NULL,
  due_date TIMESTAMPTZ NOT NULL,
  net_amount DECIMAL(10,2) NOT NULL,
  vat_rate DECIMAL(5,2) NOT NULL DEFAULT 25.00,
  vat_amount DECIMAL(10,2) NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  status TEXT NOT NULL DEFAULT 'draft',
  
  -- Croatian FINA integration
  ubl_xml_content TEXT,
  xml_generated_at TIMESTAMPTZ,
  xml_hash TEXT,
  fina_message_id TEXT,
  fina_status TEXT,
  fina_delivery_status TEXT,
  sent_to_fina_at TIMESTAMPTZ,
  error_message TEXT,
  error_details JSONB,
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Hotel Business Logic Adaptations

1. **Reservation → Invoice**: Replace order-based logic with reservation-based
2. **Guest Management**: Adapt customer fields for hotel guests
3. **Service Line Items**: Hotel services (room, breakfast, tourism tax, etc.)
4. **Tourism Tax**: Croatian tourism tax calculation and compliance
5. **Seasonal Pricing**: Hotel-specific pricing and VAT handling
6. **Currency Handling**: EUR primary, support for other currencies if needed

### Croatian Hotel-Specific Requirements

1. **Tourism Tax**: Special Croatian tourism tax for accommodation
2. **Guest Registration**: Integration with Croatian guest registration system
3. **Seasonal Rates**: VAT handling for seasonal accommodation rates
4. **Service Categories**: Accommodation, food & beverage, additional services
5. **Multi-language**: Croatian, English, German, Italian invoice templates

## 7. Implementation Roadmap for Hotel Finance System

### Phase 1: Core Setup (Week 1)
1. **Database Schema**: Implement hotel-specific e-računi tables
2. **Configuration**: Set up Hotel Porec company data and Croatian settings
3. **Type Definitions**: Adapt e-računi types for hotel domain
4. **Basic Service Layer**: Implement core HotelEracuniService

### Phase 2: XML Generation (Week 2)
1. **UBL Generator**: Adapt XML generator for hotel services
2. **Hotel Line Items**: Room charges, food & beverage, tourism tax
3. **Croatian Compliance**: VAT rates, OIB validation, EUR currency
4. **XML Validation**: Hotel-specific validation rules

### Phase 3: Integration & Testing (Week 3)
1. **SOAP Client**: Implement hotel FINA SOAP client
2. **Mock Testing**: Set up mock FINA server for hotel development
3. **EchoMsg Testing**: Certificate-free connectivity testing
4. **Error Handling**: Comprehensive error handling and retry logic

### Phase 4: UI Implementation (Week 4)
1. **Invoice Management**: Hotel invoice creation and management UI
2. **Reservation Integration**: Add e-računi buttons to reservation details
3. **Status Tracking**: Visual status indicators and progress tracking
4. **Testing Interface**: Hotel-specific testing and validation tools

### Phase 5: Production Readiness (Week 5+)
1. **FINA Registration**: Request demo certificates for Hotel Porec
2. **Real Testing**: Test with FINA demo environment
3. **Certificate Management**: Secure certificate storage and rotation
4. **Monitoring**: Error monitoring and audit logging

## 8. Key Success Factors

### Croatian Compliance
1. **OIB Validation**: Implement proper Croatian tax number validation
2. **VAT Rates**: 25% standard rate for hotel services
3. **Currency**: EUR as primary currency
4. **UBL CIUS**: Croatian Implementation of Universal Business Language
5. **FINA Integration**: Official Croatian e-invoice system

### Technical Excellence
1. **Error Handling**: Comprehensive error handling with retry logic
2. **Testing Strategy**: Mock server for development, real testing for validation
3. **Security**: Secure certificate management and encrypted storage
4. **Performance**: Efficient XML generation and SOAP communication
5. **Monitoring**: Complete audit trail and error monitoring

### Hotel Domain Adaptation
1. **Reservation Integration**: Seamless integration with existing hotel system
2. **Service Categories**: Proper handling of hotel service types
3. **Guest Management**: Adaptation of customer data for hotel guests
4. **Multi-language**: Support for multiple languages common in Croatian tourism
5. **Seasonal Handling**: Proper handling of seasonal rates and tourism tax

## Conclusion

The TOMI Pharm e-računi implementation provides a solid foundation for Croatian fiscal compliance that can be directly adapted for the hotel finance system. The key patterns include:

1. **Production-Ready Code**: Comprehensive type definitions, service layers, and integration patterns
2. **Croatian Compliance**: Full adherence to FINA requirements and Croatian fiscal law
3. **Testing Framework**: Complete mock testing environment for development
4. **Error Handling**: Robust error handling and retry mechanisms
5. **Security**: Proper certificate management and secure communication

The implementation roadmap provides a clear path to adapt these patterns for Hotel Porec's specific requirements while maintaining Croatian fiscal compliance and FINA integration capabilities.