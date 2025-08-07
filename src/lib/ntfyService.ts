interface NtfyNotification {
  topic: string;
  message: string;
  title?: string;
  priority?: 'min' | 'low' | 'default' | 'high' | 'max';
  tags?: string;
  actions?: NtfyAction[];
}

interface NtfyAction {
  action: 'view' | 'http' | 'broadcast';
  label: string;
  url?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
}

interface BookingNotificationData {
  roomNumber: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  bookingSource: string;
  totalAmount?: number;
}

class NtfyService {
  private baseUrl: string;
  private defaultTopic: string;

  constructor() {
    this.baseUrl = 'https://ntfy.sh';
    this.defaultTopic = process.env.REACT_APP_NTFY_TOPIC || 'hotel-porec-room-401';
  }

  private async sendNotification(notification: NtfyNotification): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/${notification.topic}`;
      
      const headers: Record<string, string> = {
        'Content-Type': 'text/plain',
      };

      if (notification.title) {
        headers['Title'] = notification.title;
      }

      if (notification.priority) {
        headers['Priority'] = notification.priority;
      }

      if (notification.tags) {
        headers['Tags'] = notification.tags;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: notification.message,
      });

      if (!response.ok) {
        console.error('Failed to send ntfy notification:', response.statusText);
        return false;
      }

      console.log('Ntfy notification sent successfully');
      return true;
    } catch (error) {
      console.error('Error sending ntfy notification:', error);
      return false;
    }
  }

  async sendRoom401BookingNotification(bookingData: BookingNotificationData): Promise<boolean> {
    // Only send notification for room 401
    if (bookingData.roomNumber !== '401') {
      return false;
    }

    const guestCount = bookingData.adults + bookingData.children;
    const guestText = guestCount === 1 ? 'guest' : 'guests';
    
    const message = `🏨 New Room 401 Booking

🏨 New Booking Created

📍 Room: ${bookingData.roomNumber}
👤 Guest: ${bookingData.guestName}
📅 Check-in: ${bookingData.checkIn}
📅 Check-out: ${bookingData.checkOut}
🌙 Nights: ${bookingData.nights}
👥 ${guestCount} ${guestText} (${bookingData.adults} adults${bookingData.children > 0 ? `, ${bookingData.children} children` : ''})
🔗 Source: ${bookingData.bookingSource}${bookingData.totalAmount ? `\n💰 Total: €${bookingData.totalAmount.toFixed(2)}` : ''}
    `.trim();

    const notification: NtfyNotification = {
      topic: this.defaultTopic,
      message,
      title: `New Room 401 Booking`,  // Removed emoji from title header
      priority: 'default',
      tags: 'hotel,booking,room401',
    };

    return this.sendNotification(notification);
  }

  async sendTestNotification(): Promise<boolean> {
    const testNotification: NtfyNotification = {
      topic: this.defaultTopic,
      message: '🧪 Test notification from Hotel Porec reservation system. If you receive this, the ntfy integration is working correctly!',
      title: 'Test Notification',  // Removed emoji from title header
      priority: 'low',
      tags: 'test,hotel',
    };

    return this.sendNotification(testNotification);
  }

  getTopic(): string {
    return this.defaultTopic;
  }

  getSubscriptionInstructions(): string {
    return `
To receive notifications for Room 401 bookings on your phone:

1. Install the ntfy app:
   📱 Android: https://play.google.com/store/apps/details?id=io.heckel.ntfy
   📱 iPhone: https://apps.apple.com/us/app/ntfy/id1625396347

2. Open the ntfy app and tap "Subscribe to topic"

3. Enter the topic name: ${this.defaultTopic}

4. Tap "Subscribe"

5. You're all set! You'll now receive push notifications when new bookings are created for room 401.

Topic: ${this.defaultTopic}
    `.trim();
  }
}

export const ntfyService = new NtfyService();
export type { BookingNotificationData };