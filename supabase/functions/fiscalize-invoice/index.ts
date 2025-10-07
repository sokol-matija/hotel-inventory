// Supabase Edge Function: Croatian B2C Fiscalization
// Based on working scripts/production/test-fina-cert.js

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// These will be loaded from Deno's npm compatibility layer
import forge from 'npm:node-forge@1.3.1';
import { SignedXml } from 'npm:xml-crypto@6.1.2';

interface FiscalizationRequest {
  invoiceNumber: string;
  dateTime: string; // ISO 8601
  totalAmount: number;
  vatAmount: number;
  oib: string;
  paymentMethod: 'G' | 'K' | 'T' | 'O'; // G=cash, K=card, T=check, O=other
}

interface FiscalizationResponse {
  success: boolean;
  jir?: string;
  zki?: string;
  qrCodeData?: string;
  error?: string;
  timestamp: string;
}

// Configuration (uses Supabase Secrets)
const CONFIG = {
  CERT_BASE64: Deno.env.get('FISCAL_CERT_BASE64') || '',
  CERT_PASSWORD: Deno.env.get('FISCAL_CERT_PASSWORD') || 'Marvel247@$&',
  HOTEL_OIB: '87246357068',
  BUSINESS_SPACE: 'POSL1',
  CASH_REGISTER: '2',
  TEST_URL: 'cistest.apis-it.hr',
  TEST_PORT: 8449,
  TEST_PATH: '/FiskalizacijaServiceTest',
};

/**
 * Generate ZKI (Croatian security code) using P12 certificate
 */
async function generateZKI(
  certificate: any,
  privateKey: any,
  fiscalData: {
    oib: string;
    dateTime: string;
    invoiceNumber: string;
    businessSpace: string;
    cashRegister: string;
    totalAmount: number;
  }
): Promise<string> {
  // Format datetime for ZKI (space separator)
  const zkiDate = formatZKIDateTime(new Date(fiscalData.dateTime));

  const dataString = [
    fiscalData.oib,
    zkiDate,
    fiscalData.invoiceNumber,
    fiscalData.businessSpace,
    fiscalData.cashRegister,
    fiscalData.totalAmount.toFixed(2),
  ].join('');

  console.log(`📝 ZKI Data String: ${dataString}`);

  // Croatian ZKI Algorithm (SHA1 + MD5)
  const md = forge.md.sha1.create();
  md.update(dataString, 'utf8');
  const signature = privateKey.sign(md);

  const md5 = forge.md.md5.create();
  md5.update(signature);
  const md5Hash = md5.digest();

  const zki = forge.util.bytesToHex(md5Hash).toLowerCase();
  console.log(`🔒 ZKI Generated: ${zki}`);

  return zki;
}

/**
 * Format datetime for ZKI generation
 */
function formatZKIDateTime(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
}

/**
 * Format datetime for XML
 */
