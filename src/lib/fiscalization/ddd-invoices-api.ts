/**
 * DDD Invoices API Integration for Croatian Fiscalization 2.0
 *
 * Supports:
 * - B2C: Cash register fiscalization (Step 40)
 * - B2B: Business-to-Business invoices (Step 50+70)
 * - B2G: Business-to-Government invoices (Step 50+70)
 *
 * API Documentation: https://app.dddinvoices.com/documentation
 */

// ============================================================================
// TYPES
// ============================================================================

export type PaymentType = 'Cash' | 'Card' | 'BankTransfer' | 'Other';
export type InvoiceType = 'b2c' | 'b2b' | 'b2g';

export interface DDDInvoiceItem {
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number; // Net price (without VAT)
  vatRate: 5 | 10 | 13 | 25; // Croatian VAT rates
  discount?: number; // Percentage (0-100)
}

export interface DDDCustomer {
  oib?: string; // Required for B2B/B2G
  name: string;
  address?: string;
  city?: string;
  postCode?: string;
  country?: string; // ISO 2-letter code
  email?: string;
}

export interface DDDInvoiceRequest {
  invoiceType: InvoiceType;
  invoiceNumber?: string; // Auto-generated if not provided
  issueDate?: Date;
  customer: DDDCustomer;
  items: DDDInvoiceItem[];
  paymentType: PaymentType;
  currency?: 'EUR' | 'HRK';
  notes?: string;
}

export interface DDDInvoiceResponse {
  success: boolean;
  invoiceId?: string; // DDD internal ID
  jir?: string; // Croatian Tax Authority identifier
  zki?: string; // Security code (for B2C)
  pdfUrl?: string;
  xmlUrl?: string;
  error?: string;
  errorCode?: string;
}

// ============================================================================
// DDD INVOICES API CLIENT
// ============================================================================

export class DDDInvoicesAPI {
  private apiUrl = 'https://api.dddinvoices.com/api/service';
  private apiKey: string;
  private projectName = 'EUeInvoices'; // DDD project name for EU e-invoices
  private sellerOib: string;
  private sellerName: string;
  private sellerAddress: string;
  private sellerCity: string;
  private sellerPostCode: string;

  constructor(config: {
    apiKey: string;
    sellerOib: string;
    sellerName: string;
    sellerAddress: string;
    sellerCity: string;
    sellerPostCode: string;
  }) {
    this.apiKey = config.apiKey;
    this.sellerOib = config.sellerOib;
    this.sellerName = config.sellerName;
    this.sellerAddress = config.sellerAddress;
    this.sellerCity = config.sellerCity;
    this.sellerPostCode = config.sellerPostCode;
  }

  /**
   * Get Steps based on invoice type
   *
   * Steps:
   * 35 = Confirm & lock invoice
   * 40 = Fiscalize (B2C Croatian cash register)
   * 50 = Generate country-specific UBL (B2B/B2G)
   * 70 = Send to Tax Authority Portal
   * 85 = Generate PDF with fiscal data
   */
  private getStepsForType(type: InvoiceType): number[] {
    switch (type) {
      case 'b2c':
        return [35, 40, 85]; // Fiscalize + PDF
      case 'b2b':
      case 'b2g':
        return [35, 50, 70, 85]; // UBL + Send to TAP + PDF
      default:
        throw new Error(`Unknown invoice type: ${type}`);
    }
  }

  /**
   * Map payment type to DDD format
   */
  private mapPaymentType(type: PaymentType): string {
    const mapping: Record<PaymentType, string> = {
      Cash: 'CASH',
      Card: 'CARD',
      BankTransfer: 'NONCASH', // Changed from CREDITTRANSFER
      Other: 'CASH'
    };
    return mapping[type] || 'CASH';
  }

  /**
   * Map VAT rate to DDD VAT code
   * Croatian VAT rates: 5%, 10%, 13%, 25%
   */
  private mapVatCode(vatRate: number): string {
    return vatRate.toString();
  }

