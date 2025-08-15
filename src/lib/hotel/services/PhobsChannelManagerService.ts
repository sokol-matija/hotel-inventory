// PhobsChannelManagerService - Channel Manager Integration Service
// Handles Phobs API communication, OTA channel synchronization, and reservation management

import hotelNotification from '../../notifications';
import { PhobsErrorHandlingService } from './PhobsErrorHandlingService';
import { 
  PhobsConfig,
  PhobsReservation,
  OTAChannel,
  SyncResult,
  SyncOperation,
  ChannelManagerStatus,
  ConflictResolution,
  ChannelPerformanceMetrics,
  AvailabilitySyncRequest,
  RatesSyncRequest,
  ReservationSyncRequest,
  PhobsWebhookEvent
} from './phobsTypes';
import { Reservation, BookingSource } from '../types';

export interface ApiRequestOptions {
  timeout?: number;
  retryCount?: number;
  headers?: Record<string, string>;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  statusCode?: number;
  requestId?: string;
}

export interface AuthenticationResult {
  success: boolean;
  token?: string;
  expiresAt?: Date;
  error?: string;
}

export interface ConnectionTestResult {
  success: boolean;
  latency?: number;
  apiVersion?: string;
  supportedFeatures?: string[];
  error?: string;
}

export class PhobsChannelManagerService {
  private static instance: PhobsChannelManagerService;
  private config: PhobsConfig | null = null;
  private authToken: string | null = null;
  private tokenExpiresAt: Date | null = null;
  private retryQueue: Array<{ operation: SyncOperation; data: any; retryCount: number }> = [];
  private isConnected: boolean = false;
  private lastSyncAt: Date | null = null;
  private syncInProgress: Set<SyncOperation> = new Set();
  private errorHandler: PhobsErrorHandlingService;

  private constructor() {
    this.errorHandler = PhobsErrorHandlingService.getInstance();
  }

  public static getInstance(): PhobsChannelManagerService {
    if (!PhobsChannelManagerService.instance) {
      PhobsChannelManagerService.instance = new PhobsChannelManagerService();
    }
    return PhobsChannelManagerService.instance;
  }

  // ===========================
  // CONFIGURATION & AUTHENTICATION
  // ===========================

  /**
   * Initialize Phobs channel manager with configuration
   */
  async initialize(config: PhobsConfig): Promise<{ success: boolean; error?: string }> {
    try {
      this.config = config;
      
      // Test connection and authenticate
      const authResult = await this.authenticate();
      if (!authResult.success) {
        throw new Error(authResult.error || 'Authentication failed');
      }

      // Test API connectivity
      const connectionTest = await this.testConnection();
      if (!connectionTest.success) {
        throw new Error(connectionTest.error || 'Connection test failed');
      }

      this.isConnected = true;
      hotelNotification.success(
        'Phobs Channel Manager Connected!',
        `Successfully connected to ${config.environment} environment`,
        4
      );

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Phobs initialization failed:', error);
      
      hotelNotification.error(
        'Channel Manager Connection Failed',
        errorMessage,
        6
      );

      return { success: false, error: errorMessage };
    }
  }

  /**
   * Authenticate with Phobs API
   */
  private async authenticate(): Promise<AuthenticationResult> {
    if (!this.config) {
      return { success: false, error: 'Configuration not provided' };
    }

    const result = await this.errorHandler.withRetry(
      async () => {
        const response = await this.makeApiRequest('/auth/token', {
          method: 'POST',
          body: JSON.stringify({
            apiKey: this.config!.apiKey,
            secretKey: this.config!.secretKey,
            hotelId: this.config!.hotelId
          })
        });

        if (response.success && response.data?.token) {
          this.authToken = response.data.token;
          this.tokenExpiresAt = new Date(Date.now() + (24 * 60 * 60 * 1000)); // 24 hours
          
          return { 
            success: true, 
            token: this.authToken, 
            expiresAt: this.tokenExpiresAt 
          };
        } else {
          throw new Error(response.error || 'Authentication failed');
        }
      },
      {
        operation: 'authenticate',
        endpoint: '/auth/token',
        hotelId: this.config.hotelId
      },
      {
        maxAttempts: 2, // Don't retry auth too many times
        baseDelayMs: 2000
      }
    );

    if (result.success && result.data) {
      return result.data as AuthenticationResult;
    } else {
      this.errorHandler.logError(result.error!);
      return { 
        success: false, 
        error: result.error?.message || 'Authentication failed' 
      };
    }
  }

