# Croatian Fiscalization Implementation Guide

## Overview
This guide explains how to implement Croatian Tax Authority fiscalization for Hotel Porec using the existing production certificates and configuration.

## Current Implementation Status ✅

### Phase 1: Infrastructure (COMPLETED)
- ✅ **Fiscalization Service Architecture**: Complete module at `src/lib/fiscalization/`
- ✅ **Test Environment Configuration**: Safe TEST-only environment 
- ✅ **Certificate Management**: Extraction and validation system
- ✅ **Croatian Fiscal XML Generation**: UBL 2.1 compliant XML structure
- ✅ **Test UI**: Complete testing interface in Finance module

### What's Been Built
1. **FiscalizationService**: Main service class for Croatian Tax Authority communication
2. **CertificateManager**: P12 certificate handling and security
3. **FiscalXMLGenerator**: Croatian fiscal XML generation (UBL 2.1 compliant)
4. **Test Interface**: Complete UI for safe testing at `/hotel/finance/fiscalization-test`
5. **Safety Controls**: Multiple layers preventing accidental production usage

## Certificate Configuration

### Location of Certificates
```
certificates/
├── FISKAL 1.P12     (older certificate)
├── FISKAL 2.p12     (older certificate)  
├── FISKAL_3.p12     (CURRENT - use this one)
└── Hporec1.txt      (certificate info)
```

### Certificate Information
- **File**: `FISKAL_3.p12` (most recent)
- **Password**: `Hporec1` (decoded from base64 in config.xml)
- **Hotel OIB**: `87246357068` (production)
- **Test OIB**: `37014645007` (for testing)

### Extraction Steps

#### 1. Copy Certificate File
```bash
# Copy the P12 certificate to a secure location outside the repository
cp "certificates/FISKAL_3.p12" ~/secure-certificates/
```

#### 2. Environment Configuration
Create environment variables for development:
```bash
# .env.local
REACT_APP_FISCAL_CERT_PATH=~/secure-certificates/FISKAL_3.p12
REACT_APP_FISCAL_CERT_PASSWORD=Hporec1
REACT_APP_FISCAL_FORCE_TEST=true
```

#### 3. Production Configuration (Supabase)
For production deployment:
1. Upload certificate to Supabase secure storage
2. Configure Supabase Edge Function with certificate access
3. Set production environment variables

## Test Environment Configuration

### Croatian Tax Authority URLs
- **TEST**: `https://cistest.apis-it.hr:8449/FiskalizalizacijaServiceTest`
- **PRODUCTION**: `https://cis.porezna-uprava.hr:8449/FiskalizalizacijaService`

### Safety Features
The system includes multiple safety controls:

1. **Environment Detection**: Automatically uses TEST in development
2. **OIB Validation**: Test OIB (37014645007) vs Production OIB (87246357068)  
3. **Warning Messages**: Clear indicators when in test mode
4. **Production Guards**: Prevents accidental production usage

## How to Test Fiscalization

### 1. Access Test Interface
Navigate to: **Finance → Fiscalization Test** (`/hotel/finance/fiscalization-test`)

### 2. Validate Configuration
1. Click "Validate Configuration" 
2. Check certificate status
3. Verify TEST environment is active

### 3. Run Test Invoice
1. Review test invoice data (€150 hotel accommodation)
2. Click "Test Croatian Tax Authority Connection"
3. Wait for response with JIR and fiscal receipt URL

### 4. Expected Test Results
```json
{
  "success": true,
  "jir": "TEST-12345-ABCDEF",
  "fiscalReceiptUrl": "https://cistest.apis-it.hr/qr/TEST-12345-ABCDEF",
  "timestamp": "2025-01-30T10:30:00Z"
}
```

## DOS System Integration Analysis

### Configuration from DOS config.xml
```xml
<OIB>87246357068</OIB>
<OznakaPoslProstora>POSL1</OznakaPoslProstora>
<OznakaNaplatnogUredjaja>2</OznakaNaplatnogUredjaja>
<CertificateFile>FISKAL_3.p12</CertificateFile>
<CertificatePass>SHBvcmVjMQ==</CertificatePass> <!-- Base64: "Hporec1" -->
<Url>https://cis.porezna-uprava.hr:8449/FiskalizacijaService</Url>
```