function formatXMLDateTime(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${day}.${month}.${year}T${hours}:${minutes}:${seconds}`;
}

/**
 * Generate UUID v4
 */
function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Generate SOAP envelope
 */
function generateSOAPEnvelope(
  fiscalData: FiscalizationRequest,
  zki: string,
  signXmlId: string
): string {
  const xmlDateTime = formatXMLDateTime(new Date(fiscalData.dateTime));
  const messageId = generateUUID();

  // Calculate VAT breakdown
  const baseAmount = fiscalData.totalAmount / 1.25;
  const vatAmount = fiscalData.totalAmount - baseAmount;

  return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
    <soap:Body>
        <tns:RacunZahtjev Id="${signXmlId}" xmlns:tns="http://www.apis-it.hr/fin/2012/types/f73">
            <tns:Zaglavlje>
                <tns:IdPoruke>${messageId}</tns:IdPoruke>
                <tns:DatumVrijeme>${xmlDateTime}</tns:DatumVrijeme>
            </tns:Zaglavlje>
            <tns:Racun>
                <tns:Oib>${fiscalData.oib}</tns:Oib>
                <tns:USustPdv>true</tns:USustPdv>
                <tns:DatVrijeme>${xmlDateTime}</tns:DatVrijeme>
                <tns:OznSlijed>N</tns:OznSlijed>
                <tns:BrRac>
                    <tns:BrOznRac>${fiscalData.invoiceNumber}</tns:BrOznRac>
                    <tns:OznPosPr>${CONFIG.BUSINESS_SPACE}</tns:OznPosPr>
                    <tns:OznNapUr>${CONFIG.CASH_REGISTER}</tns:OznNapUr>
                </tns:BrRac>
                <tns:Pdv>
                    <tns:Porez>
                        <tns:Stopa>25.00</tns:Stopa>
                        <tns:Osnovica>${baseAmount.toFixed(2)}</tns:Osnovica>
                        <tns:Iznos>${vatAmount.toFixed(2)}</tns:Iznos>
                    </tns:Porez>
                </tns:Pdv>
                <tns:IznosUkupno>${fiscalData.totalAmount.toFixed(2)}</tns:IznosUkupno>
                <tns:NacinPlac>${fiscalData.paymentMethod}</tns:NacinPlac>
                <tns:OibOper>${fiscalData.oib}</tns:OibOper>
                <tns:ZastKod>${zki}</tns:ZastKod>
                <tns:NakDost>false</tns:NakDost>
            </tns:Racun>
        </tns:RacunZahtjev>
    </soap:Body>
</soap:Envelope>`;
}

/**
 * Sign SOAP envelope with XML-DSIG
 */
function signSOAPEnvelope(
  soapEnvelope: string,
  signXmlId: string,
  certPem: string,
  privateKeyPem: string
): string {
  const sig = new SignedXml({
    privateKey: privateKeyPem,
    publicCert: certPem,
    signatureAlgorithm: 'http://www.w3.org/2000/09/xmldsig#rsa-sha1',
    canonicalizationAlgorithm: 'http://www.w3.org/2001/10/xml-exc-c14n#',
  });

  sig.addReference({
    xpath: `//*[@Id='${signXmlId}']`,
    digestAlgorithm: 'http://www.w3.org/2000/09/xmldsig#sha1',
    transforms: [
      'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
      'http://www.w3.org/2001/10/xml-exc-c14n#',
    ],
  });

  sig.computeSignature(soapEnvelope, {
    location: {
      reference: `//*[@Id='${signXmlId}']`,
      action: 'append',
    },
    prefix: '',
  });

  return sig.getSignedXml();
}

/**
 * Croatian Tax Authority TEST endpoint server certificate
 * Extracted from cistest.apis-it.hr:8449
 * Valid until: 2026-01-29
 */
