#!/usr/bin/env node
// Validate ZKI Algorithm Against Real Hotel Porec Data
// Compare our implementation with known working ZKI from production

const forge = require('node-forge');
const fs = require('fs');
const path = require('path');

// Real Hotel Porec fiscal data from QR code and FZAHTJEV
const REAL_FISCAL_DATA = {
    // From QR code: https://porezna.gov.hr/rn?zki=16ac248e21a738625b98d17e51149e87&datv=20250802_2148&izn=700
    expectedZKI: '16ac248e21a738625b98d17e51149e87',
    oib: '87246357068',
    // Real data from FZAHTJEV file
    dateTime: '02/08/2025 21:48:29', // Exact format from FZAHTJEV
    invoiceNumber: '634',             // Exact from FZAHTJEV
    amount: '7.00',                   // Exact from FZAHTJEV
    businessProcess: '59984427582',   // Real business process from FZAHTJEV
    // Test different date formats
    dateFormats: [
        '02/08/2025 21:48:29',  // Exact from FZAHTJEV
        '02.08.2025T21:48:29',  // ISO-like format
        '02/08/2025T21:48:29',  // Mixed format
        '20250802214829',       // Compact format
        '2025-08-02T21:48:29',  // Full ISO format
        '02.08.2025 21:48:29'   // Dot separator
    ],
    // Test different business process codes
    businessProcesses: [
        '59984427582',  // Real from FZAHTJEV
        'POSL1',        // Standard code we used
        '2'             // Simple code
    ]
};

const CERT_PATH = path.resolve(__dirname, '../example/DosProg/ffgastro/H Porec/FISKAL_3.p12');
const CERT_PASSWORD = 'Hporec1';

console.log('🔍 ZKI Algorithm Validation Test');
console.log('================================');
console.log(`🎯 Target ZKI: ${REAL_FISCAL_DATA.expectedZKI}`);
console.log(`📅 Date/Time: ${REAL_FISCAL_DATA.dateTime}`);
console.log(`💰 Amount: €${REAL_FISCAL_DATA.amount}`);
console.log('');

class ZKIValidator {
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

    generateZKI(dataString, method = 'current') {
        try {
            if (method === 'current') {
                // Our current implementation: RSA-SHA1 + MD5
                const md = forge.md.sha1.create();
                md.update(dataString, 'utf8');
                const signature = this.privateKey.sign(md);
                
                const md5 = forge.md.md5.create();
                md5.update(signature);
                const md5Hash = md5.digest();
                
                return forge.util.bytesToHex(md5Hash).toLowerCase();
            } else if (method === 'direct_md5') {
                // Alternative: Direct MD5 of data string
                const md5 = forge.md.md5.create();
                md5.update(dataString, 'utf8');
                return forge.util.bytesToHex(md5.digest()).toLowerCase();
            } else if (method === 'rsa_only') {
                // Alternative: RSA signature only (first 32 chars)
                const md = forge.md.sha1.create();
                md.update(dataString, 'utf8');
                const signature = this.privateKey.sign(md);
                return forge.util.bytesToHex(signature).substring(0, 32).toLowerCase();
            }
        } catch (error) {
            console.error(`❌ ZKI generation failed (${method}):`, error.message);
            return null;
        }
    }

    testRealFiscalData() {
        console.log('🧪 Testing Real Hotel Porec Fiscal Data');
        console.log('========================================');
        
        const results = [];
        
        // Test with real business processes and date formats
        for (const businessProcess of REAL_FISCAL_DATA.businessProcesses) {
            for (const dateFormat of REAL_FISCAL_DATA.dateFormats) {
                console.log(`\n📋 Testing: Business Process "${businessProcess}", Date "${dateFormat}"`);
                
                // Create data string with real parameters
                const dataString = [
                    REAL_FISCAL_DATA.oib,
                    dateFormat,
                    REAL_FISCAL_DATA.invoiceNumber,
                    businessProcess,
                    '2',  // Operator number
                    REAL_FISCAL_DATA.amount
                ].join('');
                
                console.log(`📝 Data String: ${dataString}`);
                
                // Test different ZKI methods
                const methods = ['current', 'direct_md5', 'rsa_only'];
                
                for (const method of methods) {
                    const generatedZKI = this.generateZKI(dataString, method);
                    
                    if (generatedZKI) {
                        const isMatch = generatedZKI === REAL_FISCAL_DATA.expectedZKI;
                        const status = isMatch ? '🎉 MATCH!' : '❌ No match';
                        
                        console.log(`  ${method.padEnd(12)}: ${generatedZKI} ${status}`);
                        
                        if (isMatch) {
                            results.push({
                                businessProcess,
                                dateFormat,
                                method,
                                dataString,
                                zki: generatedZKI,
                                success: true
                            });
                        }
                    }
                }
            }
        }
        
        return results;
    }

