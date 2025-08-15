// PhobsReservationSyncService - Bidirectional reservation synchronization
// Handles sync between internal hotel system and Phobs/OTA channels

import { PhobsChannelManagerService } from './PhobsChannelManagerService';
import { PhobsDataMapperService } from './PhobsDataMapperService';
import { PhobsInventoryService } from './PhobsInventoryService';
import hotelNotification from '../../notifications';
import { ntfyService } from '../../ntfyService';
import {
  PhobsReservation,
  SyncResult,
  ReservationSyncRequest,
  ConflictResolution,
  OTAChannel,
  PhobsWebhookEvent
} from './phobsTypes';
import { Reservation, Guest, Room } from '../types';

export interface ReservationSyncStatus {
  lastOutboundSync: Date | null;
  lastInboundSync: Date | null;
  totalReservationsSynced: number;
  pendingOutbound: number;
  pendingInbound: number;
  conflictsDetected: number;
  conflictsResolved: number;
  syncErrors: number;
}

export interface SyncQueueItem {
  id: string;
  type: 'outbound' | 'inbound';
  operation: 'create' | 'update' | 'cancel';
  reservationId: string;
  phobsReservationId?: string;
  channel?: OTAChannel;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  attempts: number;
  maxAttempts: number;
  lastAttempt: Date | null;
  scheduledFor: Date;
  data: any;
  errors: string[];
  createdAt: Date;
}

export interface ConflictResolutionStrategy {
  autoResolve: boolean;
  strategy: 'favor_internal' | 'favor_phobs' | 'favor_latest' | 'manual_review';
  notifyStaff: boolean;
  escalateAfterMinutes: number;
}

export interface ReservationSyncOptions {
  forceSync?: boolean;
  selectedChannels?: OTAChannel[];
  conflictResolution?: ConflictResolutionStrategy;
  batchSize?: number;
  throttleMs?: number;
}

export class PhobsReservationSyncService {
  private static instance: PhobsReservationSyncService;
  private channelManagerService: PhobsChannelManagerService;
  private dataMapperService: PhobsDataMapperService;
  private inventoryService: PhobsInventoryService;
  
  private syncStatus: ReservationSyncStatus;
  private syncQueue: SyncQueueItem[] = [];
  private processingQueue: boolean = false;
  private activeConflicts: Map<string, ConflictResolution> = new Map();
  
  private defaultConflictStrategy: ConflictResolutionStrategy = {
    autoResolve: false,
    strategy: 'manual_review',
    notifyStaff: true,
    escalateAfterMinutes: 30
  };

  private constructor() {
    this.channelManagerService = PhobsChannelManagerService.getInstance();
    this.dataMapperService = PhobsDataMapperService.getInstance();
    this.inventoryService = PhobsInventoryService.getInstance();
    
    this.syncStatus = {
      lastOutboundSync: null,
      lastInboundSync: null,
      totalReservationsSynced: 0,
      pendingOutbound: 0,
      pendingInbound: 0,
      conflictsDetected: 0,
      conflictsResolved: 0,
      syncErrors: 0
    };

    // Start queue processing
    this.startQueueProcessor();
  }

  public static getInstance(): PhobsReservationSyncService {
    if (!PhobsReservationSyncService.instance) {
      PhobsReservationSyncService.instance = new PhobsReservationSyncService();
    }
    return PhobsReservationSyncService.instance;
  }

  // ===========================
  // OUTBOUND SYNC (Internal → Phobs)
  // ===========================