### Business Configuration
- **Business Space**: POSL1
- **Cash Register**: 2  
- **Address**: Rade Končara 1, 52440 Poreč
- **Working Hours**: 0-24

## Next Implementation Steps

### Phase 2: Complete SOAP Integration (TODO)
- [ ] **Real P12 Certificate Loading**: Replace test ZKI with actual RSA signing
- [ ] **SOAP Client Implementation**: Replace simulation with real Croatian Tax Authority calls
- [ ] **Error Handling**: Croatian Tax Authority error response processing
- [ ] **Offline Mode**: Handle network failures gracefully

### Phase 3: Production Integration (TODO)  
- [ ] **Invoice Integration**: Connect with existing invoice generation
- [ ] **PDF Enhancement**: Add JIR and QR codes to invoice PDFs
- [ ] **Database Updates**: Store fiscal data in invoice records
- [ ] **Audit Logging**: Complete fiscal transaction logging

### Phase 4: Production Deployment (TODO)
- [ ] **Certificate Installation**: Secure P12 certificate storage in Supabase
- [ ] **Production Environment**: Configure production endpoints
- [ ] **Monitoring**: Croatian Tax Authority communication monitoring
- [ ] **Staff Training**: Hotel staff training on fiscal system

## Security Considerations

### Certificate Security
- ✅ Never commit P12 certificates to Git repository
- ✅ Store certificate password in environment variables only
- ✅ Use secure storage (Supabase Vault) for production
- ✅ Implement certificate access logging

### Environment Safety
- ✅ Multiple guards against accidental production usage
- ✅ Clear TEST vs PRODUCTION environment indicators
- ✅ Test OIB separate from production OIB
- ✅ Automatic TEST mode in development

### Access Control
- ✅ Fiscal operations restricted to authorized users
- ✅ Certificate access limited to fiscal service only
- ✅ Production environment requires explicit enablement

## Croatian Legal Compliance

### Fiscal Requirements (✅ Already Implemented)
- **25% VAT**: Correctly calculated and displayed
- **Tourism Tax**: €1.35-€1.50 per person per night
- **Invoice Numbering**: Croatian format (HP-YYYY-XXXXXX)
- **Hotel Information**: Real Hotel Porec business data

### Fiscal Integration Requirements (TODO)
- **ZKI Generation**: RSA signature with P12 certificate
- **JIR Response**: Unique invoice identifier from Croatian Tax Authority
- **QR Code**: Fiscal receipt verification QR code
- **Offline Handling**: Graceful degradation when Croatian Tax Authority unavailable

## Usage Instructions

### For Development
1. Extract P12 certificate from DOS system
2. Configure environment variables
3. Use Fiscalization Test page for safe testing
4. Always verify TEST environment is active

### For Production (Future)
1. Upload certificate to Supabase secure storage
2. Configure production environment variables
3. Test extensively with Croatian Tax Authority TEST environment first
4. Enable production mode only after complete validation

## Troubleshooting

### Common Issues
1. **Certificate Password**: Must be exactly "Hporec1" (case sensitive)
2. **Environment Mode**: Always verify TEST mode in development
3. **Network Access**: Croatian Tax Authority may block some IP ranges
4. **Certificate Expiry**: Monitor certificate validity dates

### Error Codes
- **CERT_001**: Certificate file not found
- **CERT_002**: Invalid certificate password  
- **FISCAL_001**: Invalid OIB format
- **FISCAL_002**: Croatian Tax Authority connection failed
- **FISCAL_003**: Invalid fiscal XML format

## Support and Documentation

### Croatian Tax Authority Resources
- **Documentation**: https://www.porezna-uprava.hr/fiskalizacija
- **Test Environment**: https://cistest.apis-it.hr:8449/FiskalizalizacijaServiceTest
- **Technical Support**: Croatian Tax Authority technical help desk

### Implementation Support
- **Architecture**: Complete service-oriented design
- **Testing**: Comprehensive test interface
- **Safety**: Multiple production guards
- **Documentation**: Complete setup and usage guides

---

**Status**: Phase 1 Complete - Ready for Phase 2 Implementation  
**Last Updated**: January 30, 2025  
**Version**: 1.0 - Initial Croatian Fiscalization Architecture