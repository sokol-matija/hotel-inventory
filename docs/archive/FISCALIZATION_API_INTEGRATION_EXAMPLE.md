# Fiscalization 2.0 API Integration Example

## How Your Hotel App Will Integrate with a Provider

This document shows **exactly** what your code will look like when integrated with a good Fiscalization 2.0 provider (using DDD Invoices as an example).

---

## Architecture Overview

```
┌─────────────────────┐
│   Hotel Next.js App │
│   (Your Frontend)   │
└──────────┬──────────┘
           │
           │ HTTP Request
           ▼
┌─────────────────────┐
│  Supabase Function  │
│   (Your Backend)    │
└──────────┬──────────┘
           │
           │ REST API Call
           ▼
┌─────────────────────┐
│  Fiscalization      │
│  Provider API       │
│  (DDD/Melasoft/etc) │
└──────────┬──────────┘
           │
           │ UBL XML + AS4
           ▼
┌─────────────────────┐
│  Croatian Tax       │
│  Authority (CIS)    │
└─────────────────────┘
```

---

## 1. Environment Variables

**File**: `.env.local`

```bash
# Fiscalization Provider (DDD Invoices example)
FISCAL_PROVIDER_API_URL=https://dddinvoices.com/api/service/
FISCAL_PROVIDER_API_KEY=your_api_key_here
FISCAL_PROVIDER_ENV=sandbox  # or 'production'

# Your Business Details
HOTEL_OIB=87246357068
HOTEL_NAME=Hotel Porec
HOTEL_ADDRESS=Rade Koncara 1
HOTEL_CITY=Porec
HOTEL_ZIP=52440
HOTEL_COUNTRY=HR

# Supabase (existing)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

---

## 2. Fiscalization Service (TypeScript)

**File**: `src/lib/fiscalization/provider-api.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

// Types
export interface FiscalInvoice {
  invoiceNumber: string;
  issueDate: Date;
  buyer: {
    oib?: string;
    name: string;
    address?: string;
    city?: string;
    zip?: string;
    country?: string;
    email?: string;
  };
  items: Array<{
    name: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    vatRate: number; // 5, 13, or 25 for Croatia
    discount?: number;
  }>;
  currency: 'EUR' | 'HRK';
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'other';
  notes?: string;
}

export interface FiscalResponse {
  success: boolean;
  invoiceId: string;
  jir?: string; // Unique Invoice Identifier from Tax Authority
  qrCodeUrl?: string;
  pdfUrl?: string;
  xmlUrl?: string;
  error?: string;
}

// Fiscalization Provider API Client
export class FiscalizationAPI {
  private apiUrl: string;
  private apiKey: string;
  private environment: 'sandbox' | 'production';

  constructor() {
    this.apiUrl = process.env.FISCAL_PROVIDER_API_URL!;
    this.apiKey = process.env.FISCAL_PROVIDER_API_KEY!;
    this.environment = (process.env.FISCAL_PROVIDER_ENV as any) || 'sandbox';
  }

