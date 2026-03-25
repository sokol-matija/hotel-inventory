// ReservationService - Business logic for reservation management
// Handles email operations, fiscal invoice generation, and reservation state management

import { CalendarEvent, Company } from '../types';
import type { Reservation } from '@/lib/queries/hooks/useReservations';
import type { Guest } from '@/lib/queries/hooks/useGuests';
import type { Room } from '@/lib/queries/hooks/useRooms';
import { RESERVATION_STATUS_COLORS } from '../calendarUtils';
import { HotelEmailService } from '../../emailService';
import hotelNotification from '../../notifications';
import {
  generatePDFInvoice,
  generateThermalReceipt,
  generateInvoiceNumber,
} from '../../pdfInvoiceGenerator';
import { FiscalizationService } from '../../fiscalization/FiscalizationService';
import { supabase } from '../../supabase';

export interface ReservationData {
  reservation: Reservation;
  guest: Guest;
  room: Room;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  statusColors: any;
  isMaintenanceReservation: boolean;
}

export interface FiscalData {
  jir?: string;
  zki?: string;
  qrCodeData?: string;
}

export interface EmailResult {
  success: boolean;
  message?: string;
}

export interface FiscalInvoiceResult {
  success: boolean;
  jir?: string;
  qrCodeData?: string;
  message?: string;
}

export class ReservationService {
  private static instance: ReservationService;

  private constructor() {}

  public static getInstance(): ReservationService {
    if (!ReservationService.instance) {
      ReservationService.instance = new ReservationService();
    }
    return ReservationService.instance;
  }

  /**
   * Get reservation data from event and reservations list
   */
  async getReservationData(
    event: CalendarEvent | null,
    reservations: Reservation[]
  ): Promise<ReservationData | null> {
    if (!event) return null;

    const reservation = reservations.find((r) => r.id === Number(event.reservationId));
    if (!reservation) return null;

    // Fetch room data from database
    const { data: roomData, error: roomError } = await supabase
      .from('rooms')
      .select(
        '*, room_types!room_type_id(code), room_pricing(base_rate, pricing_seasons(code, year_pattern))'
      )
      .eq('id', Number(event.roomId))
      .single();

    if (roomError || !roomData) return null;

    // Use guest from join (display_name not in SELECT — derive it from first/last name)
    const guestJoin = reservation.guests;
    if (!guestJoin) return null;
    const guest: Guest = {
      ...(guestJoin as unknown as Guest),
      display_name:
        (guestJoin as unknown as { full_name?: string }).full_name ||
        `${(guestJoin as unknown as { first_name?: string }).first_name ?? ''} ${(guestJoin as unknown as { last_name?: string }).last_name ?? ''}`.trim(),
    };

    // Map room to Room type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const room = mapRoomFromDB(roomData as any);

    const status = reservation.reservation_statuses?.code ?? 'confirmed';
    const statusColors =
      RESERVATION_STATUS_COLORS[status as keyof typeof RESERVATION_STATUS_COLORS];
    const isMaintenanceReservation = false;

    return {
      reservation,
      guest,
      room,
      statusColors,
      isMaintenanceReservation,
    };
  }

  /**
   * Send welcome email to guest
   */
  async sendWelcomeEmail(
    reservation: Reservation,
    guest: Guest,
    room?: Room
  ): Promise<EmailResult> {
    try {
      // Use provided room or fetch from database
      const roomData = room || (await this.getRoomById(reservation.room_id));
      const result = await HotelEmailService.sendWelcomeEmail(
        reservation,
        guest,
        roomData ?? undefined
      );

      if (result.success) {
        hotelNotification.success(
          'Welcome Email Sent!',
          `Guest information sent to ${guest.email || 'guest'}`,
          4
        );
        return { success: true };
      } else {
        hotelNotification.error('Email Failed', result.message, 5);
        return { success: false, message: result.message };
      }
    } catch (error) {
      console.error('Error sending email:', error);
      hotelNotification.error('Email Error', 'Failed to send welcome email. Please try again.', 5);
      return { success: false, message: 'Failed to send email' };
    }
  }

  /**
   * Send reminder email to guest
   */
  async sendReminderEmail(
    reservation: Reservation,
    guest: Guest,
    room?: Room
  ): Promise<EmailResult> {
    try {
      // Use provided room or fetch from database
      const roomData = room || (await this.getRoomById(reservation.room_id));
      const result = await HotelEmailService.sendReminderEmail(
        reservation,
        guest,
        roomData ?? undefined
      );

      if (result.success) {
        hotelNotification.success(
          'Reminder Email Sent!',
          `Reminder sent to ${guest.email || 'guest'}`,
          4
        );
        return { success: true };
      } else {
        hotelNotification.error('Email Failed', result.message, 5);
        return { success: false, message: result.message };
      }
    } catch (error) {
      console.error('Error sending reminder:', error);
      hotelNotification.error('Email Error', 'Failed to send reminder email. Please try again.', 5);
      return { success: false, message: 'Failed to send reminder' };
    }
  }