const FINA_TEST_SERVER_CERT = `-----BEGIN CERTIFICATE-----
MIIHZzCCBU+gAwIBAgIQQlBtGrUWNmLAE8NMBp/unTANBgkqhkiG9w0BAQsFADBI
MQswCQYDVQQGEwJIUjEdMBsGA1UEChMURmluYW5jaWpza2EgYWdlbmNpamExGjAY
BgNVBAMTEUZpbmEgRGVtbyBDQSAyMDIwMB4XDTI1MDEyOTA4MzMyNloXDTI2MDEy
OTA4MzMyNlowczELMAkGA1UEBhMCSFIxFzAVBgNVBAoTDkFQSVMgSVQgRC5PLk8u
MQ8wDQYDVQQHEwZaQUdSRUIxGzAZBgNVBAMTEmNpc3Rlc3QuYXBpcy1pdC5ocjEd
MBsGA1UEBRMUVkFUSFItMDI5OTQ2NTAxOTkuNzIwggEiMA0GCSqGSIb3DQEBAQUA
A4IBDwAwggEKAoIBAQCC0mq+ZuvEMYCaXoq9AJ/R3uzja1but1W6+2sUMuF5iWW5
kqvAaZheet9OLEfQrU6y8Jxwz3zWx028iJDV8FGAox+92gTGBpvV4cj6XNYtNmCQ
fhYKy9i7oNTsNnC5piAeeumInWazh/kYmWFmC9K28bPbO9+hkFD2h83tHQFPBZ44
0GL7im87Fevl8g4778NHw44XBRQ0dIrIugfuXEyaYgnxle7qto0z1Tu5bmWcRQ8C
ypUzSzysSwdmQitj9MyLG1n5LNQjKyct9j3ic6On5QRR76ToyN5GKfzEgwAcoKoE
l9zrxrzYvzGwFXazXObbPQD7FG6mHs6reoyPnjjTAgMBAAGjggMgMIIDHDCCAQUG
CisGAQQB1nkCBAIEgfYEgfMA8QB2AMO/A6fhyohBxge64/9CcPyl7EWxhuu+Tizz
/HeGMPX2AAABlLExpRsAAAQDAEcwRQIgHcuQUclUcNV7aTcG1dEzU0rVobDcqw4o
bsWByU3m14kCIQCE9YFgI7SBhJP939VMQXf1aKJPRKtn2mETdw8z+sdIWwB3ALDM
g+Wl+X1rr3wJzChJBIcqx+iLEyxjULfG/SbhbGx3AAABlLExpioAAAQDAEgwRgIh
AOY+0oYFhbwXeWCXUoDFG4iYFXbm2yZC4GYpQVbzdbS1AiEAseJX6PSPuNfNdMnY
PuI7aJJ17dd9FL2GAyuHOOUWuK8wDgYDVR0PAQH/BAQDAgWgMB0GA1UdJQQWMBQG
CCsGAQUFBwMBBggrBgEFBQcDAjCBtwYDVR0gBIGvMIGsMIGVBggrfIhQBSEOAjCB
iDBCBggrBgEFBQcCARY2aHR0cDovL2RlbW8tcGtpLmZpbmEuaHIvY3BzL2Nwc292
Y3BkZW1vMjAxNHYyLTAtaHIucGRmMEIGCCsGAQUFBwIBFjZodHRwOi8vZGVtby1w
a2kuZmluYS5oci9jcHMvY3Bzb3ZjcGRlbW8yMDE0djItMC1lbi5wZGYwCAYGBACP
egEHMAgGBmeBDAECAjB9BggrBgEFBQcBAQRxMG8wKAYIKwYBBQUHMAGGHGh0dHA6
Ly9kZW1vMjAxNC1vY3NwLmZpbmEuaHIwQwYIKwYBBQUHMAKGN2h0dHA6Ly9kZW1v
LXBraS5maW5hLmhyL2NlcnRpZmlrYXRpL2RlbW8yMDIwX3N1Yl9jYS5jZXIwHQYD
VR0RBBYwFIISY2lzdGVzdC5hcGlzLWl0LmhyMD8GA1UdHwQ4MDYwNKAyoDCGLmh0
dHA6Ly9kZW1vLXBraS5maW5hLmhyL2NybC9kZW1vMjAyMHBhcnRjMS5jcmwwHwYD
VR0jBBgwFoAUla9S1cLp1zeEPm5Jj8kf6lwrX88wHQYDVR0OBBYEFP50HsjGl9WQ
JKzQyWpWnRoUJ0cgMAkGA1UdEwQCMAAwDQYJKoZIhvcNAQELBQADggIBACphxeuY
udG9vIm26DDH+d+Ulft4d0BcrallwG02JvIdXbKMFsZ3TQAuisd3yuHebSYd86V0
tngJODuTEM9oRkbZZEImzndPIlab/1ABti/krCX7m9KQEMaZDNzFYVWP8uXXOofW
FMa1gdzWmABtTSEE4ZcT/hAaRAWSCIlLElVaS/tWm6wu5YbPE/1UGw0JODhpToqI
uXD9/UBwwMq18zVVpIOMTbP3lS36UODN0LfVkCqUiyg7P1xM23XpQsXFnj9GtK5k
/+lrtpq5JLq/HpPw3paCaPj5yz1Rc6Hy+Ha8qRJH8LiSInp0JT0FAVpY6qfNLufN
TfdDKfdib+PnyiB2XgDy9EWGuxdExaaCcWrcxI2ts/mp0bqUKU/p9Z5IwWdddPAE
2I9WBNYn7+CNH0qzXtDnFR75xSp0OSFE0i9wJ1TGuInj3zVoRjeSZyaj0WCI7oB8
aj+T5UD4Qh66CqJ8KYyHagCMCWSGuzJpwFDGRUq4+o2IXLRbIHSCopLYHQAb81Oo
5YJ5Sd3G14NYIgYvvenYAj85lQD7ndg5Mm/xUbUJUpE5ooSSmN63+rdrBPUTsPMo
nSNCtG1lY78sQpzU8DIqHP6xWwN5277TTpWDpX/6pHuBXHuJbX+Nekzqt6w3NqK5
8vie9RizaRZC0vCjpUj/R3Dz591beYUW8Lmj
-----END CERTIFICATE-----`;

