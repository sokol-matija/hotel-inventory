// EmailTestService - Business logic for email and notification testing
// Handles email configuration, sending, notification testing, and test data management

import { HotelEmailService, EmailLanguage, EmailType } from '../emailService';
import { ntfyService, BookingNotificationData } from '../ntfyService';
import { Reservation, Guest } from '../hotel/types';
import type { Room } from '../queries/hooks/useRooms';
import hotelNotification from '../notifications';

export interface TestResult {
  success: boolean;
  message: string;
}

export interface EmailTestConfiguration {
  emailAddress: string;
  language: EmailLanguage;
  emailType: EmailType;
}

export interface EmailTestData {
  guest: Guest;
  room: Room;
  reservation: Reservation;
}

export class EmailTestService {
  private static instance: EmailTestService;

  private constructor() {}

  public static getInstance(): EmailTestService {
    if (!EmailTestService.instance) {
      EmailTestService.instance = new EmailTestService();
    }
    return EmailTestService.instance;
  }

  /**
   * Get default test data for email and notification testing
   */
  getTestData(): EmailTestData {
    const testGuest: Guest = {
      id: 1,
      first_name: 'Matija',
      last_name: 'Sokol',
      full_name: 'Matija Sokol',
      email: 'sokol.matija@gmail.com',
      phone: '+385 98 123 456',
      nationality: 'Croatia',
      preferred_language: 'en',
      dietary_restrictions: null,
      has_pets: true,
      is_vip: true,
      vip_level: 1,
      date_of_birth: '1985-03-15',
      passport_number: null,
      id_card_number: null,
      special_needs: null,
      marketing_consent: null,
      average_rating: null,
      notes: null,
      country_code: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      display_name: 'Matija Sokol',
    };

    const testRoom: Room = {
      id: 301,
      room_number: '301',
      floor_number: 3,
      room_types: { code: 'double' },
      name_croatian: 'Dvokrevetna soba',
      name_english: 'Double Room',
      seasonal_rates: {
        A: 120,
        B: 150,
        C: 180,
        D: 220,
      },
      max_occupancy: 2,
      is_premium: false,
      amenities: ['WiFi', 'Air Conditioning', 'Sea View'],
      is_clean: true,
    };

    const tomorrow = new Date(Date.now() + 86400000);
    const fiveDaysOut = new Date(Date.now() + 5 * 86400000);
    const testReservation: Reservation = {
      id: 1,
      room_id: testRoom.id,
      guest_id: testGuest.id,
      check_in_date: tomorrow.toISOString().split('T')[0],
      check_out_date: fiveDaysOut.toISOString().split('T')[0],
      number_of_guests: 2,
      adults: 2,
      children_count: 1,
      reservation_statuses: { code: 'confirmed' },
      booking_sources: { code: 'direct' },
      special_requests: 'Sea view preferred, early check-in requested',
      number_of_nights: 4,
      booking_date: new Date().toISOString().split('T')[0],
      notes: 'Test reservation for email system',
      guests: testGuest,
      // Required fields with defaults
      booking_reference: null,
      company_id: null,
      has_pets: false,
      is_r1: false,
      labels: null,
    } as unknown as Reservation;

    return {
      guest: testGuest,
      room: testRoom,
      reservation: testReservation,
    };
  }

  /**
   * Send a test email with the specified configuration
   */
  async sendTestEmail(
    config: EmailTestConfiguration,
    testData: EmailTestData
  ): Promise<TestResult> {
    try {
      // Generate email data based on email type
      const emailData =
        config.emailType === 'reminder'
          ? { guest: { ...testData.guest, email: config.emailAddress } }
          : {
              guest: { ...testData.guest, email: config.emailAddress },
              reservation: testData.reservation,
              room: testData.room,
            };

      // Generate email template
      const template = HotelEmailService.generateEmail(
        config.emailType,
        emailData,
        config.language
      );

      // Send email
      const result = await HotelEmailService.sendEmail(
        config.emailAddress,
        template,
        testData.guest.display_name
      );

      if (result.success) {
        hotelNotification.success(
          'Test Email Sent Successfully!',
          `${config.emailType} email sent to ${config.emailAddress}`
        );
      } else {
        hotelNotification.error('Email Send Failed', result.message);
      }

      return result;
    } catch (error) {
      console.error('Error sending test email:', error);
      const errorResult = {
        success: false,
        message: 'Failed to send test email. Please check the console for details.',
      };
      hotelNotification.error('Email Send Error', errorResult.message);
      return errorResult;
    }
  }

