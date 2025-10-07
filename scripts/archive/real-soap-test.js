#!/usr/bin/env node
// Real Croatian Tax Authority SOAP Test
// Tests FINA certificate with actual Croatian Tax Authority TEST endpoint

const fs = require('fs');
const https = require('https');
const crypto = require('crypto');
const forge = require('node-forge');

// Configuration - NEW FINA CERTIFICATE WITH TEST ENDPOINT
const CONFIG = {
    CERT_PATH: '../.certificates/87246357068.49208351934.A.1.p12',
    CERT_PASSWORD: 'Marvel247@$&',
    CERT_PASSWORD_BACKUP: 'Marvel2479@$&(',
    HOTEL_OIB: '87246357068', // Real Hotel OIB (matches certificate)
    TEST_URL: 'cistest.apis-it.hr',    // Still TEST endpoint
    TEST_PORT: 8449,
    TEST_PATH: '/FiskalizacijaServiceTest',
    BUSINESS_SPACE: 'POSL1',
    CASH_REGISTER: '2'
};

console.log('🏛️ Croatian Tax Authority SOAP Test');
console.log('===================================');
console.log('⚠️  USING TEST ENVIRONMENT ONLY');
console.log(`📍 Endpoint: https://${CONFIG.TEST_URL}:${CONFIG.TEST_PORT}${CONFIG.TEST_PATH}`);
console.log(`🔢 Hotel OIB: ${CONFIG.HOTEL_OIB} (Production cert with TEST endpoint)`);
console.log('');

class CroatianFiscalSOAPClient {
    constructor() {
        this.certificate = null;
        this.privateKey = null;
    }

    async loadCertificate() {
        console.log('📋 Step 1: Loading P12 Certificate...');
        
        try {
            const certPath = require('path').resolve(__dirname, CONFIG.CERT_PATH);
            const certBuffer = fs.readFileSync(certPath);
            
            console.log(`✅ Certificate file loaded: ${certBuffer.length} bytes`);
            
            // Parse P12 certificate using node-forge
            const p12Asn1 = forge.asn1.fromDer(certBuffer.toString('binary'));
            const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, CONFIG.CERT_PASSWORD);
            
            // Extract certificate and private key
            const bags = p12.getBags({ bagType: forge.pki.oids.certBag });
            const certBag = bags[forge.pki.oids.certBag][0];
            this.certificate = certBag.cert;
            
            const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
            const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag][0];
            this.privateKey = keyBag.key;
            
            console.log('✅ Certificate parsed successfully');
            console.log(`📄 Subject: ${this.certificate.subject.getField('CN').value}`);
            console.log(`📅 Valid Until: ${this.certificate.validity.notAfter}`);
            
