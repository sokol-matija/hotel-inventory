#!/usr/bin/env node
// Check all Hotel Porec certificates to find demo/test certificates

const fs = require('fs');
const forge = require('node-forge');
const path = require('path');

const CERT_PASSWORD = 'Hporec1';
const CERT_DIR = '../example/DosProg/ffgastro/H Porec';

const certificates = [
    'FISKAL 1.P12',
    'FISKAL 2.p12', 
    'FISKAL_3.p12'
];

console.log('🔍 Checking All Hotel Porec Certificates');
console.log('========================================');
console.log('Looking for demo/test certificates that work with TEST endpoint');
console.log('');

async function checkCertificate(certFile) {
    console.log(`📋 Checking: ${certFile}`);
    console.log('-'.repeat(50));
    
    try {
        const certPath = path.resolve(__dirname, CERT_DIR, certFile);
        
        if (!fs.existsSync(certPath)) {
            console.log('❌ File not found');
            return;
        }
        
        const certBuffer = fs.readFileSync(certPath);
        const p12Asn1 = forge.asn1.fromDer(certBuffer.toString('binary'));
        const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, CERT_PASSWORD);
        
        const bags = p12.getBags({ bagType: forge.pki.oids.certBag });
        const certBag = bags[forge.pki.oids.certBag][0];
        const certificate = certBag.cert;
        
        // Extract certificate details
        const subject = certificate.subject.getField('CN')?.value || 'Unknown';
        const issuer = certificate.issuer.getField('CN')?.value || 'Unknown';
        const validFrom = certificate.validity.notBefore;
        const validUntil = certificate.validity.notAfter;
        const isExpired = new Date() > validUntil;
        
        console.log(`📄 Subject: ${subject}`);
        console.log(`🏛️ Issuer: ${issuer}`);
        console.log(`📅 Valid From: ${validFrom}`);
        console.log(`📅 Valid Until: ${validUntil}`);
        console.log(`⏰ Status: ${isExpired ? '❌ EXPIRED' : '✅ VALID'}`);
        
        // Check if this might be a demo certificate
        const isDemoCandidate = issuer.toLowerCase().includes('demo') || 
                               issuer.toLowerCase().includes('test') ||
                               subject.toLowerCase().includes('demo') ||
                               subject.toLowerCase().includes('test');
        
        if (isDemoCandidate) {
            console.log('🎯 *** POTENTIAL DEMO CERTIFICATE ***');
        }
        
        // Check certificate chain
        console.log('🔗 Certificate Chain Analysis:');
        console.log(`   Subject CN: ${subject}`);
        console.log(`   Issuer CN: ${issuer}`);
        
        if (issuer.includes('Demo')) {
            console.log('   🎯 This appears to be a DEMO certificate!');
        } else if (issuer.includes('FINA')) {
            console.log('   🏢 This appears to be a PRODUCTION certificate');
        }
        
        console.log('');
        
        return {
            file: certFile,
            subject,
            issuer, 
            validUntil,
            isExpired,
            isDemoCandidate,
            isValid: !isExpired
        };
        
    } catch (error) {
        console.log(`❌ Failed to read certificate: ${error.message}`);
        console.log('');
        return null;
    }
}

async function checkAllCertificates() {
    const results = [];
    
    for (const certFile of certificates) {
        const result = await checkCertificate(certFile);
        if (result) {
            results.push(result);
        }
    }
    
    console.log('📊 SUMMARY');
    console.log('==========');
    
    const validCerts = results.filter(r => r.isValid);
    const demoCerts = results.filter(r => r.isDemoCandidate);
    
    console.log(`Total certificates: ${results.length}`);
    console.log(`Valid certificates: ${validCerts.length}`);
    console.log(`Potential demo certificates: ${demoCerts.length}`);
    console.log('');
    
    if (demoCerts.length > 0) {
        console.log('🎯 DEMO CERTIFICATE CANDIDATES:');
        demoCerts.forEach(cert => {
            console.log(`   📄 ${cert.file}`);
            console.log(`      Issuer: ${cert.issuer}`);
            console.log(`      Status: ${cert.isValid ? '✅ Valid' : '❌ Expired'}`);
        });
        console.log('');
    }
    
    if (validCerts.length > 0) {
        console.log('✅ VALID CERTIFICATES:');
        validCerts.forEach(cert => {
            console.log(`   📄 ${cert.file}`);
            console.log(`      Subject: ${cert.subject}`);
            console.log(`      Issuer: ${cert.issuer}`);
            console.log(`      Valid Until: ${cert.validUntil}`);
        });
        console.log('');
    }
    
    console.log('🔧 RECOMMENDATIONS:');
    
    if (demoCerts.filter(c => c.isValid).length > 0) {
        console.log('1. Try using the demo certificate(s) listed above');
        console.log('2. These should resolve the s002 certificate environment error');
    } else if (validCerts.length > 0) {
        console.log('1. All certificates appear to be production certificates');
        console.log('2. You need to request a proper DEMO certificate from FINA');
        console.log('3. Contact: fiskalizacija.help@apis-it.hr');
    } else {
        console.log('1. All certificates are expired');
        console.log('2. Request new certificates from FINA');
    }
    
    console.log('4. For testing, use: https://cistest.apis-it.hr:8449/FiskalizacijaServiceTest');
    console.log('5. For production, use: https://cis.porezna-uprava.hr:8449/FiskalizacijaService');
}

// Run analysis
checkAllCertificates().catch(error => {
    console.error('💥 Analysis failed:', error);
    process.exit(1);
});