  /**
   * Calculate VAT amount from net price
   */
  private calculateVatAmount(netPrice: number, vatRate: number): number {
    return netPrice * (vatRate / 100);
  }

  /**
   * Calculate totals from items
   */
  private calculateTotals(items: DDDInvoiceItem[]): { totalNet: number; totalVat: number; totalGross: number } {
    let totalNet = 0;
    let totalVat = 0;

    items.forEach(item => {
      const itemNet = item.unitPrice * item.quantity;
      const discount = item.discount || 0;
      const netAfterDiscount = itemNet * (1 - discount / 100);
      const vat = netAfterDiscount * (item.vatRate / 100);

      totalNet += netAfterDiscount;
      totalVat += vat;
    });

    return {
      totalNet: parseFloat(totalNet.toFixed(2)),
      totalVat: parseFloat(totalVat.toFixed(2)),
      totalGross: parseFloat((totalNet + totalVat).toFixed(2))
    };
  }

  /**
   * Create invoice via DDD API
   */
  async createInvoice(request: DDDInvoiceRequest): Promise<DDDInvoiceResponse> {
    try {
      // Calculate totals
      const totals = this.calculateTotals(request.items);

      // Prepare invoice object according to DDD schema
      const invoiceObject = {
        BuyerLegalForm: 'LegalEntity',
        BuyerTypeCode: 'Domestic',
        BuyerCountryCode: request.customer.country || 'HR',
        BuyerTaxNum: request.customer.oib || null,
        BuyerName: request.customer.name,
        BuyerPostCode: request.customer.postCode || '',
        BuyerStreet: request.customer.address || '',
        BuyerCity: request.customer.city || '',
        BuyerRegNum: null,
        BuyerId: null,
        BuyerIsBudget: request.invoiceType === 'b2g',
        BuyerBudgetNum: null,
        DocNumber: request.invoiceNumber || null, // Auto-generated if null
        DocIssueDate: request.issueDate?.toISOString() || null,
        DocDueDate: null,
        DocTotalAmount: totals.totalGross,
        DocTotalVatAmount: totals.totalVat,
        DocTotalVatAmountCC: totals.totalVat, // Same as DocTotalVatAmount in single currency
        DocStartDate: request.issueDate?.toISOString() || new Date().toISOString(),
        DocEndDate: request.issueDate?.toISOString() || new Date().toISOString(),
        DocDeliveryDate: request.issueDate?.toISOString() || new Date().toISOString(),
        DocCurrencyCode: request.currency || 'EUR',
        DocExchangeRate: 1.0,
        DocAllowPercent: 0,
        DocSigner: null,
        DocNote: request.notes || null,
        DocBuyerOrderRef: null,
        OriginalInvNumber: null,
        OriginalInvIssueDate: null,
        DocTypeCode: 'INVOICE',
        DocSaleTypeCode: 'Wholesale',
        DocPaymentTypeCode: this.mapPaymentType(request.paymentType),
        OperatorTAPRegistration: null,
        PDFOriginal: null,
        _details: {
          Items: request.items.map(item => ({
            ItemName: item.name,
            ItemQuantity: item.quantity,
            ItemUmcCode: 'piece', // Unit of measure
            ItemNetPrice: item.unitPrice,
            ItemRetailPrice: null,
            ItemAllowancePercent: item.discount || 0,
            ItemVatRate: 0, // Will be calculated by DDD from ItemVatCode
            ItemVatCode: this.mapVatCode(item.vatRate),
            ItemExciseAmount: 0
          })),
          Payments: [
            {
              PayCode: this.mapPaymentType(request.paymentType),
              PayNumber: null,
              PayAmount: 0, // Calculated by DDD
              PayPayeeAccountType: null,
              PayNetworkProvider: null,
              PayCardHolderOrReference: null,
              PayDocDate: null
            }
          ]
        }
      };

      // Get steps for invoice type
      const steps = this.getStepsForType(request.invoiceType);

      // Prepare API request
      const apiRequest = {
        Complexity: 'Minimal',
        Steps: steps,
        ReturnDoc: ['PDFP', 'XMLS'], // Return PDF and XML
        Object: {
          Invoice: invoiceObject
        }
      };

      console.log('📤 Sending invoice to DDD Invoices API...');
      console.log(`📋 Type: ${request.invoiceType.toUpperCase()}`);
      console.log(`📝 Steps: ${steps.join(', ')}`);

      // Make API call
      const response = await fetch(`${this.apiUrl}/EUeInvoices.DDDI_Save`, {
        method: 'POST',
        headers: {
          'Authorization': `IoT ${this.apiKey}:${this.projectName}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(apiRequest)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      // Check for API-level errors
      if (result.Status === 'Error') {
        console.error('❌ DDD API Error:', result);
        return {
          success: false,
          error: result.Reason || 'Unknown API error',
          errorCode: result.Code?.toString()
        };
      }

      // Check for extension-level errors
      if (result.Result?.Status === 'Error') {
        console.error('❌ DDD Extension Error:', result.Result);
        return {
          success: false,
          error: result.Result.Reason || 'Unknown extension error',
          errorCode: result.Result.Step?.toString()
        };
      }

      // Extract response data
      const invoiceId = result.Result?.Result?.Id;
      const returnDoc = result.Result?.ReturnDoc || {};

      console.log('✅ Invoice created successfully!');
      console.log(`📋 Invoice ID: ${invoiceId}`);

      return {
        success: true,
        invoiceId: invoiceId,
        jir: undefined, // DDD doesn't return JIR directly - need to check TAP response
        pdfUrl: returnDoc.PDFP,
        xmlUrl: returnDoc.XMLS
      };

    } catch (error) {
      console.error('💥 DDD Invoices API Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Helper: Create B2C receipt (cash register)
   */
  async createB2CReceipt(
    items: DDDInvoiceItem[],
    paymentType: PaymentType = 'Cash',
    customerName: string = 'Cash Customer'
  ): Promise<DDDInvoiceResponse> {
    return this.createInvoice({
      invoiceType: 'b2c',
      customer: {
        name: customerName
      },
      items,
      paymentType,
      currency: 'EUR'
    });
  }

  /**
   * Helper: Create B2B invoice
   */
  async createB2BInvoice(
    customer: DDDCustomer,
    items: DDDInvoiceItem[],
    paymentType: PaymentType = 'BankTransfer',
    invoiceNumber?: string
  ): Promise<DDDInvoiceResponse> {
    if (!customer.oib) {
      throw new Error('OIB is required for B2B invoices');
    }

    return this.createInvoice({
      invoiceType: 'b2b',
      customer,
      items,
      paymentType,
      invoiceNumber,
      currency: 'EUR'
    });
  }

  /**
   * Helper: Create B2G invoice (government)
   */
  async createB2GInvoice(
    customer: DDDCustomer,
    items: DDDInvoiceItem[],
    paymentType: PaymentType = 'BankTransfer',
    invoiceNumber?: string
  ): Promise<DDDInvoiceResponse> {
    if (!customer.oib) {
      throw new Error('OIB is required for B2G invoices');
    }

    return this.createInvoice({
      invoiceType: 'b2g',
      customer,
      items,
      paymentType,
      invoiceNumber,
      currency: 'EUR'
    });
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let dddAPI: DDDInvoicesAPI | null = null;

export function initializeDDDInvoices(config: {
  apiKey: string;
  sellerOib: string;
  sellerName: string;
  sellerAddress: string;
  sellerCity: string;
  sellerPostCode: string;
}): DDDInvoicesAPI {
  dddAPI = new DDDInvoicesAPI(config);
  return dddAPI;
}

export function getDDDInvoices(): DDDInvoicesAPI {
  if (!dddAPI) {
    throw new Error('DDD Invoices API not initialized. Call initializeDDDInvoices() first.');
  }
  return dddAPI;
}
