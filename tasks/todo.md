# Croatian Fiscalization Service Architecture - TODO

## Plan Overview
Create a comprehensive Croatian fiscalization service architecture for Hotel Porec based on DOS system analysis. This will integrate with the existing e-računi system and hotel invoice generation while ensuring SAFE testing with Croatian Tax Authority.

## Analysis Summary
**Existing Systems Found:**
- ✅ E-računi system already exists (`src/lib/eracuni/`)
- ✅ PDF invoice generator with Croatian fiscal compliance (`src/lib/pdfInvoiceGenerator.ts`)
- ✅ Hotel finance module with fiscal compliance UI (`src/components/hotel/finance/FiscalCompliancePage.tsx`)
- ✅ Hotel types with Croatian fiscal fields (`src/lib/hotel/types.ts`)

**DOS System Information:**
- Certificate files: FISKAL 1.P12, FISKAL 2.p12, FISKAL_3.p12
- Certificate password: "Hporec1" (base64: SHBvcmVjMQ==)
- Hotel OIB: 87246357068
- Business space: POSL1, Cash register: 2
- TEST URL: https://cistest.apis-it.hr:8449/FiskalizacijaServiceTest
- PRODUCTION URL: https://cis.porezna-uprava.hr:8449/FiskalizacijaService
- Test OIB: 37014645007

## Tasks

### Phase 1: Create Fiscalization Service Module
- [ ] **Task 1.1**: Create `src/lib/fiscalization/` directory structure
- [ ] **Task 1.2**: Create `FiscalizationService.ts` - Main service class with SOAP communication
- [ ] **Task 1.3**: Create `types.ts` - Croatian fiscal types and interfaces (extend existing)
- [ ] **Task 1.4**: Create `config.ts` - TEST/PRODUCTION environment configuration with safety checks
- [ ] **Task 1.5**: Create `xmlGenerator.ts` - Croatian fiscal XML generation (ZKI, JIR calculation)
- [ ] **Task 1.6**: Create `certificate.ts` - Certificate management utilities and validation

### Phase 2: Test Environment Configuration
- [ ] **Task 2.1**: Add TEST-only configuration with clear separation from production
- [ ] **Task 2.2**: Implement safety checks to prevent accidental production API calls
- [ ] **Task 2.3**: Add comprehensive error handling for fiscal operations
- [ ] **Task 2.4**: Create logging system for fiscal operations and debugging

### Phase 3: Integration with Existing Systems
- [ ] **Task 3.1**: Extend existing Invoice interface with additional fiscal fields
- [ ] **Task 3.2**: Hook into existing `generatePDFInvoice` function with fiscal enhancements
- [ ] **Task 3.3**: Update existing fiscal compliance UI to use new service
- [ ] **Task 3.4**: Maintain compatibility with existing e-računi system

### Phase 4: Certificate Management & Security
- [ ] **Task 4.1**: Document certificate extraction process from DOS system
- [ ] **Task 4.2**: Create secure certificate storage approach for Supabase environment
- [ ] **Task 4.3**: Add certificate validation and expiry checking
- [ ] **Task 4.4**: Implement certificate rotation planning

### Phase 5: Testing & Validation
- [ ] **Task 5.1**: Create comprehensive test suite for fiscal XML generation
- [ ] **Task 5.2**: Add validation for Croatian fiscal requirements (OIB, ZKI, JIR formats)
- [ ] **Task 5.3**: Create test page/interface for fiscal operations
- [ ] **Task 5.4**: Document testing procedures with Croatian Tax Authority test environment

## Requirements
- ✅ Use TypeScript strictly (following existing patterns)
- ✅ Start with TEST environment only (safety first)
- ✅ Follow existing code patterns in hotel module
- ✅ Never accidentally hit production endpoints
- ✅ Comprehensive error handling and logging
- ✅ Integration with existing invoice and e-računi systems

## Notes
- Focus on architecture first - SOAP communication and ZKI generation will be implemented after architecture is complete
- All fiscal operations must be logged for audit trail
- Certificate security is critical - never expose certificates in code
- Must maintain compatibility with existing Hotel Porec business data