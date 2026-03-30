import type { Invoice, Payment } from '../../../../lib/hotel/types';
import type { Guest } from '../../../../lib/queries/hooks/useGuests';
import type { Room } from '../../../../lib/queries/hooks/useRooms';
import type { Reservation } from '../../../../lib/queries/hooks/useReservations';

// ── Shared prop types for InvoicePaymentPage sub-components ──────────────────

export interface InvoiceStatsCardsProps {
  totalInvoices: number;
  totalRevenue: number;
  unpaidCount: number;
  totalPaid: number;
}

export interface InvoiceFilterBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
}

export interface InvoiceTableProps {
  invoices: Invoice[];
  guests: Guest[];
  reservations: Reservation[];
  rooms: Room[];
  statusColors: Record<string, string>;
  onViewInvoice: (invoice: Invoice) => void;
  onDownloadPDF: (invoice: Invoice) => void;
}

export interface PaymentTableProps {
  payments: Payment[];
  statusColors: Record<string, string>;
  getInvoiceNumber: (invoiceId: number) => string;
}

export interface InvoiceDetailDialogProps {
  invoice: Invoice | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guests: Guest[];
  reservations: Reservation[];
  rooms: Room[];
  statusColors: Record<string, string>;
  onDownloadPDF: (invoice: Invoice) => void;
}
