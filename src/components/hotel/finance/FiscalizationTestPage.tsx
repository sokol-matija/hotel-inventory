// Croatian Fiscalization Test Page
// Safe testing interface for Croatian Tax Authority integration

import React, { useState } from 'react';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { 
  getFiscalizationService, 
  getCertificateManager,
  getCurrentEnvironment,
  CERTIFICATE_EXTRACTION_GUIDE 
} from '../../../lib/fiscalization';
import { FiscalInvoiceData, FiscalResponse } from '../../../lib/fiscalization/types';
import { AlertTriangle, CheckCircle, XCircle, Download, FileText, Shield } from 'lucide-react';

// Simple alert component using existing patterns
const Alert: React.FC<{ 
  variant?: 'default' | 'destructive'; 
  children: React.ReactNode; 
}> = ({ variant = 'default', children }) => (
  <div className={`rounded-lg border p-4 ${
    variant === 'destructive' 
      ? 'border-red-200 bg-red-50 text-red-800' 
      : 'border-blue-200 bg-blue-50 text-blue-800'
  }`}>
    {children}
  </div>
);

const AlertDescription: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="text-sm">{children}</div>
);

const Separator: React.FC = () => (
  <hr className="border-gray-200 my-4" />
);

const CardDescription: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-sm text-muted-foreground">{children}</p>
);