/**
 * Fina Demo CA 2020 (Certificate Authority)
 * Downloaded from http://demo-pki.fina.hr/certifikati/demo2020_sub_ca.cer
 * Valid until: 2030-07-31
 */
const FINA_TEST_CA_CERT = `-----BEGIN CERTIFICATE-----
MIIG2TCCBMGgAwIBAgIRAO+lAHYWpwKcAAAAAF2TJCUwDQYJKoZIhvcNAQELBQAw
SDELMAkGA1UEBhMCSFIxHTAbBgNVBAoTFEZpbmFuY2lqc2thIGFnZW5jaWphMRow
GAYDVQQDExFGaW5hIERlbW8gUm9vdCBDQTAeFw0yMDA3MzExMjMwMThaFw0zMDA3
MzExMjMwMThaMEgxCzAJBgNVBAYTAkhSMR0wGwYDVQQKExRGaW5hbmNpanNrYSBh
Z2VuY2lqYTEaMBgGA1UEAxMRRmluYSBEZW1vIENBIDIwMjAwggIiMA0GCSqGSIb3
DQEBAQUAA4ICDwAwggIKAoICAQDGVQs3lvOAWve/NVDXGyP3zxMKJni7rLCrAjFw
GpdyC4A1gU0FLjgAoAI+J4Pqg1RThHFgwufGU4OEVFT27I34x5RJeznX7WTkSQBY
m2zL9wYcvatXqBaP+AI/QJB7j8gaMrYuB1ERLRATSY8ylO0V2XnE6NizehiYPgzz
IRnB58GRKMeWMrVYY22DjXlxAcqiHGb2OpCh11VlOdO5VK9wo9zcp7wAmL5CaGRj
uEzplc17egBTXrpf4xprm9FA03Wr9bjXqROvaXOB7HXNLCYIMoQJuIGXOC9IJlCF
/JnOw65wFcWUm2udTMIQ/uNRT0BzKsOQMuew+9u+jx7qsFxxL0+fu0XLEySrlKS9
IS98AFRSESVJvDAjTo/OuLUfCyFgbzx8Q2LQ0s7zFij2wRyAIQSA3vlAAbfs3vsN
UR3kBJP0hSuyWlh1/1/Nzim/oHILp+oSe1Ze6nZfJmvrOxiiUOxdb+SRff47y81K
FJkteiNEC0/2AVjwcZ9cJm7Jz2hmEI92HHM0c30bam5ni9QzpJ3aegMCJnVJHoGx
yNt6v0F9ajJqAeK4e5NL/jpyFyGGYyrwEMZrmPT+7G3ZcyCfo7s43TAtArPRHJcA
jYie7EU6/39QO+QOLdPPSp2FKHJRKu2gCy44HOibJkCx9vXGavGNEfMPap0Syd5A
CxDNYQIDAQABo4IBvDCCAbgwDgYDVR0PAQH/BAQDAgEGMBIGA1UdEwEB/wQIMAYB
Af8CAQAwgZIGA1UdIASBijCBhzCBhAYHK3yIUAUBATB5MDkGCCsGAQUFBwIBFi1o
dHRwOi8vZGVtby1wa2kuZmluYS5oci9jcHMvY3BkZW1vcm9vdDEtMC5wZGYwPAYI
KwYBBQUHAgEWMGh0dHA6Ly9kZW1vLXBraS5maW5hLmhyL2Nwcy9jcGRlbW9yb290
MS0wLWVuLnBkZjB+BggrBgEFBQcBAQRyMHAwKAYIKwYBBQUHMAGGHGh0dHA6Ly9k
ZW1vMjAxNC1vY3NwLmZpbmEuaHIwRAYIKwYBBQUHMAKGOGh0dHA6Ly9kZW1vLXBr
aS5maW5hLmhyL2NlcnRpZmlrYXRpL2RlbW8yMDE0X3Jvb3RfY2EuY2VyMD0GA1Ud
HwQ2MDQwMqAwoC6GLGh0dHA6Ly9kZW1vLXBraS5maW5hLmhyL2NybC9EZW1vUm9v
dDIwMTQuY3JsMB8GA1UdIwQYMBaAFF9vWznJf0Hm5pEV+qG2tbLnglXVMB0GA1Ud
DgQWBBSVr1LVwunXN4Q+bkmPyR/qXCtfzzANBgkqhkiG9w0BAQsFAAOCAgEANsy0
uUErWKXMsF2i61mh5ZLdcJyLtDJYM+o59QPkrdkUkchtROZbdhWLu6XlZQlnZa5U
5/5W7xFPUVxYcou4mzYDRyfxXh7CiMFnVq1IPLuefH7VCi3lgoP+iAM+oIXImigc
rYxAh10NHhRhHcA2V9GRNgnZ0FtYp+16R8TblKpBbHHqmvrk/5IQ57O6iDo7uNds
qWlVkY0WiYvEhM4bWeEfrNucBvOWvMA0OgeIA/DsFI45wQTYKdHzqSlWUwInZJAN
Ql+PcFPkAgtWUr+HiD3ePTjvgXrLZDUnIo5Nzrz2DGCGb37q+GDxSD5IYSD6Mv7/
1AcK2gV80qV5ise7x3fVqTvaPDzCkumr6BI7ZRKMpwdJY6x8CX+jTj5XbMGtqdT5
LoGnNsBUkm3drVuSocFnDReBFO3sqW22W0HJIUrXyp+qNKSqGIf8uE9y36lAG2Bc
uyCgtQ73dBLDFSR838zpuvuvVQtXbKBhO/hxc3SPfeW+l5yLd/PlHy00VAgRf75V
0ANZWG+MzKW5V2xtjNXHDSSHFyimnR6/WkVi5z1LW2x+OcfIfNP7m/dBf318HIq9
omPCY3nFLSk5tqVPQKogO7iJjGumtwIGMKHagMSPupiLmeqQoL7qvSIaKDekuCJq
oKD4vN6CuQncv1QFl8ftNpBkc3UeOaaFjqsB/8Q=
-----END CERTIFICATE-----`;