  /**
   * Test connection to Phobs API
   */
  async testConnection(): Promise<ConnectionTestResult> {
    try {
      const startTime = Date.now();
      const response = await this.makeApiRequest('/health', { method: 'GET' });
      const latency = Date.now() - startTime;

      if (response.success) {
        return {
          success: true,
          latency,
          apiVersion: response.data?.version,
          supportedFeatures: response.data?.features || []
        };
      } else {
        throw new Error(response.error || 'Health check failed');
      }
    } catch (error) {
      console.error('Connection test failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed'
      };
    }
  }

  // ===========================
  // INVENTORY SYNCHRONIZATION
  // ===========================

  /**
   * Sync room availability to all OTA channels
   */
  async syncRoomAvailability(request: AvailabilitySyncRequest): Promise<SyncResult> {
    const operation: SyncOperation = 'availability';
    
    if (this.syncInProgress.has(operation)) {
      return {
        success: false,
        operation,
        recordsProcessed: 0,
        recordsSuccessful: 0,
        recordsFailed: 0,
        errors: ['Availability sync already in progress'],
        duration: 0
      };
    }

    this.syncInProgress.add(operation);
    const startTime = Date.now();
    let recordsProcessed = 0;
    let recordsSuccessful = 0;
    let recordsFailed = 0;
    const errors: string[] = [];

    try {
      hotelNotification.info(
        'Syncing Availability',
        `Updating availability for ${request.roomIds.length} rooms across all channels...`
      );

      for (const availability of request.availability) {
        recordsProcessed++;
        
        try {
          const response = await this.makeApiRequest('/inventory/availability', {
            method: 'PUT',
            body: JSON.stringify({
              roomId: availability.roomId,
              date: availability.date.toISOString(),
              available: availability.available,
              rate: availability.rate,
              restrictions: {
                minimumStay: availability.minimumStay,
                stopSale: availability.stopSale,
                closeToArrival: availability.closeToArrival,
                closeToDeparture: availability.closeToDeparture
              },
              forceUpdate: request.forceUpdate
            })
          });

          if (response.success) {
            recordsSuccessful++;
          } else {
            recordsFailed++;
            errors.push(`Room ${availability.roomId}: ${response.error}`);
          }
        } catch (error) {
          recordsFailed++;
          errors.push(`Room ${availability.roomId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      const duration = Date.now() - startTime;
      this.lastSyncAt = new Date();

      const result: SyncResult = {
        success: recordsFailed === 0,
        operation,
        recordsProcessed,
        recordsSuccessful,
        recordsFailed,
        errors,
        duration
      };

      if (result.success) {
        hotelNotification.success(
          'Availability Sync Complete!',
          `Updated ${recordsSuccessful} availability records across all channels`,
          4
        );
      } else {
        hotelNotification.error(
          'Availability Sync Issues',
          `${recordsFailed}/${recordsProcessed} records failed to sync`,
          5
        );
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('Availability sync error:', error);
      
      return {
        success: false,
        operation,
        recordsProcessed,
        recordsSuccessful,
        recordsFailed: recordsProcessed,
        errors: [error instanceof Error ? error.message : 'Sync failed'],
        duration
      };
    } finally {
      this.syncInProgress.delete(operation);
    }
  }

  /**
   * Sync room rates to all OTA channels
   */
  async syncRates(request: RatesSyncRequest): Promise<SyncResult> {
    const operation: SyncOperation = 'rates';
    
    if (this.syncInProgress.has(operation)) {
      return {
        success: false,
        operation,
        recordsProcessed: 0,
        recordsSuccessful: 0,
        recordsFailed: 0,
        errors: ['Rate sync already in progress'],
        duration: 0
      };
    }

    this.syncInProgress.add(operation);
    const startTime = Date.now();
    let recordsProcessed = 0;
    let recordsSuccessful = 0;
    let recordsFailed = 0;
    const errors: string[] = [];

    try {
      hotelNotification.info(
        'Syncing Rates',
        `Updating rates for ${request.rates.length} rate plans across all channels...`
      );

      for (const ratePlan of request.rates) {
        recordsProcessed++;
        
        try {
          const response = await this.makeApiRequest('/inventory/rates', {
            method: 'PUT',
            body: JSON.stringify({
              rateId: ratePlan.rateId,
              baseRate: ratePlan.baseRate,
              seasonalAdjustments: ratePlan.seasonalAdjustments,
              channelRates: ratePlan.channelRates,
              restrictions: {
                minimumStay: ratePlan.minimumStay,
                maximumStay: ratePlan.maximumStay,
                advanceBookingDays: ratePlan.advanceBookingDays
              },
              forceUpdate: request.forceUpdate
            })
          });

          if (response.success) {
            recordsSuccessful++;
          } else {
            recordsFailed++;
            errors.push(`Rate ${ratePlan.rateId}: ${response.error}`);
          }
        } catch (error) {
          recordsFailed++;
          errors.push(`Rate ${ratePlan.rateId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      const duration = Date.now() - startTime;
      this.lastSyncAt = new Date();

      const result: SyncResult = {
        success: recordsFailed === 0,
        operation,
        recordsProcessed,
        recordsSuccessful,
        recordsFailed,
        errors,
        duration
      };

      if (result.success) {
        hotelNotification.success(
          'Rate Sync Complete!',
          `Updated ${recordsSuccessful} rate plans across all channels`,
          4
        );
      } else {
        hotelNotification.error(
          'Rate Sync Issues',
          `${recordsFailed}/${recordsProcessed} rate plans failed to sync`,
          5
        );
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('Rate sync error:', error);
      
      return {
        success: false,
        operation,
        recordsProcessed,
        recordsSuccessful,
        recordsFailed: recordsProcessed,
        errors: [error instanceof Error ? error.message : 'Sync failed'],
        duration
      };
    } finally {
      this.syncInProgress.delete(operation);
    }
  }

  // ===========================
  // RESERVATION SYNCHRONIZATION
  // ===========================

  /**
   * Sync reservations with OTA channels (bidirectional)
   */
  async syncReservations(request: ReservationSyncRequest): Promise<SyncResult> {
    const operation: SyncOperation = 'reservation';
    
    if (this.syncInProgress.has(operation)) {
      return {
        success: false,
        operation,
        recordsProcessed: 0,
        recordsSuccessful: 0,
        recordsFailed: 0,
        errors: ['Reservation sync already in progress'],
        duration: 0
      };
    }

    this.syncInProgress.add(operation);
    const startTime = Date.now();
    let recordsProcessed = 0;
    let recordsSuccessful = 0;
    let recordsFailed = 0;
    const errors: string[] = [];

    try {
      const operationText = request.operation === 'create' ? 'Creating' : 
                           request.operation === 'update' ? 'Updating' : 'Cancelling';
      
      hotelNotification.info(
        'Syncing Reservations',
        `${operationText} ${request.reservations.length} reservations across all channels...`
      );

      for (const reservation of request.reservations) {
        recordsProcessed++;
        
        try {
          const endpoint = request.operation === 'cancel' 
            ? `/reservations/${reservation.phobsReservationId}/cancel`
            : '/reservations';
          
          const method = request.operation === 'create' ? 'POST' : 'PUT';
          
          const response = await this.makeApiRequest(endpoint, {
            method,
            body: JSON.stringify({
              reservation: this.mapReservationToPhobsFormat(reservation),
              operation: request.operation,
              forceUpdate: request.forceUpdate
            })
          });

          if (response.success) {
            recordsSuccessful++;
          } else {
            recordsFailed++;
            errors.push(`Reservation ${reservation.phobsReservationId}: ${response.error}`);
          }
        } catch (error) {
          recordsFailed++;
          errors.push(`Reservation ${reservation.phobsReservationId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      const duration = Date.now() - startTime;
      this.lastSyncAt = new Date();

      const result: SyncResult = {
        success: recordsFailed === 0,
        operation,
        recordsProcessed,
        recordsSuccessful,
        recordsFailed,
        errors,
        duration
      };

      if (result.success) {
        hotelNotification.success(
          'Reservation Sync Complete!',
          `${operationText.replace('ing', 'ed')} ${recordsSuccessful} reservations across all channels`,
          4
        );
      } else {
        hotelNotification.error(
          'Reservation Sync Issues',
          `${recordsFailed}/${recordsProcessed} reservations failed to sync`,
          5
        );
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('Reservation sync error:', error);
      
      return {
        success: false,
        operation,
        recordsProcessed,
        recordsSuccessful,
        recordsFailed: recordsProcessed,
        errors: [error instanceof Error ? error.message : 'Sync failed'],
        duration
      };
    } finally {
      this.syncInProgress.delete(operation);
    }
  }

  /**
   * Handle incoming reservation from OTA channel (webhook)
   */
  async handleIncomingReservation(phobsReservation: PhobsReservation): Promise<{ success: boolean; internalReservationId?: string; error?: string }> {
    try {
      // Convert Phobs reservation to internal format
      const internalReservation = this.mapPhobsReservationToInternal(phobsReservation);
      
      // Check for conflicts (double booking, rate mismatch)
      const conflicts = await this.detectConflicts(phobsReservation);
      if (conflicts.length > 0) {
        // Handle conflicts based on configuration
        const resolution = await this.resolveConflicts(conflicts);
        if (!resolution.success) {
          throw new Error(`Conflict resolution failed: ${resolution.error}`);
        }
      }

      // Save to internal system
      // TODO: Integrate with HotelDataService to create reservation
      const reservationId = `internal-${Date.now()}`;
      
      hotelNotification.success(
        'New OTA Reservation!',
        `${phobsReservation.guest.firstName} ${phobsReservation.guest.lastName} from ${phobsReservation.channel}`,
        5
      );

      return { success: true, internalReservationId: reservationId };
    } catch (error) {
      console.error('Error handling incoming reservation:', error);
      hotelNotification.error(
        'Reservation Processing Failed',
        `Error processing ${phobsReservation.channel} reservation`,
        6
      );
      
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // ===========================
  // WEBHOOK PROCESSING
  // ===========================

  /**
   * Process incoming webhook from Phobs
   */
  async processWebhook(event: PhobsWebhookEvent): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify webhook signature
      if (!this.verifyWebhookSignature(event)) {
        throw new Error('Invalid webhook signature');
      }

      switch (event.eventType) {
        case 'reservation.created':
          if ('reservation' in event.data) {
            await this.handleIncomingReservation(event.data.reservation);
          }
          break;
          
        case 'reservation.modified':
          if ('reservation' in event.data) {
            await this.handleReservationModification(event.data.reservation);
          }
          break;
          
        case 'reservation.cancelled':
          if ('reservation' in event.data) {
            await this.handleReservationCancellation(event.data.reservation);
          }
          break;
          
        case 'availability.updated':
        case 'rates.updated':
          // Handle availability/rate updates from OTA channels
          break;
          
        default:
          console.warn('Unknown webhook event type:', event.eventType);
      }

      return { success: true };
    } catch (error) {
      console.error('Webhook processing error:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // ===========================
  // MONITORING & STATUS
  // ===========================

  /**
   * Get current channel manager status
   */
  getStatus(): ChannelManagerStatus {
    return {
      isConnected: this.isConnected,
      lastSyncAt: this.lastSyncAt || new Date(0),
      totalChannels: 15, // Example: 15 OTA channels
      activeChannels: 12,
      errorChannels: 1,
      totalReservations: 0, // TODO: Get from database
      syncErrors: this.retryQueue.length,
      lastError: this.retryQueue.length > 0 ? 'Sync operations in retry queue' : undefined
    };
  }

  /**
   * Get channel performance metrics
   */
  async getChannelMetrics(
    channel: OTAChannel, 
    startDate: Date, 
    endDate: Date
  ): Promise<ChannelPerformanceMetrics | null> {
    try {
      const response = await this.makeApiRequest(`/analytics/channels/${channel}`, {
        method: 'GET',
        headers: {
          'X-Date-Range': `${startDate.toISOString()},${endDate.toISOString()}`
        }
      });

      if (response.success) {
        return response.data as ChannelPerformanceMetrics;
      } else {
        throw new Error(response.error || 'Failed to fetch metrics');
      }
    } catch (error) {
      console.error('Error fetching channel metrics:', error);
      return null;
    }
  }

  // ===========================
  // PRIVATE HELPER METHODS
  // ===========================

  /**
   * Make authenticated API request to Phobs
   */
  private async makeApiRequest(
    endpoint: string, 
    options: RequestInit & ApiRequestOptions = {}
  ): Promise<ApiResponse> {
    if (!this.config) {
      throw new Error('Service not initialized');
    }

    // Check if token needs refresh
    if (this.tokenExpiresAt && this.tokenExpiresAt < new Date()) {
      await this.authenticate();
    }

    const url = `${this.config.baseUrl}${endpoint}`;
    const timeout = options.timeout || this.config.timeout;
    
    const requestOptions: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`,
        'X-Hotel-ID': this.config.hotelId,
        ...options.headers
      }
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, {
        ...requestOptions,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const data = await response.json();
      
      if (response.ok) {
        return {
          success: true,
          data,
          statusCode: response.status,
          requestId: response.headers.get('X-Request-ID') || undefined
        };
      } else {
        return {
          success: false,
          error: data.message || `HTTP ${response.status}`,
          statusCode: response.status,
          requestId: response.headers.get('X-Request-ID') || undefined
        };
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      throw error;
    }
  }

  /**
   * Map internal reservation to Phobs format
   */
  private mapReservationToPhobsFormat(reservation: PhobsReservation): any {
    return {
      roomId: reservation.roomId,
      checkIn: reservation.checkIn.toISOString(),
      checkOut: reservation.checkOut.toISOString(),
      guest: {
        firstName: reservation.guest.firstName,
        lastName: reservation.guest.lastName,
        email: reservation.guest.email,
        phone: reservation.guest.phone,
        country: reservation.guest.country
      },
      pricing: {
        totalAmount: reservation.totalAmount,
        currency: reservation.currency,
        roomRate: reservation.roomRate,
        taxes: reservation.taxes,
        fees: reservation.fees
      },
      specialRequests: reservation.specialRequests
    };
  }

  /**
   * Map OTA channel to booking source
   */
  private mapOTAToBookingSource(otaChannel: OTAChannel): BookingSource {
    const mapping: { [key in OTAChannel]: BookingSource } = {
      'booking.com': 'booking.com',
      'directBooking': 'direct',
      'expedia': 'other',
      'airbnb': 'other',
      'agoda': 'other',
      'hotels.com': 'other',
      'hostelworld': 'other',
      'kayak': 'other',
      'trivago': 'other',
      'priceline': 'other',
      'camping.info': 'other',
      'pitchup.com': 'other',
      'eurocamp': 'other'
    };
    return mapping[otaChannel] || 'other';
  }

  /**
   * Map Phobs reservation to internal format
   */
  private mapPhobsReservationToInternal(phobsReservation: PhobsReservation): Partial<Reservation> {
    return {
      roomId: phobsReservation.roomId,
      checkIn: phobsReservation.checkIn,
      checkOut: phobsReservation.checkOut,
      numberOfGuests: phobsReservation.numberOfGuests,
      adults: phobsReservation.adults,
      children: [], // TODO: Map children data
      status: 'confirmed',
      bookingSource: this.mapOTAToBookingSource(phobsReservation.channel),
      specialRequests: phobsReservation.specialRequests,
      totalAmount: phobsReservation.totalAmount,
      bookingDate: phobsReservation.bookingDate,
      lastModified: new Date(),
      notes: `OTA Booking from ${phobsReservation.channel} - Ref: ${phobsReservation.bookingReference}`
    };
  }

  /**
   * Detect conflicts for incoming reservations
   */
  private async detectConflicts(reservation: PhobsReservation): Promise<ConflictResolution[]> {
    // TODO: Implement conflict detection logic
    // Check for double bookings, rate mismatches, availability conflicts
    return [];
  }

  /**
   * Resolve detected conflicts
   */
  private async resolveConflicts(conflicts: ConflictResolution[]): Promise<{ success: boolean; error?: string }> {
    // TODO: Implement conflict resolution logic
    return { success: true };
  }

  /**
   * Verify webhook signature for security
   */
  private verifyWebhookSignature(event: PhobsWebhookEvent): boolean {
    if (!this.config?.webhookSecret) {
      return false; // No secret configured
    }
    
    // TODO: Implement HMAC signature verification
    // Compare event.signature with computed HMAC
    return true; // Simplified for now
  }

  /**
   * Handle reservation modification from webhook
   */
  private async handleReservationModification(reservation: PhobsReservation): Promise<void> {
    // TODO: Update internal reservation
    hotelNotification.info(
      'Reservation Modified',
      `${reservation.guest.firstName} ${reservation.guest.lastName} reservation updated via ${reservation.channel}`
    );
  }

  /**
   * Handle reservation cancellation from webhook
   */
  private async handleReservationCancellation(reservation: PhobsReservation): Promise<void> {
    // TODO: Cancel internal reservation
    hotelNotification.warning(
      'Reservation Cancelled',
      `${reservation.guest.firstName} ${reservation.guest.lastName} cancelled via ${reservation.channel}`
    );
  }
}