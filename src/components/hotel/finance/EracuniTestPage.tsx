import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { useHotel } from '../../../lib/hotel/state/HotelContext';
import { HotelEracuniService } from '../../../lib/eracuni/eracuniService';
import { 
  Wifi,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Download,
  Send,
  Shield,
  AlertTriangle
} from 'lucide-react';

const EracuniTestPage: React.FC = () => {
  const { invoices } = useHotel();
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionResult, setConnectionResult] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResults, setSubmissionResults] = useState<any[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<string>('');
  const [xmlPreview, setXmlPreview] = useState<string>('');

  const eracuniService = new HotelEracuniService();

  const testFinaConnection = async () => {
    setIsConnecting(true);
    try {
      const result = await eracuniService.testFinaConnection();
      setConnectionResult(result);
    } catch (error) {
      setConnectionResult({
        success: false,
        message: `Connection test failed: ${error}`,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const generateXmlPreview = (invoiceId: string) => {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (!invoice) return;

    try {
      const { xmlContent } = eracuniService.generateInvoicePreview(invoice);
      setXmlPreview(xmlContent);
      setSelectedInvoice(invoiceId);
    } catch (error) {
      console.error('Error generating XML preview:', error);
    }
  };

  const submitTestInvoice = async (invoiceId: string) => {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (!invoice) return;

    setIsSubmitting(true);
    try {
      const result = await eracuniService.processInvoiceForEracuni(invoice);
      setSubmissionResults(prev => [...prev, { invoiceId, result, timestamp: new Date().toISOString() }]);
    } catch (error) {
      setSubmissionResults(prev => [...prev, {
        invoiceId,
        result: { success: false, message: `Submission failed: ${error}` },
        timestamp: new Date().toISOString()
      }]);
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

  const serviceStatus = eracuniService.getServiceStatus();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Croatian E-Računi Test Center</h1>
          <p className="text-gray-600 mt-2">Test Croatian fiscal compliance and FINA integration</p>
        </div>
        <div className="flex items-center space-x-2">
          <Shield className="w-5 h-5 text-blue-600" />
          <span className="text-sm font-medium text-blue-600">Demo Environment</span>
        </div>
      </div>

      {/* Service Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Wifi className="w-5 h-5" />
            <span>Service Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium">XML Generator</span>
              <Badge variant={serviceStatus.xmlGenerator ? "default" : "destructive"}>
                {serviceStatus.xmlGenerator ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium">SOAP Client</span>
              <Badge variant={serviceStatus.soapClient ? "default" : "destructive"}>
                {serviceStatus.soapClient ? 'Ready' : 'Not Ready'}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium">FINA Connection</span>
              <Badge variant={serviceStatus.finaConnection === 'Connected' ? "default" : "secondary"}>
                {serviceStatus.finaConnection}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connection Test */}
      <Card>
        <CardHeader>
          <CardTitle>FINA Connection Test</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <Button 
                onClick={testFinaConnection}
                disabled={isConnecting}
                className="flex items-center space-x-2"
              >
                {isConnecting ? <Clock className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
                <span>{isConnecting ? 'Testing...' : 'Test FINA Connection'}</span>
              </Button>
              
              {connectionResult && (
                <div className="flex items-center space-x-2">
                  {connectionResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                  <span className={`text-sm ${connectionResult.success ? 'text-green-600' : 'text-red-600'}`}>
                    {connectionResult.message}
                  </span>
                </div>
              )}
            </div>
            
            {connectionResult && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600">
                  Test completed at: {new Date(connectionResult.timestamp).toLocaleString()}
                </p>
                {connectionResult.response_id && (
                  <p className="text-xs text-gray-600">
                    Response ID: {connectionResult.response_id}
                  </p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Invoice Testing */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice E-Računi Testing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Available Invoices */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Available Invoices ({invoices.length})</h3>
              <div className="grid gap-4">
                {invoices.slice(0, 5).map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <FileText className="w-5 h-5 text-blue-600" />
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
                        <FileText className="w-4 h-4" />
                        <span>Preview XML</span>
                      </Button>
                      
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => submitTestInvoice(invoice.id)}
                        disabled={isSubmitting}
                        className="flex items-center space-x-1"
                      >
                        {isSubmitting ? (
                          <Clock className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
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
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold">UBL XML Preview</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadXml}
                    className="flex items-center space-x-1"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download XML</span>
                  </Button>
                </div>
                <div className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto max-h-96">
                  <pre className="text-sm whitespace-pre-wrap">{xmlPreview}</pre>
                </div>
              </div>
            )}

            {/* Submission Results */}
            {submissionResults.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Submission Results</h3>
                <div className="space-y-3">
                  {submissionResults.map((result, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Invoice: {result.invoiceId}</span>
                        <div className="flex items-center space-x-2">
                          {result.result.success ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-600" />
                          )}
                          <Badge variant={result.result.success ? "default" : "destructive"}>
                            {result.result.success ? 'Success' : 'Failed'}
                          </Badge>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">{result.result.message}</p>
                      
                      {result.result.success && (
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          {result.result.jir && (
                            <div>
                              <span className="font-medium">JIR:</span>
                              <p className="text-gray-600 break-all">{result.result.jir}</p>
                            </div>
                          )}
                          {result.result.zki && (
                            <div>
                              <span className="font-medium">ZKI:</span>
                              <p className="text-gray-600 break-all">{result.result.zki}</p>
                            </div>
                          )}
                        </div>
                      )}
                      
                      <p className="text-xs text-gray-500 mt-2">
                        Submitted: {new Date(result.timestamp).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Warning Notice */}
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-orange-900">Demo Environment Notice</h3>
              <p className="text-sm text-orange-700 mt-1">
                This is a demonstration environment for testing Croatian e-računi integration. 
                No real fiscal data is submitted to Croatian authorities. 
                For production use, proper FINA certificates and production endpoints must be configured.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EracuniTestPage;