export default function FiscalizationTestPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [testResult, setTestResult] = useState<FiscalResponse | null>(null);
  const [serviceStatus, setServiceStatus] = useState<any>(null);
  const [showCertGuide, setShowCertGuide] = useState(false);

  // Get current environment and service instances
  const environment = getCurrentEnvironment();
  const fiscalizationService = getFiscalizationService();
  const certificateManager = getCertificateManager();

  // Test invoice data
  const TEST_INVOICE: FiscalInvoiceData = {
    invoiceNumber: 'HP-2025-000001',
    dateTime: new Date(),
    totalAmount: 150.00,
    vatAmount: 30.00,
    items: [
      {
        name: 'Hotel Accommodation',
        quantity: 2,
        unitPrice: 60.00,
        vatRate: 25,
        totalAmount: 120.00,
      },
      {
        name: 'Tourism Tax',
        quantity: 2,
        unitPrice: 1.50,
        vatRate: 0,
        totalAmount: 3.00,
      },
    ],
    paymentMethod: 'CASH',
  };

  React.useEffect(() => {
    // Load service status on component mount
    const status = fiscalizationService.getServiceStatus();
    setServiceStatus(status);
  }, []);

  const handleTestFiscalization = async () => {
    setIsProcessing(true);
    setTestResult(null);

    try {
      console.log('🧪 Starting fiscalization test...');
      const result = await fiscalizationService.fiscalizeInvoice(TEST_INVOICE);
      setTestResult(result);
      
      if (result.success) {
        console.log('✅ Fiscalization test successful:', result);
      } else {
        console.error('❌ Fiscalization test failed:', result.error);
      }
    } catch (error) {
      console.error('💥 Fiscalization test error:', error);
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleValidateConfiguration = () => {
    const validation = fiscalizationService.validateConfiguration();
    const status = fiscalizationService.getServiceStatus();
    setServiceStatus({ ...status, validation });
  };

  const downloadCertificateGuide = () => {
    const guide = certificateManager.getCertificateExtractionGuide();
    const blob = new Blob([guide], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Croatian_Fiscal_Certificate_Guide.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Croatian Fiscalization Test</h1>
          <p className="text-muted-foreground mt-2">
            Test Croatian Tax Authority integration safely
          </p>
        </div>
        <Badge variant={environment.mode === 'TEST' ? 'secondary' : 'destructive'}>
          {environment.mode} Environment
        </Badge>
      </div>

      {/* Safety Warning */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>SAFETY MODE ACTIVE:</strong> This system is configured to use Croatian Tax Authority 
          TEST environment only. No real fiscal receipts will be generated.
        </AlertDescription>
      </Alert>

      {/* Environment Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Current Configuration
          </CardTitle>
          <CardDescription>
            Croatian fiscal system configuration and status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Environment</label>
              <p className="text-sm text-muted-foreground">{environment.mode}</p>
            </div>
            <div>
              <label className="text-sm font-medium">OIB</label>
              <p className="text-sm text-muted-foreground">{environment.oib}</p>
            </div>
            <div>
              <label className="text-sm font-medium">URL</label>
              <p className="text-sm text-muted-foreground break-all">{environment.url}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Certificate Status</label>
              <Badge variant={serviceStatus?.certificateConfigured ? 'default' : 'destructive'}>
                {serviceStatus?.certificateConfigured ? 'Configured' : 'Not Configured'}
              </Badge>
            </div>
          </div>

          <Separator />

          <div className="flex gap-2">
            <Button onClick={handleValidateConfiguration} variant="outline" size="sm">
              <CheckCircle className="h-4 w-4 mr-2" />
              Validate Configuration
            </Button>
            <Button onClick={downloadCertificateGuide} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download Certificate Guide
            </Button>
          </div>

          {/* Validation Results */}
          {serviceStatus?.validation && (
            <div className="space-y-2">
              {serviceStatus.validation.errors.length > 0 && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Configuration Errors:</strong>
                    <ul className="list-disc list-inside mt-2">
                      {serviceStatus.validation.errors.map((error: string, index: number) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {serviceStatus.validation.warnings.length > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Warnings:</strong>
                    <ul className="list-disc list-inside mt-2">
                      {serviceStatus.validation.warnings.map((warning: string, index: number) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Certificate Setup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Certificate Setup
          </CardTitle>
          <CardDescription>
            P12 certificate extraction from DOS system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm space-y-2">
            <p><strong>Certificate Files:</strong> FISKAL_3.p12 (from DOS system)</p>
            <p><strong>Password:</strong> Hporec1</p>
            <p><strong>Location:</strong> example/DosProg/ffgastro/H Porec/</p>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={() => setShowCertGuide(!showCertGuide)} 
              variant="outline" 
              size="sm"
            >
              {showCertGuide ? 'Hide' : 'Show'} Certificate Instructions
            </Button>
          </div>

          {showCertGuide && (
            <div className="bg-muted p-4 rounded-lg">
              <pre className="text-xs whitespace-pre-wrap">
                {CERTIFICATE_EXTRACTION_GUIDE}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Fiscalization Test
          </CardTitle>
          <CardDescription>
            Test Croatian Tax Authority communication with sample invoice
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Test Invoice Data */}
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-2">Test Invoice Data:</h4>
            <div className="text-sm space-y-1">
              <p><strong>Invoice:</strong> {TEST_INVOICE.invoiceNumber}</p>
              <p><strong>Amount:</strong> €{TEST_INVOICE.totalAmount.toFixed(2)} (incl. €{TEST_INVOICE.vatAmount.toFixed(2)} VAT)</p>
              <p><strong>Items:</strong> {TEST_INVOICE.items.length} items</p>
              <p><strong>Payment:</strong> {TEST_INVOICE.paymentMethod}</p>
            </div>
          </div>

          {/* Test Button */}
          <Button 
            onClick={handleTestFiscalization}
            disabled={isProcessing}
            className="w-full"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Testing Fiscalization...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Test Croatian Tax Authority Connection
              </>
            )}
          </Button>

          {/* Test Results */}
          {testResult && (
            <div className="space-y-2">
              <Alert variant={testResult.success ? 'default' : 'destructive'}>
                {testResult.success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                <AlertDescription>
                  <strong>
                    {testResult.success ? 'Fiscalization Test Successful!' : 'Fiscalization Test Failed'}
                  </strong>
                  <div className="mt-2 text-sm">
                    {testResult.success ? (
                      <div className="space-y-1">
                        <p><strong>JIR:</strong> {testResult.jir}</p>
                        {testResult.fiscalReceiptUrl && (
                          <p><strong>Receipt URL:</strong> 
                            <a 
                              href={testResult.fiscalReceiptUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline ml-1"
                            >
                              {testResult.fiscalReceiptUrl}
                            </a>
                          </p>
                        )}
                        <p><strong>Timestamp:</strong> {testResult.timestamp.toLocaleString()}</p>
                      </div>
                    ) : (
                      <p><strong>Error:</strong> {testResult.error}</p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Next Steps</CardTitle>
          <CardDescription>Recommendations for fiscalization implementation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {serviceStatus?.recommendations.map((recommendation: string, index: number) => (
              <div key={index} className="flex items-start gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                <p className="text-sm">{recommendation}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}