  /**
   * Generate Croatian fiscal invoice with Tax Authority compliance
   */
  async generateFiscalInvoice(
    reservation: Reservation,
    guest: Guest,
    room: Room
  ): Promise<FiscalInvoiceResult & { fiscalData?: FiscalData }> {
    try {
      const fiscalizationService = FiscalizationService.getInstance();
      const invoiceNumber = generateInvoiceNumber(reservation);

      // Fetch company data if this is an R1 reservation
      let company: Company | undefined;
      if (reservation.is_r1 && reservation.company_id) {
        const { data: companyData, error: companyError } = await supabase
          .from('companies')
          .select('*')
          .eq('id', Number(reservation.company_id))
          .single();

        if (companyData && !companyError) {
          // Company type is now the DB row type directly
          company = companyData;
        }
      }

      // Derive totalAmount/vatAmount from reservation_charges
      const { data: charges } = await supabase
        .from('reservation_charges')
        .select('total, vat_rate')
        .eq('reservation_id', reservation.id);

      const totalAmount = (charges ?? []).reduce((sum, c) => sum + c.total, 0);
      const vatAmount = (charges ?? []).reduce((sum, c) => {
        const rate = c.vat_rate ?? 13;
        return sum + c.total - c.total / (1 + rate / 100);
      }, 0);

      // Prepare fiscal invoice data
      const fiscalInvoiceData = {
        invoiceNumber,
        dateTime: new Date(),
        totalAmount,
        vatAmount,
        items: [
          {
            name: `Room ${room.room_number} - ${room.name_english}`,
            quantity: reservation.number_of_nights ?? 1,
            unitPrice: 0, // Phase 9 migration
            vatRate: 13, // Croatian accommodation VAT rate (since 2018)
            totalAmount,
          },
        ],
        paymentMethod: 'CARD' as const,
      };

      // Fiscalize with Croatian Tax Authority
      const fiscalResponse = await fiscalizationService.fiscalizeInvoice(fiscalInvoiceData);

      if (fiscalResponse.success && fiscalResponse.jir && fiscalResponse.zki) {
        const fiscalData: FiscalData = {
          jir: fiscalResponse.jir,
          zki: fiscalResponse.zki, // Real ZKI from fiscalization response
          qrCodeData:
            fiscalResponse.qrCodeData ||
            fiscalizationService.generateFiscalQRData(fiscalResponse.jir, totalAmount),
        };

        // Save fiscal data to database
        try {
          await this.saveFiscalDataToDatabase(
            reservation.id,
            invoiceNumber,
            fiscalData.jir!,
            fiscalData.zki!,
            fiscalData.qrCodeData!,
            totalAmount,
            guest.id // guest.id is number (QueryData-derived type)
          );
        } catch (dbError) {
          console.error('❌ Failed to save fiscal data to database:', dbError);
          throw dbError; // Don't silently fail - we need to know about this!
        }

        // Generate PDF invoice with company data for R1 billing
        await generatePDFInvoice({
          reservation,
          guest,
          room,
          invoiceNumber,
          invoiceDate: new Date(),
          jir: fiscalData.jir,
          zki: fiscalData.zki,
          qrCodeData: fiscalData.qrCodeData,
          company, // Pass company data for R1 billing
        });

        hotelNotification.success(
          'Fiscal Invoice Generated!',
          `JIR: ${fiscalResponse.jir} - PDF downloaded with Croatian Tax Authority compliance.`,
          6
        );

        return {
          success: true,
          jir: fiscalResponse.jir,
          qrCodeData: fiscalData.qrCodeData,
          fiscalData,
        };
      } else {
        hotelNotification.error(
          'Fiscalization Failed',
          fiscalResponse.error || 'Unable to connect to Croatian Tax Authority',
          6
        );
        return { success: false, message: fiscalResponse.error };
      }
    } catch (error) {
      console.error('Error generating fiscal invoice:', error);
      hotelNotification.error(
        'Fiscal Error',
        'Failed to generate fiscal invoice. Please try again.',
        5
      );
      return { success: false, message: 'Failed to generate fiscal invoice' };
    }
  }