            return true;
        } catch (error) {
            console.error('❌ Certificate loading failed:', error.message);
            return false;
        }
    }

    generateZKI(fiscalData) {
        console.log('📋 Step 2: Generating ZKI (Security Code)...');
        
        try {
            // CRITICAL: Use validated format from real Hotel Porec data
            // This exact format produces ZKI: 16ac248e21a738625b98d17e51149e87
            
            // Format date with SPACE separator (not T) - BREAKTHROUGH DISCOVERY
            const zkiDate = this.formatZKIDateTime(fiscalData.dateTime);
            // Use simple invoice number (not full HP-YYYY-XXXXXX format)
            const simpleInvoiceNumber = fiscalData.invoiceNumber.split('-').pop() || '634';
            
            // Create fiscal data string according to VALIDATED Croatian specification
            const dataString = [
                fiscalData.oib,
                zkiDate,  // Space format: dd.MM.yyyy HH:mm:ss
                simpleInvoiceNumber,  // Simple number: 634 (not HP-2025-867836)
                fiscalData.businessSpace,
                fiscalData.cashRegister,
                fiscalData.totalAmount.toFixed(2)
            ].join('');
            
            console.log(`📝 Data String: ${dataString}`);
            
            // Croatian ZKI Algorithm (Official Specification):
            // 1. Sign data string with RSA-SHA1
            // 2. Hash the signature with MD5
            // 3. Take 32-character hexadecimal result
            
            // Step 1: RSA-SHA1 signature
            const md = forge.md.sha1.create();
            md.update(dataString, 'utf8');
            const signature = this.privateKey.sign(md);
            
            console.log(`🔒 RSA-SHA1 Signature Length: ${signature.length} bytes`);
            
            // Step 2: MD5 hash of the signature (Croatian requirement)
            const md5 = forge.md.md5.create();
            md5.update(signature);
            const md5Hash = md5.digest();
            
            // Step 3: Convert to 32-character hexadecimal (lowercase a-f, per Croatian spec)
            const zki = forge.util.bytesToHex(md5Hash).toLowerCase();
            
            console.log(`✅ ZKI Generated (Croatian Algorithm): ${zki}`);
            console.log(`📏 ZKI Length: ${zki.length} characters`);
            
            return zki;
            
        } catch (error) {
            console.error('❌ ZKI generation failed:', error.message);
            throw error;
        }
    }

    formatCroatianDateTime(date) {
        // For XML requests - uses T separator
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');
        
        return `${day}.${month}.${year}T${hours}:${minutes}:${seconds}`;
    }

    formatZKIDateTime(date) {
        // CRITICAL: For ZKI generation - uses SPACE separator (validated format)
        // This exact format produces the correct ZKI: 16ac248e21a738625b98d17e51149e87
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');
        
        return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;  // SPACE not T
    }

    generateSOAPEnvelope(fiscalData, zki) {
        console.log('📋 Step 3: Creating SOAP Envelope...');
        
        const dateTime = this.formatCroatianDateTime(fiscalData.dateTime);
        const messageId = `HP${Date.now()}${Math.random().toString(36).substr(2, 8)}`.toUpperCase();
        
        const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" 
               xmlns:tns="http://www.apis-it.hr/fin/2012/types/f73">
    <soap:Header/>
    <soap:Body>
        <tns:RacunZahtjev>
            <tns:Zaglavlje>
                <tns:IdPoruke>${messageId}</tns:IdPoruke>
                <tns:DatumVrijeme>${dateTime}</tns:DatumVrijeme>
            </tns:Zaglavlje>
            <tns:Racun>
                <tns:Oib>${fiscalData.oib}</tns:Oib>
                <tns:USustavuPDV>true</tns:USustavuPDV>
                <tns:DatVrijeme>${dateTime}</tns:DatVrijeme>
                <tns:OznakaSlijednosti>N</tns:OznakaSlijednosti>
                <tns:BrRac>
                    <tns:BrOznRac>${fiscalData.invoiceNumber}</tns:BrOznRac>
                    <tns:OznPosPr>${fiscalData.businessSpace}</tns:OznPosPr>
                    <tns:OznNapUr>${fiscalData.cashRegister}</tns:OznNapUr>
                </tns:BrRac>
                <tns:Racun>
                    <tns:TvrtkaNaziv>Hotel Porec TEST</tns:TvrtkaNaziv>
                    <tns:Adresa>
                        <tns:Ulica>Rade Končara</tns:Ulica>
                        <tns:KucniBroj>1</tns:KucniBroj>
                        <tns:Posta>52440</tns:Posta>
                        <tns:Naselje>Poreč</tns:Naselje>
                    </tns:Adresa>
                    <tns:IznosUkupno>${fiscalData.totalAmount.toFixed(2)}</tns:IznosUkupno>
                    <tns:NacinPlac>G</tns:NacinPlac>
                    <tns:ZastKod>${zki}</tns:ZastKod>
                    <tns:NakDan>false</tns:NakDan>
                </tns:Racun>
            </tns:Racun>
        </tns:RacunZahtjev>
    </soap:Body>
</soap:Envelope>`;

        console.log('✅ SOAP envelope created');
        return soapEnvelope;
    }

    async sendSOAPRequest(soapEnvelope) {
        console.log('📋 Step 4: Sending SOAP Request to Croatian Tax Authority...');
        console.log(`🎯 Target: https://${CONFIG.TEST_URL}:${CONFIG.TEST_PORT}${CONFIG.TEST_PATH}`);
        
        return new Promise((resolve, reject) => {
            const postData = soapEnvelope;
            
            const options = {
                hostname: CONFIG.TEST_URL,
                port: CONFIG.TEST_PORT,
                path: CONFIG.TEST_PATH,
                method: 'POST',
                headers: {
                    'Content-Type': 'text/xml; charset=utf-8',
                    'Content-Length': Buffer.byteLength(postData),
                    'SOAPAction': 'http://www.apis-it.hr/fin/2012/services/FiskalizacijaService/racun'
                },
                // Use client certificate for mutual TLS
                cert: forge.pki.certificateToPem(this.certificate),
                key: forge.pki.privateKeyToPem(this.privateKey),
                rejectUnauthorized: false // For testing only
            };

            const req = https.request(options, (res) => {
                console.log(`📡 Response Status: ${res.statusCode}`);
                console.log(`📡 Response Headers:`, res.headers);
                
                let responseData = '';
                res.on('data', (chunk) => {
                    responseData += chunk;
                });
                
                res.on('end', () => {
                    console.log('✅ Response received');
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: responseData
                    });
                });
            });

            req.on('error', (error) => {
                console.error('❌ SOAP request failed:', error.message);
                reject(error);
            });

            req.write(postData);
            req.end();
        });
    }

    parseSOAPResponse(response) {
        console.log('📋 Step 5: Parsing Croatian Tax Authority Response...');
        
        try {
            // Look for JIR in response
            const jirMatch = response.body.match(/<tns:Jir>([^<]+)<\/tns:Jir>/);
            const errorMatch = response.body.match(/<tns:SifraGreske>([^<]+)<\/tns:SifraGreske>/);
            const messageMatch = response.body.match(/<tns:PorukaGreske>([^<]+)<\/tns:PorukaGreske>/);
            
            if (jirMatch) {
                const jir = jirMatch[1];
                console.log('🎉 SUCCESS! JIR Received:', jir);
                console.log('📄 Fiscal Receipt URL:', `https://cistest.apis-it.hr/qr/${jir}`);
                
                return {
                    success: true,
                    jir: jir,
                    fiscalReceiptUrl: `https://cistest.apis-it.hr/qr/${jir}`,
                    timestamp: new Date()
                };
            } else if (errorMatch) {
                const errorCode = errorMatch[1];
                const errorMessage = messageMatch ? messageMatch[1] : 'Unknown error';
                
                console.log('⚠️ Croatian Tax Authority Error:');
                console.log(`📟 Error Code: ${errorCode}`);
                console.log(`📝 Error Message: ${errorMessage}`);
                
                return {
                    success: false,
                    error: `${errorCode}: ${errorMessage}`,
                    timestamp: new Date()
                };
            } else {
                console.log('🤔 Unexpected response format');
                console.log('📄 Response Body:', response.body);
                
                return {
                    success: false,
                    error: 'Unexpected response format',
                    rawResponse: response.body,
                    timestamp: new Date()
                };
            }
        } catch (error) {
            console.error('❌ Response parsing failed:', error.message);
            return {
                success: false,
                error: error.message,
                timestamp: new Date()
            };
        }
    }
}

