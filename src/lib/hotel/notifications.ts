// Hotel notification service
// Simple notification wrapper for hotel-specific messages

interface NotificationOptions {
  title: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

class HotelNotificationService {
  show(options: NotificationOptions) {
    // For now, just console log - can be enhanced with toast notifications later
    const { title, message, type = 'info' } = options;
    console.log(`[${type.toUpperCase()}] ${title}: ${message}`);
    
    // Could integrate with a toast library like react-hot-toast here
    // toast[type](message);
  }

  success(title: string, message: string) {
    this.show({ title, message, type: 'success' });
  }

  error(title: string, message: string) {
    this.show({ title, message, type: 'error' });
  }

  warning(title: string, message: string) {
    this.show({ title, message, type: 'warning' });
  }

  info(title: string, message: string) {
    this.show({ title, message, type: 'info' });
  }
}

const hotelNotification = new HotelNotificationService();
export default hotelNotification;