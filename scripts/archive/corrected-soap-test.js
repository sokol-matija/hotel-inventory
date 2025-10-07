#!/usr/bin/env node
// Corrected Croatian Tax Authority SOAP Test
// Based on DOS system analysis and official documentation

const fs = require('fs');
const https = require('https');
const forge = require('node-forge');
const path = require('path');

// Configuration - NEW FINA Certificate
const CONFIG = {
    CERT_PATH: '../.certificates/87246357068.49208351934.A.1.p12',
    CERT_PASSWORD: 'Marvel247@$&',
    CERT_PASSWORD_BACKUP: 'Marvel2479@$&(',
    HOTEL_OIB: '87246357068',
    TEST_URL: 'cistest.apis-it.hr',
    TEST_PORT: 8449,
    TEST_PATH: '/FiskalizacijaServiceTest',
    BUSINESS_SPACE: 'POSL1',
    CASH_REGISTER: '2'
};

console.log('🔧 Corrected Croatian Tax Authority SOAP Test');
console.log('============================================');
console.log('📋 Based on DOS system analysis and documentation');
console.log(`📍 Endpoint: https://${CONFIG.TEST_URL}:${CONFIG.TEST_PORT}${CONFIG.TEST_PATH}`);
console.log('');

class CorrectedFiscalSOAPClient {
    constructor() {
        this.certificate = null;
        this.privateKey = null;
    }

    async loadCertificate() {
        console.log('📋 Step 1: Loading P12 Certificate...');
        
        try {
            const certPath = path.resolve(__dirname, CONFIG.CERT_PATH);
            const certBuffer = fs.readFileSync(certPath);
            
            const p12Asn1 = forge.asn1.fromDer(certBuffer.toString('binary'));
            const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, CONFIG.CERT_PASSWORD);
            
            const bags = p12.getBags({ bagType: forge.pki.oids.certBag });
            const certBag = bags[forge.pki.oids.certBag][0];
            this.certificate = certBag.cert;
            
            const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
            const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag][0];
            this.privateKey = keyBag.key;
            
            console.log('✅ Certificate loaded successfully');
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
            // VALIDATED format from real Hotel Porec data
            const zkiDate = this.formatZKIDateTime(fiscalData.dateTime);
            const simpleInvoiceNumber = fiscalData.invoiceNumber.toString();
            
            const dataString = [
                fiscalData.oib,
                zkiDate,
                simpleInvoiceNumber,
                fiscalData.businessSpace,
                fiscalData.cashRegister,
                fiscalData.totalAmount.toFixed(2)
            ].join('');
            
            console.log(`📝 ZKI Data String: ${dataString}`);
            
            // Croatian ZKI Algorithm (Validated)
            const md = forge.md.sha1.create();
            md.update(dataString, 'utf8');
            const signature = this.privateKey.sign(md);
            
            const md5 = forge.md.md5.create();
            md5.update(signature);
            const md5Hash = md5.digest();
            
            const zki = forge.util.bytesToHex(md5Hash).toLowerCase();
            console.log(`🔒 ZKI Generated: ${zki}`);
            
