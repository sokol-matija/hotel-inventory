# Scripts Organization

This directory contains all fiscalization and testing scripts organized by functionality.

## 📁 Folder Structure

### ✅ `production/` - WORKING Production Scripts

**These scripts are FULLY WORKING and production-ready.**

- **`test-fina-cert.js`** ⭐ **MAIN B2C FISCALIZATION**
  - ✅ Full B2C cash register fiscalization
  - ✅ Connects to Croatian Tax Authority (TEST environment)
  - ✅ Gets real JIR (Jedinstveni Identifikator Računa)
  - ✅ Generates real ZKI (Zaštitni Kod Izdavatelja)
  - ✅ XML-DSIG signature implementation
  - ✅ QR code URL generation
  - **Status:** TESTED AND WORKING ✅
  - **Last Test:** October 6, 2025 - SUCCESS
  - **JIR Received:** `68a809da-e190-48b9-a8ee-4586a025e22f`

- **`xmlSigner.js`** - XML Digital Signature Utility
  - Required dependency for `test-fina-cert.js`
  - Implements XML-DSIG for Croatian Tax Authority
  - Uses node-forge for RSA-SHA1 signing

**How to Run:**
```bash
node scripts/production/test-fina-cert.js
```

---

### 🏢 `b2b-b2g/` - Business Invoice Scripts (DDD Invoices API)

**B2B (Business-to-Business) and B2G (Business-to-Government) e-invoicing.**

- **`test-ddd-simple.ts`** - Simplified B2B invoice generation
  - ✅ Working with DDD Invoices API
  - Generates PDF and UBL XML
  - No TAP (Tax Authority Portal) submission
  - **Status:** WORKING (without TAP endpoint)

- **`test-ddd-invoices.ts`** - Full B2B/B2G/B2C test suite
  - Comprehensive DDD Invoices API testing
  - All invoice types: B2C, B2B, B2G

- **`test-ddd-get-new.ts`** - API structure exploration
  - Gets sample invoice object from DDD API
  - Useful for understanding required fields

**How to Run:**
```bash
npx tsx scripts/b2b-b2g/test-ddd-simple.ts
```

**API Key:** `603e5ce1-e6ce-4622-9a0e-ba3cd097a5f5`

---

### 📱 `qr-code/` - QR Code Generation

**QR code generation for Croatian fiscal receipts.**

- **`test-qr-code.ts`** - QR code generation test
  - ✅ Working QR code generator
  - Generates PNG, SVG, Buffer, Data URL formats
  - Croatian fiscal QR code format
  - **Status:** TESTED AND WORKING ✅

**How to Run:**
```bash
npx tsx scripts/qr-code/test-qr-code.ts
```

---

### 🗄️ `archive/` - Old/Experimental/Not Working Scripts

**Historical scripts kept for reference. DO NOT USE IN PRODUCTION.**

These scripts were experimental or had issues:

- `corrected-croatian-soap.js` - s002 certificate error
- `real-soap-test.js` - s004 digital signature error (missing XML-DSIG)
- `final-fiscalization-test.js` - ZKI algorithm validation issues
- `corrected-soap-test.js` - Early SOAP implementation attempt
- `test-certificate.js` - Certificate testing
- `test-exact-validated-zki.js` - ZKI validation experiments
- `test-fiscal-integration.js` - Integration testing
- `test-invoice-number-format.js` - Invoice number format tests
- `test-qr-code-functionality.js` - Early QR code tests (superseded by qr-code/)
- `test-storno-functionality.js` - Cancellation/storno testing
- `test-updated-fiscalization.js` - Fiscalization updates
- `validate-zki-algorithm.js` - ZKI algorithm validation
- `test-receipt-printing-compliance.js` - Receipt printing tests
- `check-all-certificates.js` - Certificate inventory

---

## 🎯 Quick Reference

### For B2C (Cash Register) Fiscalization:
```bash
node scripts/production/test-fina-cert.js
```

### For B2B/B2G (Business Invoices):
```bash
npx tsx scripts/b2b-b2g/test-ddd-simple.ts
```

### For QR Code Generation:
```bash
npx tsx scripts/qr-code/test-qr-code.ts
```

---

## 📋 Implementation Status

| Type | Status | Script | Notes |
|------|--------|--------|-------|
| **B2C** | ✅ WORKING | `production/test-fina-cert.js` | Full Croatian Tax Authority integration |
| **B2B/B2G** | ⚠️ PARTIAL | `b2b-b2g/test-ddd-simple.ts` | DDD API working, TAP endpoint needs config |
| **QR Code** | ✅ WORKING | `qr-code/test-qr-code.ts` | All formats supported |

---

## 🔐 Certificates

- **Location:** `/.certificates/87246357068.49208351934.A.1.p12`
- **Password:** `Marvel247@$&`
- **OIB:** `87246357068` (Hotel Porec)
- **Valid Until:** July 31, 2030

---

## 🌐 Endpoints

### Croatian Tax Authority (TEST):
- **URL:** `https://cistest.apis-it.hr:8449/FiskalizacijaServiceTest`
- **Environment:** TEST (Demo certificates accepted)

### DDD Invoices API:
- **URL:** `https://api.dddinvoices.com/api/service`
- **API Key:** `603e5ce1-e6ce-4622-9a0e-ba3cd097a5f5`

---

## 📚 Next Steps

1. **Integrate B2C into App:**
   - Copy logic from `production/test-fina-cert.js` into `src/lib/fiscalization/FiscalizationService.ts`
   - Replace simulated fiscalization with real SOAP implementation

2. **Complete B2B/B2G:**
   - Configure TAP endpoint in DDD Invoices portal
   - Test automatic submission to Croatian Tax Authority

3. **QR Code Integration:**
   - Already implemented in `src/lib/fiscalization/qr-code-generator.ts`
   - Integrate into PDF generation

---

**Last Updated:** October 6, 2025
**Status:** B2C fully working, B2B/B2G partial, QR codes ready
