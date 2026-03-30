import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '../../../ui/button';
import { Download, FileText } from 'lucide-react';
import { useInvoicePaymentPage } from './useInvoicePaymentPage';
import { InvoiceStatsCards } from './InvoiceStatsCards';
import { InvoiceFilterBar } from './InvoiceFilterBar';
import { InvoiceTable } from './InvoiceTable';
import { PaymentTable } from './PaymentTable';
import { InvoiceDetailDialog } from './InvoiceDetailDialog';

export default function InvoicePaymentPage() {
  const {
    isLoading,
    isError,
    invoices,
    guests,
    rooms,
    reservations,
    payments,
    filteredInvoices,
    unpaidInvoices,
    totalRevenue,
    totalPaid,
    statusColors,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    selectedInvoice,
    showInvoiceDetails,
    setShowInvoiceDetails,
    activeTab,
    setActiveTab,
    getInvoiceNumber,
    handleViewInvoice,
    handleDownloadPDF,
  } = useInvoicePaymentPage();

  if (isLoading) {
    return (
      <div className="space-y-3 p-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-md" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center p-8 text-red-500">
        Failed to load invoice data. Please try again.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoice & Payment Management</h1>
          <p className="mt-1 text-gray-600">Manage invoices, track payments, and download PDFs</p>
        </div>
        <div className="mt-4 flex space-x-3 sm:mt-0">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </Button>
          <Button size="sm">
            <FileText className="mr-2 h-4 w-4" />
            New Invoice
          </Button>
        </div>
      </div>

      <InvoiceStatsCards
        totalInvoices={invoices.length}
        totalRevenue={totalRevenue}
        unpaidCount={unpaidInvoices.length}
        totalPaid={totalPaid}
      />

      {/* Tab Navigation */}
      <div className="mb-6 flex space-x-1 border-b">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'invoices'
              ? 'border-blue-500 bg-blue-50 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Invoices ({invoices.length})
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'payments'
              ? 'border-blue-500 bg-blue-50 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Payments ({payments.length})
        </button>
      </div>

      <InvoiceFilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />

      {/* Content based on active tab */}
      {activeTab === 'invoices' ? (
        <InvoiceTable
          invoices={filteredInvoices}
          guests={guests}
          reservations={reservations}
          rooms={rooms}
          statusColors={statusColors}
          onViewInvoice={handleViewInvoice}
          onDownloadPDF={handleDownloadPDF}
        />
      ) : (
        <PaymentTable
          payments={payments}
          statusColors={statusColors}
          getInvoiceNumber={getInvoiceNumber}
        />
      )}

      <InvoiceDetailDialog
        invoice={selectedInvoice}
        open={showInvoiceDetails}
        onOpenChange={setShowInvoiceDetails}
        guests={guests}
        reservations={reservations}
        rooms={rooms}
        statusColors={statusColors}
        onDownloadPDF={handleDownloadPDF}
      />
    </div>
  );
}
