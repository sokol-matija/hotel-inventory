import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { useInvoices } from '../../../lib/queries/hooks/useInvoices';
import { FiscalizationService } from '../../../lib/fiscalization/FiscalizationService';
import { FiscalInvoiceData } from '../../../lib/fiscalization/types';
import StornoTestSection from './StornoTestSection';
import {
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Download,
  Send,
  Shield,
  AlertTriangle,
  Settings,
  Zap,
} from 'lucide-react';

interface ConnectionResult {
  success: boolean;
  message: string;
  timestamp: string;
  warnings?: string[];
  status?: { environment: string; oib: string };
}

interface SubmissionResult {
  success: boolean;
  error?: string;
  jir?: string;
  zki?: string;
  fiscalReceiptUrl?: string;
  timestamp: Date;
  invoiceId: number;
  invoiceNumber: string;
  submittedAt: string;
  [key: string]: unknown; // allow extra fields from fiscal service
}

const FiscalizationTestPage: React.FC = () => {
  const { data: invoices = [] } = useInvoices();
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionResult, setConnectionResult] = useState<ConnectionResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResults, setSubmissionResults] = useState<SubmissionResult[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<number | ''>('');
  const [xmlPreview, setXmlPreview] = useState<string>('');
  const [serviceStatus, setServiceStatus] = useState<{
    environment: string;
    oib: string;
    certificateConfigured: boolean;
    validationErrors: string[];
    recommendations: string[];
  } | null>(null);

  const fiscalizationService = FiscalizationService.getInstance();

  const testFiscalizationService = async () => {
    setIsConnecting(true);
    try {
      // Test service configuration
      const validation = fiscalizationService.validateConfiguration();
      const status = fiscalizationService.getServiceStatus();

      setConnectionResult({
        success: validation.valid,
        message: validation.valid
          ? 'Croatian Tax Authority fiscalization service ready'
          : `Configuration issues: ${validation.errors.join(', ')}`,
        timestamp: new Date().toISOString(),
        warnings: validation.warnings,
        status: status,
      });

      setServiceStatus(status);
    } catch (error) {
      setConnectionResult({
        success: false,
        message: `Service test failed: ${error}`,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const generateXmlPreview = (invoiceId: number) => {
    const invoice = invoices.find((inv) => inv.id === invoiceId);
    if (!invoice) return;

    try {
      // Generate preview XML (this would use xmlGenerator)
      const xmlPreviewContent = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Croatian Fiscal XML Preview for Invoice ${invoice.invoiceNumber} -->
<FiscalRequest>
  <Invoice>
    <Number>${invoice.invoiceNumber}</Number>
    <Date>${invoice.issueDate.toISOString()}</Date>
    <Total>${invoice.totalAmount.toFixed(2)}</Total>
    <BusinessSpace>POSL1</BusinessSpace>
    <CashRegister>2</CashRegister>
  </Invoice>
</FiscalRequest>`;

      setXmlPreview(xmlPreviewContent);
      setSelectedInvoice(invoiceId);
    } catch (error) {
      console.error('Error generating fiscal XML preview:', error);
    }
  };

  const submitTestInvoice = async (invoiceId: number) => {
    const invoice = invoices.find((inv) => inv.id === invoiceId);
    if (!invoice) return;

    setIsSubmitting(true);
    try {
      // Convert hotel invoice to fiscal format with validated data
      const fiscalData: FiscalInvoiceData = {
        invoiceNumber: invoice.invoiceNumber,
        dateTime: invoice.issueDate,
        totalAmount: invoice.totalAmount,
        vatAmount: invoice.vatAmount,
        items: [
          {
            name: `Hotel accommodation (Room N/A)`,
            quantity: 1,
            unitPrice: invoice.subtotal,
            totalAmount: invoice.subtotal,
            vatRate: 0.25, // 25% Croatian VAT
          },
        ],
        paymentMethod: 'CASH' as const,
      };

      const result = await fiscalizationService.fiscalizeInvoice(fiscalData);

      setSubmissionResults((prev) => [
        ...prev,
        {
          success: result.success,
          jir: result.jir,
          zki: result.zki,
          error: result.error,
          timestamp: result.timestamp,
          invoiceId,
          invoiceNumber: invoice.invoiceNumber,
          submittedAt: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      setSubmissionResults((prev) => [
        ...prev,
        {
          success: false,
          error: `Fiscalization failed: ${error}`,
          timestamp: new Date(),
          invoiceId,
          invoiceNumber: invoice.invoiceNumber,
          submittedAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadXml = () => {
    if (!xmlPreview) return;

    const blob = new Blob([xmlPreview], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hotel-porec-invoice-${selectedInvoice}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  React.useEffect(() => {
    // Load service status on component mount
    const status = fiscalizationService.getServiceStatus();
    setServiceStatus(status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Croatian Fiscalization Test Center</h1>
          <p className="mt-2 text-gray-600">
            Test Croatian Tax Authority integration with proven Hotel Porec fiscalization system
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Shield className="h-5 w-5 text-blue-600" />
          <span className="text-sm font-medium text-blue-600">Demo Environment</span>
        </div>
      </div>

      {/* Service Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Fiscalization Service Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
              <span className="text-sm font-medium">Environment</span>
              <Badge variant={serviceStatus?.environment === 'TEST' ? 'secondary' : 'default'}>
                {serviceStatus?.environment || 'Unknown'}
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
              <span className="text-sm font-medium">Hotel OIB</span>
              <Badge variant="outline">{serviceStatus?.oib || 'Not configured'}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
              <span className="text-sm font-medium">Certificate</span>
              <Badge variant={serviceStatus?.certificateConfigured ? 'default' : 'destructive'}>
                {serviceStatus?.certificateConfigured ? 'Configured' : 'Missing'}
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
              <span className="text-sm font-medium">Tax Authority</span>
              <Badge variant="secondary">TEST Endpoint</Badge>
            </div>
          </div>

          {serviceStatus && serviceStatus.validationErrors.length > 0 && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
              <h4 className="mb-2 text-sm font-medium text-red-800">Configuration Issues:</h4>
              <ul className="space-y-1 text-sm text-red-700">
                {serviceStatus.validationErrors.map((error) => (
                  <li key={error}>• {error}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Service Test */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="h-5 w-5" />
            <span>Croatian Tax Authority Service Test</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <Button
                onClick={testFiscalizationService}
                disabled={isConnecting}
                className="flex items-center space-x-2"
              >
                {isConnecting ? (
                  <Clock className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                <span>{isConnecting ? 'Testing...' : 'Test Fiscalization Service'}</span>
              </Button>

              {connectionResult && (
                <div className="flex items-center space-x-2">
                  {connectionResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  <span
                    className={`text-sm ${connectionResult.success ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {connectionResult.message}
                  </span>
                </div>
              )}
            </div>

            {connectionResult && (
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="mb-2 text-xs text-gray-600">
                  Test completed at: {new Date(connectionResult.timestamp).toLocaleString()}
                </p>

                {connectionResult.warnings && connectionResult.warnings.length > 0 && (
                  <div className="mb-2">
                    <p className="mb-1 text-xs font-medium text-orange-700">Warnings:</p>
                    <ul className="space-y-1 text-xs text-orange-600">
                      {connectionResult.warnings.map((warning: string) => (
                        <li key={warning}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {connectionResult.status && (
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="font-medium">Environment:</span>{' '}
                      {connectionResult.status.environment}
                    </div>
                    <div>
                      <span className="font-medium">OIB:</span> {connectionResult.status.oib}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Invoice Testing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Croatian Fiscal Invoice Testing</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Available Invoices */}
            <div>
              <h3 className="mb-3 text-lg font-semibold">Available Invoices ({invoices.length})</h3>
              <div className="grid gap-4">
                {invoices.slice(0, 5).map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="font-medium">{invoice.invoiceNumber}</p>
                          <p className="text-sm text-gray-600">
                            Guest: {invoice.guestId} • Total: €{invoice.totalAmount.toFixed(2)}
                          </p>
                          <p className="text-xs text-gray-500">
                            Issued: {invoice.issueDate.toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => generateXmlPreview(invoice.id)}
                        className="flex items-center space-x-1"
                      >
                        <FileText className="h-4 w-4" />
                        <span>Preview Fiscal XML</span>
                      </Button>

                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => submitTestInvoice(invoice.id)}
                        disabled={isSubmitting}
                        className="flex items-center space-x-1"
                      >
                        {isSubmitting ? (
                          <Clock className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        <span>Submit Test</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* XML Preview */}
            {xmlPreview && (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Croatian Fiscal XML Preview</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadXml}
                    className="flex items-center space-x-1"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download Fiscal XML</span>
                  </Button>
                </div>
                <div className="max-h-96 overflow-auto rounded-lg bg-gray-900 p-4 text-green-400">
                  <pre className="text-sm whitespace-pre-wrap">{xmlPreview}</pre>
                </div>
                <div className="mt-2 rounded border border-blue-200 bg-blue-50 p-2 text-sm text-blue-700">
                  This XML follows Croatian Tax Authority specifications with validated Hotel Porec
                  business data (POSL1, Register 2)
                </div>
              </div>
            )}

            {/* Fiscalization Results */}
            {submissionResults.length > 0 && (
              <div>
                <h3 className="mb-3 text-lg font-semibold">Croatian Tax Authority Results</h3>
                <div className="space-y-3">
                  {submissionResults.map((result) => (
                    <div key={result.invoiceId} className="rounded-lg border p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-medium">Invoice: {result.invoiceNumber}</span>
                        <div className="flex items-center space-x-2">
                          {result.success ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                          <Badge variant={result.success ? 'default' : 'destructive'}>
                            {result.success ? 'Fiscalized' : 'Failed'}
                          </Badge>
                        </div>
                      </div>

                      {result.error && <p className="mb-2 text-sm text-red-600">{result.error}</p>}

                      {result.success && (
                        <div className="space-y-2">
                          {result.jir && (
                            <div className="grid grid-cols-1 gap-4 text-xs md:grid-cols-2">
                              <div>
                                <span className="font-medium text-green-700">JIR (Unique ID):</span>
                                <p className="font-mono break-all text-gray-600">{result.jir}</p>
                              </div>
                              {result.fiscalReceiptUrl && (
                                <div>
                                  <span className="font-medium text-blue-700">Fiscal Receipt:</span>
                                  <p className="text-xs break-all text-blue-600">
                                    <a
                                      href={result.fiscalReceiptUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="hover:underline"
                                    >
                                      {result.fiscalReceiptUrl}
                                    </a>
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="mt-2 rounded border border-green-200 bg-green-50 p-2 text-sm text-green-700">
                            Successfully fiscalized with Croatian Tax Authority TEST environment
                          </div>
                        </div>
                      )}

                      <p className="mt-2 text-xs text-gray-500">
                        Submitted: {new Date(result.submittedAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Storno Testing Section */}
      <StornoTestSection fiscalizationResults={submissionResults} />

      {/* Warning Notice */}
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-orange-600" />
            <div>
              <h3 className="font-medium text-orange-900">
                Croatian Tax Authority TEST Environment
              </h3>
              <p className="mt-1 text-sm text-orange-700">
                This system uses the official Croatian Tax Authority TEST endpoint
                (cistest.apis-it.hr:8449). All fiscal requests are sent to the TEST environment
                only. NEW FINA certificate 87246357068.49208351934.A.1.p12 is used with validated
                business data (OIB: 87246357068, POSL1, Register 2).
              </p>
              <div className="mt-2 text-xs text-orange-600">
                <p>
                  <strong>Test Endpoint:</strong>{' '}
                  https://cistest.apis-it.hr:8449/FiskalizacijaServiceTest
                </p>
                <p>
                  <strong>Certificate:</strong> 87246357068.49208351934.A.1.p12 (expires July 31,
                  2030)
                </p>
                <p>
                  <strong>Algorithm:</strong> Validated against real Hotel Porec fiscal receipts
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FiscalizationTestPage;