  /**
   * Send B2B Invoice (Fiscalization 2.0)
   * For corporate clients, travel agencies, etc.
   */
  async sendB2BInvoice(invoice: FiscalInvoice): Promise<FiscalResponse> {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'X-Environment': this.environment
        },
        body: JSON.stringify({
          type: 'b2b_invoice',
          country: 'HR',
          seller: {
            vat: process.env.HOTEL_OIB,
            name: process.env.HOTEL_NAME,
            address: process.env.HOTEL_ADDRESS,
            city: process.env.HOTEL_CITY,
            zip: process.env.HOTEL_ZIP,
            country: 'HR'
          },
          buyer: {
            vat: invoice.buyer.oib,
            name: invoice.buyer.name,
            address: invoice.buyer.address,
            city: invoice.buyer.city,
            zip: invoice.buyer.zip,
            country: invoice.buyer.country || 'HR',
            email: invoice.buyer.email
          },
          invoice: {
            number: invoice.invoiceNumber,
            issueDate: invoice.issueDate.toISOString(),
            currency: invoice.currency,
            paymentMethod: invoice.paymentMethod,
            items: invoice.items.map(item => ({
              name: item.name,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              vatRate: item.vatRate,
              discount: item.discount || 0
            })),
            notes: invoice.notes
          }
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Fiscalization failed');
      }

      const data = await response.json();

      return {
        success: true,
        invoiceId: data.invoiceId,
        jir: data.jir,
        qrCodeUrl: data.qrCodeUrl,
        pdfUrl: data.pdfUrl,
        xmlUrl: data.xmlUrl
      };

    } catch (error) {
      console.error('B2B Invoice fiscalization error:', error);
      return {
        success: false,
        invoiceId: invoice.invoiceNumber,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send B2C Receipt (Already implemented via our SOAP integration)
   * This is kept for reference - use the existing implementation
   */
  async sendB2CReceipt(receiptData: any): Promise<FiscalResponse> {
    // Use your existing implementation (scripts/test-fina-cert.js logic)
    // OR switch to provider API if they offer B2C as well
    console.log('Use existing B2C fiscalization (already working!)');
    return {
      success: true,
      invoiceId: receiptData.invoiceNumber,
      jir: 'Use existing implementation'
    };
  }
}

// Singleton instance
export const fiscalAPI = new FiscalizationAPI();
```

---

## 3. Supabase Edge Function

**File**: `supabase/functions/fiscalize-invoice/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    // 1. Get invoice data from request
    const { reservationId, invoiceType } = await req.json();

    // 2. Get invoice details from database
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: reservation, error } = await supabase
      .from('reservations')
      .select(`
        *,
        guest:guests(*),
        room:rooms(*),
        items:reservation_items(*)
      `)
      .eq('id', reservationId)
      .single();

    if (error) throw error;

