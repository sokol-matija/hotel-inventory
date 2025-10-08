# DDD Invoices vs Webračun: Complete API Comparison

## 🎯 Executive Summary

**WINNER: DDD Invoices** ✅

**Why**: Webračun **only supports B2C** (cash register fiscalization). It does **NOT support Fiscalization 2.0 B2B/B2G** e-invoicing that becomes mandatory January 1, 2026.

---

## 📊 Detailed Comparison

| Feature | DDD Invoices ✅ | Webračun ❌ |
|---------|----------------|-------------|
| **B2C Fiscalization** | ✅ Yes (Step 40) | ✅ Yes |
| **B2B E-invoicing (2026)** | ✅ Yes (Step 50+70) | ❌ **NO** |
| **B2G E-invoicing** | ✅ Yes (Step 50+70) | ❌ **NO** |
| **Fiscalization 2.0 Ready** | ✅ **YES** | ❌ **NO** |
| **API Type** | REST JSON | REST JSON |
| **Complexity** | Medium | Simple |
| **Croatian Tax Authority** | ✅ Supported | ✅ Supported |
| **Peppol Network** | ✅ Yes | ❌ No |
| **Global Coverage** | ✅ 30+ countries | ❌ Croatia only |
| **PDF Generation** | ✅ Yes | ✅ Yes |
| **XML UBL 2.1** | ✅ Yes | ❌ No |
| **Company Location** | International | 🇭🇷 Croatia (Pula) |
| **Price** | ~€40-80/month | ~€20-40/month |

---

## 🔍 API Structure Comparison

### **DDD Invoices API**

```bash
# Authentication
Authorization: IoT <connectionKey>:EUeInvoices

# Base URL
https://api.dddinvoices.com/api/service/

# Main Endpoints
1. DDDI_GetNew - Get initialized invoice object
2. DDDI_Save - Save and process invoice

# Steps System (What gets executed)
Steps: [35, 40, 50, 70, 85]
- 35 = Confirm & lock invoice
- 40 = Fiscalize (B2C Croatian cash register)
- 50 = Generate country-specific UBL (B2B/B2G)
- 70 = Send to Tax Authority Portal (TAP)
- 85 = Generate PDF with fiscal data

# Example: B2B Invoice for Croatia
curl -X POST https://api.dddinvoices.com/api/service/EUeInvoices.DDDI_Save \
  -H "Authorization: IoT your-api-key:EUeInvoices" \
  -H "Content-Type: application/json" \
  -d '{
    "Complexity": "Minimal",
    "Steps": [35, 50, 70, 85],
    "ReturnDoc": ["PDFP", "XMLS"],
    "Object": {
      "Invoice": {
        "BuyerCountryCode": "HR",
        "BuyerTaxNum": "12345678901",
        "BuyerName": "Travel Agency Ltd",
        "DocCurrencyCode": "EUR",
        "DocPaymentTypeCode": "NONCASH",
        "_details": {
          "Items": [{
            "ItemName": "Hotel Stay",
            "ItemQuantity": 3,
            "ItemUmcCode": "piece",
            "ItemNetPrice": 150.00,
            "ItemVatCode": "13"
          }]
        }
      }
    }
  }'

# Response
{
  "Status": "OK",
  "Result": {
    "Status": "OK",
    "Step": 85,
    "Result": {
      "Id": "uuid-here",
      "PDFPrimary": "File/xxx"
    },
    "ReturnDoc": {
      "PDFP": "https://api.dddinvoices.com/Public/xxx.pdf",
      "XMLS": "https://api.dddinvoices.com/Public/xxx.xml"
    }
  }
}
```

### **Webračun API**

```bash
# Authentication
POST https://www.app.webracun.com/rest/api/v1/login
Content-Type: application/json
{"username": "test", "password": "public_api_test"}

# Response
{
  "token": "[B@15d18b6f",
  "userId": 2
}

# Create Invoice (B2C ONLY)
POST https://www.app.webracun.com/rest/api/v1/invoice
Authority: [token]
Content-Type: application/json
{
  "paymentType": "Cash",
  "items": [
    {
      "itemId": "97",
      "quantity": "1"
    }
  ]
}

# Response
{
  "invoiceId": "971Ql0EwJV",
  "invoiceLink": "http://localhost:8080/obican/invoiceViewer.html?invoiceId=971Ql0EwJV",
  "jir": "ea71c96703128b8c551cee339e63f565",
  "zki": "e7392fc1-ddd2-4f90-909d-18d2c10b1011",
  "message": "Invoice successfully created"
}

# Cancel Invoice
POST https://www.app.webracun.com/rest/api/v1/cancellation
{"invoiceId": "971Ql0EwJV"}
```

