import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { FiscalizationService } from '../../../lib/fiscalization/FiscalizationService';
import { FiscalInvoiceData, StornoRequest } from '../../../lib/fiscalization/types';
import { 
  RotateCcw,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  MinusCircle,
  FileText,
  Send
} from 'lucide-react';

interface StornoTestSectionProps {
  fiscalizationResults: any[];
}

const StornoTestSection: React.FC<StornoTestSectionProps> = ({ fiscalizationResults }) => {
  const [selectedJir, setSelectedJir] = useState<string>('');
  const [stornoType, setStornoType] = useState<'FULL' | 'PARTIAL'>('FULL');
  const [partialAmount, setPartialAmount] = useState<string>('');
  const [stornoReason, setStornoReason] = useState<string>('Customer refund request');
  const [isProcessing, setIsProcessing] = useState(false);
  const [stornoResults, setStornoResults] = useState<any[]>([]);

  const fiscalizationService = FiscalizationService.getInstance();

  // Get successfully fiscalized invoices
  const successfulInvoices = fiscalizationResults.filter(result => result.success && result.jir);

  const handleStornoSubmit = async () => {
    const selectedResult = fiscalizationResults.find(result => result.jir === selectedJir);
    if (!selectedResult || !selectedJir) return;

    setIsProcessing(true);
    try {
      // Create original invoice data (simplified for demo)
      const originalInvoice: FiscalInvoiceData = {
        invoiceNumber: selectedResult.invoiceNumber,
        dateTime: new Date(selectedResult.submittedAt),
        totalAmount: 75.50, // Demo amount
        vatAmount: 15.10,
        items: [{
          name: 'Hotel accommodation',
          quantity: 1,
          unitPrice: 75.50,
          vatRate: 25,
          totalAmount: 75.50,
        }],
        paymentMethod: 'CASH'
      };

      let result: any;
      if (stornoType === 'FULL') {
        result = await fiscalizationService.stornoFullInvoice(selectedJir, originalInvoice, stornoReason);
      } else {
        const amount = parseFloat(partialAmount);
        if (isNaN(amount) || amount <= 0) {
          throw new Error('Invalid partial amount');
        }
        result = await fiscalizationService.stornoPartialAmount(selectedJir, originalInvoice, amount, stornoReason);
      }

      setStornoResults(prev => [...prev, {
        ...result,
        originalJir: selectedJir,
        originalInvoiceNumber: selectedResult.invoiceNumber,
        stornoType,
        partialAmount: stornoType === 'PARTIAL' ? parseFloat(partialAmount) : undefined,
        reason: stornoReason,
        submittedAt: new Date().toISOString()
      }]);

    } catch (error) {
      setStornoResults(prev => [...prev, {
        success: false,
        error: `Storno failed: ${error}`,
        originalJir: selectedJir,
        originalInvoiceNumber: selectedResult.invoiceNumber,
        stornoType,
        reason: stornoReason,
        submittedAt: new Date().toISOString()
      }]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <RotateCcw className="w-5 h-5" />
          <span>Croatian Storno (Invoice Cancellation) Testing</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Storno Form */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Create Storno Invoice</h3>
            
            <div className="grid gap-4">
              {/* Select JIR to cancel */}
              <div>
                <label className="text-sm font-medium mb-2 block">Select Invoice to Cancel (JIR)</label>
                <Select value={selectedJir} onValueChange={setSelectedJir}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose successfully fiscalized invoice" />
                  </SelectTrigger>
                  <SelectContent>
                    {successfulInvoices.map((result, index) => (
                      <SelectItem key={index} value={result.jir}>
                        {result.invoiceNumber} - {result.jir}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {successfulInvoices.length === 0 && (
                  <p className="text-sm text-orange-600 mt-1">
                    ⚠️ No successfully fiscalized invoices available. Submit a test invoice first.
                  </p>
                )}
              </div>

              {/* Storno Type */}
              <div>
                <label className="text-sm font-medium mb-2 block">Storno Type</label>
                <Select value={stornoType} onValueChange={(value) => setStornoType(value as 'FULL' | 'PARTIAL')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FULL">Full Cancellation</SelectItem>
                    <SelectItem value="PARTIAL">Partial Cancellation</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Partial Amount (only for PARTIAL) */}
              {stornoType === 'PARTIAL' && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Partial Amount (EUR)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={partialAmount}
                    onChange={(e) => setPartialAmount(e.target.value)}
                    placeholder="Enter amount to cancel (e.g., 25.00)"
                  />
                </div>
              )}

              {/* Storno Reason */}
              <div>
                <label className="text-sm font-medium mb-2 block">Cancellation Reason</label>
                <Textarea
                  value={stornoReason}
                  onChange={(e) => setStornoReason(e.target.value)}
                  placeholder="Enter reason for cancellation..."
                  rows={2}
                />
              </div>

              {/* Submit Button */}
              <Button
                onClick={handleStornoSubmit}
                disabled={isProcessing || !selectedJir || successfulInvoices.length === 0}
                className="flex items-center space-x-2"
              >
                {isProcessing ? (
                  <Clock className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>
                  {isProcessing ? 'Processing Storno...' : `Submit ${stornoType} Storno`}
                </span>
              </Button>
            </div>
          </div>

          {/* Storno Results */}
          {stornoResults.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Croatian Tax Authority Storno Results</h3>
              <div className="space-y-3">
                {stornoResults.map((result, index) => (
                  <div key={index} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">
                        Storno for: {result.originalInvoiceNumber} ({result.stornoType})
                      </span>
                      <div className="flex items-center space-x-2">
                        {result.success ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                        <Badge variant={result.success ? "default" : "destructive"}>
                          {result.success ? 'Storno Successful' : 'Storno Failed'}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-3">
                      <div>
                        <span className="font-medium">Original JIR:</span>
                        <p className="text-gray-600 font-mono text-xs break-all">{result.originalJir}</p>
                      </div>
                      <div>
                        <span className="font-medium">Storno Type:</span>
                        <p className="text-gray-600">{result.stornoType}</p>
                      </div>
                      {result.partialAmount && (
                        <div>
                          <span className="font-medium">Amount:</span>
                          <p className="text-gray-600">€{result.partialAmount.toFixed(2)}</p>
                        </div>
                      )}
                    </div>

                    <div className="mb-3">
                      <span className="font-medium text-sm">Reason:</span>
                      <p className="text-gray-600 text-sm">{result.reason}</p>
                    </div>
                    
                    {result.error && (
                      <p className="text-sm text-red-600 mb-2">{result.error}</p>
                    )}
                    
                    {result.success && (
                      <div className="space-y-2">
                        {result.jir && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                            <div>
                              <span className="font-medium text-green-700">New Storno JIR:</span>
                              <p className="text-gray-600 break-all font-mono">{result.jir}</p>
                            </div>
                            {result.fiscalReceiptUrl && (
                              <div>
                                <span className="font-medium text-blue-700">Storno Receipt:</span>
                                <p className="text-blue-600 text-xs break-all">
                                  <a href={result.fiscalReceiptUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                    {result.fiscalReceiptUrl}
                                  </a>
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                        
                        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                          ✅ Storno successfully processed by Croatian Tax Authority TEST environment
                        </div>
                      </div>
                    )}
                    
                    <p className="text-xs text-gray-500 mt-2">
                      Submitted: {new Date(result.submittedAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info Section */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-4">
              <div className="flex items-start space-x-3">
                <MinusCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-blue-900">Croatian Storno (Cancellation) Information</h3>
                  <div className="text-sm text-blue-700 mt-1 space-y-2">
                    <p>
                      Storno invoices are negative invoices that cancel or partially cancel original invoices. 
                      They are sent to the Croatian Tax Authority with negative amounts and reference the original JIR.
                    </p>
                    <div className="mt-2">
                      <p><strong>Full Storno:</strong> Cancels entire invoice amount</p>
                      <p><strong>Partial Storno:</strong> Cancels specific amount from original invoice</p>
                      <p><strong>XML Format:</strong> Uses negative amounts and includes StornoRacun/StornoRazlog fields</p>
                      <p><strong>Invoice Numbers:</strong> Storno invoices get "S" prefix (e.g., HP-2025-S123456)</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
};

export default StornoTestSection;