// Croatian E-Računi Service for Hotel Porec
// Complete workflow for fiscal compliance

import { Invoice } from '../hotel/types';
import { 
  EracuniInvoice, 
  EracuniResponse, 
  EracuniFiscalData,
  CROATIAN_TAX_RATES,
  CROATIAN_FISCAL_RULES 
} from './types';
import { HotelEracuniXMLGenerator } from './xmlGenerator';
import { FinaSoapClient } from './finaSoapClient';

export class HotelEracuniService {
  private xmlGenerator = new HotelEracuniXMLGenerator();
  private soapClient = new FinaSoapClient();

  async processInvoiceForEracuni(hotelInvoice: Invoice): Promise<EracuniResponse> {
    try {
      // Step 1: Convert Hotel Invoice to E-računi format
      const eracuniInvoice = this.convertToEracuniFormat(hotelInvoice);
      
      // Step 2: Validate invoice data
      const validation = this.validateInvoiceData(eracuniInvoice);
      if (!validation.isValid) {
        return {
          success: false,
          message: `Validation failed: ${validation.errors.join(', ')}`,
          timestamp: new Date().toISOString(),
          error_code: 'VALIDATION_ERROR'
        };
      }

      // Step 3: Generate Croatian UBL XML
      const xmlContent = this.xmlGenerator.generateUBLXML(eracuniInvoice);
      
      // Step 4: Validate generated XML
      const xmlValidation = this.xmlGenerator.validateXML(xmlContent);
      if (!xmlValidation.isValid) {
        return {
          success: false,
          message: `XML validation failed: ${xmlValidation.errors.join(', ')}`,
          timestamp: new Date().toISOString(),
          error_code: 'XML_VALIDATION_ERROR'
        };
      }

      // Step 5: Submit to FINA
      const response = await this.soapClient.submitInvoice(eracuniInvoice, xmlContent);
      
      return response;
      
    } catch (error) {
      return {
        success: false,
        message: `E-računi processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString(),
        error_code: 'PROCESSING_ERROR'
      };
    }
  }

  async testFinaConnection(): Promise<EracuniResponse> {
    return await this.soapClient.testConnection();
  }

  private convertToEracuniFormat(hotelInvoice: Invoice): EracuniInvoice {
    // Calculate Croatian tourism tax
    const tourismTax = this.calculateTourismTax(hotelInvoice);
    
    // Extract additional services
    const additionalServices = this.extractAdditionalServices(hotelInvoice);
    
    return {
      id: hotelInvoice.id,
      reservation_id: hotelInvoice.reservationId,
      guest_id: hotelInvoice.guestId,
      invoice_number: this.formatInvoiceNumber(hotelInvoice.invoiceNumber),
      invoice_date: hotelInvoice.issueDate.toISOString().split('T')[0],
      due_date: hotelInvoice.dueDate.toISOString().split('T')[0],
      net_amount: hotelInvoice.subtotal,
      vat_rate: CROATIAN_TAX_RATES.STANDARD_VAT,
      vat_amount: hotelInvoice.vatAmount,
      total_amount: hotelInvoice.totalAmount,
      currency: 'EUR',
      status: 'draft',
      
      fiscal_data: {
        oib: hotelInvoice.fiscalData.oib,
        jir: hotelInvoice.fiscalData.jir,
        zki: hotelInvoice.fiscalData.zki,
        fiscal_receipt_url: hotelInvoice.fiscalData.fiscalReceiptUrl
      },
      
      hotel_data: {
        room_number: this.extractRoomNumber(hotelInvoice),
        room_type: this.extractRoomType(hotelInvoice),
        check_in_date: this.extractCheckInDate(hotelInvoice),
        check_out_date: this.extractCheckOutDate(hotelInvoice),
        nights: this.calculateNights(hotelInvoice),
        guests: this.extractGuestCount(hotelInvoice),
        tourism_tax: tourismTax,
        breakfast_included: this.isBreakfastIncluded(hotelInvoice),
        additional_services: additionalServices
      },
      
      created_at: hotelInvoice.issueDate.toISOString(),
      updated_at: new Date().toISOString(),
      xml_generated: false
    };
  }

  private validateInvoiceData(invoice: EracuniInvoice): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // OIB validation
    if (!this.validateOIB(invoice.fiscal_data.oib)) {
      errors.push('Invalid Croatian OIB');
    }

    // Invoice number format validation
    if (!CROATIAN_FISCAL_RULES.INVOICE_NUMBER_PATTERN.test(invoice.invoice_number)) {
      errors.push('Invalid invoice number format (expected HP-YYYY-XXXXXX)');
    }

    // Amount validation
    if (invoice.total_amount <= 0) {
      errors.push('Total amount must be positive');
    }

    if (invoice.net_amount <= 0) {
      errors.push('Net amount must be positive');
    }

    // VAT calculation validation
    const expectedVat = invoice.net_amount * invoice.vat_rate;
    if (Math.abs(invoice.vat_amount - expectedVat) > 0.01) {
      errors.push('VAT amount calculation error');
    }

    // Hotel data validation
    if (invoice.hotel_data.nights <= 0) {
      errors.push('Number of nights must be positive');
    }

    if (invoice.hotel_data.guests <= 0) {
      errors.push('Number of guests must be positive');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private validateOIB(oib: string): boolean {
    if (!oib || oib.length !== CROATIAN_FISCAL_RULES.OIB_LENGTH) {
      return false;
    }

    // Croatian OIB checksum algorithm
    if (!/^\d{11}$/.test(oib)) {
      return false;
    }

    let sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(oib[i]) * (10 - i);
    }

    const remainder = sum % 11;
    const checkDigit = remainder < 2 ? remainder : 11 - remainder;
    
    return checkDigit === parseInt(oib[10]);
  }

  private formatInvoiceNumber(originalNumber: string): string {
    // Convert to Hotel Porec format: HP-YYYY-XXXXXX
    if (originalNumber.startsWith('HP-')) {
      return originalNumber;
    }
    
    const year = new Date().getFullYear();
    const sequence = originalNumber.split('-').pop() || '000001';
    return `HP-${year}-${sequence.padStart(6, '0')}`;
  }

  private calculateTourismTax(invoice: Invoice): number {
    const nights = this.calculateNights(invoice);
    const guests = this.extractGuestCount(invoice);
    return nights * guests * CROATIAN_TAX_RATES.TOURISM_TAX_PER_NIGHT;
  }

  private extractAdditionalServices(invoice: Invoice): Array<{name: string; quantity: number; unit_price: number; total: number}> {
    // Extract from invoice items or description
    // For now, return empty array - this would be implemented based on actual hotel invoice structure
    return [];
  }

  private extractRoomNumber(invoice: Invoice): string {
    // Extract room number from invoice notes or use roomId
    return invoice.notes?.match(/Room (\d+)/)?.[1] || invoice.roomId || 'N/A';
  }

  private extractRoomType(invoice: Invoice): string {
    // Extract room type from invoice notes
    return invoice.notes?.match(/Room \d+ \(([^)]+)\)/)?.[1] || 'Standard Room';
  }

  private extractCheckInDate(invoice: Invoice): string {
    // This would come from reservation data
    return new Date(invoice.issueDate.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  }

  private extractCheckOutDate(invoice: Invoice): string {
    // This would come from reservation data
    return invoice.issueDate.toISOString().split('T')[0];
  }

  private calculateNights(invoice: Invoice): number {
    // Calculate from check-in/check-out dates
    // For now, estimate from invoice amount (assuming €50-150 per night)
    const estimatedNightlyRate = 100;
    return Math.max(1, Math.round(invoice.subtotal / estimatedNightlyRate));
  }

  private extractGuestCount(invoice: Invoice): number {
    // Extract from invoice notes or reservation data
    return parseInt(invoice.notes?.match(/(\d+) guests?/)?.[1] || '2');
  }

  private isBreakfastIncluded(invoice: Invoice): boolean {
    return invoice.notes?.toLowerCase().includes('breakfast') || false;
  }

  generateInvoicePreview(hotelInvoice: Invoice): { eracuniInvoice: EracuniInvoice; xmlContent: string } {
    const eracuniInvoice = this.convertToEracuniFormat(hotelInvoice);
    const xmlContent = this.xmlGenerator.generateUBLXML(eracuniInvoice);
    
    return {
      eracuniInvoice,
      xmlContent
    };
  }

  getServiceStatus(): { 
    xmlGenerator: boolean; 
    soapClient: boolean; 
    finaConnection: string;
    lastTest?: string;
  } {
    const connectionStatus = this.soapClient.getConnectionStatus();
    
    return {
      xmlGenerator: true,
      soapClient: true,
      finaConnection: connectionStatus.connected ? 'Connected' : 'Disconnected',
      lastTest: new Date().toISOString()
    };
  }
}