  /**
   * Sync internal reservation to Phobs/OTA channels
   */
  async syncReservationToPhobs(
    reservation: Reservation,
    guest: Guest,
    room: Room,
    operation: 'create' | 'update' | 'cancel',
    options: ReservationSyncOptions = {}
  ): Promise<SyncResult> {
    try {
      // Map reservation to Phobs format
      const mappingResult = this.dataMapperService.mapReservationToPhobs(reservation, guest, room);
      if (!mappingResult.success) {
        throw new Error(`Mapping failed: ${mappingResult.errors.join(', ')}`);
      }

      const phobsReservation = mappingResult.data!;

      // Check for conflicts before sync
      const conflicts = await this.detectReservationConflicts(phobsReservation, reservation);
      if (conflicts.length > 0 && !options.forceSync) {
        return await this.handleSyncConflicts(conflicts, phobsReservation, operation);
      }

      // Create sync request
      const syncRequest: ReservationSyncRequest = {
        reservations: [phobsReservation],
        operation,
        forceUpdate: options.forceSync || false
      };

      // Execute sync
      const syncResult = await this.channelManagerService.syncReservations(syncRequest);

      // Update availability if reservation created/cancelled
      if ((operation === 'create' || operation === 'cancel') && syncResult.success) {
        await this.updateAvailabilityAfterReservationChange(reservation, room, operation);
      }

      // Send notifications
      if (syncResult.success) {
        await this.sendSyncNotifications(operation, phobsReservation, 'outbound');
        this.syncStatus.totalReservationsSynced++;
        this.syncStatus.lastOutboundSync = new Date();
      } else {
        this.syncStatus.syncErrors++;
      }

      return syncResult;

    } catch (error) {
      console.error('Outbound reservation sync error:', error);
      this.syncStatus.syncErrors++;
      
      return {
        success: false,
        operation: 'reservation',
        recordsProcessed: 1,
        recordsSuccessful: 0,
        recordsFailed: 1,
        errors: [error instanceof Error ? error.message : 'Unknown sync error'],
        duration: 0
      };
    }
  }

