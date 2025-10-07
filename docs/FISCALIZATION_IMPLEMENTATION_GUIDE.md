# Fiscalization 2.0 Implementation Guide - FINAL

## 🎯 Decision: Use DDD Invoices

**Winner**: DDD Invoices ✅
**Reason**: Only provider that supports Fiscalization 2.0 (B2B/B2G) mandatory January 1, 2026

---

## 📋 What You Have Now

### ✅ Already Working
- **B2C Cash Register** (scripts/test-fina-cert.js)
  - Certificate authenticated
  - ZKI generation working
  - XML-DSIG signature working
  - JIR received from Croatian Tax Authority
  - **STATUS**: 100% FUNCTIONAL

### ✅ Ready to Integrate
- **DDD Invoices API Key** (you have it!)
- **Integration Code** (src/lib/fiscalization/ddd-invoices-api.ts)
- **Test Script** (scripts/test-ddd-invoices.ts)
- **Complete Documentation** (this file!)

---

## 🚀 Implementation Steps

### Step 1: Configure Environment Variables (5 minutes)

Add to `.env.local`:

```bash
# DDD Invoices API
DDD_API_KEY=your_api_key_here
DDD_API_URL=https://api.dddinvoices.com/api/service

# Hotel Porec
HOTEL_OIB=87246357068
HOTEL_NAME=Hotel Porec
HOTEL_ADDRESS=Rade Koncara 1
HOTEL_CITY=Porec
HOTEL_POST_CODE=52440

# TOMI PHARM (if integrating pharmacy)
PHARM_OIB=63219215783
PHARM_NAME=TOMI PHARM d.o.o.
PHARM_ADDRESS=Susedsko polje 57
PHARM_CITY=Zagreb
PHARM_POST_CODE=10000
```

### Step 2: Install Dependencies (2 minutes)

```bash
npm install
# or
pnpm install
```

### Step 3: Test the API (10 minutes)

Edit `scripts/test-ddd-invoices.ts`:

```typescript
// Line 10: Replace with your actual API key
const HOTEL_CONFIG = {
  apiKey: 'YOUR_ACTUAL_API_KEY_HERE', // ← Put your key here
  sellerOib: '87246357068',
  sellerName: 'Hotel Porec',
  sellerAddress: 'Rade Koncara 1',
  sellerCity: 'Porec',
  sellerPostCode: '52440'
};
```

Run the test:

```bash
npx tsx scripts/test-ddd-invoices.ts
```

**Expected Output:**
```
═════════════════════════════════════════════════════════
   DDD INVOICES API - TEST SUITE
   Hotel Porec - Croatian Fiscalization 2.0
═════════════════════════════════════════════════════════

🧪 Test 1: B2C Receipt (Cash Register)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ SUCCESS!
📋 Invoice ID: abc-123-def
📄 PDF: https://api.dddinvoices.com/Public/xxx.pdf
📄 XML: https://api.dddinvoices.com/Public/xxx.xml

🧪 Test 2: B2B Invoice (Corporate Client)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ SUCCESS!
📋 Invoice ID: xyz-456-abc
📄 PDF: https://api.dddinvoices.com/Public/yyy.pdf
📄 XML: https://api.dddinvoices.com/Public/yyy.xml
```

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                     Your Hotel App                       │
│               (Next.js + React + Supabase)              │
└────────────────┬────────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
   B2C Receipts    B2B/B2G Invoices
        │                 │
        ▼                 ▼
┌───────────────┐  ┌──────────────────┐
│ Your SOAP API │  │  DDD Invoices    │
│ (Already      │  │  API             │
│  Working!)    │  │  (New)           │
└───────┬───────┘  └────────┬─────────┘
        │                   │
        │                   │
        └─────────┬─────────┘
                  │
                  ▼
      ┌─────────────────────┐
      │  Croatian Tax       │
      │  Authority (CIS)    │
      └─────────────────────┘
```

---

## 💻 Integration Code

### For B2B Invoices (Corporate Clients)

```typescript
import { getDDDInvoices } from '@/lib/fiscalization/ddd-invoices-api';

// When corporate client checks out
async function handleCorporateCheckout(reservation: Reservation) {
  const ddd = getDDDInvoices();

  const result = await ddd.createB2BInvoice(
    {
      oib: reservation.company.oib,
      name: reservation.company.name,
      address: reservation.company.address,
      city: reservation.company.city,
      postCode: reservation.company.postCode,
      email: reservation.company.email
    },
    reservation.items.map(item => ({
      name: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      vatRate: 13 // Croatian tourism VAT
    })),
    'BankTransfer',
    `INV-${reservation.id}`
  );

  if (result.success) {
    // Save to database
    await supabase
      .from('invoices')
      .update({
        jir: result.jir,
        pdf_url: result.pdfUrl,
        xml_url: result.xmlUrl,
        fiscalized_at: new Date()
      })
      .eq('reservation_id', reservation.id);

    // Send email with PDF
    await sendInvoiceEmail(reservation.company.email, result.pdfUrl);
  }
}
```

### For B2C Receipts (Cash/Card)

```typescript
// Use your existing SOAP implementation!
// It's already working - don't change it