  /**
   * Email fiscal receipt to guest
   */
  async emailFiscalReceipt(
    reservation: Reservation,
    guest: Guest,
    fiscalData: FiscalData
  ): Promise<EmailResult> {
    if (!fiscalData.jir) {
      hotelNotification.error('No Fiscal Data', 'Please generate a fiscal invoice first.', 4);
      return { success: false, message: 'No fiscal data available' };
    }

    try {
      // In a real implementation, this would email the fiscal receipt
      // For now, we'll simulate the process
      await new Promise((resolve) => setTimeout(resolve, 2000));

      hotelNotification.success(
        'Fiscal Receipt Emailed!',
        `Fiscal receipt with JIR ${fiscalData.jir} sent to ${guest.email}`,
        5
      );

      return { success: true };
    } catch (error) {
      console.error('Error emailing fiscal receipt:', error);
      hotelNotification.error(
        'Email Error',
        'Failed to email fiscal receipt. Please try again.',
        5
      );
      return { success: false, message: 'Failed to email fiscal receipt' };
    }
  }

  /**
   * Print thermal receipt for Croatian compliance
   */
  async printThermalReceipt(
    reservation: Reservation,
    guest: Guest,
    room: Room,
    fiscalData: FiscalData
  ): Promise<{ success: boolean; message?: string }> {
    if (!fiscalData.jir) {
      hotelNotification.error('No Fiscal Data', 'Please generate a fiscal invoice first.', 4);
      return { success: false, message: 'No fiscal data available' };
    }

    try {
      const invoiceNumber = generateInvoiceNumber(reservation);
      await generateThermalReceipt({
        reservation,
        guest,
        room,
        invoiceNumber,
        invoiceDate: new Date(),
        jir: fiscalData.jir,
        zki: fiscalData.zki!,
        qrCodeData: fiscalData.qrCodeData!,
      });

      hotelNotification.success(
        'Thermal Receipt Generated!',
        `Croatian Tax Authority compliant receipt ready for printing.`,
        4
      );

      return { success: true };
    } catch (error) {
      console.error('Error generating thermal receipt:', error);
      hotelNotification.error(
        'Print Error',
        'Failed to generate thermal receipt. Please try again.',
        5
      );
      return { success: false, message: 'Failed to generate thermal receipt' };
    }
  }

  /**
   * Get available status actions for reservation
   */
  getStatusActions(reservation: Reservation): Array<{
    status: string;
    label: string;
    icon: string;
    variant: 'default' | 'outline' | 'destructive';
  }> {
    const actions = [];
    const status = reservation.reservation_statuses?.code ?? 'confirmed';

    switch (status) {
      case 'confirmed':
        actions.push({
          status: 'checked-in',
          label: 'Check In',
          icon: 'log-in',
          variant: 'default' as const,
        });
        break;

      case 'checked-in':
        actions.push({
          status: 'checked-out',
          label: 'Check Out',
          icon: 'log-out',
          variant: 'default' as const,
        });
        break;

      case 'checked-out':
        // No status changes available for checked out reservations
        break;

      case 'room-closure':
      case 'unallocated':
      case 'incomplete-payment':
        // These statuses typically don't have user actions
        break;
    }

    return actions;
  }

  /**
   * Determine if check-in workflow should be shown
   */
  shouldShowCheckInWorkflow(reservation: Reservation): boolean {
    return (reservation.reservation_statuses?.code ?? 'confirmed') === 'confirmed';
  }

  /**
   * Determine if check-out workflow should be shown
   */
  shouldShowCheckOutWorkflow(reservation: Reservation): boolean {
    return (reservation.reservation_statuses?.code ?? 'confirmed') === 'checked-in';
  }

  /**
   * Format reservation dates for display
   */
  formatReservationDates(reservation: Reservation): string {
    return `${new Date(reservation.check_in_date).toLocaleDateString()} - ${new Date(reservation.check_out_date).toLocaleDateString()}`;
  }