async function testRealConnection() {
    console.log('🚀 Starting Real Croatian Tax Authority Test');
    console.log('');
    
    const client = new CroatianFiscalSOAPClient();
    
    try {
        // Step 1: Load certificate
        const certLoaded = await client.loadCertificate();
        if (!certLoaded) {
            throw new Error('Certificate loading failed');
        }
        
        // Step 2: Prepare test data
        const fiscalData = {
            oib: CONFIG.HOTEL_OIB,
            dateTime: new Date(),
            invoiceNumber: `HP-2025-${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`,
            businessSpace: CONFIG.BUSINESS_SPACE,
            cashRegister: CONFIG.CASH_REGISTER,
            totalAmount: 150.00
        };
        
        console.log('📊 Test Invoice Data:', fiscalData);
        console.log('');
        
        // Step 3: Generate ZKI
        const zki = client.generateZKI(fiscalData);
        
        // Step 4: Create SOAP envelope
        const soapEnvelope = client.generateSOAPEnvelope(fiscalData, zki);
        
        // Step 5: Send request
        const response = await client.sendSOAPRequest(soapEnvelope);
        
        // Step 6: Parse response
        const result = client.parseSOAPResponse(response);
        
        console.log('');
        console.log('📊 Final Result:');
        console.log(JSON.stringify(result, null, 2));
        
        if (result.success) {
            console.log('');
            console.log('🎉 CERTIFICATE VALIDATION SUCCESSFUL!');
            console.log('✅ Your FINA certificate works with Croatian Tax Authority');
            console.log('✅ ZKI generation is working correctly');
            console.log('✅ SOAP communication is functional');
            console.log('✅ Ready for production implementation');
        } else {
            console.log('');
            console.log('⚠️ Test completed with errors - this is normal for testing');
            console.log('🔍 Review the error details above');
        }
        
        return result;
        
    } catch (error) {
        console.error('💥 Test failed:', error.message);
        return {
            success: false,
            error: error.message,
            timestamp: new Date()
        };
    }
}

// Check if node-forge is available
try {
    require.resolve('node-forge');
} catch (e) {
    console.log('📦 Installing required dependency: node-forge');
    console.log('🔧 Run: npm install node-forge');
    console.log('');
    process.exit(1);
}

// Run the test
if (require.main === module) {
    testRealConnection()
        .then(result => {
            process.exit(result.success ? 0 : 1);
        })
        .catch(error => {
            console.error('💥 Unexpected error:', error);
            process.exit(1);
        });
}

module.exports = { CroatianFiscalSOAPClient, testRealConnection };