/**
 * Ntfy.sh Notification Service
 * Sends push notifications to ntfy.sh topics
 */

import { Reservation, Room, Guest } from '../types';

export interface NtfyNotification {
  topic: string;
  title: string;
  message: string;
  priority?: 1 | 2 | 3 | 4 | 5; // 1=min, 3=default, 5=max
  tags?: string[];
  click?: string; // URL to open when notification is clicked
}

export class NtfyNotificationService {
  private static instance: NtfyNotificationService;
  private readonly baseUrl = 'https://ntfy.sh';

  private constructor() {}

  public static getInstance(): NtfyNotificationService {
    if (!NtfyNotificationService.instance) {
      NtfyNotificationService.instance = new NtfyNotificationService();
    }
    return NtfyNotificationService.instance;
  }

  /**
   * Send a notification to ntfy.sh
   */
  async sendNotification(notification: NtfyNotification): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${notification.topic}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: notification.topic,
          title: notification.title,
          message: notification.message,
          priority: notification.priority || 3,
          tags: notification.tags || [],
          click: notification.click,
        }),
      });

      if (!response.ok) {
        throw new Error(`ntfy.sh API returned status ${response.status}`);
      }

      console.log(`✓ Notification sent to ntfy.sh/${notification.topic}`);
    } catch (error) {
      console.error('Failed to send ntfy notification:', error);
      // Don't throw - notifications are non-critical
    }
  }

  /**
   * Send notification for a new reservation in room 401
   */
  async notifyRoom401Reservation(
    reservation: Reservation,
    room: Room,
    guest: Guest
  ): Promise<void> {
    // Only notify for room 401
    if (room.number !== '401') {
      return;
    }

    const checkInDate = new Date(reservation.checkIn).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    const checkOutDate = new Date(reservation.checkOut).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    const guestName = `${guest.firstName} ${guest.lastName}`;
    const nights = reservation.numberOfNights;
    const guests = reservation.numberOfGuests;

    await this.sendNotification({
      topic: 'hotel-porec-room-401',
      title: `🏨 New Reservation - Room 401`,
      message: `Guest: ${guestName}\nCheck-in: ${checkInDate}\nCheck-out: ${checkOutDate}\n${nights} night${nights > 1 ? 's' : ''} • ${guests} guest${guests > 1 ? 's' : ''}\nStatus: ${reservation.status}`,
      priority: 4,
      tags: ['hotel', 'booking', '401'],
    });
  }
}

export const ntfyNotificationService = NtfyNotificationService.getInstance();
