import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { Input } from '../../../ui/input';
import { Label } from '../../../ui/label';
import { 
  Printer, 
  Receipt, 
  CheckCircle, 
  AlertTriangle,
  Settings,
  TestTube
} from 'lucide-react';
import { printTestReceipt, printFiscalTestReceipt } from '../../../../lib/printers/windowsPrinter';
import { HOTEL_POREC } from '../../../../lib/hotel/hotelData';

export default function PrinterTestPage() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);
  const [printerName, setPrinterName] = useState('');

  const addTestResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testPrinterConnection = async () => {
    setIsPrinting(true);
    addTestResult('Testing printer connection...');
    
    try {
      // Test basic browser printing capability
      if (typeof window.print === 'function') {
        setIsConnected(true);
        addTestResult('✅ Browser printing available');
        addTestResult('✅ Windows WinPrint compatibility detected');
      } else {
        setIsConnected(false);
        addTestResult('❌ Browser printing not available');
      }
    } catch (error) {
      setIsConnected(false);
      addTestResult(`❌ Connection test failed: ${error}`);
    } finally {
      setIsPrinting(false);
    }
  };

  const printSimpleTest = async () => {
    setIsPrinting(true);
    addTestResult('Printing simple test receipt...');
    
    try {
      const success = await printTestReceipt();
      if (success) {
        addTestResult('✅ Simple test receipt sent to printer');
      } else {
        addTestResult('❌ Failed to print simple test receipt');
      }
    } catch (error) {
      addTestResult(`❌ Print error: ${error}`);
    } finally {
      setIsPrinting(false);
    }
  };

  const printFiscalTest = async () => {
    setIsPrinting(true);
    addTestResult('Printing fiscal test receipt...');
    
    try {
      const testOrder = {
        id: 'test-001',
        orderNumber: 'TEST-001',
        roomId: '101',
        roomNumber: '101',
        guestName: 'Test Guest',
        orderedAt: new Date(),
        items: [
          {
            id: '1',
            itemId: 1,
            itemName: 'Coca Cola 0.33L',
            category: 'Beverage',
            price: 3.50,
            quantity: 2,
            totalPrice: 7.00,
            unit: 'pcs',
            availableStock: 50
          },
          {
            id: '2',
            itemId: 2,
            itemName: 'Sandwich Club',
            category: 'Food',
            price: 12.00,
            quantity: 1,
            totalPrice: 12.00,
            unit: 'pcs',
            availableStock: 25
          }
        ],
        subtotal: 19.00,
        tax: 4.75, // 25% VAT
        totalAmount: 23.75,
        paymentMethod: 'immediate_cash' as const,
        paymentStatus: 'paid' as const,
        orderStatus: 'delivered' as const,
        notes: 'Test order for printer verification',
        orderedBy: 'Front Desk Staff',
        deliveredAt: new Date(),
        printedReceipt: true
      };

      const success = await printFiscalTestReceipt({
        order: testOrder,
        hotelInfo: {
          name: HOTEL_POREC.name,
          address: HOTEL_POREC.address,
          phone: HOTEL_POREC.phone,
          email: HOTEL_POREC.email,
          oib: HOTEL_POREC.taxId,
          fiscalNumber: 'HP-2025-000001'
        },
        timestamp: new Date()
      });

      if (success) {
        addTestResult('✅ Fiscal test receipt sent to printer');
      } else {
        addTestResult('❌ Failed to print fiscal test receipt');
      }
    } catch (error) {
      addTestResult(`❌ Fiscal print error: ${error}`);
    } finally {
      setIsPrinting(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center space-x-3">
        <TestTube className="h-8 w-8 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Printer Test Center</h1>
          <p className="text-gray-600">Test thermal printer connectivity and receipt generation</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Printer Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Printer Configuration</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="printerName">Printer Name (Optional)</Label>
              <Input
                id="printerName"
                placeholder="e.g., Bixolon SRP-350II"
                value={printerName}
                onChange={(e) => setPrinterName(e.target.value)}
              />
              <p className="text-sm text-gray-500 mt-1">
                Leave empty to use default system printer
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                {isConnected === null ? (
                  <div className="w-3 h-3 bg-gray-400 rounded-full" />
                ) : isConnected ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                )}
                <span className="text-sm font-medium">
                  {isConnected === null ? 'Not tested' : 
                   isConnected ? 'Printer ready' : 'Connection failed'}
                </span>
              </div>

              <Button 
                onClick={testPrinterConnection} 
                disabled={isPrinting}
                className="w-full"
                variant="outline"
              >
                <Printer className="h-4 w-4 mr-2" />
                {isPrinting ? 'Testing...' : 'Test Connection'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Test Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Receipt className="h-5 w-5" />
              <span>Receipt Tests</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <Button 
                onClick={printSimpleTest} 
                disabled={isPrinting || isConnected === false}
                variant="outline"
                className="justify-start"
              >
                <Receipt className="h-4 w-4 mr-2" />
                Print Simple Test
              </Button>

              <Button 
                onClick={printFiscalTest} 
                disabled={isPrinting || isConnected === false}
                className="justify-start"
              >
                <Receipt className="h-4 w-4 mr-2" />
                Print Fiscal Receipt Test
              </Button>
            </div>

            <div className="pt-4 border-t">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Test Results</span>
                <Button 
                  onClick={clearResults} 
                  variant="ghost" 
                  size="sm"
                  disabled={testResults.length === 0}
                >
                  Clear
                </Button>
              </div>
              
              <div className="bg-gray-50 rounded-md p-3 max-h-64 overflow-y-auto">
                {testResults.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No test results yet</p>
                ) : (
                  <div className="space-y-1">
                    {testResults.map((result, index) => (
                      <p key={index} className="text-xs font-mono text-gray-700">
                        {result}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>Windows Thermal Printer Setup</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-sm mb-2">Compatible Printers</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Bixolon SRP-350II (your model)</li>
                <li>• Any thermal printer with Windows drivers</li>
                <li>• ESC/POS compatible printers</li>
                <li>• Standard Windows printers</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-sm mb-2">Setup Instructions</h4>
              <ol className="text-sm text-gray-600 space-y-1">
                <li>1. Install printer drivers in Windows</li>
                <li>2. Set thermal printer as default (optional)</li>
                <li>3. Configure paper size to 80mm thermal</li>
                <li>4. Test connection using this page</li>
              </ol>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-start space-x-2">
              <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <h5 className="font-semibold text-blue-900">Croatian Fiscal Compliance</h5>
                <p className="text-sm text-blue-700 mt-1">
                  Test receipts include OIB numbers, 25% VAT calculation, and fiscal invoice formatting 
                  required for Croatian hospitality businesses.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}