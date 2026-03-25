import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { QueryData } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '../queryKeys';
import type { Guest, Reservation, InvoiceStatus, Payment } from '@/lib/hotel/types';

// ─── Query definition ──────────────────────────────────────────────────────────

const invoicesQuery = supabase
  .from('invoices')
  .select(
    `
    *,
    fiscal_records (
      jir,
      zki,
      qr_code_data
    ),
    guests (
      id,
      first_name,
      last_name,
      email,
      phone
    ),
    reservations (
      id,
      room_id,
      check_in_date,
      check_out_date,
      number_of_nights,
      adults,
      children_count,
      status_id
    )
  `
  )
  .order('created_at', { ascending: false });

// ─── Derived types ─────────────────────────────────────────────────────────────

export type InvoiceRow = QueryData<typeof invoicesQuery>[number];

export interface Invoice {
  id: number;
  invoiceNumber: string;
  reservationId: number;
  guestId: number;
  companyId?: number;
  guest?: Guest;
  reservation?: Reservation;
  issueDate: Date;
  dueDate: Date;
  serviceDate?: Date;
  paidDate?: Date;
  status: InvoiceStatus;
  currency: string;
  items: unknown[];
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  tourismTax: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentMethod?: string;
  fiscalData?: {
    oib: string;
    jir: string;
    zki: string;
    qrCodeData?: string;
    fiscalReceiptUrl?: string;
    operatorOib?: string;
  };
  payments?: Payment[];
  issuedBy?: string;
  pdfPath?: string;
  isEmailSent?: boolean;
  emailSentAt?: Date;
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Mapping helpers ───────────────────────────────────────────────────────────

function mapInvoiceReservation(row: InvoiceRow): Partial<Reservation> {
  const r = row.reservations;
  if (!r) return {};
  return {
    id: r.id,
    room_id: r.room_id,
    guest_id: row.guest_id ?? undefined,
    check_in_date: r.check_in_date,
    check_out_date: r.check_out_date,
    adults: r.adults,
    number_of_guests: r.adults + (r.children_count || 0),
    number_of_nights: r.number_of_nights,
    status_id: r.status_id,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRowToInvoice(row: any): Invoice {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    reservationId: row.reservation_id ?? 0,
    guestId: row.guest_id ?? 0,
    companyId: row.company_id ?? undefined,
    issueDate: new Date(row.issue_date),
    dueDate: new Date(row.due_date || row.issue_date),
    status: (row.status || 'draft') as InvoiceStatus,
    subtotal: parseFloat(row.subtotal || '0'),
    vatRate: 0.13,
    vatAmount: parseFloat(row.vat_amount || '0'),
    tourismTax: parseFloat(row.tourism_tax || '0'),
    totalAmount: parseFloat(row.total_amount || '0'),
    paidAmount: parseFloat(row.paid_amount || '0'),
    remainingAmount: parseFloat(row.balance_due || '0'),
    currency: 'EUR',
    items: [],
    notes: row.notes || '',
    createdAt: new Date(row.created_at || Date.now()),
    updatedAt: new Date(row.updated_at || Date.now()),
    fiscalData: row.fiscal_records?.[0]
      ? {
          oib: '87246357068',
          jir: row.fiscal_records[0].jir,
          zki: row.fiscal_records[0].zki,
          qrCodeData: row.fiscal_records[0].qr_code_data,
        }
      : undefined,
    guest: row.guests
      ? ({
          id: row.guests.id,
          first_name: row.guests.first_name,
          last_name: row.guests.last_name,
          full_name: `${row.guests.first_name} ${row.guests.last_name}`,
          display_name: `${row.guests.first_name} ${row.guests.last_name}`,
          email: row.guests.email,
          phone: row.guests.phone,
          nationality: null,
          preferred_language: 'en',
          dietary_restrictions: null,
          has_pets: null,
          is_vip: null,
          vip_level: null,
          date_of_birth: null,
          passport_number: null,
          id_card_number: null,
          special_needs: null,
          marketing_consent: null,
          average_rating: null,
          notes: null,
          country_code: null,
          created_at: null,
          updated_at: null,
        } as Guest)
      : undefined,
    reservation: row.reservations
      ? (mapInvoiceReservation(row) as unknown as Reservation)
      : undefined,
  };
}

// ─── Service functions ─────────────────────────────────────────────────────────

async function fetchInvoices(): Promise<Invoice[]> {
  const { data } = await invoicesQuery.throwOnError();
  return (data ?? []).map(mapRowToInvoice);
}

// ─── Hooks ─────────────────────────────────────────────────────────────────────

export function useInvoices() {
  return useQuery({
    queryKey: queryKeys.invoices.all(),
    queryFn: fetchInvoices,
    staleTime: 1000 * 60 * 2, // 2 min — invoices change less frequently
  });
}

// ─── Derived ──────────────────────────────────────────────────────────────────

export function useUnpaidInvoices() {
  const { data: invoices = [], ...rest } = useInvoices();
  const unpaid = useMemo(() => invoices.filter((inv) => inv.status !== 'paid'), [invoices]);
  return { data: unpaid, ...rest };
}

export function useInvoicesByDateRange(start: Date | null, end: Date | null) {
  const { data: invoices = [], ...rest } = useInvoices();
  const filtered = useMemo(() => {
    if (!start || !end) return invoices;
    return invoices.filter((inv) => inv.issueDate >= start && inv.issueDate <= end);
  }, [invoices, start, end]);
  return { data: filtered, ...rest };
}
