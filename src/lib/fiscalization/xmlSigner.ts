// Croatian Fiscal XML Digital Signature (XML-DSIG)
// Implements XML signature according to Croatian Tax Authority requirements

import forge from 'node-forge';
import { SignedXml } from 'xml-crypto';
import * as fs from 'fs';

export interface SigningResult {
  success: boolean;
  signedXml?: string;
  error?: string;
}

/**
 * XML Digital Signature for Croatian Fiscalization
 *
 * Implements XML-DSIG according to:
 * - Croatian Tax Authority Technical Specification v1.3
 * - W3C XML Signature Syntax and Processing
 * - Uses RSA-SHA1 signature algorithm
 * - Uses Exclusive XML Canonicalization
 */
export class FiscalXMLSigner {
  private certificate: forge.pki.Certificate;
  private privateKey: forge.pki.PrivateKey;
  private certPem: string;
  private privateKeyPem: string;

  constructor(certPath: string, password: string) {
    try {
      // Load P12 certificate
      const certBuffer = fs.readFileSync(certPath);
      const p12Asn1 = forge.asn1.fromDer(certBuffer.toString('binary'));
      const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

      // Extract certificate
      const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
      const certBagArray = certBags[forge.pki.oids.certBag];

      if (!certBagArray || certBagArray.length === 0) {
        throw new Error('No certificate found in P12 file');
      }

      const certBag = certBagArray[0];

      if (!certBag.cert) {
        throw new Error('Certificate bag does not contain a valid certificate');
      }

      this.certificate = certBag.cert;

      // Extract private key
      const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
      const keyBagArray = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag];

      if (!keyBagArray || keyBagArray.length === 0) {
        throw new Error('No private key found in P12 file');
      }

      const keyBag = keyBagArray[0];

      if (!keyBag.key) {
        throw new Error('Key bag does not contain a valid private key');
      }

      this.privateKey = keyBag.key;

      // Convert to PEM format for xml-crypto
      this.certPem = forge.pki.certificateToPem(this.certificate);
      this.privateKeyPem = forge.pki.privateKeyToPem(this.privateKey);

      console.log('✅ XML Signer initialized successfully');
      console.log(`📄 Certificate: ${this.certificate.subject.getField('CN')?.value}`);
    } catch (error) {
      throw new Error(`Failed to load certificate: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Sign a SOAP envelope according to Croatian Tax Authority requirements
   *
   * @param xml - The SOAP envelope XML to sign
   * @param refId - The Id attribute of the element to sign (e.g., "signXmlId123")
   * @returns SigningResult with signed XML or error
   */
  signSOAPEnvelope(xml: string, refId: string): SigningResult {
    try {
      console.log('🔐 Signing SOAP envelope with XML-DSIG...');

      // Create SignedXml instance
      const sig = new SignedXml({
        privateKey: this.privateKeyPem,
        publicCert: this.certPem,
        signatureAlgorithm: 'http://www.w3.org/2000/09/xmldsig#rsa-sha1',
        canonicalizationAlgorithm: 'http://www.w3.org/2001/10/xml-exc-c14n#'
      });

      // Add reference to the element we're signing
      sig.addReference({
        xpath: `//*[@Id='${refId}']`,
        digestAlgorithm: 'http://www.w3.org/2000/09/xmldsig#sha1',
        transforms: [
          'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
          'http://www.w3.org/2001/10/xml-exc-c14n#'
        ]
      });

      // Set the location where the signature should be inserted
      // Croatian Tax Authority expects it inside the RacunZahtjev element
      // NOTE: Don't set Signature Id attribute - xml-crypto will handle it correctly
      sig.computeSignature(xml, {
        location: { reference: `//*[@Id='${refId}']`, action: 'append' },
        prefix: ''
      });

      const signedXml = sig.getSignedXml();

      console.log('✅ SOAP envelope signed successfully');
      console.log(`📏 Signed XML length: ${signedXml.length} characters`);

      return {
        success: true,
        signedXml
      };

    } catch (error) {
      console.error('❌ XML signing failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown signing error'
      };
    }
  }

  /**
   * Get certificate information
   */
  getCertificateInfo(): {
    subject: string;
    issuer: string;
    validFrom: Date;
    validTo: Date;
    serialNumber: string;
  } {
    return {
      subject: this.certificate.subject.getField('CN')?.value || 'Unknown',
      issuer: this.certificate.issuer.getField('CN')?.value || 'Unknown',
      validFrom: this.certificate.validity.notBefore,
      validTo: this.certificate.validity.notAfter,
      serialNumber: this.certificate.serialNumber
    };
  }

  /**
   * Get private key for ZKI generation
   * Used by CertificateManager for signing ZKI data
   */
  getPrivateKey(): forge.pki.PrivateKey {
    return this.privateKey;
  }
}
