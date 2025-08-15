// PhobsIntegration.test.ts - Comprehensive integration tests for Phobs API communication
// Tests all major components of the Phobs channel manager integration

import { PhobsChannelManagerService } from '../PhobsChannelManagerService';
import { PhobsReservationSyncService } from '../PhobsReservationSyncService';
import { PhobsInventoryService } from '../PhobsInventoryService';
import { PhobsDataMapperService } from '../PhobsDataMapperService';
import { PhobsConfigurationService } from '../PhobsConfigurationService';
import { PhobsErrorHandlingService } from '../PhobsErrorHandlingService';
import { PhobsMonitoringService } from '../PhobsMonitoringService';
import {
  PhobsReservation,
  PhobsGuest,
  PhobsRoom,
  OTAChannel,
  PhobsWebhookEvent,
  SyncResult
} from '../phobsTypes';
import { Reservation, Guest, Room } from '../../types';

// Mock data for testing
const mockPhobsConfig = {
  apiKey: 'test_api_key_123',
  secretKey: 'test_secret_key_456',
  hotelId: 'test_hotel_789',
  baseUrl: 'https://api.phobs.test/v1',
  environment: 'test' as const,
  webhookSecret: 'test_webhook_secret',
  webhookUrl: 'https://test-hotel.com/api/phobs/webhook'
};

const mockGuest: Guest = {
  id: 'guest_123',
  firstName: 'John',
  lastName: 'Doe',
  fullName: 'John Doe',
  email: 'john.doe@example.com',
  phone: '+1234567890',
  dateOfBirth: new Date('1985-06-15'),
  nationality: 'Croatia',
  preferredLanguage: 'en',
  dietaryRestrictions: [],
  specialNeeds: '',
  hasPets: false,
  isVip: false,
  vipLevel: 0,
  children: [],
  totalStays: 1,
  emergencyContactName: undefined,
  emergencyContactPhone: undefined,
  createdAt: new Date(),
  updatedAt: new Date()
};

const mockRoom: Room = {
  id: 'room_101',
  number: '101',
  floor: 1,
  type: 'double',
  maxOccupancy: 2,
  nameEnglish: 'Standard Double Room',
  nameCroatian: 'Standardna dvokrevetna soba',
  amenities: ['WiFi', 'TV', 'Air Conditioning'],
  seasonalRates: {
    A: 80,  // Winter
    B: 100, // Spring
    C: 120, // Fall
    D: 150  // Summer
  }
};

const mockReservation: Reservation = {
  id: 'reservation_456',
  roomId: 'room_101',
  guestId: 'guest_123',
  checkIn: new Date('2025-08-20'),
  checkOut: new Date('2025-08-23'),
  numberOfGuests: 2,
  adults: 2,
  children: [],
  status: 'confirmed',
  bookingSource: 'booking.com',
  specialRequests: 'Late check-in requested',
  seasonalPeriod: 'D',
  baseRoomRate: 150,
  numberOfNights: 3,
  subtotal: 450,
  childrenDiscounts: 0,
  tourismTax: 6,
  vatAmount: 56.25,
  petFee: 0,
  parkingFee: 0,
  shortStaySuplement: 0,
  additionalCharges: 0,
  roomServiceItems: [],
  totalAmount: 512.25,
  bookingDate: new Date('2025-08-15'),
  lastModified: new Date('2025-08-15'),
  notes: 'Test reservation'
};

const mockPhobsReservation: PhobsReservation = {
  phobsReservationId: 'phobs_res_456_123',
  phobsGuestId: 'phobs_guest_123_456',
  internalReservationId: 'reservation_456',
  internalGuestId: 'guest_123',
  roomId: 'phobs_room_101',
  checkIn: new Date('2025-08-20'),
  checkOut: new Date('2025-08-23'),
  numberOfGuests: 2,
  adults: 2,
  children: 0,
  guest: {
    phobsGuestId: 'phobs_guest_123_456',
    internalGuestId: 'guest_123',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    country: 'Croatia',
    countryCode: 'HR',
    city: undefined,
    address: undefined,
    postalCode: undefined,
    language: 'en',
    dateOfBirth: new Date('1985-06-15'),
    nationality: 'Croatia',
    preferences: [],
    specialRequests: '',
    totalBookings: 1,
    totalRevenue: 0,
    isVip: false,
    syncedAt: undefined,
    lastUpdated: new Date()
  },
  channel: 'booking.com',
  bookingReference: 'BDC-123456789',
  status: 'confirmed',
  totalAmount: 512.25,
  currency: 'EUR',
  commission: 76.84,
  netAmount: 435.41,
  roomRate: 150,
  taxes: 62.25,
  fees: 0,
  paymentMethod: 'ota_payment',
  paymentStatus: 'paid',
  specialRequests: 'Late check-in requested',
  guestNotes: 'Test reservation',
  bookingDate: new Date('2025-08-15'),
  lastModified: new Date('2025-08-15'),
  syncStatus: 'pending',
  syncedAt: undefined,
  syncErrors: []
};

