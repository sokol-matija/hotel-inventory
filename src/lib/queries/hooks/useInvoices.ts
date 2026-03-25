import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { QueryData } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '../queryKeys';
import type { Invoice, Guest, Reservation, InvoiceStatus } from '@/lib/hotel/types';

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
      subtotal,
      vat_amount,
      tourism_tax,
      total_amount,
      pet_fee,
      parking_fee,
      additional_charges,
      status_id,
      seasonal_period,
      base_room_rate
    )
  `
  )
  .order('created_at', { ascending: false });

// ─── Derived types ─────────────────────────────────────────────────────────────

export type InvoiceRow = QueryData<typeof invoicesQuery>[number];

// ─── Mapping helpers ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapInvoiceReservation(row: any): Partial<Reservation> {
  const r = row.reservations;
  return {
    id: r.id.toString(),
    roomId: r.room_id?.toString() || '',
    guestId: row.guest_id?.toString() || '',
    checkIn: new Date(r.check_in_date),
    checkOut: new Date(r.check_out_date),
    numberOfGuests: r.adults + (r.children_count || 0),
    adults: r.adults,
    children: [],
    // reservations uses status_id (FK), not a status string — default to 'confirmed'
    status: 'confirmed',
    totalAmount: parseFloat(r.total_amount || '0'),
    numberOfNights: r.number_of_nights,
    baseRoomRate: parseFloat(r.base_room_rate || '0'),
    subtotal: parseFloat(r.subtotal || '0'),
    vatAmount: parseFloat(r.vat_amount || '0'),
    tourismTax: parseFloat(r.tourism_tax || '0'),
    petFee: parseFloat(r.pet_fee || '0'),
    parkingFee: parseFloat(r.parking_fee || '0'),
    additionalCharges: parseFloat(r.additional_charges || '0'),
    specialRequests: '',
    bookingSource: 'direct',
    hasPets: false,
    hasParking: false,
    seasonalPeriod: r.seasonal_period || 'low',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Partial<Reservation>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRowToInvoice(row: any): Invoice {
  return {
    id: row.id.toString(),
    invoiceNumber: row.invoice_number,
    reservationId: row.reservation_id?.toString() || '',
    guestId: row.guest_id?.toString() || '',
    companyId: row.company_id?.toString(),
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
          id: row.guests.id.toString(),
          firstName: row.guests.first_name,
          lastName: row.guests.last_name,
          fullName: `${row.guests.first_name} ${row.guests.last_name}`,
          email: row.guests.email,
          phone: row.guests.phone,
          nationality: '',
          preferredLanguage: 'en',
          dietaryRestrictions: [],
          hasPets: false,
          isVip: false,
          vipLevel: 0,
          children: [],
          totalStays: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
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