            return zki;
            
        } catch (error) {
            console.error('❌ ZKI generation failed:', error.message);
            throw error;
        }
    }

    formatZKIDateTime(date) {
        // For ZKI generation - SPACE separator (validated format)
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const seconds = String(d.getSeconds()).padStart(2, '0');
        
        return `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
    }

    formatXMLDateTime(date) {
        // For XML requests - ISO format (based on documentation)
        return date.toISOString();
    }

    generateCorrectedSOAPEnvelope(fiscalData, zki) {
        console.log('📋 Step 3: Creating Corrected SOAP Envelope...');
        
        const xmlDateTime = this.formatXMLDateTime(fiscalData.dateTime);
        const messageId = `HP${Date.now()}${Math.random().toString(36).substr(2, 8)}`.toUpperCase();
        
        // CORRECTED SOAP envelope based on DOS analysis and documentation
        const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" 
               xmlns:tns="http://www.apis-it.hr/fin/2012/types/f73"
               xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <soap:Header/>
    <soap:Body>
        <tns:RacunZahtjev>
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
                <tns:IznosUkupno>${fiscalData.totalAmount.toFixed(2)}</tns:IznosUkupno>
                <tns:NacinPlac>G</tns:NacinPlac>
                <tns:ZastKod>${zki}</tns:ZastKod>
                <tns:NakDan>false</tns:NakDan>
            </tns:Racun>
        </tns:RacunZahtjev>
    </soap:Body>
</soap:Envelope>`;
        
        console.log('✅ Corrected SOAP envelope created');
        return soapEnvelope;
    }

    async sendSOAPRequest(soapEnvelope) {
        console.log('📋 Step 4: Sending Corrected SOAP Request...');
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
                    'SOAPAction': ''
                },
                rejectUnauthorized: false
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
                console.error('❌ Request failed:', error.message);
                reject(error);
            });
            
            req.write(postData);
            req.end();
        });
    }

    parseResponse(responseBody) {
        console.log('📋 Step 5: Parsing Croatian Tax Authority Response...');
        
        try {
            // Check for SOAP fault or error
            if (responseBody.includes('soap:Fault') || responseBody.includes('SoapFault')) {
                const errorMatch = responseBody.match(/<SifraGreske>(.+?)<\/SifraGreske>/);
                const messageMatch = responseBody.match(/<PorukaGreske>(.+?)<\/PorukaGreske>/);
                
                const errorCode = errorMatch ? errorMatch[1] : 'Unknown';
                const errorMessage = messageMatch ? messageMatch[1] : 'Unknown error';
                
                console.log('⚠️ Croatian Tax Authority Error:');
                console.log(`📟 Error Code: ${errorCode}`);
                console.log(`📝 Error Message: ${errorMessage}`);
                
                return {
                    success: false,
                    error: `${errorCode}: ${errorMessage}`,
                    timestamp: new Date().toISOString()
                };
            }
            
            // Check for successful response with JIR
            const jirMatch = responseBody.match(/<Jir>(.+?)<\/Jir>/);
            if (jirMatch) {
                const jir = jirMatch[1];
                console.log('🎉 SUCCESS! Croatian Tax Authority Response:');
                console.log(`📋 JIR (Unique Invoice ID): ${jir}`);
                
                return {
                    success: true,
                    jir: jir,
                    timestamp: new Date().toISOString()
                };
            }
            
            // Print full response for analysis
            console.log('📄 Full response for analysis:');
            console.log(responseBody);
            
            // Try to extract any JIR from RacunOdgovor format
            const jirAltMatch = responseBody.match(/<tns:Jir>(.+?)<\/tns:Jir>/);
            if (jirAltMatch) {
                const jir = jirAltMatch[1];
                console.log('🎉 SUCCESS! JIR found in RacunOdgovor:');
                console.log(`📋 JIR (Unique Invoice ID): ${jir}`);
                
                return {
                    success: true,
                    jir: jir,
                    timestamp: new Date().toISOString()
                };
            }
            
            // Look for errors in different format
            const errorAltMatch = responseBody.match(/<tns:SifraGreske>(.+?)<\/tns:SifraGreske>/);
            const messageAltMatch = responseBody.match(/<tns:PorukaGreske>(.+?)<\/tns:PorukaGreske>/);
            
            if (errorAltMatch) {
                const errorCode = errorAltMatch[1];
                const errorMessage = messageAltMatch ? messageAltMatch[1] : 'Unknown error';
                
                console.log('⚠️ Croatian Tax Authority Error (RacunOdgovor format):');
                console.log(`📟 Error Code: ${errorCode}`);
                console.log(`📝 Error Message: ${errorMessage}`);
                
                return {
                    success: false,
                    error: `${errorCode}: ${errorMessage}`,
                    timestamp: new Date().toISOString()
                };
            }
            
            return {
                success: false,
                error: 'Response received but no JIR or error found',
                rawResponse: responseBody,
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('❌ Response parsing failed:', error.message);
            return {
                success: false,
                error: `Parsing error: ${error.message}`,
                timestamp: new Date().toISOString()
            };
        }
    }
}

async function runCorrectedTest() {
    console.log('🚀 Starting Corrected Croatian Tax Authority Test');
    console.log('');
    
    const client = new CorrectedFiscalSOAPClient();
    
    // Step 1: Load certificate
    const certLoaded = await client.loadCertificate();
    if (!certLoaded) {
        process.exit(1);
    }
    
    // Step 2: Prepare test data (using simpler values closer to DOS system)
    const fiscalData = {
        oib: CONFIG.HOTEL_OIB,
        dateTime: new Date(),
        invoiceNumber: Math.floor(Math.random() * 9000) + 1000, // Simple 4-digit number
        businessSpace: CONFIG.BUSINESS_SPACE,
        cashRegister: CONFIG.CASH_REGISTER,
        totalAmount: 50.00 // Simpler amount
    };
    
    console.log('📊 Test Invoice Data:', fiscalData);
    console.log('');
    
    // Step 3: Generate ZKI
    const zki = client.generateZKI(fiscalData);
    
    // Step 4: Create corrected SOAP envelope
    const soapEnvelope = client.generateCorrectedSOAPEnvelope(fiscalData, zki);
    
    // Step 5: Send request
    try {
        const response = await client.sendSOAPRequest(soapEnvelope);
        
        // Step 6: Parse response  
        const result = client.parseResponse(response.body);
        
        console.log('');
        console.log('📊 Final Result:');
        console.log(JSON.stringify(result, null, 2));
        
        if (result.success) {
            console.log('');
            console.log('🎉 SUCCESS! Fiscalization completed successfully!');
            console.log('✅ Our corrected SOAP format works with Croatian Tax Authority');
            console.log('✅ We can now generate both ZKI and receive JIR');
        } else {
            console.log('');
            console.log('⚠️ Still getting errors - need further SOAP format refinement');
            console.log('🔍 Check error details above for specific issues');
        }
        
    } catch (error) {
        console.error('💥 Test failed:', error.message);
    }
}

// Run corrected test
if (require.main === module) {
    runCorrectedTest().catch(error => {
        console.error('💥 Corrected test failed:', error);
        process.exit(1);
    });
}