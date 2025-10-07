#!/usr/bin/env node
// Test with EXACT validated data from Hotel Porec DOS system
// This should produce ZKI: 16ac248e21a738625b98d17e51149e87

const forge = require('node-forge');
const fs = require('fs');
const path = require('path');

// EXACT validated data from real Hotel Porec fiscal receipt
const VALIDATED_DATA = {
    oib: '87246357068',
    dateTime: '02.08.2025 21:48:29',  // Exact from FZAHTJEV
    invoiceNumber: '634',              // Simple number from FZAHTJEV
    businessSpace: 'POSL1',
    cashRegister: '2',
    totalAmount: '7.00',               // Exact amount from FZAHTJEV
    expectedZKI: '16ac248e21a738625b98d17e51149e87'
};

const CERT_PATH = path.resolve(__dirname, '../example/DosProg/ffgastro/H Porec/FISKAL_3.p12');
const CERT_PASSWORD = 'Hporec1';

console.log('🔍 Testing EXACT Validated ZKI Data');
console.log('==================================');
console.log(`🎯 Expected ZKI: ${VALIDATED_DATA.expectedZKI}`);
console.log('');

class ExactZKIValidator {
    constructor() {
        this.certificate = null;
        this.privateKey = null;
    }

    async loadCertificate() {
        try {
            const certBuffer = fs.readFileSync(CERT_PATH);
            const p12Asn1 = forge.asn1.fromDer(certBuffer.toString('binary'));
            const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, CERT_PASSWORD);
            
            const bags = p12.getBags({ bagType: forge.pki.oids.certBag });
            const certBag = bags[forge.pki.oids.certBag][0];
            this.certificate = certBag.cert;
            
            const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
            const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag][0];
            this.privateKey = keyBag.key;
            
            console.log('✅ Certificate loaded successfully');
            return true;
        } catch (error) {
            console.error('❌ Certificate loading failed:', error.message);
            return false;
        }
    }

    generateZKI(dataString) {
        try {
            // Croatian ZKI Algorithm (Validated):
            // 1. Sign data string with RSA-SHA1
            // 2. Hash the signature with MD5
            // 3. Take 32-character hexadecimal result
            const md = forge.md.sha1.create();
            md.update(dataString, 'utf8');
            const signature = this.privateKey.sign(md);
            
            const md5 = forge.md.md5.create();
            md5.update(signature);
            const md5Hash = md5.digest();
            
            return forge.util.bytesToHex(md5Hash).toLowerCase();
        } catch (error) {
            console.error('❌ ZKI generation failed:', error.message);
            return null;
        }
    }

    testExactValidatedData() {
        console.log('🧪 Testing with EXACT validated data from Hotel Porec DOS system');
        console.log('=============================================================');
        
        // Create data string with EXACT validated format
        const dataString = [
            VALIDATED_DATA.oib,
            VALIDATED_DATA.dateTime,
            VALIDATED_DATA.invoiceNumber,
            VALIDATED_DATA.businessSpace,
            VALIDATED_DATA.cashRegister,
            VALIDATED_DATA.totalAmount
        ].join('');
        
        console.log(`📝 Data String: ${dataString}`);
        console.log(`🎯 Expected ZKI: ${VALIDATED_DATA.expectedZKI}`);
        
        const generatedZKI = this.generateZKI(dataString);
        console.log(`🔐 Generated ZKI: ${generatedZKI}`);
        
        const isMatch = generatedZKI === VALIDATED_DATA.expectedZKI;
        console.log(`✅ ZKI Match: ${isMatch ? 'YES ✅' : 'NO ❌'}`);
        
        if (isMatch) {
            console.log('');
            console.log('🎉 SUCCESS! Our algorithm produces the EXACT validated ZKI');
            console.log('📋 This proves our certificate and algorithm are correct');
            console.log('⚠️  The s004 error is likely due to format differences in SOAP request');
        } else {
            console.log('');
            console.log('❌ MISMATCH! Need to investigate certificate or algorithm');
        }
        
        return isMatch;
    }

    testCurrentSOAPFormat() {
        console.log('');
        console.log('🧪 Testing Current SOAP Test Format');
        console.log('==================================');
        
        // Test with format similar to what real-soap-test.js generates
        const currentDate = new Date();
        const day = String(currentDate.getDate()).padStart(2, '0');
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const year = currentDate.getFullYear();
        const hours = String(currentDate.getHours()).padStart(2, '0');
        const minutes = String(currentDate.getMinutes()).padStart(2, '0');
        const seconds = String(currentDate.getSeconds()).padStart(2, '0');
        
        const currentDateTime = `${day}.${month}.${year} ${hours}:${minutes}:${seconds}`;
        const randomInvoiceNumber = Math.floor(Math.random() * 900000) + 100000;
        
        const currentDataString = [
            VALIDATED_DATA.oib,
            currentDateTime,
            randomInvoiceNumber.toString(),
            VALIDATED_DATA.businessSpace,
            VALIDATED_DATA.cashRegister,
            '150.00'
        ].join('');
        
        console.log(`📝 Current Data String: ${currentDataString}`);
        
        const currentZKI = this.generateZKI(currentDataString);
        console.log(`🔐 Current Generated ZKI: ${currentZKI}`);
        console.log(`📊 This would be sent to Croatian Tax Authority TEST endpoint`);
        
        return currentZKI;
    }
}

async function runValidation() {
    const validator = new ExactZKIValidator();
    
    // Load certificate
    const certLoaded = await validator.loadCertificate();
    if (!certLoaded) {
        process.exit(1);
    }
    
    // Test exact validated data
    const exactMatch = validator.testExactValidatedData();
    
    // Test current SOAP format
    const currentZKI = validator.testCurrentSOAPFormat();
    
    console.log('');
    console.log('📊 ANALYSIS SUMMARY');
    console.log('==================');
    
    if (exactMatch) {
        console.log('✅ Certificate and algorithm are CORRECT');
        console.log('✅ Our implementation matches real Hotel Porec DOS system');
        console.log('⚠️  s004 error is likely due to:');
        console.log('   1. Invoice number format in SOAP XML');
        console.log('   2. Date format in SOAP XML vs ZKI generation');
        console.log('   3. XML structure or namespace issues');
        console.log('');
        console.log('🔧 NEXT STEPS:');
        console.log('1. Fix SOAP XML to match exact DOS system format');
        console.log('2. Use simple invoice numbers (634 not HP-2025-XXXXXX)');
        console.log('3. Consider testing with exact validated amounts');
    } else {
        console.log('❌ Algorithm or certificate issue needs investigation');
    }
}

// Run validation
if (require.main === module) {
    runValidation().catch(error => {
        console.error('💥 Validation failed:', error);
        process.exit(1);
    });
}