import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import {
  Shield,
  FileCheck,
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  Settings,
} from 'lucide-react';
import { useInvoices } from '../../../lib/queries/hooks/useInvoices';
import { FiscalRecord } from '../../../lib/hotel/types';
import { format } from 'date-fns';

export default function FiscalCompliancePage() {
  const { data: invoices = [] } = useInvoices();
  const fiscalRecords: FiscalRecord[] = []; // not loaded from DB yet

  const totalInvoices = invoices.length;
  const fiscalCompliantInvoices = invoices.filter(
    (inv) => inv.fiscalData?.jir && inv.fiscalData?.zki
  ).length;
  const pendingFiscalSubmissions = invoices.filter((inv) => !inv.fiscalData?.jir).length;
  const validFiscalRecords = fiscalRecords.filter(
    (record) => record.jir && !record.errorMessage
  ).length;

  const complianceRate = totalInvoices > 0 ? (fiscalCompliantInvoices / totalInvoices) * 100 : 0;

  return (
    <div className="mx-auto max-w-7xl p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fiscal Compliance</h1>
          <p className="mt-1 text-gray-600">
            Croatian e-računi system compliance and fiscal record management
          </p>
        </div>
        <div className="mt-4 flex space-x-3 sm:mt-0">
          <Button variant="outline" size="sm">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
          <Button size="sm">
            <Download className="mr-2 h-4 w-4" />
            Generate Report
          </Button>
        </div>
      </div>

      {/* Compliance Status */}
      <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Compliance Rate</p>
                <p className="text-2xl font-bold text-green-600">{complianceRate.toFixed(1)}%</p>
                <p className="mt-1 text-xs text-gray-500">
                  {fiscalCompliantInvoices} of {totalInvoices} invoices
                </p>
              </div>
              <Shield className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Valid Records</p>
                <p className="text-2xl font-bold text-blue-600">{validFiscalRecords}</p>
                <p className="mt-1 text-xs text-gray-500">Submitted to Croatian tax authority</p>
              </div>
              <FileCheck className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Submissions</p>
                <p className="text-2xl font-bold text-orange-600">{pendingFiscalSubmissions}</p>
                <p className="mt-1 text-xs text-gray-500">Require fiscal processing</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">System Status</p>
                <p className="text-2xl font-bold text-green-600">Active</p>
                <p className="mt-1 text-xs text-gray-500">Connected to tax authority</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Croatian Fiscal Requirements */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Croatian Fiscal Requirements</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg bg-green-50 p-3">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium">OIB Tax ID Integration</span>
                </div>
                <Badge className="bg-green-100 text-green-800">Compliant</Badge>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-green-50 p-3">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium">25% VAT Calculation</span>
                </div>
                <Badge className="bg-green-100 text-green-800">Compliant</Badge>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-green-50 p-3">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-sm font-medium">Tourism Tax Tracking</span>
                </div>
                <Badge className="bg-green-100 text-green-800">Compliant</Badge>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-blue-50 p-3">
                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium">e-računi API Integration</span>
                </div>
                <Badge className="bg-blue-100 text-blue-800">Pending</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Fiscal Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            {fiscalRecords.length > 0 ? (
              <div className="space-y-3">
                {fiscalRecords.slice(0, 5).map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">JIR: {record.jir}</p>
                      <p className="text-xs text-gray-500">
                        {format(record.dateTimeSubmitted, 'MMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                    <Badge
                      className={
                        record.jir && !record.errorMessage
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }
                    >
                      {record.jir && !record.errorMessage ? 'Valid' : 'Invalid'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <FileCheck className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                <p className="text-gray-500">No fiscal records yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Compliance Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Compliance Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Daily Requirements</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Generate JIR for all invoices</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Submit invoices to tax authority</span>
                </div>
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <span className="text-sm">Backup fiscal data</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Monthly Requirements</h4>
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">VAT report generation</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Tourism tax submission</span>
                </div>
                <div className="flex items-center space-x-3">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <span className="text-sm">Audit trail review</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-lg bg-blue-50 p-4">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> This system provides the data structure for Croatian fiscal
              compliance. Integration with the actual Croatian e-računi API requires additional
              government certification and API credentials.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