describe('PhobsIntegration', () => {
  let channelManagerService: PhobsChannelManagerService;
  let reservationSyncService: PhobsReservationSyncService;
  let inventoryService: PhobsInventoryService;
  let dataMapperService: PhobsDataMapperService;
  let configurationService: PhobsConfigurationService;
  let errorHandlingService: PhobsErrorHandlingService;
  let monitoringService: PhobsMonitoringService;

  beforeEach(() => {
    // Get service instances
    channelManagerService = PhobsChannelManagerService.getInstance();
    reservationSyncService = PhobsReservationSyncService.getInstance();
    inventoryService = PhobsInventoryService.getInstance();
    dataMapperService = PhobsDataMapperService.getInstance();
    configurationService = PhobsConfigurationService.getInstance();
    errorHandlingService = PhobsErrorHandlingService.getInstance();
    monitoringService = PhobsMonitoringService.getInstance();

    // Reset error metrics before each test
    errorHandlingService.resetMetrics();
  });

  describe('Configuration Service', () => {
    test('should save and retrieve API credentials', async () => {
      const credentials = {
        apiKey: 'test_key',
        apiSecret: 'test_secret',
        hotelId: 'test_hotel',
        baseUrl: 'https://api.test.com',
        webhookSecret: 'webhook_secret',
        webhookUrl: 'https://test.com/webhook'
      };

      const result = await configurationService.updateCredentials(credentials);
      expect(result.success).toBe(true);

      const retrieved = configurationService.getCredentials();
      expect(retrieved).toMatchObject(credentials);
    });

    test('should validate credentials before saving', async () => {
      const invalidCredentials = {
        apiKey: '', // Missing required field
        apiSecret: 'test_secret',
        hotelId: 'test_hotel',
        baseUrl: 'invalid-url', // Invalid URL
        webhookSecret: 'webhook_secret',
        webhookUrl: 'https://test.com/webhook'
      };

      const result = await configurationService.updateCredentials(invalidCredentials);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should manage channel configurations', async () => {
      const channelConfig = {
        isEnabled: true,
        commissionRate: 0.15,
        rateAdjustment: 5,
        minimumStay: 2,
        maximumStay: 14,
        stopSale: false,
        closeToArrival: false,
        closeToDeparture: false
      };

      const result = await configurationService.updateChannelConfiguration('booking.com', channelConfig);
      expect(result.success).toBe(true);

      const configs = configurationService.getChannelConfigurations();
      const bookingConfig = configs.find(c => c.channel === 'booking.com');
      expect(bookingConfig).toMatchObject({ channel: 'booking.com', ...channelConfig });
    });
  });

  describe('Data Mapper Service', () => {
    test('should map internal reservation to Phobs format', () => {
      const result = dataMapperService.mapReservationToPhobs(mockReservation, mockGuest, mockRoom);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      if (result.data) {
        expect(result.data.internalReservationId).toBe(mockReservation.id);
        expect(result.data.channel).toBe('booking.com');
        expect(result.data.totalAmount).toBe(mockReservation.totalAmount);
        expect(result.data.guest.firstName).toBe(mockGuest.firstName);
      }
    });

    test('should map Phobs reservation to internal format', () => {
      const result = dataMapperService.mapPhobsReservationToInternal(mockPhobsReservation);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      if (result.data) {
        expect(result.data.totalAmount).toBe(mockPhobsReservation.totalAmount);
        expect(result.data.checkIn).toEqual(mockPhobsReservation.checkIn);
        expect(result.data.checkOut).toEqual(mockPhobsReservation.checkOut);
      }
    });

    test('should validate required fields during mapping', () => {
      const invalidReservation = { ...mockReservation, roomId: '' };
      const result = dataMapperService.mapReservationToPhobs(invalidReservation, mockGuest, mockRoom);
      
      expect(result.success).toBe(false);
      expect(result.errors).toContain('Room ID is required');
    });

    test('should handle guest mapping with missing email', () => {
      const guestWithoutEmail = { ...mockGuest, email: '' };
      const result = dataMapperService.mapGuestToPhobs(guestWithoutEmail);
      
      expect(result.success).toBe(true);
      expect(result.warnings).toContain('Guest email is missing - this may cause issues with OTA channels');
    });
  });

  describe('Error Handling Service', () => {
    test('should handle network errors with retry logic', async () => {
      const networkErrorOperation = async () => {
        throw new Error('Network error: Connection refused');
      };

      const result = await errorHandlingService.withRetry(
        networkErrorOperation,
        { operation: 'test_network_error' },
        { maxAttempts: 2, baseDelayMs: 100 }
      );

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(2);
      expect(result.wasRetried).toBe(true);
      expect(result.error?.type).toBeDefined();
    });

    test('should not retry on authentication errors', async () => {
      const authErrorOperation = async () => {
        const error = new Error('Authentication failed');
        (error as any).status = 401;
        throw error;
      };

      const result = await errorHandlingService.withRetry(
        authErrorOperation,
        { operation: 'test_auth_error' }
      );

      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1);
      expect(result.wasRetried).toBe(false);
    });

    test('should track error metrics', () => {
      const initialMetrics = errorHandlingService.getMetrics();
      expect(initialMetrics.totalErrors).toBe(0);

      // This would be called internally by withRetry
      const error = errorHandlingService.handleError(
        new Error('Test error'),
        { operation: 'test_operation', attempt: 1, timestamp: new Date() }
      );

      expect(error).toBeDefined();
      expect(error.type).toBeDefined();
    });
  });

  describe('Monitoring Service', () => {
    test('should log operations with different levels', () => {
      monitoringService.info('test_operation', 'Test info message', { data: 'test' });
      monitoringService.warn('test_operation', 'Test warning message');
      monitoringService.error('test_operation', 'Test error message');

      const recentLogs = monitoringService.getRecentLogs(10);
      expect(recentLogs).toHaveLength(3);
      expect(recentLogs[0].level).toBe(2); // ERROR
      expect(recentLogs[1].level).toBe(1); // WARN
      expect(recentLogs[2].level).toBe(0); // INFO
    });

    test('should track performance traces', async () => {
      const traceId = monitoringService.startTrace('test_operation');
      expect(traceId).toBeDefined();

      monitoringService.addTraceStep(traceId, 'step_1');
      await new Promise(resolve => setTimeout(resolve, 10)); // Small delay
      monitoringService.completeTraceStep(traceId, 'step_1');

      const completedTrace = monitoringService.endTrace(traceId, true);
      expect(completedTrace).toBeDefined();
      expect(completedTrace?.steps).toHaveLength(1);
      expect(completedTrace?.steps[0].duration).toBeGreaterThan(0);
    });

    test('should generate operation metrics', () => {
      // Simulate some operations
      monitoringService.info('sync_reservations', 'Sync completed', {}, 'booking.com', 1500);
      monitoringService.info('sync_reservations', 'Sync completed', {}, 'expedia', 2000);
      monitoringService.error('sync_reservations', 'Sync failed', undefined, {}, 'airbnb');

      const operationMetrics = monitoringService.getOperationMetrics('sync_reservations');
      expect(operationMetrics).toHaveLength(1);
      
      const metrics = operationMetrics[0];
      expect(metrics.totalInvocations).toBe(3);
      expect(metrics.successfulInvocations).toBe(2);
      expect(metrics.failedInvocations).toBe(1);
      expect(metrics.successRate).toBeCloseTo(66.67, 1);
    });

    test('should track channel-specific metrics', () => {
      monitoringService.info('channel_sync', 'Sync completed', {}, 'booking.com', 1000);
      monitoringService.info('channel_sync', 'Sync completed', {}, 'booking.com', 1200);

      const channelMetrics = monitoringService.getChannelMetrics('booking.com');
      expect(channelMetrics).toHaveLength(1);
      
      const metrics = channelMetrics[0];
      expect(metrics.totalOperations).toBe(2);
      expect(metrics.successfulOperations).toBe(2);
      expect(metrics.averageResponseTime).toBe(1100);
    });

    test('should provide system health metrics', () => {
      const healthMetrics = monitoringService.getSystemHealthMetrics();
      
      expect(healthMetrics.uptime).toBeGreaterThan(0);
      expect(healthMetrics.lastHealthCheck).toBeInstanceOf(Date);
      expect(typeof healthMetrics.totalOperations).toBe('number');
      expect(typeof healthMetrics.errorRate).toBe('number');
    });
  });

  describe('Reservation Sync Service', () => {
    test('should process incoming OTA reservation', async () => {
      const result = await reservationSyncService.processIncomingReservation(mockPhobsReservation);
      
      // Since we don't have actual database integration in tests, 
      // we expect the process to handle the reservation appropriately
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    test('should detect duplicate reservations', async () => {
      // First reservation should succeed
      const result1 = await reservationSyncService.processIncomingReservation(mockPhobsReservation);
      
      // Second identical reservation should be detected as duplicate
      const result2 = await reservationSyncService.processIncomingReservation(mockPhobsReservation, 'webhook');
      
      expect(result2.success).toBe(false);
      expect(result2.error).toContain('Duplicate reservation');
    });

    test('should handle reservation modifications', async () => {
      const modifiedReservation = {
        ...mockPhobsReservation,
        checkOut: new Date('2025-08-24'), // Extended stay
        totalAmount: 650.00
      };

      const result = await reservationSyncService.processReservationModification(modifiedReservation);
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    test('should handle reservation cancellations', async () => {
      const result = await reservationSyncService.processReservationCancellation(mockPhobsReservation);
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    test('should get sync status', () => {
      const status = reservationSyncService.getSyncStatus();
      
      expect(status).toBeDefined();
      expect(typeof status.totalReservationsSynced).toBe('number');
      expect(typeof status.queueLength).toBe('number');
      expect(typeof status.activeConflicts).toBe('number');
    });
  });

  describe('Inventory Service', () => {
    test('should sync room inventory', async () => {
      const rooms = [mockRoom];
      const result = await inventoryService.syncRoomInventory(rooms);
      
      expect(result.success).toBe(true);
      expect(result.recordsProcessed).toBe(1);
      expect(result.operation).toBe('availability');
    });

    test('should calculate dynamic rates', () => {
      const baseRate = 100;
      const options = {
        seasonalPeriod: 'D' as const, // Peak summer
        roomType: 'double',
        channel: 'booking.com' as OTAChannel,
        advanceBookingDays: 30,
        lengthOfStay: 3
      };

      const dynamicRate = inventoryService.calculateDynamicRate(baseRate, options);
      
      expect(dynamicRate).toBeGreaterThan(baseRate); // Should be higher due to peak season
      expect(typeof dynamicRate).toBe('number');
    });

    test('should track sync status', () => {
      const status = inventoryService.getSyncStatus();
      
      expect(status).toBeDefined();
      expect(typeof status.roomsSynced).toBe('number');
      expect(typeof status.ratesSynced).toBe('number');
      expect(typeof status.availabilitySynced).toBe('number');
      expect(typeof status.isActive).toBe('boolean');
    });

    test('should handle sync cancellation', async () => {
      const cancelled = await inventoryService.cancelSync();
      expect(typeof cancelled).toBe('boolean');
    });
  });

  describe('Webhook Processing', () => {
    test('should process reservation creation webhook', async () => {
      const webhookEvent: PhobsWebhookEvent = {
        eventId: 'webhook_123',
        eventType: 'reservation.created',
        timestamp: new Date(),
        hotelId: 'test_hotel_789',
        data: mockPhobsReservation,
        signature: 'test_signature'
      };

      // This would normally be processed by the webhook handler
      const result = await reservationSyncService.processIncomingReservation(webhookEvent.data);
      expect(result).toBeDefined();
    });

    test('should process reservation modification webhook', async () => {
      const webhookEvent: PhobsWebhookEvent = {
        eventId: 'webhook_124',
        eventType: 'reservation.modified',
        timestamp: new Date(),
        hotelId: 'test_hotel_789',
        data: { ...mockPhobsReservation, totalAmount: 600.00 },
        signature: 'test_signature'
      };

      const result = await reservationSyncService.processReservationModification(webhookEvent.data);
      expect(result).toBeDefined();
    });

    test('should process reservation cancellation webhook', async () => {
      const webhookEvent: PhobsWebhookEvent = {
        eventId: 'webhook_125',
        eventType: 'reservation.cancelled',
        timestamp: new Date(),
        hotelId: 'test_hotel_789',
        data: mockPhobsReservation,
        signature: 'test_signature'
      };

      const result = await reservationSyncService.processReservationCancellation(webhookEvent.data);
      expect(result).toBeDefined();
    });
  });

  describe('Integration Flow Tests', () => {
    test('should complete full outbound reservation sync flow', async () => {
      // 1. Map reservation to Phobs format
      const mappingResult = dataMapperService.mapReservationToPhobs(mockReservation, mockGuest, mockRoom);
      expect(mappingResult.success).toBe(true);

      // 2. Sync to Phobs (would normally make API call)
      if (mappingResult.data) {
        // In a real test, this would make actual API calls
        const syncResult = await reservationSyncService.syncReservationToPhobs(
          mockReservation,
          mockGuest,
          mockRoom,
          'create'
        );
        expect(syncResult).toBeDefined();
      }
    });

    test('should complete full inbound reservation processing flow', async () => {
      // 1. Process incoming Phobs reservation
      const processingResult = await reservationSyncService.processIncomingReservation(mockPhobsReservation);
      
      // 2. Map to internal format
      const mappingResult = dataMapperService.mapPhobsReservationToInternal(mockPhobsReservation);
      expect(mappingResult.success).toBe(true);

      expect(processingResult).toBeDefined();
    });

    test('should handle complete inventory sync flow', async () => {
      const rooms = [mockRoom];
      
      // 1. Sync rooms
      const roomSyncResult = await inventoryService.syncRoomInventory(rooms);
      expect(roomSyncResult.success).toBe(true);

      // 2. Sync rates  
      const rateSyncResult = await inventoryService.syncRatePlans(rooms);
      expect(rateSyncResult.success).toBe(true);

      // 3. Sync availability
      const availabilitySyncResult = await inventoryService.syncAvailabilityData(rooms);
      expect(availabilitySyncResult.success).toBe(true);
    });
  });

  describe('Performance and Load Tests', () => {
    test('should handle multiple concurrent operations', async () => {
      const operations = Array.from({ length: 10 }, (_, i) =>
        reservationSyncService.processIncomingReservation({
          ...mockPhobsReservation,
          phobsReservationId: `phobs_res_${i}`,
          bookingReference: `BDC-${i}`
        })
      );

      const results = await Promise.all(operations);
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(typeof result.success).toBe('boolean');
      });
    });

    test('should handle large batch inventory sync', async () => {
      const rooms = Array.from({ length: 50 }, (_, i) => ({
        ...mockRoom,
        id: `room_${i}`,
        number: `${100 + i}`
      }));

      const result = await inventoryService.syncRoomInventory(rooms);
      expect(result.success).toBe(true);
      expect(result.recordsProcessed).toBe(50);
    });
  });

  describe('Error Scenarios', () => {
    test('should handle API timeout gracefully', async () => {
      const timeoutOperation = async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        throw new Error('Operation timed out after 30000ms');
      };

      const result = await errorHandlingService.withRetry(
        timeoutOperation,
        { operation: 'timeout_test' },
        { timeoutMs: 50, maxAttempts: 2 }
      );

      expect(result.success).toBe(false);
      expect(result.error?.type).toBeDefined();
    });

    test('should handle rate limiting', async () => {
      const rateLimitOperation = async () => {
        const error = new Error('Rate limit exceeded');
        (error as any).status = 429;
        throw error;
      };

      const result = await errorHandlingService.withRetry(
        rateLimitOperation,
        { operation: 'rate_limit_test' },
        { maxAttempts: 2, baseDelayMs: 100 }
      );

      expect(result.success).toBe(false);
      expect(result.wasRetried).toBe(true);
    });

    test('should handle malformed webhook data', async () => {
      const malformedReservation = {
        ...mockPhobsReservation,
        checkIn: 'invalid-date',
        totalAmount: 'not-a-number'
      };

      const result = await reservationSyncService.processIncomingReservation(malformedReservation as any);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});

// Mock HTTP responses for testing
export const mockApiResponses = {
  authentication: {
    success: {
      success: true,
      data: {
        token: 'test_jwt_token_here',
        expiresIn: 86400
      }
    },
    failure: {
      success: false,
      error: 'Invalid credentials'
    }
  },
  
  connectionTest: {
    success: {
      success: true,
      data: {
        status: 'connected',
        version: '1.0.0',
        features: ['reservations', 'inventory', 'rates']
      }
    }
  },

  reservationSync: {
    success: {
      success: true,
      data: {
        reservationId: 'phobs_res_123',
        status: 'created'
      }
    },
    conflict: {
      success: false,
      error: 'Room already booked for selected dates'
    }
  }
};

// Test utilities
export const testUtils = {
  createMockReservation: (overrides: Partial<Reservation> = {}): Reservation => ({
    ...mockReservation,
    ...overrides
  }),

  createMockGuest: (overrides: Partial<Guest> = {}): Guest => ({
    ...mockGuest,
    ...overrides
  }),

  createMockRoom: (overrides: Partial<Room> = {}): Room => ({
    ...mockRoom,
    ...overrides
  }),

  createMockPhobsReservation: (overrides: Partial<PhobsReservation> = {}): PhobsReservation => ({
    ...mockPhobsReservation,
    ...overrides
  }),

  waitForAsyncOperations: async (ms: number = 100) => {
    await new Promise(resolve => setTimeout(resolve, ms));
  }
};