    // 3. Call fiscalization provider
    const fiscalResponse = await fetch(
      Deno.env.get('FISCAL_PROVIDER_API_URL')!,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('FISCAL_PROVIDER_API_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: invoiceType, // 'b2b_invoice' or 'b2c_receipt'
          country: 'HR',
          seller: {
            vat: Deno.env.get('HOTEL_OIB'),
            name: Deno.env.get('HOTEL_NAME'),
            address: Deno.env.get('HOTEL_ADDRESS'),
            city: Deno.env.get('HOTEL_CITY'),
            zip: Deno.env.get('HOTEL_ZIP')
          },
          buyer: {
            name: reservation.guest.first_name + ' ' + reservation.guest.last_name,
            email: reservation.guest.email,
            // ... include OIB if B2B
          },
          invoice: {
            number: `INV-${reservation.id}`,
            issueDate: new Date().toISOString(),
            currency: 'EUR',
            items: reservation.items.map((item: any) => ({
              name: item.description,
              quantity: item.quantity,
              unitPrice: item.unit_price,
              vatRate: item.vat_rate
            }))
          }
        })
      }
    );

    if (!fiscalResponse.ok) {
      throw new Error('Fiscalization failed');
    }

    const fiscalData = await fiscalResponse.json();

    // 4. Save fiscalization data to database
    await supabase
      .from('invoices')
      .update({
        jir: fiscalData.jir,
        fiscalized_at: new Date().toISOString(),
        fiscal_pdf_url: fiscalData.pdfUrl,
        fiscal_xml_url: fiscalData.xmlUrl
      })
      .eq('reservation_id', reservationId);

    // 5. Return success
    return new Response(
      JSON.stringify({
        success: true,
        jir: fiscalData.jir,
        pdfUrl: fiscalData.pdfUrl
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
```

---

## 4. React Component Integration

**File**: `src/components/hotel/finance/InvoiceGenerator.tsx`

```typescript
'use client';

import { useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface InvoiceGeneratorProps {
  reservationId: string;
  invoiceType: 'b2b' | 'b2c';
}

export function InvoiceGenerator({ reservationId, invoiceType }: InvoiceGeneratorProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const supabase = createClientComponentClient();

  const handleFiscalize = async () => {
    setLoading(true);
    try {
      // Call Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('fiscalize-invoice', {
        body: {
          reservationId,
          invoiceType: invoiceType === 'b2b' ? 'b2b_invoice' : 'b2c_receipt'
        }
      });

      if (error) throw error;

      setResult(data);

      // Show success toast
      alert(`Invoice fiscalized! JIR: ${data.jir}`);

    } catch (error) {
      console.error('Fiscalization error:', error);
      alert('Failed to fiscalize invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button
        onClick={handleFiscalize}
        disabled={loading}
        className="w-full"
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {invoiceType === 'b2b' ? 'Fiscalize B2B Invoice' : 'Fiscalize Receipt'}
      </Button>

      {result && (
        <div className="p-4 bg-green-50 border border-green-200 rounded">
          <p className="font-semibold">✅ Fiscalized Successfully</p>
          <p className="text-sm">JIR: {result.jir}</p>
          {result.pdfUrl && (
            <a
              href={result.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-sm"
            >
              Download PDF Invoice →
            </a>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## 5. Database Schema Updates

**File**: `supabase/migrations/20251002_add_fiscalization_fields.sql`

```sql
-- Add fiscalization fields to invoices table
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS jir TEXT,
ADD COLUMN IF NOT EXISTS zki TEXT,
ADD COLUMN IF NOT EXISTS fiscalized_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS fiscal_provider TEXT DEFAULT 'ddd_invoices',
ADD COLUMN IF NOT EXISTS fiscal_pdf_url TEXT,
ADD COLUMN IF NOT EXISTS fiscal_xml_url TEXT,
ADD COLUMN IF NOT EXISTS fiscal_qr_code_url TEXT,
ADD COLUMN IF NOT EXISTS fiscal_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS fiscal_error TEXT;

-- Create index for JIR lookups
CREATE INDEX IF NOT EXISTS idx_invoices_jir ON invoices(jir);

-- Add fiscalization log table
CREATE TABLE IF NOT EXISTS fiscalization_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES invoices(id),
  provider TEXT NOT NULL,
  request_data JSONB,
  response_data JSONB,
  status TEXT NOT NULL, -- 'success', 'error', 'pending'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for log queries
CREATE INDEX IF NOT EXISTS idx_fiscalization_log_invoice_id
  ON fiscalization_log(invoice_id);
CREATE INDEX IF NOT EXISTS idx_fiscalization_log_created_at
  ON fiscalization_log(created_at DESC);
```

---

## 6. Testing in Sandbox

```typescript
// Test script: scripts/test-fiscal-provider.ts
import { fiscalAPI } from '../src/lib/fiscalization/provider-api';

async function testB2BInvoice() {
  console.log('🧪 Testing B2B Invoice Fiscalization...\n');

  const testInvoice = {
    invoiceNumber: 'TEST-001',
    issueDate: new Date(),
    buyer: {
      oib: '12345678901', // Test OIB
      name: 'Test Travel Agency',
      address: 'Test Street 123',
      city: 'Zagreb',
      zip: '10000',
      country: 'HR',
      email: 'test@agency.com'
    },
    items: [
      {
        name: 'Hotel Accommodation - 3 nights',
        description: 'Double room with sea view',
        quantity: 3,
        unitPrice: 150.00,
        vatRate: 13.0
      },
      {
        name: 'Breakfast',
        description: 'Continental breakfast',
        quantity: 6,
        unitPrice: 15.00,
        vatRate: 13.0
      }
    ],
    currency: 'EUR' as const,
    paymentMethod: 'bank_transfer' as const,
    notes: 'Test invoice for sandbox environment'
  };

  const result = await fiscalAPI.sendB2BInvoice(testInvoice);

  if (result.success) {
    console.log('✅ SUCCESS!');
    console.log(`JIR: ${result.jir}`);
    console.log(`PDF: ${result.pdfUrl}`);
    console.log(`XML: ${result.xmlUrl}`);
  } else {
    console.log('❌ FAILED');
    console.log(`Error: ${result.error}`);
  }
}

testB2BInvoice();
```

---

## Summary

With a good provider like **DDD Invoices**, **Melasoft**, or **RTC Suite**, your integration is:

1. ✅ **Simple**: Just JSON HTTP requests
2. ✅ **Fast**: 1-3 days to integrate
3. ✅ **Clean**: Provider handles all UBL XML, AS4, signatures
4. ✅ **Testable**: Sandbox environment available now
5. ✅ **Maintainable**: Provider updates for law changes

**Next Steps:**
1. Contact providers for demos
2. Test their sandbox API
3. Choose based on evaluation checklist
4. Implement using this code structure

---

Last Updated: October 2, 2025