  /**
   * Queue multiple reservations for batch sync
   */
  async queueReservationsForSync(
    reservations: Array<{
      reservation: Reservation;
      guest: Guest;
      room: Room;
      operation: 'create' | 'update' | 'cancel';
    }>,
    options: ReservationSyncOptions = {}
  ): Promise<{ queued: number; errors: string[] }> {
    const errors: string[] = [];
    let queued = 0;

    for (const { reservation, guest, room, operation } of reservations) {
      try {
        const queueItem: SyncQueueItem = {
          id: `outbound_${reservation.id}_${Date.now()}`,
          type: 'outbound',
          operation,
          reservationId: reservation.id,
          phobsReservationId: (reservation as any).phobsReservationId,
          priority: this.calculateSyncPriority(reservation, operation),
          attempts: 0,
          maxAttempts: 3,
          lastAttempt: null,
          scheduledFor: new Date(),
          data: { reservation, guest, room },
          errors: [],
          createdAt: new Date()
        };

        this.syncQueue.push(queueItem);
        this.syncStatus.pendingOutbound++;
        queued++;

      } catch (error) {
        errors.push(`Reservation ${reservation.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Start processing if not already running
    if (!this.processingQueue) {
      this.processQueueAsync();
    }

    return { queued, errors };
  }

  // ===========================
  // INBOUND SYNC (Phobs → Internal)
  // ===========================

  /**
   * Process incoming reservation from OTA channel (webhook)
   */
  async processIncomingReservation(
    phobsReservation: PhobsReservation,
    source: 'webhook' | 'pull_sync' = 'webhook'
  ): Promise<{ success: boolean; internalReservationId?: string; conflicts?: ConflictResolution[]; error?: string }> {
    try {
      console.log('Processing incoming reservation:', {
        phobsId: phobsReservation.phobsReservationId,
        channel: phobsReservation.channel,
        guest: `${phobsReservation.guest.firstName} ${phobsReservation.guest.lastName}`,
        checkIn: phobsReservation.checkIn,
        checkOut: phobsReservation.checkOut
      });

      // Check for existing reservation (duplicate detection)
      const existingReservation = await this.findExistingReservation(phobsReservation);
      if (existingReservation && source === 'webhook') {
        console.warn('Duplicate reservation detected:', phobsReservation.phobsReservationId);
        return {
          success: false,
          error: 'Duplicate reservation - already exists in system'
        };
      }

      // Detect conflicts
      const conflicts = await this.detectInboundConflicts(phobsReservation);
      if (conflicts.length > 0) {
        // Handle conflicts based on strategy
        const resolutionResult = await this.resolveInboundConflicts(conflicts, phobsReservation);
        if (!resolutionResult.success) {
          return {
            success: false,
            conflicts,
            error: 'Unresolvable conflicts detected'
          };
        }
      }

      // Map to internal format
      const mappingResult = this.dataMapperService.mapPhobsReservationToInternal(phobsReservation);
      if (!mappingResult.success) {
        throw new Error(`Mapping failed: ${mappingResult.errors.join(', ')}`);
      }

      const internalReservation = mappingResult.data!;

      // Create or update guest
      const guestId = await this.createOrUpdateGuestFromPhobs(phobsReservation.guest);
      internalReservation.guestId = guestId;

      // Create internal reservation
      const reservationId = await this.createInternalReservation(internalReservation, phobsReservation);

      // Update availability
      await this.updateAvailabilityAfterInboundReservation(phobsReservation);

      // Send notifications
      await this.sendInboundReservationNotifications(phobsReservation, reservationId);

      // Update sync status
      this.syncStatus.totalReservationsSynced++;
      this.syncStatus.lastInboundSync = new Date();
      if (conflicts.length > 0) {
        this.syncStatus.conflictsDetected += conflicts.length;
        this.syncStatus.conflictsResolved += conflicts.length;
      }

      console.log('Successfully processed incoming reservation:', reservationId);

      return {
        success: true,
        internalReservationId: reservationId,
        conflicts: conflicts.length > 0 ? conflicts : undefined
      };

    } catch (error) {
      console.error('Error processing incoming reservation:', error);
      this.syncStatus.syncErrors++;
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown processing error'
      };
    }
  }

  /**
   * Process reservation modification from OTA
   */
  async processReservationModification(
    phobsReservation: PhobsReservation
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Find existing internal reservation
      const existingReservation = await this.findExistingReservation(phobsReservation);
      if (!existingReservation) {
        throw new Error(`No internal reservation found for Phobs ID: ${phobsReservation.phobsReservationId}`);
      }

      // Map modifications
      const mappingResult = this.dataMapperService.mapPhobsReservationToInternal(phobsReservation);
      if (!mappingResult.success) {
        throw new Error(`Mapping failed: ${mappingResult.errors.join(', ')}`);
      }

      const updates = mappingResult.data!;

      // Update internal reservation
      await this.updateInternalReservation(existingReservation.id, updates);

      // Update availability if dates changed
      if (updates.checkIn || updates.checkOut) {
        await this.updateAvailabilityAfterDateChange(existingReservation, updates);
      }

      // Send notifications
      await this.sendModificationNotifications(phobsReservation, existingReservation.id);

      return { success: true };

    } catch (error) {
      console.error('Error processing reservation modification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown modification error'
      };
    }
  }

  /**
   * Process reservation cancellation from OTA
   */
  async processReservationCancellation(
    phobsReservation: PhobsReservation
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Find existing internal reservation
      const existingReservation = await this.findExistingReservation(phobsReservation);
      if (!existingReservation) {
        console.warn(`Cancellation for non-existent reservation: ${phobsReservation.phobsReservationId}`);
        return { success: true }; // Not an error if already gone
      }

      // Update reservation status to cancelled
      await this.updateInternalReservation(existingReservation.id, { 
        status: 'room-closure', // Map cancelled to room-closure
        lastModified: new Date()
      });

      // Update availability (make room available again)
      await this.updateAvailabilityAfterCancellation(existingReservation);

      // Send notifications
      await this.sendCancellationNotifications(phobsReservation, existingReservation.id);

      return { success: true };

    } catch (error) {
      console.error('Error processing reservation cancellation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown cancellation error'
      };
    }
  }

  // ===========================
  // CONFLICT DETECTION & RESOLUTION
  // ===========================

  /**
   * Detect conflicts for outbound reservation sync
   */
  private async detectReservationConflicts(
    phobsReservation: PhobsReservation,
    internalReservation: Reservation
  ): Promise<ConflictResolution[]> {
    const conflicts: ConflictResolution[] = [];

    try {
      // Check for double bookings on the same room/dates
      const overlappingReservations = await this.findOverlappingReservations(
        internalReservation.roomId,
        internalReservation.checkIn,
        internalReservation.checkOut
      );

      if (overlappingReservations.length > 0) {
        conflicts.push({
          conflictId: `double_booking_${internalReservation.id}_${Date.now()}`,
          type: 'double_booking',
          severity: 'critical',
          internalData: internalReservation,
          phobsData: phobsReservation,
          suggestedAction: 'manual_review',
          autoResolvable: false,
          status: 'detected',
          detectedAt: new Date(),
          channel: phobsReservation.channel,
          affectedReservations: overlappingReservations.map(r => r.id)
        });
      }

      // Check for rate mismatches
      const expectedRate = await this.calculateExpectedRate(internalReservation);
      const rateDifference = Math.abs(expectedRate - phobsReservation.roomRate);
      if (rateDifference > expectedRate * 0.1) { // More than 10% difference
        conflicts.push({
          conflictId: `rate_mismatch_${internalReservation.id}_${Date.now()}`,
          type: 'rate_mismatch',
          severity: 'medium',
          internalData: { expectedRate, actualRate: internalReservation.totalAmount },
          phobsData: { expectedRate, phobsRate: phobsReservation.roomRate },
          suggestedAction: 'accept_internal',
          autoResolvable: true,
          status: 'detected',
          detectedAt: new Date(),
          channel: phobsReservation.channel,
          affectedReservations: [internalReservation.id]
        });
      }

    } catch (error) {
      console.error('Error detecting conflicts:', error);
    }

    return conflicts;
  }

  /**
   * Detect conflicts for inbound reservation
   */
  private async detectInboundConflicts(
    phobsReservation: PhobsReservation
  ): Promise<ConflictResolution[]> {
    const conflicts: ConflictResolution[] = [];

    try {
      // Check room availability
      const isRoomAvailable = await this.checkRoomAvailability(
        phobsReservation.roomId,
        new Date(phobsReservation.checkIn),
        new Date(phobsReservation.checkOut)
      );

      if (!isRoomAvailable) {
        conflicts.push({
          conflictId: `availability_conflict_${phobsReservation.phobsReservationId}`,
          type: 'double_booking',
          severity: 'critical',
          internalData: null,
          phobsData: phobsReservation,
          suggestedAction: 'manual_review',
          autoResolvable: false,
          status: 'detected',
          detectedAt: new Date(),
          channel: phobsReservation.channel,
          affectedReservations: []
        });
      }

    } catch (error) {
      console.error('Error detecting inbound conflicts:', error);
    }

    return conflicts;
  }

  // ===========================
  // SYNC QUEUE PROCESSING
  // ===========================

  /**
   * Start the async queue processor
   */
  private startQueueProcessor(): void {
    setInterval(() => {
      if (!this.processingQueue && this.syncQueue.length > 0) {
        this.processQueueAsync();
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Process sync queue asynchronously
   */
  private async processQueueAsync(): Promise<void> {
    if (this.processingQueue) return;
    
    this.processingQueue = true;

    try {
      // Sort queue by priority and scheduled time
      this.syncQueue.sort((a, b) => {
        const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.scheduledFor.getTime() - b.scheduledFor.getTime();
      });

      // Process items due for execution
      const now = new Date();
      const itemsToProcess = this.syncQueue.filter(item => 
        item.scheduledFor <= now && item.attempts < item.maxAttempts
      );

      for (const item of itemsToProcess) {
        try {
          await this.processSyncQueueItem(item);
          
          // Remove from queue if successful
          this.syncQueue = this.syncQueue.filter(i => i.id !== item.id);
          
          if (item.type === 'outbound') {
            this.syncStatus.pendingOutbound--;
          } else {
            this.syncStatus.pendingInbound--;
          }

        } catch (error) {
          // Handle failed item
          item.attempts++;
          item.lastAttempt = new Date();
          item.errors.push(error instanceof Error ? error.message : 'Unknown error');
          
          if (item.attempts >= item.maxAttempts) {
            // Remove failed item after max attempts
            this.syncQueue = this.syncQueue.filter(i => i.id !== item.id);
            this.syncStatus.syncErrors++;
            
            console.error(`Sync item failed after ${item.maxAttempts} attempts:`, item.id);
          } else {
            // Schedule retry with exponential backoff
            const delayMinutes = Math.pow(2, item.attempts) * 5; // 5, 10, 20 minutes
            item.scheduledFor = new Date(Date.now() + delayMinutes * 60 * 1000);
          }
        }

        // Throttle processing to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

    } catch (error) {
      console.error('Queue processing error:', error);
    } finally {
      this.processingQueue = false;
    }
  }

  /**
   * Process individual sync queue item
   */
  private async processSyncQueueItem(item: SyncQueueItem): Promise<void> {
    if (item.type === 'outbound') {
      const { reservation, guest, room } = item.data;
      await this.syncReservationToPhobs(reservation, guest, room, item.operation);
    } else {
      // Handle inbound sync items
      const phobsReservation = item.data as PhobsReservation;
      await this.processIncomingReservation(phobsReservation, 'pull_sync');
    }
  }

  // ===========================
  // STATUS AND MONITORING
  // ===========================

  /**
   * Get current sync status
   */
  getSyncStatus(): ReservationSyncStatus & { queueLength: number; activeConflicts: number } {
    return {
      ...this.syncStatus,
      queueLength: this.syncQueue.length,
      activeConflicts: this.activeConflicts.size
    };
  }

  /**
   * Get pending sync items
   */
  getPendingSyncItems(): SyncQueueItem[] {
    return [...this.syncQueue];
  }

  /**
   * Get active conflicts
   */
  getActiveConflicts(): ConflictResolution[] {
    return Array.from(this.activeConflicts.values());
  }

  /**
   * Clear sync queue (emergency stop)
   */
  clearSyncQueue(): { cleared: number } {
    const cleared = this.syncQueue.length;
    this.syncQueue = [];
    this.syncStatus.pendingOutbound = 0;
    this.syncStatus.pendingInbound = 0;
    
    hotelNotification.warning(
      'Sync Queue Cleared',
      `Cleared ${cleared} pending sync operations`,
      4
    );

    return { cleared };
  }

  // ===========================
  // PRIVATE HELPER METHODS
  // ===========================

  private calculateSyncPriority(
    reservation: Reservation,
    operation: 'create' | 'update' | 'cancel'
  ): 'low' | 'normal' | 'high' | 'urgent' {
    const now = new Date();
    const checkInDate = new Date(reservation.checkIn);
    const daysUntilCheckIn = Math.ceil((checkInDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (operation === 'cancel') return 'urgent';
    if (daysUntilCheckIn <= 1) return 'urgent';
    if (daysUntilCheckIn <= 7) return 'high';
    if (daysUntilCheckIn <= 30) return 'normal';
    return 'low';
  }

  private async sendSyncNotifications(
    operation: 'create' | 'update' | 'cancel',
    reservation: PhobsReservation,
    direction: 'inbound' | 'outbound'
  ): Promise<void> {
    // Send notification for significant operations
    if (operation === 'create' && direction === 'outbound') {
      hotelNotification.success(
        'Reservation Synced',
        `${reservation.guest.firstName} ${reservation.guest.lastName} reservation sent to ${reservation.channel}`,
        3
      );
    }
  }

  private async sendInboundReservationNotifications(
    phobsReservation: PhobsReservation,
    internalReservationId: string
  ): Promise<void> {
    // Send NTFY notification for new OTA reservations
    try {
      const checkIn = new Date(phobsReservation.checkIn);
      const checkOut = new Date(phobsReservation.checkOut);
      const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

      await ntfyService.sendRoom401BookingNotification({
        bookingSource: phobsReservation.channel,
        guestName: `${phobsReservation.guest.firstName} ${phobsReservation.guest.lastName}`,
        roomNumber: String(phobsReservation.roomId),
        checkIn: checkIn.toLocaleDateString(),
        checkOut: checkOut.toLocaleDateString(),
        nights,
        adults: phobsReservation.adults,
        children: phobsReservation.children,
        totalAmount: phobsReservation.totalAmount
      });

    } catch (error) {
      console.error('Failed to send OTA booking notification:', error);
    }

    // Show in-app notification
    hotelNotification.success(
      `New ${phobsReservation.channel} Reservation!`,
      `${phobsReservation.guest.firstName} ${phobsReservation.guest.lastName} - ${phobsReservation.roomId}`,
      6
    );
  }

  private async sendModificationNotifications(
    phobsReservation: PhobsReservation,
    internalReservationId: string
  ): Promise<void> {
    hotelNotification.info(
      'Reservation Modified',
      `${phobsReservation.guest.firstName} ${phobsReservation.guest.lastName} reservation updated via ${phobsReservation.channel}`,
      4
    );
  }

  private async sendCancellationNotifications(
    phobsReservation: PhobsReservation,
    internalReservationId: string
  ): Promise<void> {
    hotelNotification.warning(
      'Reservation Cancelled',
      `${phobsReservation.guest.firstName} ${phobsReservation.guest.lastName} cancelled via ${phobsReservation.channel}`,
      5
    );
  }

  // Placeholder methods that would integrate with actual database/services
  private async findExistingReservation(phobsReservation: PhobsReservation): Promise<any> {
    // TODO: Query database for existing reservation by phobsReservationId
    return null;
  }

  private async findOverlappingReservations(roomId: string, checkIn: Date, checkOut: Date): Promise<any[]> {
    // TODO: Query database for overlapping reservations
    return [];
  }

  private async calculateExpectedRate(reservation: Reservation): Promise<number> {
    // TODO: Calculate expected rate based on room type, dates, etc.
    return reservation.totalAmount;
  }

  private async checkRoomAvailability(roomId: string, checkIn: Date, checkOut: Date): Promise<boolean> {
    // TODO: Check room availability in database
    return true;
  }

  private async createOrUpdateGuestFromPhobs(phobsGuest: any): Promise<string> {
    // TODO: Create or update guest in database
    return 'temp-guest-id';
  }

  private async createInternalReservation(reservation: any, phobsReservation: PhobsReservation): Promise<string> {
    // TODO: Create reservation in database
    return 'temp-reservation-id';
  }

  private async updateInternalReservation(reservationId: string, updates: any): Promise<void> {
    // TODO: Update reservation in database
  }

  private async updateAvailabilityAfterReservationChange(reservation: Reservation, room: Room, operation: 'create' | 'cancel'): Promise<void> {
    // TODO: Update availability in inventory service
  }

  private async updateAvailabilityAfterInboundReservation(phobsReservation: PhobsReservation): Promise<void> {
    // TODO: Update availability after inbound reservation
  }

  private async updateAvailabilityAfterDateChange(existing: any, updates: any): Promise<void> {
    // TODO: Update availability when dates change
  }

  private async updateAvailabilityAfterCancellation(reservation: any): Promise<void> {
    // TODO: Make room available again after cancellation
  }

  private async handleSyncConflicts(conflicts: ConflictResolution[], reservation: PhobsReservation, operation: string): Promise<SyncResult> {
    // TODO: Implement conflict handling logic
    return {
      success: false,
      operation: 'reservation',
      recordsProcessed: 1,
      recordsSuccessful: 0,
      recordsFailed: 1,
      errors: ['Conflicts detected - manual resolution required'],
      duration: 0
    };
  }

  private async resolveInboundConflicts(conflicts: ConflictResolution[], reservation: PhobsReservation): Promise<{ success: boolean }> {
    // TODO: Implement inbound conflict resolution
    return { success: true };
  }
}