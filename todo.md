# FINA Certificate Testing - Real SOAP Client Implementation

## Overview
Create a Node.js script to test the actual FINA certificate (FISKAL_3.p12) with the Croatian Tax Authority TEST environment. This will validate our certificate works for real fiscal submissions before implementing in the web application.

## Task List

### Phase 1: Certificate Analysis and Setup
- [ ] **Task 1**: Create Node.js test script structure
- [ ] **Task 2**: Install required dependencies (node-forge, soap, crypto)
- [ ] **Task 3**: Load and parse FISKAL_3.p12 certificate with password "Hporec1"
- [ ] **Task 4**: Extract private key and certificate data for signing
- [ ] **Task 5**: Validate certificate expiry (should be valid until December 27, 2027)

### Phase 2: ZKI Generation Implementation
- [ ] **Task 6**: Implement Croatian ZKI algorithm (RSA-SHA1 signing)
- [ ] **Task 7**: Create fiscal data string formatting (OIB + datetime + invoice number + amount)
- [ ] **Task 8**: Generate proper ZKI signature using certificate private key
- [ ] **Task 9**: Validate ZKI generation with known test cases
- [ ] **Task 10**: Add proper hex encoding and formatting

### Phase 3: SOAP Client Implementation
- [ ] **Task 11**: Create SOAP envelope for Croatian Tax Authority
- [ ] **Task 12**: Implement proper XML structure for fiscal data submission
- [ ] **Task 13**: Add certificate authentication to SOAP header
- [ ] **Task 14**: Create business space and cash register data (POSL1, register 2)
- [ ] **Task 15**: Format test invoice data (€150 hotel accommodation)

### Phase 4: Croatian Tax Authority Integration
- [ ] **Task 16**: Configure TEST endpoint: https://cistest.apis-it.hr:8449/FiskalizacijaServiceTest
- [ ] **Task 17**: Use TEST OIB: 37014645007 (not real hotel OIB)
- [ ] **Task 18**: Implement proper HTTPS handling with certificate verification
- [ ] **Task 19**: Add timeout and error handling for network requests
- [ ] **Task 20**: Parse JIR response from Croatian Tax Authority

### Phase 5: Testing and Validation
- [ ] **Task 21**: Test certificate loading and password validation
- [ ] **Task 22**: Test ZKI generation with sample fiscal data
- [ ] **Task 23**: Test SOAP request creation and XML validation
- [ ] **Task 24**: Execute full submission to TEST endpoint
- [ ] **Task 25**: Validate JIR response and store results

## Implementation Strategy

### Technical Requirements
- **Node.js Environment**: Standalone script outside React app
- **Certificate Path**: example/DosProg/ffgastro/H Porec/FISKAL_3.p12
- **Certificate Password**: Hporec1
- **Test OIB**: 37014645007 (Croatian Tax Authority test number)
- **Test Endpoint**: https://cistest.apis-it.hr:8449/FiskalizacijaServiceTest

### Dependencies to Install
```bash
npm install --save-dev node-forge soap crypto-js axios xml2js
```

### Croatian Fiscal Specifications
- **Business Space**: POSL1 (business location identifier)
- **Cash Register**: 2 (register number)
- **ZKI Algorithm**: RSA-SHA1 signature of concatenated fiscal data
- **Fiscal Data Format**: OIB + DateTime + InvoiceNumber + TotalAmount
- **XML Schema**: Croatian Tax Authority UBL format

### Test Data Structure
```javascript
const testInvoice = {
  oib: '37014645007',           // TEST OIB only
  businessSpace: 'POSL1',       // Hotel business space
  cashRegister: '2',            // Cash register number
  invoiceNumber: 'HP-2025-000001',
  amount: 150.00,               // €150 hotel accommodation
  vatAmount: 30.00,             // 25% Croatian VAT
  datetime: new Date().toISOString()
};
```

## Files to Create
- `scripts/test-fina-certificate.js` - Main SOAP client script
- `scripts/utils/certificateLoader.js` - Certificate handling utilities
- `scripts/utils/zkiGenerator.js` - ZKI signature generation
- `scripts/utils/soapClient.js` - SOAP communication utilities

## Safety Requirements
- **TEST ONLY**: Must use TEST endpoint and TEST OIB
- **No Production**: Clear warnings about test mode only
- **Certificate Security**: Handle certificate data securely
- **Error Handling**: Comprehensive error messages for debugging

## Success Criteria
1. ✅ Certificate loads successfully from FISKAL_3.p12
2. ✅ Private key extracted and ready for signing
3. ✅ ZKI generation produces valid RSA-SHA1 signatures
4. ✅ SOAP envelope creates valid Croatian Tax Authority XML
5. ✅ Network communication with TEST endpoint succeeds
6. ✅ JIR response received from Croatian Tax Authority
7. ✅ Full fiscal submission workflow validated
8. ✅ Ready for web application integration

## Expected Output
```
✅ Certificate loaded: FISKAL_3.p12 (valid until 2027-12-27)
✅ ZKI generated: a1b2c3d4e5f6... (64 chars)
✅ SOAP envelope created: 2,847 bytes
✅ Submitted to Croatian Tax Authority TEST
✅ JIR received: 9f8e7d6c5b4a... (32 chars)
✅ Fiscal submission successful!
```

## Implementation Notes
- Create standalone Node.js script for testing
- Do not modify existing React application yet
- Focus on proving certificate works with Croatian Tax Authority
- Use real Croatian fiscal data structures and algorithms
- Test with actual FINA TEST environment
- Document all Croatian Tax Authority responses

---
**Status**: Planning Complete - Ready to Begin Node.js Implementation