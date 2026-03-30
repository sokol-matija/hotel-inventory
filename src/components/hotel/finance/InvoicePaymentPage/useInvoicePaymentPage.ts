import { useState } from 'react';
import { useInvoices } from '../../../../lib/queries/hooks/useInvoices';
import { useGuests } from '../../../../lib/queries/hooks/useGuests';
import { useRooms } from '../../../../lib/queries/hooks/useRooms';
import { useReservations } from '../../../../lib/queries/hooks/useReservations';
import { useCompanies } from '../../../../lib/queries/hooks/useCompanies';
import {
  INVOICE_STATUS_COLORS,
  filterInvoices,
  getTotalRevenue,
  getUnpaidInvoices,
} from '../../../../lib/hotel/invoiceUtils';
import { generatePDFInvoice } from '../../../../lib/pdfInvoiceGenerator';
import hotelNotification from '../../../../lib/notifications';
import { supabase } from '../../../../lib/supabase';
import { mapChargeFromDB } from '../../../../lib/queries/hooks/useReservationCharges';
import type { Invoice, Company, Payment } from '../../../../lib/hotel/types';

export function useInvoicePaymentPage() {
  // ── TanStack Query data ────────────────────────────────────────────────────
  const { data: invoices = [], isLoading: invoicesLoading, isError: invoicesError } = useInvoices();
  const { data: guests = [], isLoading: guestsLoading, isError: guestsError } = useGuests();
  const { data: rooms = [], isLoading: roomsLoading, isError: roomsError } = useRooms();
  const {
    data: reservations = [],
    isLoading: reservationsLoading,
    isError: reservationsError,
  } = useReservations();
  const { data: companies = [] } = useCompanies();
  const payments: Payment[] = []; // payments not loaded from DB

  const isLoading = invoicesLoading || guestsLoading || roomsLoading || reservationsLoading;
  const isError = invoicesError || guestsError || roomsError || reservationsError;

  // ── Local state ────────────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showInvoiceDetails, setShowInvoiceDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<'invoices' | 'payments'>('invoices');

  // ── Derived data ───────────────────────────────────────────────────────────
  const filteredInvoices = filterInvoices(
    invoices,
    guests,
    reservations,
    rooms,
    searchTerm,
    statusFilter
  );
  const unpaidInvoices = getUnpaidInvoices(invoices);
  const totalRevenue = getTotalRevenue(invoices);
  const statusColors = INVOICE_STATUS_COLORS;
  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const getInvoiceNumber = (invoiceId: number) => {
    return invoices.find((inv) => inv.id === invoiceId)?.invoiceNumber || 'Unknown';
  };

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowInvoiceDetails(true);
  };

  const handleDownloadPDF = async (invoice: Invoice) => {
    try {
      // Use reservation data from invoice (loaded via JOIN)
      const reservation = invoice.reservation;
      const guest = invoice.guest;
      const room = reservation ? rooms.find((r) => r.id === reservation.room_id) : undefined;

      if (!reservation || !guest || !room) {
        hotelNotification.error(
          'PDF Generation Failed',
          'Missing reservation, guest, or room data for invoice generation.',
          4000
        );
        return;
      }

      // Resolve company from TQ cache (no extra fetch needed)
      const company: Company | undefined =
        reservation.is_r1 && reservation.company_id
          ? companies.find((c) => c.id === Number(reservation.company_id))
          : undefined;

      // Fetch line-item charges for the PDF
      const { data: chargeRows } = await supabase
        .from('reservation_charges')
        .select('*')
        .eq('reservation_id', reservation.id);

      const charges = (chargeRows ?? []).map(mapChargeFromDB);

      // Generate PDF with EXISTING fiscal data (never regenerate JIR/ZKI)
      await generatePDFInvoice({
        reservation,
        guest,
        room,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.issueDate,
        jir: invoice.fiscalData?.jir,
        zki: invoice.fiscalData?.zki,
        qrCodeData: invoice.fiscalData?.qrCodeData,
        company, // Pass company data for R1 billing
        charges,
      });

      const invoiceType = company ? 'R1 Company Invoice' : 'Invoice';
      hotelNotification.success(
        'PDF Downloaded',
        `${invoiceType} ${invoice.invoiceNumber} has been downloaded successfully.`,
        3000
      );
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      hotelNotification.error(
        'PDF Generation Failed',
        'An error occurred while generating the PDF. Please try again.',
        4000
      );
    }
  };

  return {
    // Loading / error
    isLoading,
    isError,
    // Data
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
    // State
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    selectedInvoice,
    showInvoiceDetails,
    setShowInvoiceDetails,
    activeTab,
    setActiveTab,
    // Handlers
    getInvoiceNumber,
    handleViewInvoice,
    handleDownloadPDF,
  };
}
