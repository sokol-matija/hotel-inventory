// Croatian Fiscalization Types
// Based on Croatian Tax Authority specifications and DOS system analysis

export interface FiscalEnvironment {
  mode: 'TEST' | 'PRODUCTION';
  url: string;
  oib: string;
  certificatePath?: string;
}

export interface FiscalConfiguration {
  hotelOib: string;
  businessSpaceCode: string; // POSL1
  cashRegisterCode: string;  // 2
  operatorOib?: string;
  address: {
    street: string;
    houseNumber: string;
    postalCode: string;
    city: string;
    municipality: string;
  };
  workingHours: string; // 0-24
  certificate: {
    file: string;
    password: string;
    passwordBackup?: string;
    path?: string;
  };
}

export interface FiscalRequest {
  oib: string;
  dateTime: string;
  businessSpaceCode: string;
  cashRegisterCode: string;
  invoiceNumber: string;
  invoiceSequenceNumber: string;
  totalAmount: number;
  vatAmount: number;
  operatorOib?: string;
  securityCode: string; // ZKI
}

export interface FiscalResponse {
  success: boolean;
  jir?: string; // Jedinstveni identifikator računa
  error?: string;
  fiscalReceiptUrl?: string;
  qrCodeData?: string; // QR code data string
  timestamp: Date;
  rawResponse?: any; // Store raw server response like Ruby library
}

export interface ZKIData {
  oib: string;
  dateTime: string;
  invoiceNumber: string;
  businessSpaceCode: string;
  cashRegisterCode: string;
  totalAmount: number;
}

export interface FiscalInvoiceData {
  invoiceNumber: string;
  dateTime: Date;
  totalAmount: number;
  vatAmount: number;
  items: FiscalInvoiceItem[];
  paymentMethod: 'CASH' | 'CARD' | 'TRANSFER' | 'OTHER';
  isStorno?: boolean;
  originalJir?: string; // JIR of the original invoice being cancelled
  stornoReason?: string; // Reason for cancellation
}

export interface StornoRequest {
  originalJir: string; // JIR of the invoice to cancel
  stornoInvoiceNumber: string; // New invoice number for the storno
  dateTime: Date;
  reason: string;
  stornoType: 'FULL' | 'PARTIAL';
  partialAmount?: number; // For partial cancellations
}

export interface PaymentMethodChangeRequest {
  originalJir: string; // JIR of the original invoice
  newPaymentMethod: 'CASH' | 'CARD' | 'TRANSFER' | 'OTHER';
  changeReason: string;
  changeDateTime: Date;
}

export interface OfficeSpaceFiscalization {
  businessSpaceCode: string;
  workingHours: string;
  address: {
    street: string;
    houseNumber: string;
    postalCode: string;
    city: string;
    municipality: string;
  };
  specialNotes?: string;
}

export interface FiscalInvoiceItem {
  name: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  totalAmount: number;
}

export interface FiscalStatus {
  isFiscalized: boolean;
  jir?: string;
  zki?: string;
  fiscalDateTime?: Date;
  fiscalReceiptUrl?: string;
  error?: string;
}

// Croatian Fiscal XML Schema types
export interface RacunZahtjev {
  Oib: string;
  USustavuPDV: boolean;
  DatVrijeme: string;
  OznakaSlijednosti: string;
  BrRac: {
    BrOznRac: string;
    OznPosPr: string;
    OznNapUr: string;
  };
  Racun: {
    TvrtkaNaziv?: string;
    Adresa?: {
      Ulica: string;
      KucniBroj: string;
      Posta: string;
      Naselje: string;
    };
    IznosUkupno: string;
    NacinPlac: string;
    OibOper?: string;
    ZastKod: string;
    NakDan?: boolean;
    // Storno-specific fields
    StornoRacun?: string; // JIR of original invoice being cancelled
    StornoRazlog?: string; // Reason for cancellation
  };
}

// Croatian Tax Authority SOAP Response
export interface FiskalizacijaOdgovor {
  Jir?: string;
  Greska?: {
    SifraGreske: string;
    PorukaGreske: string;
  };
}