  /**
   * Send a test Room 401 booking notification
   */
  async sendTestNotification(testData: EmailTestData): Promise<TestResult> {
    try {
      // Create notification data for Room 401
      const notificationData: BookingNotificationData = {
        roomNumber: '401',
        guestName: testData.guest.display_name,
        checkIn: this.formatDateForNotification(new Date(testData.reservation.check_in_date)),
        checkOut: this.formatDateForNotification(new Date(testData.reservation.check_out_date)),
        nights: testData.reservation.number_of_nights ?? 1,
        adults: testData.reservation.adults,
        children: testData.reservation.children_count ?? 0,
        bookingSource: testData.reservation.booking_sources?.code ?? 'direct',
        totalAmount: 0, // TODO Phase 9: derive from reservation_charges
      };

      const success = await ntfyService.sendRoom401BookingNotification(notificationData);

      const result = {
        success,
        message: success
          ? 'Test notification sent successfully to Room 401 topic!'
          : 'Failed to send notification. Please check console for details.',
      };

      if (success) {
        hotelNotification.success(
          'Test Notification Sent!',
          'Check your mobile device for the Room 401 booking notification'
        );
      } else {
        hotelNotification.error('Notification Failed', result.message);
      }

      return result;
    } catch (error) {
      console.error('Error sending test notification:', error);
      const errorResult = {
        success: false,
        message: 'Failed to send test notification. Please check the console for details.',
      };
      hotelNotification.error('Notification Error', errorResult.message);
      return errorResult;
    }
  }

  /**
   * Get available email types with descriptions
   */
  getEmailTypes(): Array<{ value: EmailType; label: string; description: string }> {
    return [
      {
        value: 'welcome',
        label: '🏨 Welcome Email',
        description: 'Check-in information & hotel details',
      },
      {
        value: 'thankyou',
        label: '🙏 Thank You Email',
        description: 'Post-stay appreciation message',
      },
      {
        value: 'reminder',
        label: '🌞 Summer Season Reminder',
        description: 'Seasonal booking reminder (no reservation data)',
      },
    ];
  }

  /**
   * Get available email languages with flags
   */
  getEmailLanguages(): Array<{ value: EmailLanguage; label: string; flag: string }> {
    return [
      { value: 'en', label: '🇬🇧 English', flag: '🇬🇧' },
      { value: 'de', label: '🇩🇪 Deutsch', flag: '🇩🇪' },
      { value: 'it', label: '🇮🇹 Italiano', flag: '🇮🇹' },
    ];
  }

  /**
   * Format date for display in UI
   */
  formatDisplayDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  /**
   * Format date for notification (extract date part only)
   */
  private formatDateForNotification(date: Date): string {
    const formatted = this.formatDisplayDate(date);
    return formatted.split(', ')[1]; // Extract just the date part
  }

  /**
   * Validate email address format
   */
  validateEmailAddress(email: string): { valid: boolean; error?: string } {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email.trim()) {
      return { valid: false, error: 'Email address is required' };
    }

    if (!emailRegex.test(email)) {
      return { valid: false, error: 'Please enter a valid email address' };
    }

    return { valid: true };
  }

  /**
   * Get guest display badges based on guest properties
   */
  getGuestBadges(
    guest: Guest
  ): Array<{ type: 'pet' | 'vip' | 'children'; label: string; icon: string }> {
    const badges: Array<{ type: 'pet' | 'vip' | 'children'; label: string; icon: string }> = [];

    if (guest.has_pets) {
      badges.push({ type: 'pet', label: 'Has Pet', icon: '❤️' });
    }

    if (guest.is_vip) {
      badges.push({ type: 'vip', label: 'VIP Guest', icon: '⭐' });
    }

    // Note: children are stored in guest_children table, not directly on Guest

    return badges;
  }
}
