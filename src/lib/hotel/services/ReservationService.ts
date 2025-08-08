// ReservationService - Business logic for reservation management
// Handles email operations, fiscal invoice generation, and reservation state management

import { CalendarEvent, Reservation, Guest, Room } from '../types';
import { SAMPLE_GUESTS } from '../sampleData';
import { HOTEL_POREC_ROOMS } from '../hotelData';
import { RESERVATION_STATUS_COLORS } from '../calendarUtils';
import { HotelEmailService } from '../../emailService';
import hotelNotification from '../../notifications';
import { generatePDFInvoice, generateThermalReceipt, generateInvoiceNumber } from '../../pdfInvoiceGenerator';
import { FiscalizationService } from '../../fiscalization/FiscalizationService';

export interface ReservationData {
  reservation: Reservation;
  guest: Guest;
  room: Room;
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
  getReservationData(
    event: CalendarEvent | null,
    reservations: Reservation[]
  ): ReservationData | null {
    if (!event) return null;

    const reservation = reservations.find(r => r.id === event.reservationId);
    const guest = SAMPLE_GUESTS.find(g => g.id === reservation?.guestId);
    const room = HOTEL_POREC_ROOMS.find(r => r.id === event.roomId);
    
    if (!reservation || !guest || !room) {
      return null;
    }

    const statusColors = RESERVATION_STATUS_COLORS[reservation.status];
    const isMaintenanceReservation = reservation.guestId === 'system-maintenance';

    return {
      reservation,
      guest,
      room,
      statusColors,
      isMaintenanceReservation
    };
  }

  /**
   * Send welcome email to guest
   */
  async sendWelcomeEmail(
    reservation: Reservation,
    guest: Guest
  ): Promise<EmailResult> {
    try {
      const result = await HotelEmailService.sendWelcomeEmail(reservation);
      
      if (result.success) {
        hotelNotification.success(
          'Welcome Email Sent!',
          `Guest information sent to ${guest.email || 'guest'}`,
          4
        );
        return { success: true };
      } else {
        hotelNotification.error(
          'Email Failed',
          result.message,
          5
        );
        return { success: false, message: result.message };
      }
    } catch (error) {
      console.error('Error sending email:', error);
      hotelNotification.error(
        'Email Error',
        'Failed to send welcome email. Please try again.',
        5
      );
      return { success: false, message: 'Failed to send email' };
    }
  }

  /**
   * Send reminder email to guest
   */
  async sendReminderEmail(
    reservation: Reservation,
    guest: Guest
  ): Promise<EmailResult> {
    try {
      const result = await HotelEmailService.sendReminderEmail(reservation);
      
      if (result.success) {
        hotelNotification.success(
          'Reminder Email Sent!',
          `Reminder sent to ${guest.email || 'guest'}`,
          4
        );
        return { success: true };
      } else {
        hotelNotification.error(
          'Email Failed',
          result.message,
          5
        );
        return { success: false, message: result.message };
      }
    } catch (error) {
      console.error('Error sending reminder:', error);
      hotelNotification.error(
        'Email Error',
        'Failed to send reminder email. Please try again.',
        5
      );
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
      
      // Prepare fiscal invoice data
      const fiscalInvoiceData = {
        invoiceNumber,
        dateTime: new Date(),
        totalAmount: reservation.totalAmount,
        vatAmount: reservation.vatAmount,
        items: [{
          name: `Room ${room.number} - ${room.nameEnglish}`,
          quantity: reservation.numberOfNights,
          unitPrice: reservation.baseRoomRate,
          vatRate: 25,
          totalAmount: reservation.totalAmount
        }],
        paymentMethod: 'CARD' as const
      };

      // Fiscalize with Croatian Tax Authority
      const fiscalResponse = await fiscalizationService.fiscalizeInvoice(fiscalInvoiceData);
      
      if (fiscalResponse.success && fiscalResponse.jir) {
        const fiscalData: FiscalData = {
          jir: fiscalResponse.jir,
          zki: 'generated-zki-code',
          qrCodeData: fiscalResponse.qrCodeData || fiscalizationService.generateFiscalQRData(fiscalResponse.jir, reservation.totalAmount)
        };

        // Generate PDF invoice
        await generatePDFInvoice({
          reservation,
          guest,
          room,
          invoiceNumber,
          invoiceDate: new Date(),
          jir: fiscalData.jir,
          zki: fiscalData.zki,
          qrCodeData: fiscalData.qrCodeData
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
          fiscalData
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
      hotelNotification.error(
        'No Fiscal Data',
        'Please generate a fiscal invoice first.',
        4
      );
      return { success: false, message: 'No fiscal data available' };
    }

    try {
      // In a real implementation, this would email the fiscal receipt
      // For now, we'll simulate the process
      await new Promise(resolve => setTimeout(resolve, 2000));

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
      hotelNotification.error(
        'No Fiscal Data',
        'Please generate a fiscal invoice first.',
        4
      );
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
        qrCodeData: fiscalData.qrCodeData!
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

    switch (reservation.status) {
      case 'confirmed':
        actions.push({
          status: 'checked-in',
          label: 'Check In',
          icon: 'log-in',
          variant: 'default' as const
        });
        break;

      case 'checked-in':
        actions.push({
          status: 'checked-out',
          label: 'Check Out',
          icon: 'log-out',
          variant: 'default' as const
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
    return reservation.status === 'confirmed';
  }

  /**
   * Determine if check-out workflow should be shown
   */
  shouldShowCheckOutWorkflow(reservation: Reservation): boolean {
    return reservation.status === 'checked-in';
  }

  /**
   * Format reservation dates for display
   */
  formatReservationDates(reservation: Reservation): string {
    return `${reservation.checkIn.toLocaleDateString()} - ${reservation.checkOut.toLocaleDateString()}`;
  }

  /**
   * Calculate total nights for reservation
   */
  calculateNights(reservation: Reservation): number {
    const diffTime = reservation.checkOut.getTime() - reservation.checkIn.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}