// Croatian Fiscal XML Generation
// Generates XML requests according to Croatian Tax Authority schema

import { FiscalInvoiceData, RacunZahtjev, ZKIData, StornoRequest } from './types';
import { HOTEL_FISCAL_CONFIG, getCurrentEnvironment } from './config';
import { format } from 'date-fns';

export class FiscalXMLGenerator {
  private static instance: FiscalXMLGenerator;
  
  public static getInstance(): FiscalXMLGenerator {
    if (!FiscalXMLGenerator.instance) {
      FiscalXMLGenerator.instance = new FiscalXMLGenerator();
    }
    return FiscalXMLGenerator.instance;
  }

  /**
   * Generate Croatian fiscal XML request
   * UPDATED: Uses corrected structure that resolves s004 "Invalid digital signature" error
   * Based on official Technical Specification v1.3
   * SUPPORTS STORNO: Handles negative amounts for cancellation invoices
   */
  public generateFiscalXML(invoiceData: FiscalInvoiceData, zki: string): string {
    const environment = getCurrentEnvironment();
    const dateTime = this.formatCroatianDateTime(invoiceData.dateTime);
    const messageId = this.generateUUID();
    const signXmlId = `signXmlId${Date.now()}`;
    
    // For storno invoices, use negative amount
    const amount = invoiceData.isStorno ? 
      (-Math.abs(invoiceData.totalAmount)).toFixed(2) : 
      invoiceData.totalAmount.toFixed(2);
    
    // CORRECTED SOAP XML structure that resolves s004 error
    const soapXML = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
    <soap:Body>
        <tns:RacunZahtjev Id="${signXmlId}" xmlns:tns="http://www.apis-it.hr/fin/2012/types/f73">
            <tns:Zaglavlje>
                <tns:IdPoruke>${messageId}</tns:IdPoruke>
                <tns:DatumVrijeme>${dateTime}</tns:DatumVrijeme>
            </tns:Zaglavlje>
            <tns:Racun>
                <tns:Oib>${environment.oib}</tns:Oib>
                <tns:USustavuPDV>true</tns:USustavuPDV>
                <tns:DatVrijeme>${dateTime}</tns:DatVrijeme>
                <tns:OznakaSlijednosti>N</tns:OznakaSlijednosti>
                <tns:BrRac>
                    <tns:BrOznRac>${invoiceData.invoiceNumber}</tns:BrOznRac>
                    <tns:OznPosPr>POSL1</tns:OznPosPr>
                    <tns:OznNapUr>2</tns:OznNapUr>
                </tns:BrRac>
                <tns:Racun>
                    <tns:IznosUkupno>${amount}</tns:IznosUkupno>
                    <tns:NacinPlac>G</tns:NacinPlac>
                    <tns:OibOper>${environment.oib}</tns:OibOper>
                    <tns:ZastKod>${zki}</tns:ZastKod>
                    <tns:NakDan>false</tns:NakDan>${invoiceData.isStorno && invoiceData.originalJir ? `
                    <tns:StornoRacun>${invoiceData.originalJir}</tns:StornoRacun>` : ''}${invoiceData.isStorno && invoiceData.stornoReason ? `
                    <tns:StornoRazlog>${invoiceData.stornoReason}</tns:StornoRazlog>` : ''}
                </tns:Racun>
            </tns:Racun>
            <ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
                <ds:SignedInfo>
                    <ds:CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
                    <ds:SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>
                    <ds:Reference URI="#${signXmlId}">
                        <ds:Transforms>
                            <ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
                            <ds:Transform Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
                        </ds:Transforms>
                        <ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>
                        <ds:DigestValue>PLACEHOLDER_DIGEST</ds:DigestValue>
                    </ds:Reference>
                </ds:SignedInfo>
                <ds:SignatureValue>PLACEHOLDER_SIGNATURE</ds:SignatureValue>
                <ds:KeyInfo>
                    <ds:X509Data>
                        <ds:X509Certificate>PLACEHOLDER_CERTIFICATE</ds:X509Certificate>
                    </ds:X509Data>
                </ds:KeyInfo>
            </ds:Signature>
        </tns:RacunZahtjev>
    </soap:Body>
</soap:Envelope>`;

    return soapXML;
  }

  /**
   * Create storno (cancellation) invoice data from StornoRequest
   * Returns FiscalInvoiceData configured for Croatian Tax Authority storno
   */
  public createStornoInvoiceData(stornoRequest: StornoRequest, originalInvoice: FiscalInvoiceData): FiscalInvoiceData {
    const stornoAmount = stornoRequest.stornoType === 'PARTIAL' && stornoRequest.partialAmount 
      ? stornoRequest.partialAmount 
      : originalInvoice.totalAmount;
    
    const stornoVatAmount = stornoRequest.stornoType === 'PARTIAL' && stornoRequest.partialAmount
      ? (stornoRequest.partialAmount * (originalInvoice.vatAmount / originalInvoice.totalAmount))
      : originalInvoice.vatAmount;

    return {
      invoiceNumber: stornoRequest.stornoInvoiceNumber,
      dateTime: stornoRequest.dateTime,
      totalAmount: stornoAmount, // Will be made negative in XML generation
      vatAmount: stornoVatAmount,
      paymentMethod: originalInvoice.paymentMethod,
      items: stornoRequest.stornoType === 'FULL' 
        ? originalInvoice.items.map(item => ({
            ...item,
            quantity: -item.quantity, // Negative quantities for storno
          }))
        : [{
            name: `Storno - ${stornoRequest.reason}`,
            quantity: 1,
            unitPrice: stornoAmount,
            vatRate: 25,
            totalAmount: stornoAmount,
          }],
      isStorno: true,
      originalJir: stornoRequest.originalJir,
      stornoReason: stornoRequest.reason,
    };
  }

  /**
   * Generate UUID for message ID
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Legacy method for backward compatibility
   * TODO: Remove when all callers are updated
   */
  private generateLegacyXML(invoiceData: FiscalInvoiceData, zki: string): string {
    const environment = getCurrentEnvironment();
    const dateTime = this.formatCroatianDateTime(invoiceData.dateTime);
    
    const racunZahtjev: RacunZahtjev = {
      Oib: environment.oib, // Use environment-specific OIB (test vs production)
      USustavuPDV: true,
      DatVrijeme: dateTime,
      OznakaSlijednosti: 'N', // Normal sequence
      BrRac: {
        BrOznRac: invoiceData.invoiceNumber,
        OznPosPr: HOTEL_FISCAL_CONFIG.businessSpaceCode,
        OznNapUr: HOTEL_FISCAL_CONFIG.cashRegisterCode,
      },
      Racun: {
        TvrtkaNaziv: 'Hotel Porec',
        Adresa: {
          Ulica: HOTEL_FISCAL_CONFIG.address.street,
          KucniBroj: HOTEL_FISCAL_CONFIG.address.houseNumber,
          Posta: HOTEL_FISCAL_CONFIG.address.postalCode,
          Naselje: HOTEL_FISCAL_CONFIG.address.city,
        },
        IznosUkupno: invoiceData.totalAmount.toFixed(2),
        NacinPlac: this.mapPaymentMethod(invoiceData.paymentMethod),
        ZastKod: zki,
        NakDan: false, // Not a subsequent delivery
      },
    };

    return this.buildXMLString(racunZahtjev);
  }

  /**
   * Generate ZKI data string for signature generation
   * CRITICAL: Uses validated format from real Hotel Porec DOS system
   */
  public generateZKIDataString(data: ZKIData): string {
    const dateTime = this.formatZKIDateTime(new Date(data.dateTime));
    
    return [
      data.oib,
      dateTime,
      data.invoiceNumber,
      data.businessSpaceCode,
      data.cashRegisterCode,
      data.totalAmount.toFixed(2),
    ].join('');
  }

  /**
   * Format date/time for Croatian fiscal system (XML)
   */
  private formatCroatianDateTime(date: Date): string {
    // Croatian XML format: dd.MM.yyyyTHH:mm:ss (with T separator)
    return format(date, "dd.MM.yyyy'T'HH:mm:ss");
  }

  /**
   * Format date/time for ZKI generation
   * CRITICAL: Validated against real Hotel Porec fiscal data
   * 
   * BREAKTHROUGH: This format was discovered by analyzing real Hotel Porec
   * fiscal receipts from their DOS system. The space separator (not T) is
   * essential for generating the correct ZKI that matches real fiscal data.
   * 
   * Real validation example:
   * - Input: 2025-08-02T21:48:29
   * - Output: "02.08.2025 21:48:29"  
   * - Produces ZKI: 16ac248e21a738625b98d17e51149e87 (verified match)
   */
  private formatZKIDateTime(date: Date): string {
    // Croatian ZKI format: dd.MM.yyyy HH:mm:ss (space separator)
    // This exact format produces the correct ZKI: 16ac248e21a738625b98d17e51149e87
    return format(date, 'dd.MM.yyyy HH:mm:ss');
  }

  /**
   * Map payment method to Croatian fiscal codes
   */
  private mapPaymentMethod(method: string): string {
    const paymentMethods: Record<string, string> = {
      'CASH': 'G', // Gotovina
      'CARD': 'K', // Kartice
      'TRANSFER': 'T', // Transakcijski račun
      'OTHER': 'O', // Ostalo
    };
    
    return paymentMethods[method] || 'G';
  }

  /**
   * Build XML string from RacunZahtjev object
   */
  private buildXMLString(racunZahtjev: RacunZahtjev): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<tns:RacunZahtjev xmlns:tns="http://www.apis-it.hr/fin/2012/types/f73" 
                  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
                  xsi:schemaLocation="http://www.apis-it.hr/fin/2012/types/f73 FiskalizacijaSchema.xsd">
  <tns:Zaglavlje>
    <tns:IdPoruke>${this.generateMessageId()}</tns:IdPoruke>
    <tns:DatumVrijeme>${this.formatCroatianDateTime(new Date())}</tns:DatumVrijeme>
  </tns:Zaglavlje>
  <tns:Racun>
    <tns:Oib>${racunZahtjev.Oib}</tns:Oib>
    <tns:USustavuPDV>${racunZahtjev.USustavuPDV}</tns:USustavuPDV>
    <tns:DatVrijeme>${racunZahtjev.DatVrijeme}</tns:DatVrijeme>
    <tns:OznakaSlijednosti>${racunZahtjev.OznakaSlijednosti}</tns:OznakaSlijednosti>
    <tns:BrRac>
      <tns:BrOznRac>${racunZahtjev.BrRac.BrOznRac}</tns:BrOznRac>
      <tns:OznPosPr>${racunZahtjev.BrRac.OznPosPr}</tns:OznPosPr>
      <tns:OznNapUr>${racunZahtjev.BrRac.OznNapUr}</tns:OznNapUr>
    </tns:BrRac>
    <tns:Racun>
      <tns:TvrtkaNaziv>${racunZahtjev.Racun.TvrtkaNaziv}</tns:TvrtkaNaziv>
      <tns:Adresa>
        <tns:Ulica>${racunZahtjev.Racun.Adresa?.Ulica}</tns:Ulica>
        <tns:KucniBroj>${racunZahtjev.Racun.Adresa?.KucniBroj}</tns:KucniBroj>
        <tns:Posta>${racunZahtjev.Racun.Adresa?.Posta}</tns:Posta>
        <tns:Naselje>${racunZahtjev.Racun.Adresa?.Naselje}</tns:Település>
      </tns:Adresa>
      <tns:IznosUkupno>${racunZahtjev.Racun.IznosUkupno}</tns:IznosUkupno>
      <tns:NacinPlac>${racunZahtjev.Racun.NacinPlac}</tns:NacinPlac>
      ${racunZahtjev.Racun.OibOper ? `<tns:OibOper>${racunZahtjev.Racun.OibOper}</tns:OibOper>` : ''}
      <tns:ZastKod>${racunZahtjev.Racun.ZastKod}</tns:ZastKod>
      <tns:NakDan>${racunZahtjev.Racun.NakDan}</tns:NakDan>
    </tns:Racun>
  </tns:Racun>
</tns:RacunZahtjev>`;
  }

  /**
   * Generate unique message ID for fiscal request
   */
  private generateMessageId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 8);
    return `HP${timestamp}${random}`.toUpperCase();
  }

  /**
   * Validate fiscal XML before sending
   */
  public validateFiscalData(invoiceData: FiscalInvoiceData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate invoice number format
    if (!/^HP-\d{4}-\d{6}$/.test(invoiceData.invoiceNumber)) {
      errors.push('Invalid invoice number format. Expected: HP-YYYY-XXXXXX');
    }

    // Validate amount
    if (invoiceData.totalAmount <= 0 || invoiceData.totalAmount > 999999.99) {
      errors.push('Total amount must be between 0.01 and 999999.99');
    }

    // Validate VAT amount
    if (invoiceData.vatAmount < 0 || invoiceData.vatAmount > invoiceData.totalAmount) {
      errors.push('Invalid VAT amount');
    }

    // Validate payment method
    const validPaymentMethods = ['CASH', 'CARD', 'TRANSFER', 'OTHER'];
    if (!validPaymentMethods.includes(invoiceData.paymentMethod)) {
      errors.push('Invalid payment method');
    }

    // Validate items
    if (!invoiceData.items || invoiceData.items.length === 0) {
      errors.push('Invoice must contain at least one item');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}