---

## ⚠️ Critical Differences

### **1. Fiscalization 2.0 Support**

**DDD Invoices:**
- ✅ **B2C** (cash register) - Step 40
- ✅ **B2B** (business invoices) - Step 50 + 70
- ✅ **B2G** (government invoices) - Step 50 + 70
- ✅ UBL 2.1 with Croatian CIUS
- ✅ AS4 transport protocol
- ✅ Ready for January 1, 2026

**Webračun:**
- ✅ **B2C** (cash register) ONLY
- ❌ **B2B** NOT SUPPORTED
- ❌ **B2G** NOT SUPPORTED
- ❌ No UBL generation
- ❌ **NOT ready for Fiscalization 2.0**

### **2. API Complexity**

**DDD Invoices:**
- **More complex** but more powerful
- Need to understand "Steps" system
- Need to map your data to their invoice object
- More configuration options

**Webračun:**
- **Very simple** API
- Just send itemId + quantity
- Items configured in UI beforehand
- Limited options

### **3. Integration Effort**

**DDD Invoices:**
- **Initial setup**: 2-3 days
- Need to map all invoice fields
- More flexible data model
- Better for complex scenarios

**Webračun:**
- **Initial setup**: 1 day
- Pre-configure items in UI
- Just send item IDs
- Better for simple scenarios

---

## 💰 Cost Comparison

| | DDD Invoices | Webračun |
|---|--------------|----------|
| **Monthly** | €40-80 | €20-40 |
| **Setup** | €0 | €0 |
| **B2C Support** | ✅ Included | ✅ Included |
| **B2B Support** | ✅ Included | ❌ Not available |
| **B2G Support** | ✅ Included | ❌ Not available |
| **5-Year Total** | €2,400-4,800 | €1,200-2,400 |

**BUT**: Webračun doesn't solve your 2026 problem! You'd need another provider anyway.

---

## 🎯 Your Specific Needs

### **Hotel Porec:**
- ✅ B2C: Guest checkouts (already built with our SOAP implementation)
- ✅ B2B: Corporate bookings, travel agencies (need provider)
- ❌ B2G: Not applicable

### **TOMI PHARM:**
- ✅ B2C: Retail pharmacy sales (cash register)
- ✅ B2B: Business clients (need provider)
- ✅ B2G: Hospital invoices (already working via FINA)

