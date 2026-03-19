import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { Input } from '../../ui/input';
import { Textarea } from '../../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { FiscalizationService } from '../../../lib/fiscalization/FiscalizationService';
import { FiscalInvoiceData } from '../../../lib/fiscalization/types';
import { RotateCcw, CheckCircle, XCircle, Clock, MinusCircle, Send } from 'lucide-react';

interface StornoTestSectionProps {
  fiscalizationResults: Record<string, unknown>[];
}

const StornoTestSection: React.FC<StornoTestSectionProps> = ({ fiscalizationResults }) => {
  const [selectedJir, setSelectedJir] = useState<string>('');
  const [stornoType, setStornoType] = useState<'FULL' | 'PARTIAL'>('FULL');
  const [partialAmount, setPartialAmount] = useState<string>('');
  const [stornoReason, setStornoReason] = useState<string>('Customer refund request');
  const [isProcessing, setIsProcessing] = useState(false);
  const [stornoResults, setStornoResults] = useState<Record<string, unknown>[]>([]);

  const fiscalizationService = FiscalizationService.getInstance();

  // Get successfully fiscalized invoices
  const successfulInvoices = fiscalizationResults.filter((result) => result.success && result.jir);

  const handleStornoSubmit = async () => {
    const selectedResult = fiscalizationResults.find((result) => result.jir === selectedJir);
    if (!selectedResult || !selectedJir) return;

    setIsProcessing(true);
    try {
      // Create original invoice data (simplified for demo)
      const originalInvoice: FiscalInvoiceData = {
        invoiceNumber: selectedResult.invoiceNumber,
        dateTime: new Date(selectedResult.submittedAt),
        totalAmount: 75.5, // Demo amount
        vatAmount: 15.1,
        items: [
          {
            name: 'Hotel accommodation',
            quantity: 1,
            unitPrice: 75.5,
            vatRate: 25,
            totalAmount: 75.5,
          },
        ],
        paymentMethod: 'CASH',
      };

      let result: Record<string, unknown>;
      if (stornoType === 'FULL') {
        result = await fiscalizationService.stornoFullInvoice(
          selectedJir,
          originalInvoice,
          stornoReason
        );
      } else {
        const amount = parseFloat(partialAmount);
        if (isNaN(amount) || amount <= 0) {
          throw new Error('Invalid partial amount');
        }
        result = await fiscalizationService.stornoPartialAmount(
          selectedJir,
          originalInvoice,
          amount,
          stornoReason
        );
      }

      setStornoResults((prev) => [
        ...prev,
        {
          ...result,
          originalJir: selectedJir,
          originalInvoiceNumber: selectedResult.invoiceNumber,
          stornoType,
          partialAmount: stornoType === 'PARTIAL' ? parseFloat(partialAmount) : undefined,
          reason: stornoReason,
          submittedAt: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      setStornoResults((prev) => [
        ...prev,
        {
          success: false,
          error: `Storno failed: ${error}`,
          originalJir: selectedJir,
          originalInvoiceNumber: selectedResult.invoiceNumber,
          stornoType,
          reason: stornoReason,
          submittedAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <RotateCcw className="h-5 w-5" />
          <span>Croatian Storno (Invoice Cancellation) Testing</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Storno Form */}
          <div>
            <h3 className="mb-4 text-lg font-semibold">Create Storno Invoice</h3>

            <div className="grid gap-4">
              {/* Select JIR to cancel */}
              <div>
                <label htmlFor="storno-jir" className="mb-2 block text-sm font-medium">
                  Select Invoice to Cancel (JIR)
                </label>
                <Select value={selectedJir} onValueChange={setSelectedJir}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose successfully fiscalized invoice" />
                  </SelectTrigger>
                  <SelectContent>
                    {successfulInvoices.map((result) => (
                      <SelectItem key={result.jir as string} value={result.jir as string}>
                        {result.invoiceNumber} - {result.jir}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {successfulInvoices.length === 0 && (
                  <p className="mt-1 text-sm text-orange-600">
                    ⚠️ No successfully fiscalized invoices available. Submit a test invoice first.
                  </p>
                )}
              </div>

              {/* Storno Type */}
              <div>
                <label htmlFor="storno-type" className="mb-2 block text-sm font-medium">
                  Storno Type
                </label>
                <Select
                  value={stornoType}
                  onValueChange={(value) => setStornoType(value as 'FULL' | 'PARTIAL')}
                >
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
                  <label htmlFor="storno-partial-amount" className="mb-2 block text-sm font-medium">
                    Partial Amount (EUR)
                  </label>
                  <Input
                    id="storno-partial-amount"
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
                <label htmlFor="storno-reason" className="mb-2 block text-sm font-medium">
                  Cancellation Reason
                </label>
                <Textarea
                  id="storno-reason"
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
                  <Clock className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                <span>{isProcessing ? 'Processing Storno...' : `Submit ${stornoType} Storno`}</span>
              </Button>
            </div>
          </div>

          {/* Storno Results */}
          {stornoResults.length > 0 && (
            <div>
              <h3 className="mb-3 text-lg font-semibold">Croatian Tax Authority Storno Results</h3>
              <div className="space-y-3">
                {stornoResults.map((result) => (
                  <div
                    key={`${result.originalJir as string}-${result.submittedAt as string}`}
                    className="rounded-lg border p-4"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-medium">
                        Storno for: {result.originalInvoiceNumber} ({result.stornoType})
                      </span>
                      <div className="flex items-center space-x-2">
                        {result.success ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                        <Badge variant={result.success ? 'default' : 'destructive'}>
                          {result.success ? 'Storno Successful' : 'Storno Failed'}
                        </Badge>
                      </div>
                    </div>

                    <div className="mb-3 grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
                      <div>
                        <span className="font-medium">Original JIR:</span>
                        <p className="font-mono text-xs break-all text-gray-600">
                          {result.originalJir}
                        </p>
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
                      <span className="text-sm font-medium">Reason:</span>
                      <p className="text-sm text-gray-600">{result.reason}</p>
                    </div>

                    {result.error && <p className="mb-2 text-sm text-red-600">{result.error}</p>}

                    {result.success && (
                      <div className="space-y-2">
                        {result.jir && (
                          <div className="grid grid-cols-1 gap-4 text-xs md:grid-cols-2">
                            <div>
                              <span className="font-medium text-green-700">New Storno JIR:</span>
                              <p className="font-mono break-all text-gray-600">{result.jir}</p>
                            </div>
                            {result.fiscalReceiptUrl && (
                              <div>
                                <span className="font-medium text-blue-700">Storno Receipt:</span>
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
                          ✅ Storno successfully processed by Croatian Tax Authority TEST
                          environment
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

          {/* Info Section */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-4">
              <div className="flex items-start space-x-3">
                <MinusCircle className="mt-0.5 h-5 w-5 text-blue-600" />
                <div>
                  <h3 className="font-medium text-blue-900">
                    Croatian Storno (Cancellation) Information
                  </h3>
                  <div className="mt-1 space-y-2 text-sm text-blue-700">
                    <p>
                      Storno invoices are negative invoices that cancel or partially cancel original
                      invoices. They are sent to the Croatian Tax Authority with negative amounts
                      and reference the original JIR.
                    </p>
                    <div className="mt-2">
                      <p>
                        <strong>Full Storno:</strong> Cancels entire invoice amount
                      </p>
                      <p>
                        <strong>Partial Storno:</strong> Cancels specific amount from original
                        invoice
                      </p>
                      <p>
                        <strong>XML Format:</strong> Uses negative amounts and includes
                        StornoRacun/StornoRazlog fields
                      </p>
                      <p>
                        <strong>Invoice Numbers:</strong> Storno invoices get "S" prefix (e.g.,
                        HP-2025-S123456)
                      </p>
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