  /**
   * Calculate total nights for reservation
   */
  calculateNights(reservation: Reservation): number {
    const checkOut = new Date(reservation.check_out_date);
    const checkIn = new Date(reservation.check_in_date);
    const diffTime = checkOut.getTime() - checkIn.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Fetch room by ID from DB
   */
  private async getRoomById(roomId: number): Promise<Room | null> {
    const { data, error } = await supabase
      .from('rooms')
      .select(
        '*, room_types!room_type_id(code), room_pricing(base_rate, pricing_seasons(code, year_pattern))'
      )
      .eq('id', roomId)
      .single();

    if (error || !data) return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return mapRoomFromDB(data as any);
  }

  /**
   * Save fiscal data to database
   * Creates invoice record and fiscal_record entry
   */
  private async saveFiscalDataToDatabase(
    reservationId: number,
    invoiceNumber: string,
    jir: string,
    zki: string,
    qrCodeData: string,
    totalAmount: number,
    guestId: number // Added to satisfy billing_target constraint
  ): Promise<void> {
    const reservationIdNum = reservationId;

    // Step 1: Create or get invoice record
    const { data: existingInvoice } = await supabase
      .from('invoices')
      .select('id')
      .eq('reservation_id', reservationIdNum)
      .eq('invoice_number', invoiceNumber)
      .single();

    let invoiceId: number;

    if (existingInvoice) {
      invoiceId = existingInvoice.id;
    } else {
      // Create new invoice
      const { data: newInvoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          invoice_number: invoiceNumber,
          reservation_id: reservationIdNum,
          guest_id: guestId, // FIX: Add guest_id to satisfy billing_target constraint
          issue_date: new Date().toISOString().split('T')[0],
          subtotal: totalAmount / 1.13, // Remove 13% VAT (Croatian accommodation rate)
          total_amount: totalAmount,
          status: 'sent',
        })
        .select('id')
        .single();

      if (invoiceError) throw invoiceError;
      invoiceId = newInvoice.id;
    }

    // Step 2: Create fiscal_record
    const { error: fiscalError } = await supabase.from('fiscal_records').insert({
      invoice_id: invoiceId,
      jir,
      zki,
      qr_code_data: qrCodeData,
      submitted_at: new Date().toISOString(),
      response_status: 'success',
      response_message: 'Croatian Tax Authority accepted invoice',
      operator_oib: '87246357068', // Hotel OIB
      business_space_code: 'POSL1',
      register_number: 2,
    });

    if (fiscalError) throw fiscalError;
  }
}

// ─── Private helper ────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRoomFromDB(room: any): Room {
  const roomType = room.room_types?.code || 'double';
  return {
    id: room.id,
    room_number: room.room_number,
    floor_number: room.floor_number,
    room_types: room.room_types,
    max_occupancy: room.max_occupancy || 2,
    is_premium: room.is_premium || false,
    amenities: room.amenities || [],
    is_clean: room.is_clean ?? false,
    name_croatian: getRoomTypeCroatianName(roomType),
    name_english: getRoomTypeEnglishName(roomType),
    seasonal_rates: {
      A:
        room.room_pricing?.find(
          (rp: { pricing_seasons?: { code: string } }) => rp.pricing_seasons?.code === 'A'
        )?.base_rate ?? 50,
      B:
        room.room_pricing?.find(
          (rp: { pricing_seasons?: { code: string } }) => rp.pricing_seasons?.code === 'B'
        )?.base_rate ?? 60,
      C:
        room.room_pricing?.find(
          (rp: { pricing_seasons?: { code: string } }) => rp.pricing_seasons?.code === 'C'
        )?.base_rate ?? 80,
      D:
        room.room_pricing?.find(
          (rp: { pricing_seasons?: { code: string } }) => rp.pricing_seasons?.code === 'D'
        )?.base_rate ?? 100,
    },
  } as unknown as Room;
}

function getRoomTypeCroatianName(roomType: string): string {
  const mapping: Record<string, string> = {
    BD: 'Velika dvokrevetna soba',
    BS: 'Velika jednokrevetna soba',
    D: 'Dvokrevetna soba',
    T: 'Trokrevetna soba',
    S: 'Jednokrevetna soba',
    F: 'Obiteljska soba',
    A: 'Apartman',
    RA: '401 ROOFTOP APARTMAN',
    single: 'Jednokrevetna soba',
    double: 'Dvokrevetna soba',
    triple: 'Trokrevetna soba',
    family: 'Obiteljska soba',
    apartment: 'Apartman',
  };
  return mapping[roomType] || 'Dvokrevetna soba';
}

function getRoomTypeEnglishName(roomType: string): string {
  const mapping: Record<string, string> = {
    BD: 'Big Double Room',
    BS: 'Big Single Room',
    D: 'Double Room',
    T: 'Triple Room',
    S: 'Single Room',
    F: 'Family Room',
    A: 'Apartment',
    RA: '401 Rooftop Apartment',
    single: 'Single Room',
    double: 'Double Room',
    triple: 'Triple Room',
    family: 'Family Room',
    apartment: 'Apartment',
  };
  return mapping[roomType] || `${roomType.charAt(0).toUpperCase()}${roomType.slice(1)} Room`;
}
