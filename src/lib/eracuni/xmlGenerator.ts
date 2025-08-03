// Croatian UBL 2.1 XML Generator for Hotel Porec E-Računi
// Based on Croatian CIUS (Core Invoice Usage Specification)

import { EracuniInvoice, HOTEL_POREC_CONFIG, CROATIAN_TAX_RATES } from './types';

export class HotelEracuniXMLGenerator {
  private config = HOTEL_POREC_CONFIG;

  generateUBLXML(invoice: EracuniInvoice): string {
    const xmlHeader = `<?xml version="1.0" encoding="UTF-8"?>`;
    
    const xmlContent = `
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
         xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  
  <!-- Croatian UBL 2.1 Invoice for Hotel Industry -->
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#conformant#urn:fdc:peppol.eu:2017:poacc:billing:international:aunz:3.0</cbc:CustomizationID>
  <cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>
  
  <!-- Invoice Identification -->
  <cbc:ID>${invoice.invoice_number}</cbc:ID>
  <cbc:IssueDate>${this.formatDateForXML(invoice.invoice_date)}</cbc:IssueDate>
  <cbc:DueDate>${this.formatDateForXML(invoice.due_date)}</cbc:DueDate>
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:Note>Hotel accommodation and services invoice - Hotel Porec</cbc:Note>
  <cbc:DocumentCurrencyCode>${invoice.currency}</cbc:DocumentCurrencyCode>
  
  <!-- Hotel Porec Supplier Information -->
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="HR:OIB">${this.config.company_oib}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name>${this.config.company_name}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${this.config.company_address}</cbc:StreetName>
        <cbc:CityName>${this.config.company_city}</cbc:CityName>
        <cbc:PostalZone>${this.config.company_postal_code}</cbc:PostalZone>
        <cac:Country>
          <cbc:IdentificationCode>${this.config.company_country}</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${this.config.company_oib}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${this.config.company_name}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
      <cac:Contact>
        <cbc:Telephone>+385(0)52/451 611</cbc:Telephone>
        <cbc:ElectronicMail>hotelporec@pu.t-com.hr</cbc:ElectronicMail>
      </cac:Contact>
    </cac:Party>
  </cac:AccountingSupplierParty>
  
  <!-- Guest Customer Information -->
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>Hotel Guest - Reservation ${invoice.reservation_id}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>Guest Address</cbc:StreetName>
        <cbc:CityName>Guest City</cbc:CityName>
        <cbc:PostalZone>00000</cbc:PostalZone>
        <cac:Country>
          <cbc:IdentificationCode>XX</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
    </cac:Party>
  </cac:AccountingCustomerParty>

  <!-- Payment Terms -->
  <cac:PaymentTerms>
    <cbc:Note>Payment due within 30 days of invoice date</cbc:Note>
  </cac:PaymentTerms>

  <!-- Tax Total -->
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${invoice.currency}">${invoice.vat_amount.toFixed(2)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${invoice.currency}">${invoice.net_amount.toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${invoice.currency}">${invoice.vat_amount.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>${(invoice.vat_rate * 100).toFixed(1)}</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>

  <!-- Monetary Total -->
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${invoice.currency}">${this.calculateLineExtension(invoice).toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${invoice.currency}">${invoice.net_amount.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${invoice.currency}">${invoice.total_amount.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${invoice.currency}">${invoice.total_amount.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>

  <!-- Invoice Lines -->
  ${this.generateInvoiceLines(invoice)}

</Invoice>`;

    return xmlHeader + xmlContent;
  }

  private generateInvoiceLines(invoice: EracuniInvoice): string {
    let lines = '';
    let lineId = 1;

    // Main accommodation line
    const accommodationTotal = invoice.hotel_data.nights * this.calculateNightlyRate(invoice);
    lines += this.generateInvoiceLine(
      lineId++,
      `Hotel accommodation - Room ${invoice.hotel_data.room_number} (${invoice.hotel_data.room_type})`,
      invoice.hotel_data.nights,
      'nights',
      this.calculateNightlyRate(invoice),
      accommodationTotal,
      invoice.currency,
      invoice.vat_rate
    );

    // Tourism tax line
    if (invoice.hotel_data.tourism_tax > 0) {
      lines += this.generateInvoiceLine(
        lineId++,
        'Croatian Tourism Tax',
        invoice.hotel_data.guests * invoice.hotel_data.nights,
        'person-nights',
        CROATIAN_TAX_RATES.TOURISM_TAX_PER_NIGHT,
        invoice.hotel_data.tourism_tax,
        invoice.currency,
        0 // Tourism tax is not subject to VAT
      );
    }

    // Additional services
    invoice.hotel_data.additional_services.forEach(service => {
      lines += this.generateInvoiceLine(
        lineId++,
        service.name,
        service.quantity,
        'units',
        service.unit_price,
        service.total,
        invoice.currency,
        invoice.vat_rate
      );
    });

    return lines;
  }

  private generateInvoiceLine(
    id: number,
    description: string,
    quantity: number,
    unit: string,
    unitPrice: number,
    lineTotal: number,
    currency: string,
    vatRate: number
  ): string {
    const vatAmount = lineTotal * vatRate;
    const netAmount = lineTotal - vatAmount;

    return `
  <cac:InvoiceLine>
    <cbc:ID>${id}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="${unit}">${quantity}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${currency}">${netAmount.toFixed(2)}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Description>${description}</cbc:Description>
      <cbc:Name>${description}</cbc:Name>
      <cac:ClassifiedTaxCategory>
        <cbc:ID>${vatRate > 0 ? 'S' : 'Z'}</cbc:ID>
        <cbc:Percent>${(vatRate * 100).toFixed(1)}</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="${currency}">${unitPrice.toFixed(2)}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>`;
  }

  private calculateNightlyRate(invoice: EracuniInvoice): number {
    // Calculate base nightly rate excluding tourism tax and additional services
    const additionalServicesTotal = invoice.hotel_data.additional_services.reduce(
      (sum, service) => sum + service.total, 0
    );
    
    const accommodationTotal = invoice.total_amount - invoice.hotel_data.tourism_tax - additionalServicesTotal;
    return accommodationTotal / invoice.hotel_data.nights;
  }

  private calculateLineExtension(invoice: EracuniInvoice): number {
    // Sum of all line extensions (net amounts)
    return invoice.net_amount;
  }

  private formatDateForXML(dateString: string): string {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  }

  validateXML(xmlContent: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Basic XML structure validation
    if (!xmlContent.includes('<?xml version="1.0"')) {
      errors.push('Missing XML declaration');
    }
    
    if (!xmlContent.includes('xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"')) {
      errors.push('Missing UBL 2.1 namespace declaration');
    }
    
    // Croatian specific validations
    if (!xmlContent.includes('HR:OIB')) {
      errors.push('Missing Croatian OIB identification');
    }
    
    if (!xmlContent.includes('Hotel Porec')) {
      errors.push('Missing Hotel Porec identification');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}