    testDifferentDateFormats() {
        console.log('\n🕐 Testing Different Date/Time Formats');
        console.log('=====================================');
        
        const dateFormats = [
            '02.08.2025T21:48:29',  // Current format
            '02.08.2025T21:48',     // Without seconds
            '2.8.2025T21:48:29',    // Without leading zeros
            '02/08/2025T21:48:29',  // Different separator
            '20250802T214829',      // Compact format
            '02.08.25T21:48:29'     // Short year
        ];
        
        const results = [];
        
        for (const dateFormat of dateFormats) {
            console.log(`\n📅 Testing Date Format: "${dateFormat}"`);
            
            // Test with most likely invoice pattern
            const dataString = [
                REAL_FISCAL_DATA.oib,
                dateFormat,
                '634',  // Simple number from FZAHTJEV
                'POSL1',
                '2',
                REAL_FISCAL_DATA.amount
            ].join('');
            
            const generatedZKI = this.generateZKI(dataString, 'current');
            
            if (generatedZKI) {
                const isMatch = generatedZKI === REAL_FISCAL_DATA.expectedZKI;
                const status = isMatch ? '🎉 MATCH!' : '❌ No match';
                
                console.log(`  Generated ZKI: ${generatedZKI} ${status}`);
                
                if (isMatch) {
                    results.push({
                        dateFormat,
                        dataString,
                        zki: generatedZKI,
                        success: true
                    });
                }
            }
        }
        
        return results;
    }
}

async function runValidation() {
    const validator = new ZKIValidator();
    
    // Load certificate
    const certLoaded = await validator.loadCertificate();
    if (!certLoaded) {
        process.exit(1);
    }
    
    // Test real fiscal data patterns
    const realDataResults = validator.testRealFiscalData();
    
    // Summary
    console.log('\n📊 VALIDATION SUMMARY');
    console.log('====================');
    
    const allResults = [...realDataResults];
    
    if (allResults.length > 0) {
        console.log('🎉 SUCCESS! Found matching algorithm(s):');
        allResults.forEach((result, index) => {
            console.log(`\n${index + 1}. Success Configuration:`);
            console.log(`   Invoice Pattern: ${result.invoicePattern || 'N/A'}`);
            console.log(`   Date Format: ${result.dateFormat || 'Standard'}`);
            console.log(`   Method: ${result.method || 'current'}`);
            console.log(`   Data String: ${result.dataString}`);
            console.log(`   Generated ZKI: ${result.zki}`);
        });
        
        console.log('\n✅ ZKI Algorithm Successfully Validated!');
        console.log('✅ Ready for Croatian Tax Authority integration');
        
    } else {
        console.log('❌ No matching algorithm found');
        console.log('🔍 Need to investigate further or try different approaches');
        console.log('\nPossible issues:');
        console.log('- Invoice number format is different');
        console.log('- Date/time format needs adjustment');
        console.log('- Different ZKI calculation method needed');
        console.log('- Certificate key usage might be different');
    }
}

// Run validation
if (require.main === module) {
    runValidation()
        .then(() => {
            console.log('\n🏁 Validation completed');
        })
        .catch(error => {
            console.error('💥 Validation failed:', error);
            process.exit(1);
        });
}

module.exports = { ZKIValidator };