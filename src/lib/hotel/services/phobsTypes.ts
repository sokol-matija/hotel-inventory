// Phobs Channel Manager Integration - TypeScript Interfaces
// Integration with Hotel Porec inventory management system

import type { 
  Reservation, 
  Guest, 
  Room, 
  RoomType, 
  SeasonalPeriod, 
  ReservationStatus,
  PaymentMethod 
} from '../types';

// Branded types for Phobs IDs to prevent mixing with internal IDs
export type PhobsReservationId = string & { __brand: 'PhobsReservationId' };
export type PhobsGuestId = string & { __brand: 'PhobsGuestId' };
export type PhobsRoomId = string & { __brand: 'PhobsRoomId' };
export type PhobsChannelId = string & { __brand: 'PhobsChannelId' };
export type PhobsRateId = string & { __brand: 'PhobsRateId' };

// Helper functions to create branded types
export const createPhobsReservationId = (id: string): PhobsReservationId => id as PhobsReservationId;
export const createPhobsGuestId = (id: string): PhobsGuestId => id as PhobsGuestId;
export const createPhobsRoomId = (id: string): PhobsRoomId => id as PhobsRoomId;
export const createPhobsChannelId = (id: string): PhobsChannelId => id as PhobsChannelId;
export const createPhobsRateId = (id: string): PhobsRateId => id as PhobsRateId;

// OTA Channel Types
export type OTAChannel = 
  | 'booking.com'
  | 'expedia'
  | 'airbnb'
  | 'agoda'
  | 'hotels.com'
  | 'hostelworld'
  | 'kayak'
  | 'trivago'
  | 'priceline'
  | 'camping.info'
  | 'pitchup.com'
  | 'eurocamp'
  | 'directBooking';

export type ChannelStatus = 'active' | 'inactive' | 'error' | 'syncing' | 'paused';
export type SyncStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'retry';
export type SyncOperation = 'availability' | 'rates' | 'reservation' | 'cancellation' | 'modification';

// Phobs API Configuration
export interface PhobsConfig {
  baseUrl: string;
  apiKey: string;
  secretKey: string;
  hotelId: string;
  environment: 'staging' | 'production';
  webhookUrl: string;
  webhookSecret: string;
  timeout: number;
  retryCount: number;
  rateLimitPerMinute: number;
}

// Channel Manager Status
export interface ChannelManagerStatus {
  isConnected: boolean;
  lastSyncAt: Date;
  totalChannels: number;
  activeChannels: number;
  errorChannels: number;
  totalReservations: number;
  syncErrors: number;
  lastError?: string;
}

// OTA Channel Configuration
export interface OTAChannelConfig {
  channelId: PhobsChannelId;
  name: OTAChannel;
  displayName: string;
  status: ChannelStatus;
  isEnabled: boolean;
  
  // Channel-specific settings
  commission: number; // Percentage
  allowInstantBooking: boolean;
  minimumStay: number;
  maximumStay: number;
  cutoffHours: number; // Hours before check-in to stop accepting bookings
  
  // Rate settings
  baseRateAdjustment: number; // Percentage adjustment from base rate
  availability: boolean;
  
  // Restrictions
  restrictedRoomTypes: RoomType[];
  blackoutDates: DateRange[];
  
  // Performance metrics
  totalBookings: number;
  revenue: number;
  averageBookingValue: number;
  conversionRate: number;
  lastBookingAt?: Date;
  
