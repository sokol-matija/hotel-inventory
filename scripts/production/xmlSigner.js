// Croatian Fiscal XML Digital Signature (XML-DSIG) - JavaScript Version
// For use in test scripts

const forge = require('node-forge');
const { SignedXml } = require('xml-crypto');
const fs = require('fs');

/**
 * XML Digital Signature for Croatian Fiscalization
 *
 * Implements XML-DSIG according to Croatian Tax Authority requirements
 */
class FiscalXMLSigner {
  constructor(certPath, password) {
    try {
      console.log('🔐 Loading certificate for XML signing...');

      // Load P12 certificate
      const certBuffer = fs.readFileSync(certPath);
      const p12Asn1 = forge.asn1.fromDer(certBuffer.toString('binary'));
      const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

      // Extract certificate
      const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
      const certBag = certBags[forge.pki.oids.certBag][0];
      this.certificate = certBag.cert;

      // Extract private key
      const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
      const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag][0];
      this.privateKey = keyBag.key;

      // Convert to PEM format for xml-crypto
      this.certPem = forge.pki.certificateToPem(this.certificate);
      this.privateKeyPem = forge.pki.privateKeyToPem(this.privateKey);

      console.log('✅ XML Signer initialized');
      console.log(`📄 Certificate: ${this.certificate.subject.getField('CN')?.value}`);
      console.log(`📅 Valid Until: ${this.certificate.validity.notAfter}`);
    } catch (error) {
      throw new Error(`Failed to load certificate: ${error.message}`);
    }
  }

  /**
   * Sign a SOAP envelope with XML-DSIG
   *
   * @param {string} xml - The SOAP envelope XML
   * @param {string} refId - The Id attribute of the element to sign
   * @returns {string} Signed XML
   */
  signSOAPEnvelope(xml, refId) {
    try {
      console.log('🔐 Signing SOAP envelope with XML-DSIG...');
      console.log(`📝 Signing element with Id: ${refId}`);

      // Create SignedXml instance with Croatian Tax Authority requirements
      const sig = new SignedXml({
        privateKey: this.privateKeyPem,
        publicCert: this.certPem,
        signatureAlgorithm: 'http://www.w3.org/2000/09/xmldsig#rsa-sha1',
        canonicalizationAlgorithm: 'http://www.w3.org/2001/10/xml-exc-c14n#'
      });

      // Add reference to the element being signed
      sig.addReference({
        xpath: `//*[@Id='${refId}']`,
        digestAlgorithm: 'http://www.w3.org/2000/09/xmldsig#sha1',
        transforms: [
          'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
          'http://www.w3.org/2001/10/xml-exc-c14n#'
        ]
      });

      // Compute the signature
      // Insert it inside the RacunZahtjev element (append as last child)
      // Note: Don't set Signature Id attribute - xml-crypto will handle it correctly
      sig.computeSignature(xml, {
        location: {
          reference: `//*[@Id='${refId}']`,
          action: 'append'
        },
        prefix: ''
      });

      const signedXml = sig.getSignedXml();

      console.log('✅ SOAP envelope signed successfully!');
      console.log(`📏 Signed XML length: ${signedXml.length} characters`);
      console.log('🎉 XML-DSIG signature added - s004 error should be resolved!');

      return signedXml;

    } catch (error) {
      console.error('❌ XML signing failed:', error.message);
      throw error;
    }
  }

  /**
   * Get certificate information
   */
  getCertificateInfo() {
    return {
      subject: this.certificate.subject.getField('CN')?.value || 'Unknown',
      issuer: this.certificate.issuer.getField('CN')?.value || 'Unknown',
      validFrom: this.certificate.validity.notBefore,
      validTo: this.certificate.validity.notAfter,
      serialNumber: this.certificate.serialNumber
    };
  }
}

module.exports = { FiscalXMLSigner };
