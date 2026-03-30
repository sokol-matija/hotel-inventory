import { Card, CardContent, CardHeader, CardTitle } from '../../../../ui/card';
import { Button } from '../../../../ui/button';
import { Badge } from '../../../../ui/badge';
import { Mail, Receipt, Printer, Download, CheckCircle, AlertTriangle } from 'lucide-react';
import { FiscalData } from '../../../../../lib/hotel/services/ReservationService';

export interface FiscalCardProps {
  fiscalData: FiscalData | null;
  isFiscalizing: boolean;
  isSendingEmail: boolean;
  guestEmail: string | null | undefined;
  onGenerateInvoice: () => void;
  onPrintReceipt: () => void;
  onEmailReceipt: () => void;
}

export const FiscalCard = ({
  fiscalData,
  isFiscalizing,
  isSendingEmail,
  guestEmail,
  onGenerateInvoice,
  onPrintReceipt,
  onEmailReceipt,
}: FiscalCardProps) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center space-x-2">
        <Receipt className="h-5 w-5" />
        <span>Croatian Fiscal Invoices</span>
        {fiscalData && (
          <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800">
            Fiscalized
          </Badge>
        )}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          onClick={onGenerateInvoice}
          disabled={isFiscalizing}
          className="bg-indigo-600 text-white hover:bg-indigo-700"
        >
          {isFiscalizing ? (
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Generate Fiscal Invoice
        </Button>
        <Button
          onClick={onPrintReceipt}
          disabled={isFiscalizing}
          variant="outline"
          className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
        >
          {isFiscalizing ? (
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-indigo-600" />
          ) : (
            <Printer className="mr-2 h-4 w-4" />
          )}
          Print Thermal Receipt
        </Button>
        <Button
          onClick={onEmailReceipt}
          disabled={isSendingEmail || isFiscalizing || !guestEmail}
          variant="outline"
          className="border-green-200 text-green-700 hover:bg-green-50"
        >
          {isSendingEmail || isFiscalizing ? (
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-green-600" />
          ) : (
            <Mail className="mr-2 h-4 w-4" />
          )}
          Email Fiscal Receipt
        </Button>
      </div>
      <div className="mt-3 space-y-1 text-sm text-gray-600">
        <p className="flex items-center gap-1.5">
          <Receipt className="h-3.5 w-3.5 text-gray-500" />
          <strong>Fiscal Invoice:</strong> Croatian Tax Authority compliant PDF with QR code and JIR
        </p>
        <p className="flex items-center gap-1.5">
          <Printer className="h-3.5 w-3.5 text-gray-500" />
          <strong>Thermal Receipt:</strong> 80mm format for receipt printers with fiscal data
        </p>
        <p className="flex items-center gap-1.5">
          <Mail className="h-3.5 w-3.5 text-gray-500" />
          <strong>Email Receipt:</strong> Send professional fiscal invoice to guest automatically
        </p>
        {fiscalData && (
          <div className="mt-2 rounded-lg bg-green-50 p-2">
            <p className="flex items-center gap-1 font-medium text-green-800">
              <CheckCircle className="h-4 w-4" /> Fiscalized with Croatian Tax Authority
            </p>
            <p className="text-xs text-green-700">JIR: {fiscalData.jir}</p>
          </div>
        )}
        {!guestEmail && (
          <p className="mt-2 flex items-center gap-1 text-red-600">
            <AlertTriangle className="h-3.5 w-3.5" /> No email address on file for guest
          </p>
        )}
      </div>
    </CardContent>
  </Card>
);