/**
 * Send SOAP request to Croatian Tax Authority
 */
async function sendSOAPRequest(signedXML: string): Promise<string> {
  // Create HTTP client that trusts the full Croatian Tax Authority TEST certificate chain
  const client = Deno.createHttpClient({
    caCerts: [FINA_TEST_SERVER_CERT, FINA_TEST_CA_CERT],
  });

  const response = await fetch(
    `https://${CONFIG.TEST_URL}:${CONFIG.TEST_PORT}${CONFIG.TEST_PATH}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': '',
      },
      body: signedXML,
      // @ts-ignore - Deno-specific option
      client,
    }
  );

  return await response.text();
}

/**
 * Parse Croatian Tax Authority response
 */
function parseResponse(responseBody: string): {
  success: boolean;
  jir?: string;
  error?: string;
} {
  // Check for errors
  const errorMatch =
    responseBody.match(/<SifraGreske>(.+?)<\/SifraGreske>/) ||
    responseBody.match(/<tns:SifraGreske>(.+?)<\/tns:SifraGreske>/);
  const messageMatch =
    responseBody.match(/<PorukaGreske>(.+?)<\/PorukaGreske>/) ||
    responseBody.match(/<tns:PorukaGreske>(.+?)<\/tns:PorukaGreske>/);

  if (errorMatch) {
    const errorCode = errorMatch[1];
    const errorMessage = messageMatch ? messageMatch[1] : 'Unknown error';
    return {
      success: false,
      error: `${errorCode}: ${errorMessage}`,
    };
  }

  // Check for JIR
  const jirMatch =
    responseBody.match(/<Jir>(.+?)<\/Jir>/) ||
    responseBody.match(/<tns:Jir>(.+?)<\/tns:Jir>/);

  if (jirMatch) {
    return {
      success: true,
      jir: jirMatch[1],
    };
  }

  return {
    success: false,
    error: 'No JIR or error found in response',
  };
}

/**
 * Main fiscalization handler
 */
serve(async (req) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers':
          'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    // Parse request
    const fiscalRequest: FiscalizationRequest = await req.json();

    console.log('📋 Fiscalization request:', fiscalRequest);

    // Load certificate from base64-encoded environment variable
    if (!CONFIG.CERT_BASE64) {
      throw new Error('Certificate not configured (FISCAL_CERT_BASE64 missing)');
    }

    // Decode base64 certificate
    const certBinary = atob(CONFIG.CERT_BASE64);
    const p12Asn1 = forge.asn1.fromDer(certBinary);
    const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, CONFIG.CERT_PASSWORD);

    // Extract certificate and private key
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const certificate = certBags[forge.pki.oids.certBag][0].cert;

    const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
    const privateKey = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag][0].key;

    // Convert to PEM
    const certPem = forge.pki.certificateToPem(certificate);
    const privateKeyPem = forge.pki.privateKeyToPem(privateKey);

    // Generate ZKI
    const zki = await generateZKI(certificate, privateKey, {
      oib: fiscalRequest.oib,
      dateTime: fiscalRequest.dateTime,
      invoiceNumber: fiscalRequest.invoiceNumber,
      businessSpace: CONFIG.BUSINESS_SPACE,
      cashRegister: CONFIG.CASH_REGISTER,
      totalAmount: fiscalRequest.totalAmount,
    });

    // Generate SOAP envelope
    const signXmlId = `signXmlId${Date.now()}`;
    const soapEnvelope = generateSOAPEnvelope(fiscalRequest, zki, signXmlId);

    // Sign envelope
    const signedSOAP = signSOAPEnvelope(
      soapEnvelope,
      signXmlId,
      certPem,
      privateKeyPem
    );

    // Send to Croatian Tax Authority
    console.log('🚀 Sending SOAP request to Croatian Tax Authority...');

    const responseBody = await sendSOAPRequest(signedSOAP);
    const result = parseResponse(responseBody);

    console.log('📡 Croatian Tax Authority response received');
    console.log(`✅ Success: ${result.success}`);
    if (result.jir) {
      console.log(`📋 JIR: ${result.jir}`);
    }

    if (result.success && result.jir) {
      // Generate QR code data
      const qrCodeData = [
        'https://porezna-uprava.gov.hr/rn',
        result.jir,
        formatXMLDateTime(new Date(fiscalRequest.dateTime)),
        fiscalRequest.totalAmount.toFixed(2),
      ].join('|');

      const response: FiscalizationResponse = {
        success: true,
        jir: result.jir,
        zki,
        qrCodeData,
        timestamp: new Date().toISOString(),
      };

      console.log('✅ Fiscalization successful:', response);

      return new Response(JSON.stringify(response), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } else {
      const response: FiscalizationResponse = {
        success: false,
        error: result.error,
        timestamp: new Date().toISOString(),
      };

      console.error('❌ Fiscalization failed:', response);

      return new Response(JSON.stringify(response), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  } catch (error) {
    console.error('💥 Edge Function error:', error);

    const response: FiscalizationResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});
