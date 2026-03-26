/**
 * Hotel Email Service — thin facade.
 *
 * All template generation lives in `src/lib/email/templates/reservationTemplates.ts`.
 * All HTTP dispatch lives in `src/lib/email/emailClient.ts`.
 *
 * This file re-exports public types and wraps the helpers in the `HotelEmailService`
 * static class that existing callers depend on — zero changes required at call sites.
 */

import { Reservation, Guest } from './hotel/types';
import type { Room } from './queries/hooks/useRooms';
import { HOTEL_POREC_ROOMS } from './hotel/hotelData';

import {
  generateWelcomeEmail,
  generateThankYouEmail,
  generateSeasonReminderEmail,
  generateReminderEmail,
  generateEmailByType,
} from '@/lib/email/templates/reservationTemplates';
import { sendEmail } from '@/lib/email/emailClient';

// Re-export types so existing importers (`import { EmailLanguage } from '../emailService'`) keep working.
export type {
  EmailLanguage,
  EmailType,
  EmailTemplate,
  HotelInfoEmailData,
} from '@/lib/email/templates/reservationTemplates';

export class HotelEmailService {
  static generateWelcomeEmail = generateWelcomeEmail;
  static generateThankYouEmail = generateThankYouEmail;
  static generateSeasonReminderEmail = generateSeasonReminderEmail;
  static generateReminderEmail = generateReminderEmail;
  static generateEmail = generateEmailByType;
  static sendEmail = sendEmail;

  /**
   * Convenient method to send welcome email for a reservation.
   */
  static async sendWelcomeEmail(
    reservation: Reservation,
    guest?: Guest,
    room?: Room,
    language?: Parameters<typeof generateWelcomeEmail>[1]
  ): Promise<{ success: boolean; message: string }> {
    try {
      const guestData = (guest || reservation.guests) as Guest | undefined;
      const roomData = room ?? HOTEL_POREC_ROOMS.find((r) => r.id === reservation.room_id);

      if (!guestData || !roomData) {
        throw new Error('Guest or room not found');
      }

      const emailLanguage =
        language ??
        ((guestData.preferred_language as Parameters<typeof generateWelcomeEmail>[1]) || 'en');

      const template = generateWelcomeEmail(
        { guest: guestData, reservation, room: roomData },
        emailLanguage
      );
      return await sendEmail(
        guestData.email || '',
        template,
        guestData.display_name ?? guestData.full_name ?? ''
      );
    } catch (error) {
      console.error('Error sending welcome email:', error);
      return {
        success: false,
        message: 'Failed to send welcome email. Missing guest or room information.',
      };
    }
  }

  /**
   * Convenient method to send reminder email for an upcoming reservation.
   */
  static async sendReminderEmail(
    reservation: Reservation,
    guest?: Guest,
    room?: Room
  ): Promise<{ success: boolean; message: string }> {
    try {
      const guestData = (guest || reservation.guests) as Guest | undefined;
      const roomData = room ?? HOTEL_POREC_ROOMS.find((r) => r.id === reservation.room_id);

      if (!guestData || !roomData) {
        throw new Error('Guest or room not found');
      }

      const template = generateReminderEmail({ guest: guestData, reservation, room: roomData });
      return await sendEmail(
        guestData.email || '',
        template,
        guestData.display_name ?? guestData.full_name ?? ''
      );
    } catch (error) {
      console.error('Error sending reminder email:', error);
      return {
        success: false,
        message: 'Failed to send reminder email. Missing guest or room information.',
      };
    }
  }

  /**
   * Convenient method to send thank-you email after check-out.
   */
  static async sendThankYouEmail(
    reservation: Reservation,
    guest?: Guest,
    room?: Room
  ): Promise<{ success: boolean; message: string }> {
    try {
      const guestData = (guest || reservation.guests) as Guest | undefined;
      const roomData = room ?? HOTEL_POREC_ROOMS.find((r) => r.id === reservation.room_id);

      if (!guestData || !roomData) {
        throw new Error('Guest or room not found');
      }

      const template = generateThankYouEmail({ guest: guestData, reservation, room: roomData });
      return await sendEmail(
        guestData.email || '',
        template,
        guestData.display_name ?? guestData.full_name ?? ''
      );
    } catch (error) {
      console.error('Error sending thank you email:', error);
      return {
        success: false,
        message: 'Failed to send thank you email. Missing guest or room information.',
      };
    }
  }
}