import { fiscalizeCashReceipt } from '@/lib/fiscalization/croatian-fiscal';

async function handleGuestCheckout(reservation: Reservation) {
  const result = await fiscalizeCashReceipt({
    oib: '87246357068',
    dateTime: new Date(),
    invoiceNumber: String(reservation.id),
    businessSpace: 'POSL1',
    cashRegister: '2',
    totalAmount: reservation.total
  });

  // Save JIR, ZKI to database
  await supabase
    .from('receipts')
    .insert({
      reservation_id: reservation.id,
      jir: result.jir,
      zki: result.zki,
      fiscalized_at: new Date()
    });

  // Print receipt with QR code
  printReceipt(result);
}
```

---

## 📅 Timeline to Production

| Week | Task | Status |
|------|------|--------|
| **Week 1 (Now)** | ✅ Test DDD API | In Progress |
| **Week 2** | Integrate B2B into app | Not Started |
| **Week 3** | Database schema updates | Not Started |
| **Week 4** | UI integration | Not Started |
| **October** | Sandbox testing | Not Started |
| **November** | Bug fixes & refinement | Not Started |
| **December** | Final testing | Not Started |
| **Jan 1, 2026** | 🚀 GO LIVE | Not Started |

---

## 💰 Cost Summary

| Item | Cost |
|------|------|
| **B2C (Already working)** | €0 (self-hosted) |
| **DDD Invoices B2B/B2G** | €60/month |
| **Total Monthly** | €60 |
| **Total Yearly** | €720 |
| **5-Year Total** | €3,600 |

**Compare to**: Webračun (€30) + Another B2B provider (€60) = €90/month = €5,400/5 years
**Savings**: €1,800 over 5 years!

---

## 🎯 What Each System Does

### Your Existing B2C System (SOAP)
✅ **Use for:**
- Guest checkouts at hotel reception
- Pharmacy retail sales
- Any cash/card payment

✅ **What it returns:**
- JIR (Tax Authority ID)
- ZKI (Security code)
- Fiscalization timestamp

✅ **Status:** Working perfectly!

### New DDD Invoices System
✅ **Use for:**
- Corporate hotel bookings (B2B)
- Travel agency invoices (B2B)
- Government contracts (B2G)
- Business pharmacy clients (B2B)

✅ **What it returns:**
- Invoice ID
- PDF invoice URL
- UBL XML URL
- Tax Authority confirmation

✅ **Status:** Ready to integrate!

---

## 📞 Next Steps

### TODAY:
1. ✅ Test DDD API with your key (10 minutes)
2. ✅ Verify all 3 test scenarios work
3. ✅ Review the code in `src/lib/fiscalization/ddd-invoices-api.ts`

### THIS WEEK:
1. Create Supabase Edge Function for B2B invoices
2. Update database schema (add fiscalization fields)
3. Build UI component for invoice generation

### NEXT WEEK:
1. Integrate into checkout flow
2. Test with real data in sandbox
3. Create invoice email templates

### OCTOBER-DECEMBER:
1. Full integration testing
2. Bug fixes
3. Staff training
4. Final testing

### JANUARY 1, 2026:
🚀 **GO LIVE!** You're compliant!

---

## ❓ FAQs

### Q: Do I need to change my existing B2C system?
**A**: NO! Keep using it. It works perfectly. Just add DDD for B2B/B2G.

### Q: How much coding is required?
**A**: ~2-3 days. Most code is already written for you.

### Q: What if something breaks?
**A**: You have support from DDD Invoices + this documentation + the code we created.

### Q: Can I test before paying?
**A**: Yes! DDD provides sandbox environment. Test everything before going live.

### Q: What about TOMI PHARM?
**A**: Same API works for both businesses. Just different seller OIB.

---

## 📚 All Documentation Files

Created for you:

1. ✅ `DDD_VS_WEBRACUN_COMPARISON.md` - Complete provider comparison
2. ✅ `FISCALIZATION_PROVIDER_EVALUATION.md` - Evaluation checklist
3. ✅ `FISCALIZATION_API_INTEGRATION_EXAMPLE.md` - Integration examples
4. ✅ `PROVIDER_CONTACT_EMAIL_TEMPLATE.md` - Email templates
5. ✅ `src/lib/fiscalization/ddd-invoices-api.ts` - Integration code
6. ✅ `scripts/test-ddd-invoices.ts` - Test script
7. ✅ `FISCALIZATION_IMPLEMENTATION_GUIDE.md` - This file!

---

## 🎉 Summary

**You have everything you need:**

✅ B2C fiscalization working
✅ DDD Invoices API key
✅ Integration code written
✅ Test script ready
✅ Complete documentation
✅ Clear implementation path

**Next step**: Run the test script and verify it works!

```bash
# Edit scripts/test-ddd-invoices.ts with your API key
# Then run:
npx tsx scripts/test-ddd-invoices.ts
```

**Questions?** Review the documentation files above or contact DDD Invoices support.

**Ready when you are!** 🚀

---

Last Updated: October 2, 2025
Version: 1.0 - Final Implementation Guide
