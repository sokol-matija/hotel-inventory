import { describe, it, expect } from 'vitest';
import {
  INVOICE_STATUS_COLORS,
  getInvoiceStatusColor,
  getGuestName,
  getRoomNumber,
  filterInvoices,
  getTotalRevenue,
  getUnpaidInvoices,
} from './invoiceUtils';
import type { Invoice } from './types';
import type { Guest } from '../queries/hooks/useGuests';
import type { Room } from '../queries/hooks/useRooms';
import type { Reservation } from '../queries/hooks/useReservations';

// ── Factories ─────────────────────────────────────────────────────────────────

function buildInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: '1',
    invoiceNumber: 'INV-001',
    guestId: '10',
    reservationId: '20',
    status: 'draft',
    totalAmount: 100,
    issueDate: new Date('2026-01-01'),
    dueDate: new Date('2026-01-31'),
    items: [],
    ...overrides,
  } as Invoice;
}

const guests: Pick<Guest, 'id' | 'display_name'>[] = [
  { id: 10, display_name: 'Ana Horvat' },
  { id: 11, display_name: 'Ivan Novak' },
];

const rooms: Pick<Room, 'id' | 'room_number'>[] = [
  { id: 100, room_number: '101' },
  { id: 101, room_number: '202' },
];

const reservations: Pick<Reservation, 'id' | 'room_id'>[] = [
  { id: 20, room_id: 100 },
  { id: 21, room_id: 101 },
];

// ── getInvoiceStatusColor ─────────────────────────────────────────────────────

describe('getInvoiceStatusColor', () => {
  it.each(Object.keys(INVOICE_STATUS_COLORS))('returns correct class for %s', (status) => {
    expect(getInvoiceStatusColor(status)).toBe(INVOICE_STATUS_COLORS[status]);
  });

  it('returns default gray class for unknown status', () => {
    expect(getInvoiceStatusColor('unknown')).toBe('bg-gray-100 text-gray-800');
  });
});

// ── getGuestName ──────────────────────────────────────────────────────────────

describe('getGuestName', () => {
  it('returns display_name for known guest', () => {
    expect(getGuestName('10', guests)).toBe('Ana Horvat');
  });

  it('returns display_name for another known guest', () => {
    expect(getGuestName('11', guests)).toBe('Ivan Novak');
  });

  it('returns "Unknown Guest" for missing guest', () => {
    expect(getGuestName('99', guests)).toBe('Unknown Guest');
  });

  it('returns "Unknown Guest" for empty guests array', () => {
    expect(getGuestName('10', [])).toBe('Unknown Guest');
  });
});

// ── getRoomNumber ─────────────────────────────────────────────────────────────

describe('getRoomNumber', () => {
  it('returns room_number via reservation lookup', () => {
    const invoice = buildInvoice({ reservationId: '20' });
    expect(getRoomNumber(invoice, reservations, rooms)).toBe('101');
  });

  it('returns correct room for second reservation', () => {
    const invoice = buildInvoice({ reservationId: '21' });
    expect(getRoomNumber(invoice, reservations, rooms)).toBe('202');
  });

  it('returns "Unknown Room" when reservation not found', () => {
    const invoice = buildInvoice({ reservationId: '99' });
    expect(getRoomNumber(invoice, reservations, rooms)).toBe('Unknown Room');
  });

  it('returns "Unknown Room" when room not found for reservation', () => {
    const orphanReservations: Pick<Reservation, 'id' | 'room_id'>[] = [{ id: 20, room_id: 999 }];
    const invoice = buildInvoice({ reservationId: '20' });
    expect(getRoomNumber(invoice, orphanReservations, rooms)).toBe('Unknown Room');
  });
});

// ── filterInvoices ────────────────────────────────────────────────────────────

describe('filterInvoices', () => {
  const invoices = [
    buildInvoice({
      id: '1',
      invoiceNumber: 'INV-001',
      guestId: '10',
      reservationId: '20',
      status: 'paid',
    }),
    buildInvoice({
      id: '2',
      invoiceNumber: 'INV-002',
      guestId: '11',
      reservationId: '21',
      status: 'draft',
    }),
    buildInvoice({
      id: '3',
      invoiceNumber: 'INV-003',
      guestId: '10',
      reservationId: '20',
      status: 'overdue',
    }),
  ];

  it('returns all invoices with no filters', () => {
    expect(filterInvoices(invoices, guests, reservations, rooms, '', 'all')).toHaveLength(3);
  });

  it('filters by status', () => {
    const result = filterInvoices(invoices, guests, reservations, rooms, '', 'paid');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('filters by invoice number search', () => {
    const result = filterInvoices(invoices, guests, reservations, rooms, 'INV-002', 'all');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('filters by guest name search (case insensitive)', () => {
    const result = filterInvoices(invoices, guests, reservations, rooms, 'ana', 'all');
    expect(result).toHaveLength(2);
  });

  it('filters by room number search', () => {
    const result = filterInvoices(invoices, guests, reservations, rooms, '202', 'all');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('combines status and search filters', () => {
    const result = filterInvoices(invoices, guests, reservations, rooms, 'Ana', 'paid');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('returns empty when no match', () => {
    expect(filterInvoices(invoices, guests, reservations, rooms, 'NOPE', 'all')).toHaveLength(0);
  });
});

// ── getTotalRevenue ───────────────────────────────────────────────────────────

describe('getTotalRevenue', () => {
  it('sums only paid invoices', () => {
    const invoices = [
      buildInvoice({ status: 'paid', totalAmount: 150 }),
      buildInvoice({ status: 'draft', totalAmount: 50 }),
      buildInvoice({ status: 'paid', totalAmount: 200 }),
    ];
    expect(getTotalRevenue(invoices)).toBe(350);
  });

  it('returns 0 with no paid invoices', () => {
    const invoices = [buildInvoice({ status: 'draft', totalAmount: 100 })];
    expect(getTotalRevenue(invoices)).toBe(0);
  });

  it('returns 0 for empty array', () => {
    expect(getTotalRevenue([])).toBe(0);
  });
});

// ── getUnpaidInvoices ─────────────────────────────────────────────────────────

describe('getUnpaidInvoices', () => {
  it('excludes paid invoices', () => {
    const invoices = [
      buildInvoice({ id: '1', status: 'paid' }),
      buildInvoice({ id: '2', status: 'draft' }),
      buildInvoice({ id: '3', status: 'overdue' }),
    ];
    const result = getUnpaidInvoices(invoices);
    expect(result).toHaveLength(2);
    expect(result.map((i) => i.id)).toEqual(['2', '3']);
  });

  it('returns empty when all paid', () => {
    const invoices = [buildInvoice({ status: 'paid' })];
    expect(getUnpaidInvoices(invoices)).toHaveLength(0);
  });

  it('returns all when none are paid', () => {
    const invoices = [buildInvoice({ status: 'draft' }), buildInvoice({ status: 'overdue' })];
    expect(getUnpaidInvoices(invoices)).toHaveLength(2);
  });
});
