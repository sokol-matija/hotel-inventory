/**
 * Pure utility functions for the invoice finance pages.
 * Extracted from InvoiceHistoryPage and InvoicePaymentPage to eliminate
 * duplication and enable unit testing.
 */

import type { Invoice } from './types';
import type { Guest } from '../queries/hooks/useGuests';
import type { Room } from '../queries/hooks/useRooms';
import type { Reservation } from '../queries/hooks/useReservations';

// ── Status colors ─────────────────────────────────────────────────────────────

export const INVOICE_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-600',
  pending: 'bg-yellow-100 text-yellow-800',
  partial: 'bg-blue-100 text-blue-800',
  refunded: 'bg-red-100 text-red-800',
};

export function getInvoiceStatusColor(status: string): string {
  return INVOICE_STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-800';
}

// ── Lookup helpers ────────────────────────────────────────────────────────────

export function getGuestName(
  guestId: string,
  guests: Pick<Guest, 'id' | 'display_name'>[]
): string {
  return guests.find((g) => g.id === Number(guestId))?.display_name ?? 'Unknown Guest';
}

export function getRoomNumber(
  invoice: Pick<Invoice, 'reservationId'>,
  reservations: Pick<Reservation, 'id' | 'room_id'>[],
  rooms: Pick<Room, 'id' | 'room_number'>[]
): string {
  const reservation = reservations.find((r) => r.id === Number(invoice.reservationId));
  if (!reservation) return 'Unknown Room';
  return rooms.find((r) => r.id === reservation.room_id)?.room_number ?? 'Unknown Room';
}

// ── Filter + aggregation ──────────────────────────────────────────────────────

export function filterInvoices(
  invoices: Invoice[],
  guests: Pick<Guest, 'id' | 'display_name'>[],
  reservations: Pick<Reservation, 'id' | 'room_id'>[],
  rooms: Pick<Room, 'id' | 'room_number'>[],
  searchTerm: string,
  statusFilter: string
): Invoice[] {
  const lower = searchTerm.toLowerCase();
  return invoices.filter((invoice) => {
    if (statusFilter !== 'all' && invoice.status !== statusFilter) return false;
    if (!searchTerm) return true;
    const guestName = getGuestName(invoice.guestId, guests);
    const roomNumber = getRoomNumber(invoice, reservations, rooms);
    return (
      invoice.invoiceNumber.toLowerCase().includes(lower) ||
      guestName.toLowerCase().includes(lower) ||
      roomNumber.includes(searchTerm)
    );
  });
}

export function getTotalRevenue(invoices: Invoice[]): number {
  return invoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.totalAmount, 0);
}

export function getUnpaidInvoices(invoices: Invoice[]): Invoice[] {
  return invoices.filter((inv) => inv.status !== 'paid');
}
