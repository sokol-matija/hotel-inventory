# Croatian B2C Fiscalization - Continuation Plan

## 📋 Executive Summary

The Croatian fiscalization integration is **95% complete**. The system successfully communicates with the Croatian Tax Authority TEST endpoint, generates invoices, and saves fiscal data (JIR, ZKI, QR codes) to the database. The remaining task is to display the fiscalized invoices in the Finance UI.

---

## ✅ What's Already Working

### 1. **Supabase Edge Function - Fiscalization** ✅
- **Location**: `supabase/functions/fiscalize-invoice/index.ts`
- **Status**: Fully functional
- **Details**:
  - SSL certificate chain configured for Croatian Tax Authority TEST endpoint
  - Connects to: `https://cistest.apis-it.hr:8449/FiskalizacijaServiceTest`
  - Handles SOAP requests with XML digital signatures
  - Returns JIR (Unique Invoice Identifier), ZKI (Security Code), and QR code data

### 2. **Frontend Fiscalization Service** ✅
- **Location**: `src/lib/fiscalization/FiscalizationService.ts`
- **Status**: Fully functional
- **Details**:
  - Extracts numeric invoice numbers (HP-2025-747258 → 747258)
  - Calls Edge Function with proper payload
  - Returns fiscal response with JIR, ZKI, QR code

### 3. **Database Integration** ✅
- **Location**: `src/lib/hotel/services/ReservationService.ts`
- **Status**: Fully functional
- **Details**:
  - Method: `saveFiscalDataToDatabase()` (lines 422-476)
  - Saves to both `invoices` and `fiscal_records` tables
  - Includes all required fields: JIR, ZKI, QR code, guest_id
  - Successfully tested and confirmed working

### 4. **Invoice Generation Flow** ✅
- **Complete flow**:
  1. User clicks "Fiscalize Invoice" in UI
  2. `ReservationService.fiscalizeInvoice()` is called
  3. Fiscal data sent to Edge Function
  4. Croatian Tax Authority responds with JIR/ZKI
  5. Data saved to database
  6. PDF generated with fiscal data

---

## 🔧 Database Schema Reference

### Tables Used:
```sql
-- invoices table
CREATE TABLE invoices (
  id SERIAL PRIMARY KEY,
  invoice_number TEXT NOT NULL,
  reservation_id INTEGER,
  guest_id INTEGER,  -- Required by billing_target constraint
  company_id INTEGER,
  issue_date DATE NOT NULL,
  subtotal NUMERIC(10,2),
  vat_amount NUMERIC(10,2),
  total_amount NUMERIC(10,2),
  status TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- fiscal_records table
CREATE TABLE fiscal_records (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER REFERENCES invoices(id),
  jir TEXT NOT NULL,  -- Jedinstveni Identifikator Računa
  zki TEXT NOT NULL,  -- Zaštitni Kod Izdavatelja
  qr_code_data TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Sample Data (Latest Invoice):
```
Invoice ID: 5
Invoice Number: HP-2025-722071
JIR: 4a669de1-8c45-4934-9004-4586a025320b
ZKI: 88132f1b4cd4a9b388dfbe180438e73c
Total Amount: 625.00
Status: sent
```

---

## 🎯 CURRENT TASK: Display Invoices in Finance UI

### Problem Statement
The Finance UI at `http://localhost:3000/hotel/finance` exists but needs to display the fiscalized invoices from the database with their JIR, ZKI, and QR code data.

### File to Modify
**Location**: `src/components/hotel/finance/InvoicePaymentPage.tsx`

### Current State Analysis

**What's Working**:
- UI component exists and renders
- Uses `useHotel()` hook to get invoices data
- Has invoice table with columns: Invoice #, Guest, Room, Amount, Status, Date, Actions
- Has invoice details dialog modal

**What's Missing**:
1. Fiscal data (JIR, ZKI, QR code) not displayed in table or details
2. Need to verify if `useHotel()` hook loads fiscal_records from database
3. QR code rendering capability

### Context Manager Hook
**Location**: `src/contexts/HotelContext.tsx` or `src/lib/hotel/state/SupabaseHotelContext.tsx`

**Investigation Needed**:
1. Check if `useHotel()` queries the `fiscal_records` table
2. Verify if Invoice type includes fiscal data fields
3. May need to add JOIN query: `invoices LEFT JOIN fiscal_records ON fiscal_records.invoice_id = invoices.id`

