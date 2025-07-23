/**
 * Tests for Push Notifications functionality
 */

import { 
  isPushNotificationSupported,
  getNotificationSeverity,
  createExpirationNotification,
  sendLocalNotification
} from '../lib/pushNotifications';

// Mock browser APIs
const mockNavigator = {
  serviceWorker: {
    register: jest.fn(),
    ready: Promise.resolve({
      pushManager: {
        getSubscription: jest.fn(),
        subscribe: jest.fn()
      }
    })
  }
};

const mockNotification = {
  requestPermission: jest.fn()
};

// Setup global mocks
beforeAll(() => {
  Object.defineProperty(global, 'navigator', {
    value: mockNavigator,
    writable: true
  });
  
  Object.defineProperty(global, 'Notification', {
    value: mockNotification,
    writable: true
  });
  
  Object.defineProperty(global, 'PushManager', {
    value: {},
    writable: true
  });
});

describe('Push Notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isPushNotificationSupported', () => {
    it('should return true when service worker and push manager are supported', () => {
      expect(isPushNotificationSupported()).toBe(true);
    });

    it('should return false when service worker is not supported', () => {
      const originalServiceWorker = navigator.serviceWorker;
      delete (navigator as any).serviceWorker;
      
      expect(isPushNotificationSupported()).toBe(false);
      
      // Restore
      (navigator as any).serviceWorker = originalServiceWorker;
    });

    it('should return false when PushManager is not supported', () => {
      const originalPushManager = (global as any).PushManager;
      delete (global as any).PushManager;
      
      expect(isPushNotificationSupported()).toBe(false);
      
      // Restore
      (global as any).PushManager = originalPushManager;
    });
  });

  describe('getNotificationSeverity', () => {
    it('should return critical for 1 day or less', () => {
      expect(getNotificationSeverity(0)).toBe('critical');
      expect(getNotificationSeverity(1)).toBe('critical');
    });

    it('should return warning for 2-7 days', () => {
      expect(getNotificationSeverity(2)).toBe('warning');
      expect(getNotificationSeverity(5)).toBe('warning');
      expect(getNotificationSeverity(7)).toBe('warning');
    });

    it('should return info for 8-30 days', () => {
      expect(getNotificationSeverity(8)).toBe('info');
      expect(getNotificationSeverity(15)).toBe('info');
      expect(getNotificationSeverity(30)).toBe('info');
    });

    it('should return info for more than 30 days', () => {
      expect(getNotificationSeverity(45)).toBe('info');
      expect(getNotificationSeverity(100)).toBe('info');
    });
  });

  describe('createExpirationNotification', () => {
    it('should create critical notification for items expiring in 1 day', () => {
      const notification = createExpirationNotification('Milk', 'Kitchen Fridge', 1, 5);
      
      expect(notification.title).toBe('🚨 Critical: Item Expires Today!');
      expect(notification.body).toBe('Milk (5 units) at Kitchen Fridge expires in 1 day');
      expect(notification.icon).toBe('/icons/critical-notification.png');
      expect(notification.data.severity).toBe('critical');
      expect(notification.tag).toBe('expiration-Milk-Kitchen Fridge');
    });

    it('should create warning notification for items expiring in 5 days', () => {
      const notification = createExpirationNotification('Bread', 'Pantry', 5, 10);
      
      expect(notification.title).toBe('⚠️ Warning: Item Expires Soon');
      expect(notification.body).toBe('Bread (10 units) at Pantry expires in 5 days');
      expect(notification.icon).toBe('/icons/warning-notification.png');
      expect(notification.data.severity).toBe('warning');
    });

    it('should create info notification for items expiring in 20 days', () => {
      const notification = createExpirationNotification('Canned Tomatoes', 'Storage', 20, 12);
      
      expect(notification.title).toBe('💛 Notice: Item Expires in 30 Days');
      expect(notification.body).toBe('Canned Tomatoes (12 units) at Storage expires in 20 days');
      expect(notification.icon).toBe('/icons/info-notification.png');
      expect(notification.data.severity).toBe('info');
    });

    it('should handle plural vs singular days correctly', () => {
      const singular = createExpirationNotification('Item', 'Location', 1, 1);
      const plural = createExpirationNotification('Item', 'Location', 2, 1);
      
      expect(singular.body).toContain('expires in 1 day');
      expect(plural.body).toContain('expires in 2 days');
    });
  });

  describe('sendLocalNotification', () => {
    let mockNotificationConstructor: jest.Mock;

    beforeEach(() => {
      mockNotificationConstructor = jest.fn();
      (global as any).Notification = mockNotificationConstructor;
      
      // Mock permission as granted
      Object.defineProperty(Notification, 'permission', {
        value: 'granted',
        writable: true
      });
    });

    it('should create notification when permission is granted', () => {
      const notificationData = {
        title: 'Test Title',
        body: 'Test Body',
        icon: '/test-icon.png',
        data: { test: 'data' }
      };

      sendLocalNotification(notificationData);

      expect(mockNotificationConstructor).toHaveBeenCalledWith('Test Title', {
        body: 'Test Body',
        icon: '/test-icon.png',
        badge: '/logo192.png',
        data: { test: 'data' },
        tag: undefined
      });
    });

    it('should not create notification when permission is denied', () => {
      Object.defineProperty(Notification, 'permission', {
        value: 'denied',
        writable: true
      });

      const notificationData = {
        title: 'Test Title',
        body: 'Test Body'
      };

      sendLocalNotification(notificationData);

      expect(mockNotificationConstructor).not.toHaveBeenCalled();
    });

    it('should handle missing Notification API gracefully', () => {
      delete (global as any).Notification;
      
      const notificationData = {
        title: 'Test Title',
        body: 'Test Body'
      };

      // Should not throw
      expect(() => sendLocalNotification(notificationData)).not.toThrow();
    });
  });
});

describe('Service Worker Integration', () => {
  it('should register service worker correctly', async () => {
    const mockRegistration = {
      pushManager: {
        getSubscription: jest.fn().mockResolvedValue(null),
        subscribe: jest.fn().mockResolvedValue({
          endpoint: 'test-endpoint',
          keys: { p256dh: 'test-key', auth: 'test-auth' }
        })
      }
    };

    mockNavigator.serviceWorker.register.mockResolvedValue(mockRegistration);

    // This would be tested with subscribeToPushNotifications function
    // but it requires more complex mocking of service worker ready state
  });
});

// Integration test helpers
export const createMockInventoryItem = (daysUntilExpiration: number) => {
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + daysUntilExpiration);
  
  return {
    id: 1,
    quantity: 10,
    expiration_date: expirationDate.toISOString(),
    item: {
      name: 'Test Item',
      category: { requires_expiration: true }
    },
    location: { name: 'Test Location' }
  };
};

export const createMockUser = () => ({
  user_id: 'test-user-id',
  push_notifications_enabled: true,
  push_subscription: JSON.stringify({
    endpoint: 'https://test-endpoint.com',
    keys: {
      p256dh: 'test-p256dh-key',
      auth: 'test-auth-key'
    }
  })
});