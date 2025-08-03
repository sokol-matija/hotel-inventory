// Croatian E-Računi Types for Hotel Porec Finance System
// Based on TOMI Pharm implementation patterns

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

export type InvoiceStatus = 
  | 'draft'           // Created but not ready
  | 'generated'       // XML generated, ready to send
  | 'sent'            // Sent to FINA
  | 'delivered'       // FINA confirmed receipt
  | 'accepted'        // FINA approved invoice
  | 'rejected'        // FINA rejected invoice
  | 'error'           // Error occurred
  | 'cancelled'       // Manually cancelled

export interface EracuniInvoice {
  id: string;
  reservation_id: string;       // Hotel reservation ID
  guest_id: string;            // Guest customer ID
  invoice_number: string;       // Format: HP-YYYY-XXXXXX (Hotel Porec)
  invoice_date: string;
  due_date: string;            // Standard 30 days
  net_amount: number;
  vat_rate: number;            // Croatia: 25% standard rate
  vat_amount: number;
  total_amount: number;
  currency: string;            // EUR (Croatia adopted Euro in 2023)
  status: InvoiceStatus;
  
  // Croatian Fiscal Compliance
  fiscal_data: {
    oib: string;               // Hotel's OIB
    jir?: string;              // Jedinstveni identifikator računa (JIR)
    zki?: string;              // Zaštitni kod izdavatelja (ZKI)
    fiscal_receipt_url?: string;
    submission_timestamp?: string;
    fina_response_id?: string;
  };
  
  // Hotel-specific data
  hotel_data: {
    room_number: string;
    room_type: string;
    check_in_date: string;
    check_out_date: string;
    nights: number;
    guests: number;
    tourism_tax: number;       // Croatian tourism tax
    breakfast_included: boolean;
    additional_services: Array<{
      name: string;
      quantity: number;
      unit_price: number;
      total: number;
    }>;
  };
  
  created_at: string;
  updated_at: string;
  xml_generated?: boolean;
  xml_content?: string;
  last_error?: string;
}

export interface EracuniResponse {
  success: boolean;
  message: string;
  jir?: string;
  zki?: string;
  response_id?: string;
  error_code?: string;
  timestamp: string;
}

export interface EracuniFiscalData {
  oib: string;
  jir: string;
  zki: string;
  invoice_id: string;
  fiscal_receipt_url: string;
  submission_timestamp: string;
  fina_response: any;
}

// Hotel Porec specific configuration
export const HOTEL_POREC_CONFIG: EracuniConfig = {
  id: 'hotel-porec-config',
  environment: 'demo',
  fina_endpoint_url: 'https://demo.erar.hr/PlatformaRacun/EračunService', // Demo endpoint
  company_name: 'Hotel Porec d.o.o.',
  company_oib: '87246357068',
  company_address: 'Rade Končara 1',
  company_city: 'Poreč',
  company_postal_code: '52440',
  company_country: 'HR',
  soap_timeout: 30000,
  max_retries: 3,
  is_active: true
};

// Croatian Tax Rates
export const CROATIAN_TAX_RATES = {
  STANDARD_VAT: 0.25,          // 25% standard VAT rate
  REDUCED_VAT: 0.13,           // 13% reduced VAT rate (some services)
  ZERO_VAT: 0.00,              // 0% for exports
  TOURISM_TAX_PER_NIGHT: 1.35  // €1.35 per person per night (2025 rate)
};

// Croatian Fiscal Validation Rules
export const CROATIAN_FISCAL_RULES = {
  OIB_LENGTH: 11,
  INVOICE_NUMBER_PATTERN: /^HP-\d{4}-\d{6}$/,
  JIR_LENGTH: 32,
  ZKI_LENGTH: 32
};