  // Sync status
  lastSyncAt?: Date;
  syncStatus: SyncStatus;
  syncErrors: string[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// Date Range for restrictions and availability
export interface DateRange {
  startDate: Date;
  endDate: Date;
  reason?: string;
}

// Phobs API Data Models

// Room Inventory for Phobs
export interface PhobsRoom {
  roomId: PhobsRoomId;
  internalRoomId: string; // Maps to our Room.id
  roomNumber: string;
  roomType: string;
  floor: number;
  maxOccupancy: number;
  
  // OTA-specific room mapping
  channelRoomMappings: {
    [K in OTAChannel]?: {
      channelRoomTypeId: string;
      channelRoomTypeName: string;
      isActive: boolean;
    };
  };
  
  // Amenities for OTA channels
  amenities: string[];
  description: {
    [language: string]: string; // Multi-language descriptions
  };
  
  // Images
  images: string[];
  
  // Status
  isActive: boolean;
  lastUpdated: Date;
}

// Rate Plan for Phobs
export interface PhobsRatePlan {
  rateId: PhobsRateId;
  name: string;
  description: string;
  
  // Rate structure
  baseRate: number;
  currency: 'EUR';
  
  // Seasonal adjustments
  seasonalAdjustments: {
    [K in SeasonalPeriod]: number;
  };
  
  // Channel-specific rates
  channelRates: {
    [K in OTAChannel]?: {
      rate: number;
      isActive: boolean;
      commission: number;
    };
  };
  
  // Restrictions
  minimumStay: number;
  maximumStay: number;
  advanceBookingDays: number;
  
  // Availability
  isActive: boolean;
  validFrom: Date;
  validTo: Date;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// Availability Data
export interface PhobsAvailability {
  roomId: PhobsRoomId;
  rateId: PhobsRateId;
  date: Date;
  
  // Availability details
  available: number; // Number of rooms available
  totalRooms: number;
  rate: number;
  currency: 'EUR';
  
  // Restrictions
  minimumStay: number;
  maximumStay: number;
  closeToArrival: boolean;
  closeToDeparture: boolean;
  stopSale: boolean;
  
  // Channel-specific availability
  channelAvailability: {
    [K in OTAChannel]?: {
      available: number;
      rate: number;
      isActive: boolean;
    };
  };
  
  // Metadata
  lastUpdated: Date;
}

// Phobs Reservation Data
export interface PhobsReservation {
  // Phobs identifiers
  phobsReservationId: PhobsReservationId;
  phobsGuestId: PhobsGuestId;
  
  // Internal mapping
  internalReservationId?: string; // Maps to our Reservation.id
  internalGuestId?: string; // Maps to our Guest.id
  
  // Basic reservation data
  roomId: PhobsRoomId;
  checkIn: Date;
  checkOut: Date;
  numberOfGuests: number;
  adults: number;
  children: number;
  
  // Guest information
  guest: PhobsGuest;
  
  // Booking details
  channel: OTAChannel;
  bookingReference: string; // OTA booking reference
  status: PhobsReservationStatus;
  
  // Financial details
  totalAmount: number;
  currency: 'EUR';
  commission: number;
  netAmount: number; // Amount after commission
  
  // Pricing breakdown
  roomRate: number;
  taxes: number;
  fees: number;
  
  // Payment information
  paymentMethod: PaymentMethod;
  paymentStatus: 'pending' | 'confirmed' | 'paid' | 'cancelled';
  
  // Special requests
  specialRequests: string;
  guestNotes: string;
  
  // Timestamps
  bookingDate: Date;
  lastModified: Date;
  
  // Sync status
  syncStatus: SyncStatus;
  syncedAt?: Date;
  syncErrors: string[];
}

export type PhobsReservationStatus = 
  | 'new'
  | 'confirmed'
  | 'modified'
  | 'cancelled'
  | 'checked_in'
  | 'checked_out'
  | 'no_show';

// Phobs Guest Data
export interface PhobsGuest {
  phobsGuestId: PhobsGuestId;
  internalGuestId?: string; // Maps to our Guest.id
  
  // Basic information
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  
  // Location
  country: string;
  countryCode: string; // ISO country code
  city?: string;
  address?: string;
  postalCode?: string;
  
  // Additional details
  language: string; // ISO language code
  dateOfBirth?: Date;
  nationality?: string;
  
  // Preferences
  preferences: string[];
  specialRequests: string;
  
  // Guest history
  totalBookings: number;
  totalRevenue: number;
  isVip: boolean;
  
  // Sync status
  syncedAt?: Date;
  lastUpdated: Date;
}

// Webhook Event Data
export interface PhobsWebhookEvent {
  eventId: string;
  eventType: PhobsEventType;
  timestamp: Date;
  hotelId: string;
  
  // Event data
  data: PhobsWebhookData;
  
  // Signature for verification
  signature: string;
  
  // Processing status
  processed: boolean;
  processedAt?: Date;
  error?: string;
}

export type PhobsEventType = 
  | 'reservation.created'
  | 'reservation.modified'
  | 'reservation.cancelled'
  | 'availability.updated'
  | 'rates.updated'
  | 'channel.status_changed'
  | 'sync.completed'
  | 'sync.failed';

export type PhobsWebhookData = 
  | PhobsReservationEvent
  | PhobsAvailabilityEvent
  | PhobsRateEvent
  | PhobsChannelEvent
  | PhobsSyncEvent;

export interface PhobsReservationEvent {
  reservation: PhobsReservation;
  previousData?: Partial<PhobsReservation>;
  channel: OTAChannel;
}

export interface PhobsAvailabilityEvent {
  roomId: PhobsRoomId;
  dateRange: DateRange;
  availability: PhobsAvailability[];
  channel?: OTAChannel;
}

export interface PhobsRateEvent {
  rateId: PhobsRateId;
  roomId: PhobsRoomId;
  dateRange: DateRange;
  newRates: number[];
  channel?: OTAChannel;
}

export interface PhobsChannelEvent {
  channelId: PhobsChannelId;
  channel: OTAChannel;
  status: ChannelStatus;
  error?: string;
}

export interface PhobsSyncEvent {
  operation: SyncOperation;
  status: SyncStatus;
  recordsProcessed: number;
  recordsSuccessful: number;
  recordsFailed: number;
  errors: string[];
  duration: number; // Milliseconds
}

// API Request/Response Types

// Sync Operations
export interface SyncResult {
  success: boolean;
  operation: SyncOperation;
  recordsProcessed: number;
  recordsSuccessful: number;
  recordsFailed: number;
  errors: string[];
  duration: number;
  nextSyncAt?: Date;
}

export interface AvailabilitySyncRequest {
  roomIds: PhobsRoomId[];
  dateRange: DateRange;
  availability: PhobsAvailability[];
  forceUpdate?: boolean;
}

export interface RatesSyncRequest {
  rateIds: PhobsRateId[];
  roomIds: PhobsRoomId[];
  dateRange: DateRange;
  rates: PhobsRatePlan[];
  forceUpdate?: boolean;
}

export interface ReservationSyncRequest {
  reservations: PhobsReservation[];
  operation: 'create' | 'update' | 'cancel';
  forceUpdate?: boolean;
}

// Error Handling
export interface PhobsApiError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  requestId?: string;
}

export interface PhobsServiceError extends Error {
  code: string;
  phobsError?: PhobsApiError;
  retryable: boolean;
  statusCode?: number;
}

// Data Mapping Types
export interface DataMapping {
  // Room type mapping between internal and Phobs/OTA
  roomTypeMappings: {
    [internalRoomType in RoomType]: {
      phobsRoomType: string;
      channelMappings: {
        [channel in OTAChannel]?: string;
      };
    };
  };
  
  // Status mapping
  statusMappings: {
    [internalStatus in ReservationStatus]: PhobsReservationStatus;
  };
  
  // Payment method mapping
  paymentMethodMappings: {
    [internalMethod in PaymentMethod]: string;
  };
}

// Conflict Resolution
export interface ConflictResolution {
  conflictId: string;
  type: 'double_booking' | 'rate_mismatch' | 'availability_mismatch';
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  // Conflict details
  internalData: any;
  phobsData: any;
  channelData?: any;
  
  // Resolution
  suggestedAction: 'accept_internal' | 'accept_phobs' | 'accept_channel' | 'manual_review';
  autoResolvable: boolean;
  
  // Status
  status: 'detected' | 'resolving' | 'resolved' | 'escalated';
  resolvedAt?: Date;
  resolvedBy?: string;
  
  // Metadata
  detectedAt: Date;
  channel?: OTAChannel;
  affectedReservations: string[];
}

// Performance Monitoring
export interface ChannelPerformanceMetrics {
  channelId: PhobsChannelId;
  channel: OTAChannel;
  
  // Time period
  startDate: Date;
  endDate: Date;
  
  // Booking metrics
  totalBookings: number;
  totalRevenue: number;
  averageBookingValue: number;
  conversionRate: number;
  
  // Performance metrics
  syncSuccessRate: number;
  averageSyncTime: number;
  errorRate: number;
  
  // Comparison
  periodOverPeriodGrowth: number;
  marketShare: number;
  
  // Top performing
  topRoomTypes: string[];
  topPeriods: SeasonalPeriod[];
  
  // Issues
  commonErrors: string[];
  conflictsDetected: number;
  conflictsResolved: number;
}

// Configuration and Settings
export interface ChannelManagerSettings {
  // Global settings
  autoSync: boolean;
  syncInterval: number; // Minutes
  maxRetries: number;
  
  // Conflict resolution
  autoResolveConflicts: boolean;
  conflictResolutionStrategy: 'favor_internal' | 'favor_channel' | 'manual';
  
  // Notifications
  emailNotifications: boolean;
  ntfyNotifications: boolean;
  slackWebhook?: string;
  
  // Rate management
  dynamicPricing: boolean;
  competitorMonitoring: boolean;
  
  // Availability management
  overbookingProtection: boolean;
  minimumAvailabilityBuffer: number;
  
  // Channel specific overrides
  channelOverrides: {
    [channel in OTAChannel]?: {
      syncInterval?: number;
      rateAdjustment?: number;
      minimumStay?: number;
      enabled?: boolean;
    };
  };
}

// All types are already exported above individually