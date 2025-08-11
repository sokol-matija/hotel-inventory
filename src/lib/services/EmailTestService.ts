// EmailTestService - Business logic for email and notification testing
// Handles email configuration, sending, notification testing, and test data management

import { HotelEmailService, EmailLanguage, EmailType } from '../emailService';
import { ntfyService, BookingNotificationData } from '../ntfyService';
import { Reservation, Guest, Room } from '../hotel/types';
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
      id: 'test-guest-001',
      name: 'Matija Sokol',
      email: 'sokol.matija@gmail.com',
      phone: '+385 98 123 456',
      emergencyContact: '+385 98 987 654',
      nationality: 'Croatia',
      preferredLanguage: 'English',
      hasPets: true,
      dateOfBirth: new Date('1985-03-15'),
      children: [
        {
          name: 'Ana Sokol',
          dateOfBirth: new Date('2015-06-20'),
          age: 8
        }
      ],
      totalStays: 3,
      isVip: true
    };

    const testRoom: Room = {
      id: 'room-301',
      number: '301',
      floor: 3,
      type: 'double',
      nameCroatian: 'Dvokrevetna soba',
      nameEnglish: 'Double Room',
      seasonalRates: {
        A: 120,
        B: 150,
        C: 180,
        D: 220
      },
      maxOccupancy: 2,
      isPremium: false,
      amenities: ['WiFi', 'Air Conditioning', 'Sea View']
    };

    const testReservation: Reservation = {
      id: 'test-reservation-001',
      roomId: testRoom.id,
      guestId: testGuest.id,
      checkIn: new Date(Date.now() + 86400000), // Tomorrow
      checkOut: new Date(Date.now() + (5 * 86400000)), // 5 days from now
      numberOfGuests: 2,
      adults: 2,
      children: [
        {
          name: 'Ana Sokol',
          dateOfBirth: new Date('2015-06-20'),
          age: 8
        }
      ],
      status: 'confirmed',
      bookingSource: 'direct',
      specialRequests: 'Sea view preferred, early check-in requested',
      
      // Pricing details
      seasonalPeriod: 'C',
      baseRoomRate: 180,
      numberOfNights: 4,
      subtotal: 720,
      childrenDiscounts: 0,
      tourismTax: 8.8,
      vatAmount: 180,
      petFee: 20,
      parkingFee: 28,
      shortStaySuplement: 0,
      additionalCharges: 0,
      roomServiceItems: [],
      totalAmount: 956.8,
      
      // Metadata
      bookingDate: new Date(),
      lastModified: new Date(),
      notes: 'Test reservation for email system'
    };

    return {
      guest: testGuest,
      room: testRoom,
      reservation: testReservation
    };
  }

  /**
   * Send a test email with the specified configuration
   */
  async sendTestEmail(config: EmailTestConfiguration, testData: EmailTestData): Promise<TestResult> {
    try {
      // Generate email data based on email type
      const emailData = config.emailType === 'reminder' 
        ? { guest: { ...testData.guest, email: config.emailAddress } }
        : { 
            guest: { ...testData.guest, email: config.emailAddress }, 
            reservation: testData.reservation, 
            room: testData.room 
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
        testData.guest.name
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
        message: 'Failed to send test email. Please check the console for details.'
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
        guestName: testData.guest.name,
        checkIn: this.formatDateForNotification(testData.reservation.checkIn),
        checkOut: this.formatDateForNotification(testData.reservation.checkOut),
        nights: testData.reservation.numberOfNights,
        adults: testData.reservation.adults,
        children: testData.reservation.children.length,
        bookingSource: testData.reservation.bookingSource,
        totalAmount: testData.reservation.totalAmount
      };

      const success = await ntfyService.sendRoom401BookingNotification(notificationData);
      
      const result = {
        success,
        message: success 
          ? 'Test notification sent successfully to Room 401 topic!' 
          : 'Failed to send notification. Please check console for details.'
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
        message: 'Failed to send test notification. Please check the console for details.'
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
        description: 'Check-in information & hotel details' 
      },
      { 
        value: 'thankyou', 
        label: '🙏 Thank You Email', 
        description: 'Post-stay appreciation message' 
      },
      { 
        value: 'reminder', 
        label: '🌞 Summer Season Reminder', 
        description: 'Seasonal booking reminder (no reservation data)' 
      }
    ];
  }

  /**
   * Get available email languages with flags
   */
  getEmailLanguages(): Array<{ value: EmailLanguage; label: string; flag: string }> {
    return [
      { value: 'en', label: '🇬🇧 English', flag: '🇬🇧' },
      { value: 'de', label: '🇩🇪 Deutsch', flag: '🇩🇪' },
      { value: 'it', label: '🇮🇹 Italiano', flag: '🇮🇹' }
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
      day: 'numeric'
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
  getGuestBadges(guest: Guest): Array<{ type: 'pet' | 'vip' | 'children'; label: string; icon: string }> {
    const badges: Array<{ type: 'pet' | 'vip' | 'children'; label: string; icon: string }> = [];
    
    if (guest.hasPets) {
      badges.push({ type: 'pet', label: 'Has Pet', icon: '❤️' });
    }
    
    if (guest.isVip) {
      badges.push({ type: 'vip', label: 'VIP Guest', icon: '⭐' });
    }
    
    if (guest.children.length > 0) {
      badges.push({ 
        type: 'children', 
        label: `${guest.children.length} Child${guest.children.length > 1 ? 'ren' : ''}`, 
        icon: '👶' 
      });
    }
    
    return badges;
  }
}