### **What You Need from Provider:**
1. ✅ B2B support (mandatory Jan 1, 2026)
2. ✅ B2G support (if FINA doesn't add B2B)
3. ✅ Good API for integration
4. ✅ Croatian Tax Authority approved
5. ✅ Future-proof

### **DDD Invoices: ✅✅✅✅✅ (5/5)**
### **Webračun: ✅❌❌✅❌ (2/5)**

---

## 🚨 The Webračun Problem

**January 1, 2026 Scenario:**

If you use Webračun:
- ✅ B2C works
- ❌ B2B doesn't work (you need another provider!)
- ❌ You're paying for 2 services
- ❌ You're integrating with 2 APIs
- ❌ More complexity

**Result**: You'd need to add DDD Invoices (or similar) anyway!

---

## ✅ Why DDD Invoices is Better for You

### **1. Future-Proof**
- ✅ Ready for Fiscalization 2.0
- ✅ Handles all transaction types
- ✅ One provider for everything

### **2. Complete Solution**
- ✅ B2C: Cash register (Step 40)
- ✅ B2B: Business invoices (Step 50+70)
- ✅ B2G: Government invoices (Step 50+70)
- ✅ Peppol: International e-invoicing (Step 55+80)

### **3. Better Technology**
- ✅ UBL 2.1 XML generation
- ✅ AS4 protocol
- ✅ Digital signatures
- ✅ All handled automatically

### **4. Global Platform**
- ✅ 30+ countries supported
- ✅ If you expand abroad, same API
- ✅ Better long-term investment

### **5. You Already Have the API Key!**
- ✅ No more evaluation needed
- ✅ Ready to start integrating
- ✅ Test environment available

---

## 🤔 When Would Webračun Be Better?

**Only if:**
1. You ONLY need B2C (cash register)
2. You don't plan to issue B2B invoices
3. You want simplest possible API
4. You prefer Croatian-only company

**BUT**: This doesn't apply to you because:
- ❌ Hotel has corporate bookings (B2B needed)
- ❌ Pharmacy may have business clients (B2B needed)
- ❌ Fiscalization 2.0 is mandatory in 3 months!

---

## 📋 Integration Complexity Comparison

### **DDD Invoices - TypeScript Example**

```typescript
// Slightly more complex but handles everything
const response = await fetch('https://api.dddinvoices.com/api/service/EUeInvoices.DDDI_Save', {
  method: 'POST',
  headers: {
    'Authorization': `IoT ${apiKey}:EUeInvoices`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    Complexity: 'Minimal',
    Steps: [35, 50, 70, 85], // B2B invoice
    ReturnDoc: ['PDFP', 'XMLS'],
    Object: {
      Invoice: {
        BuyerCountryCode: 'HR',
        BuyerTaxNum: customer.oib,
        BuyerName: customer.name,
        DocCurrencyCode: 'EUR',
        DocPaymentTypeCode: paymentType,
        _details: {
          Items: items.map(item => ({
            ItemName: item.name,
            ItemQuantity: item.quantity,
            ItemNetPrice: item.price,
            ItemVatCode: item.vatRate.toString()
          }))
        }
      }
    }
  })
});

const result = await response.json();
// Returns: JIR, PDF URL, XML URL
```

### **Webračun - TypeScript Example**

```typescript
// Simpler but ONLY B2C!
const response = await fetch('https://www.app.webracun.com/rest/api/v1/invoice', {
  method: 'POST',
  headers: {
    'Authority': token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    paymentType: 'Cash',
    items: items.map(item => ({
      itemId: item.preConfiguredId, // Must be pre-configured in UI!
      quantity: item.quantity
    }))
  })
});

const result = await response.json();
// Returns: JIR, ZKI, invoice link
// BUT: Cannot do B2B/B2G!
```

---

## 🎯 Final Recommendation

### **Use DDD Invoices** ✅

**Reasons:**
1. ✅ **Fiscalization 2.0 compliant** (B2B/B2G ready)
2. ✅ **One provider for all needs** (Hotel + Pharmacy)
3. ✅ **You already have API key**
4. ✅ **Future-proof** (handles everything)
5. ✅ **Better long-term value** (don't need 2 providers)

**When to use:**
- **B2C**: Use your existing SOAP implementation (already working!)
- **B2B**: Use DDD Invoices API (Steps: 35, 50, 70, 85)
- **B2G**: Use DDD Invoices API (Steps: 35, 50, 70, 85)

---

## 🚀 Implementation Plan with DDD Invoices

### **Phase 1: Keep What Works** (Now)
```typescript
// B2C Cash Register (Hotel checkouts, Pharmacy sales)
const jir = await fiscalizeCashReceipt({
  // Use your existing SOAP implementation!
  // Already working - don't change
});
```

### **Phase 2: Add DDD for B2B/B2G** (October-November)
```typescript
// B2B Corporate Invoices
const invoice = await dddInvoices.save({
  Steps: [35, 50, 70, 85],
  // ... invoice data
});
```

### **Phase 3: Go Live** (January 1, 2026)
- ✅ B2C: Existing system
- ✅ B2B: DDD Invoices
- ✅ B2G: DDD Invoices
- ✅ **Fully compliant!**

---

## 💡 Cost-Benefit Analysis

### **Scenario A: DDD Invoices Only**
- Monthly: €60
- Coverage: B2C + B2B + B2G
- Providers: 1
- APIs to integrate: 1 (+ keep your B2C)
- **5-Year Total: €3,600**

### **Scenario B: Webračun + Another Provider**
- Monthly: €30 (Webračun) + €60 (B2B provider) = €90
- Coverage: B2C + B2B + B2G
- Providers: 2
- APIs to integrate: 2
- **5-Year Total: €5,400**

**Savings with DDD Invoices: €1,800 over 5 years**

---

## ✅ Action Items

1. **TODAY**: Test DDD Invoices API with your key
2. **This Week**: Integrate DDD for B2B invoices
3. **October**: Test in sandbox
4. **November**: Complete integration
5. **December**: Final testing
6. **January 1, 2026**: Go live ✅

---

## 📞 Questions Answered

### "But Webračun is Croatian and cheaper?"
- ✅ Yes, but it's incomplete (no B2B/B2G)
- ✅ You'd pay more long-term (need 2 providers)
- ✅ Croatian company ≠ better for this specific need

### "Is DDD Invoices more complex?"
- ✅ Slightly, but that's because it does MORE
- ✅ 2-3 days vs 1 day integration (worth it!)
- ✅ You get B2B + B2G + Peppol + international

### "Can I use both?"
- ⚠️ Technically yes, but NOT recommended
- ⚠️ More complexity, more cost
- ⚠️ No benefit - DDD does everything Webračun does

---

## 🎉 Conclusion

**DDD Invoices wins decisively.**

Webračun is excellent **if you only need B2C**, but you need B2B/B2G for Fiscalization 2.0.

Since you already have the DDD Invoices API key, **start testing today!**

---

Last Updated: October 2, 2025