---

## 📝 Implementation Plan for Finance UI

### Step 1: Verify Data Loading
```typescript
// Check SupabaseHotelContext.tsx
// Ensure query includes fiscal_records:

const { data: invoices, error } = await supabase
  .from('invoices')
  .select(`
    *,
    fiscal_records (
      jir,
      zki,
      qr_code_data,
      created_at
    ),
    guests (
      id,
      first_name,
      last_name
    ),
    reservations (
      id,
      room_id
    )
  `)
  .order('created_at', { ascending: false });
```

### Step 2: Update Invoice Type
```typescript
// src/lib/hotel/types.ts
export interface Invoice {
  id: string;
  invoiceNumber: string;
  guestId: string;
  reservationId: string;
  issueDate: Date;
  dueDate: Date;
  subtotal: number;
  vatAmount: number;
  tourismTax: number;
  totalAmount: number;
  status: string;
  // ADD THESE:
  fiscalRecords?: {
    jir: string;
    zki: string;
    qrCodeData: string;
    createdAt: string;
  };
}
```

### Step 3: Add Fiscal Columns to Table
```tsx
// In InvoicePaymentPage.tsx table (around line 286-296)

<thead>
  <tr className="border-b border-gray-200">
    <th className="text-left py-3 px-4 font-medium text-gray-600">Invoice #</th>
    <th className="text-left py-3 px-4 font-medium text-gray-600">Guest</th>
    <th className="text-left py-3 px-4 font-medium text-gray-600">Room</th>
    <th className="text-left py-3 px-4 font-medium text-gray-600">Amount</th>
    <th className="text-left py-3 px-4 font-medium text-gray-600">JIR</th> {/* NEW */}
    <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
    <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
    <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
  </tr>
</thead>
<tbody>
  {filteredInvoices.map((invoice) => (
    <tr key={invoice.id} className="border-b border-gray-100 hover:bg-gray-50">
      <td className="py-3 px-4 font-mono text-sm">{invoice.invoiceNumber}</td>
      <td className="py-3 px-4">{getGuestName(invoice.guestId)}</td>
      <td className="py-3 px-4">{getRoomNumber(invoice.id)}</td>
      <td className="py-3 px-4 font-medium">€{invoice.totalAmount.toFixed(2)}</td>
      {/* NEW FISCAL DATA COLUMN */}
      <td className="py-3 px-4 font-mono text-xs">
        {invoice.fiscalRecords?.jir ? (
          <span className="text-green-600" title={invoice.fiscalRecords.jir}>
            {invoice.fiscalRecords.jir.slice(0, 8)}...
          </span>
        ) : (
          <span className="text-gray-400">Not fiscalized</span>
        )}
      </td>
      <td className="py-3 px-4">
        <Badge className={`text-xs ${statusColors[invoice.status as keyof typeof statusColors]}`}>
          {invoice.status.toUpperCase()}
        </Badge>
      </td>
      {/* ... rest of columns */}
    </tr>
  ))}
</tbody>
```

### Step 4: Add Fiscal Details to Invoice Dialog
```tsx
// In Invoice Details Dialog (around line 419-469)

{selectedInvoice && (
  <div className="space-y-4">
    {/* Existing fields... */}

    {/* ADD FISCAL SECTION */}
    {selectedInvoice.fiscalRecords && (
      <div className="border-t pt-4">
        <h4 className="font-medium mb-3 flex items-center">
          <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
          Fiscal Information
        </h4>
        <div className="space-y-3 bg-green-50 p-4 rounded-lg">
          <div>
            <label className="text-sm font-medium text-gray-600">JIR (Unique Invoice Identifier)</label>
            <p className="font-mono text-sm break-all">{selectedInvoice.fiscalRecords.jir}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">ZKI (Security Code)</label>
            <p className="font-mono text-sm break-all">{selectedInvoice.fiscalRecords.zki}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Fiscalization Date</label>
            <p className="text-sm">{format(new Date(selectedInvoice.fiscalRecords.createdAt), 'PPpp')}</p>
          </div>
          {selectedInvoice.fiscalRecords.qrCodeData && (
            <div>
              <label className="text-sm font-medium text-gray-600">QR Code</label>
              <div className="mt-2 p-2 bg-white rounded border inline-block">
                <QRCodeSVG value={selectedInvoice.fiscalRecords.qrCodeData} size={128} />
              </div>
            </div>
          )}
        </div>
      </div>
    )}

    {/* Existing financial breakdown... */}
  </div>
)}
```

