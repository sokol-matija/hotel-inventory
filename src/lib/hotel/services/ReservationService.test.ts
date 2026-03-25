/**
 * ReservationService tests
 *
 * Tests cover:
 *  - getInstance (singleton pattern)
 *  - getReservationData (happy path + edge cases)
 *  - sendWelcomeEmail / sendReminderEmail (success + failure + thrown error)
 *  - generateFiscalInvoice (success, fiscalization failure, thrown error)
 *  - emailFiscalReceipt (no JIR guard, success)
 *  - printThermalReceipt (no JIR guard, success, error)
 *  - getStatusActions (all status branches)
 *  - shouldShowCheckInWorkflow / shouldShowCheckOutWorkflow
 *  - formatReservationDates
 *  - calculateNights
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ReservationService } from './ReservationService';
import { buildReservation, buildGuest, buildRoom } from '@/test/utils';
import type { CalendarEvent } from '../types';

// ─── Module-level mocks ───────────────────────────────────────────────────────

// Mutable state controlled per test
const mocks = vi.hoisted(() => ({
  roomData: null as Record<string, unknown> | null,
  roomError: null as unknown,
  companyData: null as Record<string, unknown> | null,
  companyError: null as unknown,
  chargesData: null as Array<{ total: number; vat_rate: number | null }> | null,
  existingInvoice: null as Record<string, unknown> | null,
  newInvoice: null as Record<string, unknown> | null,
  invoiceError: null as unknown,
  fiscalError: null as unknown,
  sendWelcomeEmailResult: { success: true } as { success: boolean; message?: string },
  sendReminderEmailResult: { success: true } as { success: boolean; message?: string },
  fiscalizeResult: {
    success: true,
    jir: 'JIR-123',
    zki: 'ZKI-456',
    qrCodeData: 'qr-data',
    error: undefined as string | undefined,
  },
  generateFiscalQRData: vi.fn(() => 'generated-qr'),
}));

vi.mock('@/lib/supabase', () => {
  /**
   * Builds a minimal chainable Supabase builder.
   * Supports: .from().select().eq().single() and .from().select().eq()
   * The last call in the chain returns the appropriate mock result.
   */
  function makeRoomChain() {
    const chain: Record<string, unknown> = {};
    const handler: ProxyHandler<object> = {
      get(_t, prop: string) {
        if (prop === 'single')
          return () => Promise.resolve({ data: mocks.roomData, error: mocks.roomError });
        return () => new Proxy({}, handler);
      },
    };
    return new Proxy(chain, handler);
  }

  function makeCompanyChain() {
    const chain: Record<string, unknown> = {};
    const handler: ProxyHandler<object> = {
      get(_t, prop: string) {
        if (prop === 'single')
          return () => Promise.resolve({ data: mocks.companyData, error: mocks.companyError });
        return () => new Proxy({}, handler);
      },
    };
    return new Proxy(chain, handler);
  }

  function makeChargesChain() {
    const handler: ProxyHandler<object> = {
      get(_t, prop: string) {
        // .select().eq() resolves directly (no .single())
        if (prop === 'then') {
          return (resolve: (v: unknown) => void) =>
            resolve({ data: mocks.chargesData, error: null });
        }
        return () => new Proxy({}, handler);
      },
    };
    return new Proxy({}, handler);
  }

  function makeInvoicesChain() {
    // Handles two calls: .select().eq().eq().single()  AND  .insert().select().single()
    const handler: ProxyHandler<object> = {
      get(_t, prop: string) {
        if (prop === 'single') {
          // Determine which call by whether newInvoice/existingInvoice is set
          return () => {
            if (mocks.existingInvoice !== null) {
              return Promise.resolve({ data: mocks.existingInvoice, error: null });
            }
            return Promise.resolve({ data: mocks.newInvoice, error: mocks.invoiceError });
          };
        }
        return () => new Proxy({}, handler);
      },
    };
    return new Proxy({}, handler);
  }

  function makeFiscalRecordsChain() {
    const handler: ProxyHandler<object> = {
      get(_t, prop: string) {
        if (prop === 'then') {
          return (resolve: (v: unknown) => void) =>
            resolve({ data: null, error: mocks.fiscalError });
        }
        return () => new Proxy({}, handler);
      },
    };
    return new Proxy({}, handler);
  }

  return {
    supabase: {
      from: vi.fn((table: string) => {
        if (table === 'rooms') return makeRoomChain();
        if (table === 'companies') return makeCompanyChain();
        if (table === 'reservation_charges') return makeChargesChain();
        if (table === 'invoices') return makeInvoicesChain();
        if (table === 'fiscal_records') return makeFiscalRecordsChain();
        // Fallback
        const handler: ProxyHandler<object> = {
          get(_t, prop: string) {
            if (prop === 'then')
              return (resolve: (v: unknown) => void) => resolve({ data: null, error: null });
            return () => new Proxy({}, handler);
          },
        };
        return new Proxy({}, handler);
      }),
      auth: {
        onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      },
    },
  };
});

