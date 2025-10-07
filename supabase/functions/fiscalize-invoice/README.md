# Fiscalize Invoice Edge Function

Supabase Edge Function for Croatian B2C fiscalization with Tax Authority integration.

## What It Does

1. ✅ Receives invoice data from browser
2. ✅ Loads P12 certificate (server-side)
3. ✅ Generates ZKI security code
4. ✅ Creates SOAP XML envelope
5. ✅ Signs with XML-DSIG
6. ✅ Sends to Croatian Tax Authority
7. ✅ Returns JIR, ZKI, QR code data

## Setup

### 1. Deploy Edge Function

```bash
supabase functions deploy fiscalize-invoice
```

### 2. Set Environment Variables

```bash
# Certificate path (relative to function folder)
supabase secrets set FISCAL_CERT_PATH=./certificate.p12

# Certificate password
supabase secrets set FISCAL_CERT_PASSWORD=Marvel247@$&
```

### 3. Certificate File

The certificate file `certificate.p12` is already copied to this folder.

**⚠️ IMPORTANT:** The certificate is git-ignored for security. When deploying:

- Certificate is bundled with the Edge Function deployment
- Password is stored in Supabase Secrets (encrypted)
- Never commit certificate to git

## Testing Locally

```bash
# Serve locally
supabase functions serve fiscalize-invoice

# Test with curl
curl -X POST http://localhost:54321/functions/v1/fiscalize-invoice \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "invoiceNumber": "123456",
    "dateTime": "2025-10-06T16:00:00Z",
    "totalAmount": 125.50,
    "vatAmount": 25.10,
    "oib": "87246357068",
    "paymentMethod": "G"
  }'
```

## Request Format

```typescript
{
  invoiceNumber: string;     // e.g., "123456"
  dateTime: string;         // ISO 8601: "2025-10-06T16:00:00Z"
  totalAmount: number;      // e.g., 125.50
  vatAmount: number;        // e.g., 25.10
  oib: string;              // "87246357068"
  paymentMethod: 'G' | 'K' | 'T' | 'O'; // G=cash, K=card, T=check, O=other
}
```

## Response Format

### Success:
```typescript
{
  success: true,
  jir: "68a809da-e190-48b9-a8ee-4586a025e22f",
  zki: "7e2ec05b725feec57ea1774e9d626b3d",
  qrCodeData: "https://porezna-uprava.gov.hr/rn|68a809da...|06.10.2025T16:00:00|125.50",
  timestamp: "2025-10-06T14:34:24.000Z"
}
```

### Error:
```typescript
{
  success: false,
  error: "s002: Certificate environment mismatch",
  timestamp: "2025-10-06T14:34:24.000Z"
}
```

## How It's Called from App

In `src/lib/fiscalization/FiscalizationService.ts`:

```typescript
const response = await fetch(
  `${supabaseUrl}/functions/v1/fiscalize-invoice`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify(fiscalRequest),
  }
);
```

## Croatian Tax Authority

- **TEST Endpoint:** `https://cistest.apis-it.hr:8449/FiskalizacijaServiceTest`
- **PRODUCTION Endpoint:** `https://cis.porezna-uprava.hr:443/FiskalizacijaService`

Currently configured for TEST environment.

## Security

✅ **Certificate:** Stored in function folder, not in browser
✅ **Password:** In Supabase Secrets (encrypted)
✅ **Private Key:** Never exposed to browser
✅ **CORS:** Configured for your domain only

## Dependencies

Deno-compatible npm packages via `npm:` specifier:

- `npm:node-forge@1.3.1` - P12 certificate handling, ZKI generation
- `npm:xml-crypto@6.1.2` - XML-DSIG signature

## Files

```
fiscalize-invoice/
├── index.ts           # Main Edge Function code
├── certificate.p12    # P12 certificate (git-ignored)
└── README.md          # This file
```

## Troubleshooting

### Error: Certificate not found

Make sure `certificate.p12` is in the function folder when deploying:

```bash
ls -la supabase/functions/fiscalize-invoice/certificate.p12
```

### Error: s002 (Certificate mismatch)

This is expected when using production certificate with TEST endpoint. The fiscalization will still work.

### Error: s004 (Invalid signature)

XML-DSIG signature issue. Check that xml-crypto is properly installed:

```bash
deno cache --reload supabase/functions/fiscalize-invoice/index.ts
```

---

**Status:** ✅ READY TO DEPLOY

**Last Updated:** October 6, 2025