### Step 5: Add QR Code Library
```bash
npm install qrcode.react
# or
pnpm add qrcode.react
```

```tsx
// Import at top of InvoicePaymentPage.tsx
import { QRCodeSVG } from 'qrcode.react';
```

---

## 🔍 Testing Checklist

### 1. Verify Data Flow
- [ ] Check if `useHotel()` loads invoices with fiscal_records
- [ ] Console log invoices to verify structure
- [ ] Confirm fiscal data is present for invoice ID 5

### 2. UI Display
- [ ] Navigate to http://localhost:3000/hotel/finance
- [ ] Verify invoices appear in table
- [ ] Check JIR column shows abbreviated JIR with tooltip
- [ ] Click "View" on fiscalized invoice
- [ ] Verify fiscal section appears in dialog
- [ ] Confirm QR code renders correctly

### 3. Edge Cases
- [ ] Non-fiscalized invoices show "Not fiscalized"
- [ ] Fiscal section hidden for non-fiscalized invoices
- [ ] QR code renders with valid data

---

## 🐛 Known Issues & Fixes

### Issue 1: SSL Certificate Error (FIXED ✅)
- **Error**: `UnknownIssuer`
- **Fix**: Added full certificate chain to Edge Function

### Issue 2: Wrong OIB (FIXED ✅)
- **Error**: `s001: Unknown error`
- **Fix**: Changed TEST OIB to '87246357068'

### Issue 3: Invoice Number Format (FIXED ✅)
- **Error**: Croatian Tax Authority rejected "HP-2025-XXXXXX"
- **Fix**: Extract numeric part with regex: `/(\d+)$/`

### Issue 4: Database Constraint (FIXED ✅)
- **Error**: `billing_target` constraint violation
- **Fix**: Added `guest_id` to invoice insert

### Issue 5: Type Mismatch (FIXED ✅)
- **Error**: `string` not assignable to `number`
- **Fix**: Type conversion for guest.id

---

## 📚 Important File References

### Core Files
1. **Edge Function**: `supabase/functions/fiscalize-invoice/index.ts`
2. **Fiscalization Service**: `src/lib/fiscalization/FiscalizationService.ts`
3. **Reservation Service**: `src/lib/hotel/services/ReservationService.ts`
4. **Finance UI**: `src/components/hotel/finance/InvoicePaymentPage.tsx`
5. **Hotel Context**: `src/lib/hotel/state/SupabaseHotelContext.tsx` or `src/contexts/HotelContext.tsx`

### Configuration
- **Fiscal Config**: `src/lib/fiscalization/config.ts`
- **Test OIB**: 87246357068
- **Test Endpoint**: https://cistest.apis-it.hr:8449/FiskalizacijaServiceTest

---

## 🚀 Next Steps for New Chat

1. **Activate Serena MCP**: `activate_project hotel-inventory`
2. **Read Hotel Context**: Find and read the `useHotel()` hook implementation
3. **Verify Data Loading**: Check if fiscal_records are loaded with invoices
4. **Update Invoice Type**: Add fiscalRecords field if missing
5. **Modify Finance UI**: Add JIR column and fiscal details section
6. **Install QR Library**: `pnpm add qrcode.react`
7. **Test in Browser**: Navigate to http://localhost:3000/hotel/finance
8. **Verify Display**: Confirm invoice ID 5 shows fiscal data

---

## 💡 Tips for Implementation

- Use Supabase MCP to verify data structure: `mcp__supabase__execute_sql`
- Use Serena MCP for code exploration: `mcp__serena__find_symbol` and `mcp__serena__get_symbols_overview`
- Hot reload server is already running - no need to restart
- TypeScript must compile with zero errors
- Follow existing UI patterns for consistency

---

## ✨ Success Criteria

The task is complete when:
1. ✅ Finance UI loads invoices from Supabase
2. ✅ Table shows abbreviated JIR for fiscalized invoices
3. ✅ Invoice details dialog shows full JIR, ZKI
4. ✅ QR code renders correctly in dialog
5. ✅ Non-fiscalized invoices handled gracefully
6. ✅ No TypeScript errors
7. ✅ UI matches existing design patterns

---

**Last Updated**: January 2025
**Status**: Ready for Finance UI implementation
**Confidence**: High - Backend is 100% functional, only UI display remains