vi.mock('../../emailService', () => ({
  HotelEmailService: {
    sendWelcomeEmail: vi.fn(async () => mocks.sendWelcomeEmailResult),
    sendReminderEmail: vi.fn(async () => mocks.sendReminderEmailResult),
  },
}));

vi.mock('../../notifications', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../pdfInvoiceGenerator', () => ({
  generatePDFInvoice: vi.fn(async () => undefined),
  generateThermalReceipt: vi.fn(async () => undefined),
  generateInvoiceNumber: vi.fn(() => 'INV-2026-001'),
}));

vi.mock('../../fiscalization/FiscalizationService', () => ({
  FiscalizationService: {
    getInstance: vi.fn(() => ({
      fiscalizeInvoice: vi.fn(async () => mocks.fiscalizeResult),
      generateFiscalQRData: mocks.generateFiscalQRData,
    })),
  },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeCalendarEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: '1',
    reservationId: '1',
    roomId: '101',
    title: 'Test Event',
    start: new Date('2026-04-01'),
    end: new Date('2026-04-05'),
    resource: {
      status: 'confirmed',
      guestName: 'Test Guest',
      roomNumber: '101',
    },
    ...overrides,
  } as unknown as CalendarEvent;
}

function makeDbRoom(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 101,
    room_number: '101',
    floor_number: 1,
    room_types: { code: 'D' },
    max_occupancy: 2,
    is_premium: false,
    amenities: [],
    is_clean: true,
    room_pricing: [],
    ...overrides,
  };
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('ReservationService', () => {
  let service: ReservationService;

  beforeEach(() => {
    // Reset all mock data to safe defaults
    mocks.roomData = makeDbRoom();
    mocks.roomError = null;
    mocks.companyData = null;
    mocks.companyError = null;
    mocks.chargesData = [{ total: 113, vat_rate: 13 }];
    mocks.existingInvoice = null;
    mocks.newInvoice = { id: 99 };
    mocks.invoiceError = null;
    mocks.fiscalError = null;
    mocks.sendWelcomeEmailResult = { success: true };
    mocks.sendReminderEmailResult = { success: true };
    mocks.fiscalizeResult = {
      success: true,
      jir: 'JIR-123',
      zki: 'ZKI-456',
      qrCodeData: 'qr-data',
      error: undefined,
    };

    // Reset singleton between tests
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ReservationService as any).instance = undefined;
    service = ReservationService.getInstance();

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Singleton ──────────────────────────────────────────────────────────────

  describe('getInstance', () => {
    it('returns the same instance on multiple calls', () => {
      const a = ReservationService.getInstance();
      const b = ReservationService.getInstance();
      expect(a).toBe(b);
    });
  });

  // ── getReservationData ─────────────────────────────────────────────────────

  describe('getReservationData', () => {
    it('returns null when event is null', async () => {
      const result = await service.getReservationData(null, []);
      expect(result).toBeNull();
    });

    it('returns null when reservation is not found by id', async () => {
      const event = makeCalendarEvent({ reservationId: '999' });
      const reservation = buildReservation({ id: 1 });
      const result = await service.getReservationData(event, [reservation]);
      expect(result).toBeNull();
    });

    it('returns null when room DB fetch fails', async () => {
      mocks.roomData = null;
      mocks.roomError = new Error('DB error');

      const reservation = buildReservation({
        id: 1,
        guests: { first_name: 'Ana', last_name: 'Kovač', full_name: 'Ana Kovač' } as never,
      });
      const event = makeCalendarEvent({ reservationId: '1' });
      const result = await service.getReservationData(event, [reservation]);
      expect(result).toBeNull();
    });

    it('returns null when reservation has no guest join', async () => {
      const reservation = buildReservation({ id: 1, guests: null });
      const event = makeCalendarEvent({ reservationId: '1' });
      const result = await service.getReservationData(event, [reservation]);
      expect(result).toBeNull();
    });

    it('returns full ReservationData on happy path', async () => {
      const reservation = buildReservation({
        id: 1,
        reservation_statuses: { code: 'confirmed' },
        guests: {
          first_name: 'Ana',
          last_name: 'Kovač',
          full_name: 'Ana Kovač',
          email: 'ana@example.com',
        } as never,
      });
      const event = makeCalendarEvent({ reservationId: '1', roomId: '101' });

      const result = await service.getReservationData(event, [reservation]);

      expect(result).not.toBeNull();
      expect(result!.reservation).toBe(reservation);
      expect(result!.guest.display_name).toBe('Ana Kovač');
      expect(result!.room.room_number).toBe('101');
      expect(result!.statusColors).toBeDefined();
      expect(result!.isMaintenanceReservation).toBe(false);
    });

    it('derives display_name from first/last name when full_name is absent', async () => {
      const reservation = buildReservation({
        id: 1,
        guests: {
          first_name: 'Marko',
          last_name: 'Perić',
          full_name: null,
          email: 'marko@example.com',
        } as never,
      });
      const event = makeCalendarEvent({ reservationId: '1' });

      const result = await service.getReservationData(event, [reservation]);

      expect(result!.guest.display_name).toBe('Marko Perić');
    });
  });

  // ── sendWelcomeEmail ───────────────────────────────────────────────────────

  describe('sendWelcomeEmail', () => {
    it('returns success:true when email service succeeds', async () => {
      mocks.sendWelcomeEmailResult = { success: true };
      const reservation = buildReservation();
      const guest = buildGuest();
      const room = buildRoom();

      const result = await service.sendWelcomeEmail(reservation, guest, room);

      expect(result.success).toBe(true);
    });

    it('returns success:false with message when email service fails', async () => {
      mocks.sendWelcomeEmailResult = { success: false, message: 'SMTP error' };
      const reservation = buildReservation();
      const guest = buildGuest();
      const room = buildRoom();

      const result = await service.sendWelcomeEmail(reservation, guest, room);

      expect(result.success).toBe(false);
      expect(result.message).toBe('SMTP error');
    });

    it('returns success:false when email service throws', async () => {
      const { HotelEmailService } = await import('../../emailService');
      vi.mocked(HotelEmailService.sendWelcomeEmail).mockRejectedValueOnce(
        new Error('Network error')
      );
      const reservation = buildReservation();
      const guest = buildGuest();

      const result = await service.sendWelcomeEmail(reservation, guest);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to send email');
    });

    it('fetches room from DB when room arg is omitted', async () => {
      mocks.sendWelcomeEmailResult = { success: true };
      const reservation = buildReservation({ room_id: 101 });
      const guest = buildGuest();

      const result = await service.sendWelcomeEmail(reservation, guest);

      expect(result.success).toBe(true);
    });
  });

  // ── sendReminderEmail ──────────────────────────────────────────────────────

  describe('sendReminderEmail', () => {
    it('returns success:true when email service succeeds', async () => {
      mocks.sendReminderEmailResult = { success: true };
      const reservation = buildReservation();
      const guest = buildGuest();
      const room = buildRoom();

      const result = await service.sendReminderEmail(reservation, guest, room);

      expect(result.success).toBe(true);
    });

    it('returns success:false with message when email service fails', async () => {
      mocks.sendReminderEmailResult = { success: false, message: 'Rate limited' };
      const reservation = buildReservation();
      const guest = buildGuest();

      const result = await service.sendReminderEmail(reservation, guest);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Rate limited');
    });

    it('returns success:false when email service throws', async () => {
      const { HotelEmailService } = await import('../../emailService');
      vi.mocked(HotelEmailService.sendReminderEmail).mockRejectedValueOnce(
        new Error('Connection refused')
      );
      const reservation = buildReservation();
      const guest = buildGuest();
      const room = buildRoom();

      const result = await service.sendReminderEmail(reservation, guest, room);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to send reminder');
    });
  });

  // ── generateFiscalInvoice ──────────────────────────────────────────────────

  describe('generateFiscalInvoice', () => {
    it('returns success:true with JIR and fiscalData on happy path', async () => {
      mocks.chargesData = [{ total: 226, vat_rate: 13 }];
      mocks.existingInvoice = null;
      mocks.newInvoice = { id: 42 };

      const reservation = buildReservation({ is_r1: false, number_of_nights: 2 });
      const guest = buildGuest({ id: 7 });
      const room = buildRoom({ room_number: '201', name_english: 'Double Room' });

      const result = await service.generateFiscalInvoice(reservation, guest, room);

      expect(result.success).toBe(true);
      expect(result.jir).toBe('JIR-123');
      expect(result.fiscalData).toMatchObject({
        jir: 'JIR-123',
        zki: 'ZKI-456',
      });
    });

    it('uses existing invoice when one already exists for the reservation', async () => {
      mocks.existingInvoice = { id: 55 };

      const reservation = buildReservation({ is_r1: false });
      const guest = buildGuest({ id: 3 });
      const room = buildRoom();

      const result = await service.generateFiscalInvoice(reservation, guest, room);

      expect(result.success).toBe(true);
    });

    it('fetches company data when is_r1 and company_id are set', async () => {
      mocks.companyData = {
        id: 10,
        name: 'ACME d.o.o.',
        oib: '12345678901',
      };
      mocks.newInvoice = { id: 77 };

      const reservation = buildReservation({ is_r1: true, company_id: 10 });
      const guest = buildGuest({ id: 5 });
      const room = buildRoom();

      const result = await service.generateFiscalInvoice(reservation, guest, room);

      expect(result.success).toBe(true);
    });

    it('returns success:false when fiscalization fails', async () => {
      mocks.fiscalizeResult = {
        success: false,
        jir: undefined as unknown as string,
        zki: undefined as unknown as string,
        qrCodeData: undefined as unknown as string,
        error: 'Tax authority unavailable',
      };

      const reservation = buildReservation();
      const guest = buildGuest();
      const room = buildRoom();

      const result = await service.generateFiscalInvoice(reservation, guest, room);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Tax authority unavailable');
    });

    it('returns success:false when invoice insert throws', async () => {
      mocks.existingInvoice = null;
      mocks.newInvoice = null;
      mocks.invoiceError = new Error('FK constraint violation');

      const reservation = buildReservation({ is_r1: false });
      const guest = buildGuest({ id: 4 });
      const room = buildRoom();

      const result = await service.generateFiscalInvoice(reservation, guest, room);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to generate fiscal invoice');
    });

    it('returns success:false when fiscal_records insert throws', async () => {
      mocks.newInvoice = { id: 88 };
      mocks.fiscalError = new Error('fiscal_records insert failed');

      const reservation = buildReservation({ is_r1: false });
      const guest = buildGuest({ id: 6 });
      const room = buildRoom();

      const result = await service.generateFiscalInvoice(reservation, guest, room);

      expect(result.success).toBe(false);
    });

    it('derives totalAmount to 0 when charges list is empty', async () => {
      mocks.chargesData = [];
      mocks.newInvoice = { id: 99 };

      const reservation = buildReservation({ is_r1: false });
      const guest = buildGuest({ id: 9 });
      const room = buildRoom();

      const result = await service.generateFiscalInvoice(reservation, guest, room);

      expect(result.success).toBe(true);
    });

    it('uses generateFiscalQRData fallback when fiscalizeResult has no qrCodeData', async () => {
      mocks.fiscalizeResult = {
        success: true,
        jir: 'JIR-789',
        zki: 'ZKI-012',
        qrCodeData: undefined as unknown as string,
        error: undefined,
      };
      mocks.newInvoice = { id: 111 };
      mocks.generateFiscalQRData.mockReturnValue('fallback-qr');

      const reservation = buildReservation({ is_r1: false });
      const guest = buildGuest({ id: 11 });
      const room = buildRoom();

      const result = await service.generateFiscalInvoice(reservation, guest, room);

      expect(result.success).toBe(true);
      expect(result.fiscalData?.qrCodeData).toBe('fallback-qr');
    });
  });

  // ── emailFiscalReceipt ─────────────────────────────────────────────────────

  describe('emailFiscalReceipt', () => {
    it('returns success:false and a message when no JIR is provided', async () => {
      const reservation = buildReservation();
      const guest = buildGuest();

      const result = await service.emailFiscalReceipt(reservation, guest, {});

      expect(result.success).toBe(false);
      expect(result.message).toBe('No fiscal data available');
    });

    it('returns success:true when JIR is present', async () => {
      const reservation = buildReservation();
      const guest = buildGuest({ email: 'guest@hotel.hr' });
      const fiscalData = { jir: 'JIR-123', zki: 'ZKI-456', qrCodeData: 'qr' };

      const result = await service.emailFiscalReceipt(reservation, guest, fiscalData);

      expect(result.success).toBe(true);
    });
  });

  // ── printThermalReceipt ────────────────────────────────────────────────────

  describe('printThermalReceipt', () => {
    it('returns success:false when no JIR is provided', async () => {
      const reservation = buildReservation();
      const guest = buildGuest();
      const room = buildRoom();

      const result = await service.printThermalReceipt(reservation, guest, room, {});

      expect(result.success).toBe(false);
      expect(result.message).toBe('No fiscal data available');
    });

    it('returns success:true when receipt is generated', async () => {
      const reservation = buildReservation();
      const guest = buildGuest();
      const room = buildRoom();
      const fiscalData = { jir: 'JIR-123', zki: 'ZKI-456', qrCodeData: 'qr' };

      const result = await service.printThermalReceipt(reservation, guest, room, fiscalData);

      expect(result.success).toBe(true);
    });

    it('returns success:false when generateThermalReceipt throws', async () => {
      const { generateThermalReceipt } = await import('../../pdfInvoiceGenerator');
      vi.mocked(generateThermalReceipt).mockRejectedValueOnce(new Error('Print failed'));

      const reservation = buildReservation();
      const guest = buildGuest();
      const room = buildRoom();
      const fiscalData = { jir: 'JIR-123', zki: 'ZKI-456', qrCodeData: 'qr' };

      const result = await service.printThermalReceipt(reservation, guest, room, fiscalData);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to generate thermal receipt');
    });
  });

  // ── getStatusActions ───────────────────────────────────────────────────────

  describe('getStatusActions', () => {
    it('returns Check In action for confirmed status', () => {
      const reservation = buildReservation({ reservation_statuses: { code: 'confirmed' } });

      const actions = service.getStatusActions(reservation);

      expect(actions).toHaveLength(1);
      expect(actions[0].status).toBe('checked-in');
      expect(actions[0].label).toBe('Check In');
      expect(actions[0].variant).toBe('default');
    });

    it('returns Check Out action for checked-in status', () => {
      const reservation = buildReservation({ reservation_statuses: { code: 'checked-in' } });

      const actions = service.getStatusActions(reservation);

      expect(actions).toHaveLength(1);
      expect(actions[0].status).toBe('checked-out');
      expect(actions[0].label).toBe('Check Out');
    });

    it('returns empty actions for checked-out status', () => {
      const reservation = buildReservation({ reservation_statuses: { code: 'checked-out' } });

      const actions = service.getStatusActions(reservation);

      expect(actions).toHaveLength(0);
    });

    it('returns empty actions for room-closure status', () => {
      const reservation = buildReservation({ reservation_statuses: { code: 'room-closure' } });

      const actions = service.getStatusActions(reservation);

      expect(actions).toHaveLength(0);
    });

    it('returns empty actions for unallocated status', () => {
      const reservation = buildReservation({ reservation_statuses: { code: 'unallocated' } });

      const actions = service.getStatusActions(reservation);

      expect(actions).toHaveLength(0);
    });

    it('returns empty actions for incomplete-payment status', () => {
      const reservation = buildReservation({
        reservation_statuses: { code: 'incomplete-payment' },
      });

      const actions = service.getStatusActions(reservation);

      expect(actions).toHaveLength(0);
    });

    it('defaults to confirmed behaviour when reservation_statuses is null', () => {
      const reservation = buildReservation({ reservation_statuses: null });

      const actions = service.getStatusActions(reservation);

      expect(actions).toHaveLength(1);
      expect(actions[0].status).toBe('checked-in');
    });
  });

  // ── shouldShowCheckInWorkflow ──────────────────────────────────────────────

  describe('shouldShowCheckInWorkflow', () => {
    it('returns true for confirmed status', () => {
      const reservation = buildReservation({ reservation_statuses: { code: 'confirmed' } });
      expect(service.shouldShowCheckInWorkflow(reservation)).toBe(true);
    });

    it('returns false for checked-in status', () => {
      const reservation = buildReservation({ reservation_statuses: { code: 'checked-in' } });
      expect(service.shouldShowCheckInWorkflow(reservation)).toBe(false);
    });

    it('returns false for checked-out status', () => {
      const reservation = buildReservation({ reservation_statuses: { code: 'checked-out' } });
      expect(service.shouldShowCheckInWorkflow(reservation)).toBe(false);
    });

    it('defaults to true (confirmed) when reservation_statuses is null', () => {
      const reservation = buildReservation({ reservation_statuses: null });
      expect(service.shouldShowCheckInWorkflow(reservation)).toBe(true);
    });
  });

  // ── shouldShowCheckOutWorkflow ─────────────────────────────────────────────

  describe('shouldShowCheckOutWorkflow', () => {
    it('returns true for checked-in status', () => {
      const reservation = buildReservation({ reservation_statuses: { code: 'checked-in' } });
      expect(service.shouldShowCheckOutWorkflow(reservation)).toBe(true);
    });

    it('returns false for confirmed status', () => {
      const reservation = buildReservation({ reservation_statuses: { code: 'confirmed' } });
      expect(service.shouldShowCheckOutWorkflow(reservation)).toBe(false);
    });

    it('returns false for checked-out status', () => {
      const reservation = buildReservation({ reservation_statuses: { code: 'checked-out' } });
      expect(service.shouldShowCheckOutWorkflow(reservation)).toBe(false);
    });
  });

  // ── formatReservationDates ─────────────────────────────────────────────────

  describe('formatReservationDates', () => {
    it('returns a string containing both check-in and check-out dates', () => {
      const reservation = buildReservation({
        check_in_date: '2026-06-15',
        check_out_date: '2026-06-20',
      });

      const formatted = service.formatReservationDates(reservation);

      expect(formatted).toContain('2026');
      expect(formatted).toMatch(/-/); // separator present
    });

    it('returns check-in and check-out separated by a dash', () => {
      const reservation = buildReservation({
        check_in_date: '2026-07-01',
        check_out_date: '2026-07-10',
      });

      const formatted = service.formatReservationDates(reservation);

      expect(formatted).toMatch(/ - /);
    });
  });

  // ── calculateNights ────────────────────────────────────────────────────────

  describe('calculateNights', () => {
    it('calculates 4 nights for a 4-day stay', () => {
      const reservation = buildReservation({
        check_in_date: '2026-04-01',
        check_out_date: '2026-04-05',
      });

      expect(service.calculateNights(reservation)).toBe(4);
    });

    it('calculates 1 night for a same-night stay (evening to next morning)', () => {
      const reservation = buildReservation({
        check_in_date: '2026-04-01',
        check_out_date: '2026-04-02',
      });

      expect(service.calculateNights(reservation)).toBe(1);
    });

    it('calculates 7 nights for a week-long stay', () => {
      const reservation = buildReservation({
        check_in_date: '2026-08-01',
        check_out_date: '2026-08-08',
      });

      expect(service.calculateNights(reservation)).toBe(7);
    });

    it('calculates 30 nights for a month-long stay', () => {
      const reservation = buildReservation({
        check_in_date: '2026-06-01',
        check_out_date: '2026-07-01',
      });

      expect(service.calculateNights(reservation)).toBe(30);
    });
  });
});
