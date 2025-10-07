# Croatian Fiscalization - Focused Action Plan

**Date**: October 2, 2025
**Current Status**: 90% Complete
**Blocker**: s004 Error (Invalid Digital Signature)
**Goal**: Production-ready fiscalization in 2-3 weeks

---

## 🎯 The ONE Thing Blocking You

**s004 Error: "Neispravan digitalni potpis" (Invalid digital signature)**

Your SOAP envelope reaches the Croatian Tax Authority successfully, but it's rejected because it's missing the XML digital signature that proves the invoice came from your certificate.

**Everything else works perfectly** ✅

---

## 🚀 3-Week Action Plan

### WEEK 1: Fix the s004 Error (XML Digital Signature)

#### Day 1: Install Dependencies
```bash
cd /Users/msokol/Dev/Repos/2-Personal/hotel-inventory
npm install xml-crypto xmldsigjs xml2js fast-xml-parser
```

#### Day 2-3: Implement XML Signer (10-12 hours)

Create file: `src/lib/fiscalization/xmlSigner.ts`

```typescript
import { SignedXml } from 'xml-crypto';
import forge from 'node-forge';
import fs from 'fs';

export class FiscalXMLSigner {
  private certificate: forge.pki.Certificate;
  private privateKey: forge.pki.PrivateKey;
  private certPem: string;

  constructor(certPath: string, password: string) {
    // Load P12 certificate
    const certBuffer = fs.readFileSync(certPath);
    const p12Asn1 = forge.asn1.fromDer(certBuffer.toString('binary'));
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

    // Extract certificate and private key
    const bags = p12.getBags({ bagType: forge.pki.oids.certBag });
    this.certificate = bags[forge.pki.oids.certBag][0].cert;

    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
    this.privateKey = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag][0].key;

    // Convert certificate to PEM
    this.certPem = forge.pki.certificateToPem(this.certificate);
  }

  signSOAPEnvelope(xml: string, refId: string): string {
    const sig = new SignedXml();

    // Configure signature
    sig.addReference({
      xpath: `//*[@Id='${refId}']`,
      digestAlgorithm: "http://www.w3.org/2000/09/xmldsig#sha1",
      transforms: [
        "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
        "http://www.w3.org/2001/10/xml-exc-c14n#"
      ]
    });

    sig.canonicalizationAlgorithm = "http://www.w3.org/2001/10/xml-exc-c14n#";
    sig.signatureAlgorithm = "http://www.w3.org/2000/09/xmldsig#rsa-sha1";

    // Private key for signing
    const privateKeyPem = forge.pki.privateKeyToPem(this.privateKey);
    sig.signingKey = privateKeyPem;

    // Add X509 certificate
    sig.keyInfoProvider = {
      getKeyInfo: () => {
        const certBase64 = forge.util.encode64(
          forge.asn1.toDer(
            forge.pki.certificateToAsn1(this.certificate)
          ).getBytes()
        );

        return `<X509Data><X509Certificate>${certBase64}</X509Certificate></X509Data>`;
      }
    };

    // Sign the XML
    sig.computeSignature(xml, {
      location: { reference: `//*[@Id='${refId}']`, action: "append" }
    });

    return sig.getSignedXml();
  }
}
```

#### Day 4: Update test-fina-cert.js

Modify `scripts/test-fina-cert.js` around line 184:

```javascript
generateSOAPEnvelope(fiscalData, zki) {
  console.log('\n📋 Creating SOAP envelope for Croatian Tax Authority...');

  const xmlDateTime = this.formatXMLDateTime(fiscalData.dateTime);
  const messageId = `HP${Date.now()}${Math.random().toString(36).substr(2, 8)}`.toUpperCase();
  const signXmlId = `signXmlId${Date.now()}`;

  // Create unsigned SOAP envelope
  const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <tns:RacunZahtjev Id="${signXmlId}" xmlns:tns="http://www.apis-it.hr/fin/2012/types/f73">
      <tns:Zaglavlje>
        <tns:IdPoruke>${messageId}</tns:IdPoruke>
        <tns:DatumVrijeme>${xmlDateTime}</tns:DatumVrijeme>
      </tns:Zaglavlje>
      <tns:Racun>
        <tns:Oib>${fiscalData.oib}</tns:Oib>
        <tns:USustavuPDV>true</tns:USustavuPDV>
        <tns:DatVrijeme>${xmlDateTime}</tns:DatVrijeme>
        <tns:OznakaSlijednosti>N</tns:OznakaSlijednosti>
        <tns:BrRac>
          <tns:BrOznRac>${fiscalData.invoiceNumber}</tns:BrOznRac>
          <tns:OznPosPr>${fiscalData.businessSpace}</tns:OznPosPr>
          <tns:OznNapUr>${fiscalData.cashRegister}</tns:OznNapUr>
        </tns:BrRac>
        <tns:Racun>
          <tns:IznosUkupno>${fiscalData.totalAmount.toFixed(2)}</tns:IznosUkupno>
          <tns:NacinPlac>G</tns:NacinPlac>
          <tns:OibOper>${fiscalData.oib}</tns:OibOper>
          <tns:ZastKod>${zki}</tns:ZastKod>
          <tns:NakDan>false</tns:NakDan>
        </tns:Racun>
      </tns:Racun>
    </tns:RacunZahtjev>
  </soap:Body>
</soap:Envelope>`;

  console.log('🔐 Signing SOAP envelope with XML-DSIG...');

  // NEW: Sign the SOAP envelope
  const FiscalXMLSigner = require('../src/lib/fiscalization/xmlSigner').FiscalXMLSigner;
  const signer = new FiscalXMLSigner(
    path.resolve(__dirname, CONFIG.CERT_PATH),
    CONFIG.PRIMARY_PASSWORD
  );

  const signedEnvelope = signer.signSOAPEnvelope(soapEnvelope, signXmlId);

  console.log('✅ SOAP envelope signed successfully');
  console.log(`📏 Signed SOAP size: ${signedEnvelope.length} characters`);

  return signedEnvelope;
}
```

#### Day 5: Test with Croatian Tax Authority

Run the test:
```bash
node scripts/test-fina-cert.js
```

**Expected Result**:
```
✅ SOAP envelope signed successfully
🚀 Sending SOAP request to Croatian Tax Authority...
📡 Response Status: 200
✅ Response received
🎉 Croatian Tax Authority Success!
📋 JIR Received: [ACTUAL JIR NUMBER]
```

If you get JIR instead of s004, **YOU'VE FIXED IT!** 🎉

---

### WEEK 2: React App Integration

#### Day 1-2: Auto-Fiscalization on Checkout (6 hours)

Update `src/lib/hotel/checkoutService.ts`:

```typescript
import { FiscalizationService } from '../fiscalization/FiscalizationService';

export async function processCheckout(reservationId: string) {
  console.log(`Processing checkout for reservation: ${reservationId}`);

  // 1. Create invoice
  const invoice = await createInvoiceFromReservation(reservationId);

  // 2. Fiscalize automatically
  const fiscalService = FiscalizationService.getInstance();
  const fiscalResult = await fiscalService.fiscalizeInvoice({
    invoiceNumber: invoice.invoice_number,
    dateTime: new Date(),
    totalAmount: invoice.total_amount,
    vatAmount: invoice.vat_amount,
    items: invoice.items,
    paymentMethod: invoice.payment_method
  });

  if (!fiscalResult.success) {
    console.error('Fiscalization failed:', fiscalResult.error);
    // Queue for retry
    await queueFiscalizationRetry(invoice.id);
    throw new Error('Fiscalization failed');
  }

  // 3. Update invoice with fiscal data
  await supabase.from('invoices').update({
    jir: fiscalResult.jir,
    zki: fiscalResult.zki,
    fiscal_receipt_url: fiscalResult.fiscalReceiptUrl,
    fiscalized_at: new Date().toISOString()
  }).eq('id', invoice.id);

  // 4. Generate PDF with QR code
  const pdf = await generateInvoicePDF(invoice, fiscalResult);

  // 5. Email to guest
  await sendInvoiceEmail(invoice.guest_email, pdf);

  console.log(`✅ Checkout complete! JIR: ${fiscalResult.jir}`);
  return { invoice, fiscalResult };
}
```

#### Day 3: Database Schema Updates (2 hours)

```sql
-- Add fiscal columns to invoices table
ALTER TABLE invoices
  ADD COLUMN jir TEXT,
  ADD COLUMN zki TEXT,
  ADD COLUMN fiscal_receipt_url TEXT,
  ADD COLUMN fiscalized_at TIMESTAMPTZ;

-- Create fiscal retry queue
CREATE TABLE fiscal_retry_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id),
  retry_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending', -- 'pending', 'success', 'failed'
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for pending retries
CREATE INDEX idx_fiscal_retry_queue_pending
  ON fiscal_retry_queue(status, created_at)
  WHERE status = 'pending';
```

#### Day 4-5: PDF QR Code (4 hours)

```typescript
import QRCode from 'qrcode';
import PDFDocument from 'pdfkit';

export async function generateInvoicePDF(
  invoice: Invoice,
  fiscalData: FiscalResponse
): Promise<Buffer> {
  const doc = new PDFDocument();
  const chunks: Buffer[] = [];

  doc.on('data', chunk => chunks.push(chunk));

  // Invoice header
  doc.fontSize(20).text('RAČUN / INVOICE', 50, 50);
  doc.fontSize(12).text(`Number: ${invoice.invoice_number}`, 50, 80);

  // ... invoice details ...

  // Add fiscal data
  doc.fontSize(10).text(`JIR: ${fiscalData.jir}`, 50, 500);
  doc.text(`ZKI: ${fiscalData.zki}`, 50, 520);

  // Generate and add QR code
  const qrCodeDataURL = await QRCode.toDataURL(fiscalData.fiscalReceiptUrl);
  doc.image(qrCodeDataURL, 450, 480, { width: 100, height: 100 });

  doc.end();

  return new Promise(resolve => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });
}
```

---

### WEEK 3: Production Deployment

#### Day 1: Certificate Upload to Supabase (2 hours)

```bash
# Upload certificate to Supabase Storage
supabase storage create certificates

# Upload P12 file
supabase storage upload certificates/87246357068.49208351934.A.1.p12 \
  .certificates/87246357068.49208351934.A.1.p12

# Set permissions (private access only)
supabase storage update certificates --private
```

#### Day 2: Environment Configuration (2 hours)

Update `.env.production`:
```bash
# Croatian Fiscalization - PRODUCTION
REACT_APP_FISCAL_ALLOW_PRODUCTION=true
REACT_APP_FISCAL_FORCE_TEST=false
REACT_APP_FISCAL_ENVIRONMENT=PRODUCTION

# Supabase certificate storage
SUPABASE_FISCAL_CERT_BUCKET=certificates
SUPABASE_FISCAL_CERT_FILE=87246357068.49208351934.A.1.p12
SUPABASE_FISCAL_CERT_PASSWORD=Marvel247@$&

# Croatian Tax Authority PRODUCTION endpoint
FISCAL_ENDPOINT=https://cis.porezna-uprava.hr:8449/FiskalizacijaService
FISCAL_OIB=87246357068
```

#### Day 3-4: Testing & Monitoring (4 hours)

Create monitoring dashboard:
```typescript
// Fiscal monitoring queries
const getFiscalStats = async () => {
  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .not('jir', 'is', null)
    .gte('fiscalized_at', new Date(Date.now() - 24 * 60 * 60 * 1000));

  return {
    totalFiscalized: data?.length || 0,
    successRate: calculateSuccessRate(data),
    averageResponseTime: calculateAvgResponseTime(data)
  };
};
```

#### Day 5: Staff Training & Go Live (2 hours)

Create troubleshooting guide for staff:
```markdown
# Fiscal System Troubleshooting

## Error: Fiscalization Failed
1. Check internet connection
2. Verify Croatian Tax Authority is online
3. Check fiscal_retry_queue table
4. Contact IT support if error persists

## Manual Fiscalization
If auto-fiscalization fails:
1. Go to Finance → Invoices
2. Find invoice
3. Click "Fiscalize Manually"
4. Wait for JIR confirmation

## Emergency Contact
- IT Support: [phone]
- Croatian Tax Authority: 01/6201-818
```

---

## 📋 Daily Checklist

### WEEK 1 (XML Digital Signature)
- [ ] Day 1: Install npm packages (xml-crypto, xmldsigjs)
- [ ] Day 2: Create xmlSigner.ts
- [ ] Day 3: Update test-fina-cert.js with signing
- [ ] Day 4: Test signed SOAP with Croatian Tax Authority
- [ ] Day 5: Verify JIR response (not s004!)

### WEEK 2 (React Integration)
- [ ] Day 1: Checkout auto-fiscalization
- [ ] Day 2: Database schema updates
- [ ] Day 3: Retry queue implementation
- [ ] Day 4: PDF QR code generation
- [ ] Day 5: Email integration

### WEEK 3 (Production)
- [ ] Day 1: Upload certificate to Supabase
- [ ] Day 2: Production environment config
- [ ] Day 3: Monitoring dashboard
- [ ] Day 4: Test 100 invoices in TEST
- [ ] Day 5: Staff training & go live

---

## 🎯 Success Metrics

### Week 1 Success
```bash
# Run this command:
node scripts/test-fina-cert.js

# Expected output:
✅ SOAP envelope signed successfully
📡 Response Status: 200
🎉 Croatian Tax Authority Success!
📋 JIR Received: [ACTUAL_JIR_NUMBER]
```

### Week 2 Success
```typescript
// Test checkout
const result = await processCheckout(reservationId);

// Expected result:
{
  invoice: { ... },
  fiscalResult: {
    success: true,
    jir: "12345-67890-ABCDEF",
    fiscalReceiptUrl: "https://cis.porezna-uprava.hr/...",
    qrCodeData: "..."
  }
}
```

### Week 3 Success
```sql
-- Query production stats
SELECT
  COUNT(*) as total_fiscalized,
  COUNT(*) FILTER (WHERE jir IS NOT NULL) as successful,
  AVG(EXTRACT(EPOCH FROM (fiscalized_at - created_at))) as avg_time_seconds
FROM invoices
WHERE created_at >= NOW() - INTERVAL '1 day';
```

---

## 🚨 Troubleshooting

### If s004 error persists after signing:
1. Check signature is added to XML (search for `<Signature`)
2. Verify certificate is in KeyInfo block
3. Test canonicalization algorithm
4. Check digest value calculation
5. Verify reference URI matches element Id

### If Croatian Tax Authority times out:
1. Check internet connection
2. Verify TEST endpoint is reachable
3. Try curl test: `curl https://cistest.apis-it.hr:8449/FiskalizacijaServiceTest`
4. Check firewall/proxy settings

### If certificate password fails:
1. Try primary: `Marvel247@$&`
2. Try backup: `Marvel2479@$&(`
3. Verify certificate file is not corrupted
4. Check certificate expiry date

---

## 📞 Support Resources

**Croatian Tax Authority**:
- Phone: 01/6201-818
- Email: fiskalizacija@porezna-uprava.hr
- Hours: Mon-Fri 8:00-16:00

**Technical Documentation**:
- https://www.porezna-uprava.hr/fiskalizacija
- TEST Endpoint: https://cistest.apis-it.hr:8449/FiskalizacijaServiceTest
- PROD Endpoint: https://cis.porezna-uprava.hr:8449/FiskalizacijaService

**Your Implementation**:
- Certificate: `.certificates/87246357068.49208351934.A.1.p12`
- Test Script: `scripts/test-fina-cert.js`
- Config: `src/lib/fiscalization/config.ts`

---

## ✅ Final Deliverables

By end of Week 3, you should have:

1. ✅ XML Digital Signature working (no more s004!)
2. ✅ JIR responses from Croatian Tax Authority
3. ✅ Auto-fiscalization on checkout
4. ✅ PDF invoices with QR codes
5. ✅ Email delivery to guests
6. ✅ Database tracking of JIR/ZKI
7. ✅ Error recovery and retry queue
8. ✅ Production monitoring
9. ✅ Staff training complete
10. ✅ GO LIVE! 🎉

**Total Time**: 18-23 hours over 3 weeks
**Cost**: €0 (vs €280/year for Webračun)
**ROI**: €1,400 saved over 5 years

---

**Ready to start?**

**First command to run**:
```bash
npm install xml-crypto xmldsigjs xml2js fast-xml-parser
```

Then start with Week 1, Day 1! 🚀
