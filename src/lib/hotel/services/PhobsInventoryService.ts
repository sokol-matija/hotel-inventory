// PhobsInventoryService - Inventory synchronization service
// Handles room inventory, rate management, and availability sync with Phobs API

import { PhobsChannelManagerService } from './PhobsChannelManagerService';
import { PhobsDataMapperService } from './PhobsDataMapperService';
import hotelNotification from '../../notifications';
import {
  PhobsRoom,
  PhobsRatePlan,
  PhobsAvailability,
  SyncResult,
  AvailabilitySyncRequest,
  RatesSyncRequest,
  OTAChannel,
  DateRange,
  createPhobsRateId,
  createPhobsRoomId
} from './phobsTypes';
import { Room, SeasonalPeriod } from '../types';

export interface InventorySyncOptions {
  forceFullSync?: boolean;
  selectedChannels?: OTAChannel[];
  dateRange?: DateRange;
  dryRun?: boolean;
}

export interface InventorySyncStatus {
  lastRoomSync: Date | null;
  lastRateSync: Date | null;
  lastAvailabilitySync: Date | null;
  roomsSynced: number;
  ratesSynced: number;
  availabilitySynced: number;
  totalErrors: number;
  isActive: boolean;
}

export interface RoomInventoryData {
  room: Room;
  availability: { [date: string]: number };
  rates: { [date: string]: number };
  restrictions: { [date: string]: {
    minimumStay: number;
    stopSale: boolean;
    closeToArrival: boolean;
    closeToDeparture: boolean;
  }};
}

export interface RateCalculationOptions {
  seasonalPeriod: SeasonalPeriod;
  roomType: string;
  channel: OTAChannel;
  advanceBookingDays: number;
  lengthOfStay: number;
}

export class PhobsInventoryService {
  private static instance: PhobsInventoryService;
  private channelManagerService: PhobsChannelManagerService;
  private dataMapperService: PhobsDataMapperService;
  private syncStatus: InventorySyncStatus;
  private activeSync: boolean = false;
  
  private constructor() {
    this.channelManagerService = PhobsChannelManagerService.getInstance();
    this.dataMapperService = PhobsDataMapperService.getInstance();
    this.syncStatus = {
      lastRoomSync: null,
      lastRateSync: null,
      lastAvailabilitySync: null,
      roomsSynced: 0,
      ratesSynced: 0,
      availabilitySynced: 0,
      totalErrors: 0,
      isActive: false
    };
  }

  public static getInstance(): PhobsInventoryService {
    if (!PhobsInventoryService.instance) {
      PhobsInventoryService.instance = new PhobsInventoryService();
    }
    return PhobsInventoryService.instance;
  }

  // ===========================
  // FULL INVENTORY SYNC
  // ===========================

  /**
   * Sync all inventory data (rooms, rates, availability) to Phobs
   */
  async syncAllInventory(
    rooms: Room[],
    options: InventorySyncOptions = {}
  ): Promise<{
    roomSync: SyncResult;
    rateSync: SyncResult;
    availabilitySync: SyncResult;
    overallSuccess: boolean;
  }> {
    if (this.activeSync && !options.forceFullSync) {
      throw new Error('Inventory sync already in progress. Use forceFullSync option to override.');
    }

    this.activeSync = true;
    this.syncStatus.isActive = true;

    try {
      hotelNotification.info(
        'Starting Full Inventory Sync',
        `Syncing ${rooms.length} rooms across ${options.selectedChannels?.length || 'all'} channels...`,
        5
      );

      // Phase 1: Sync room configurations
      const roomSync = await this.syncRoomInventory(rooms, options);
      this.syncStatus.lastRoomSync = new Date();
      this.syncStatus.roomsSynced = roomSync.recordsSuccessful;

      // Phase 2: Sync rate plans
      const rateSync = await this.syncRatePlans(rooms, options);
      this.syncStatus.lastRateSync = new Date();
      this.syncStatus.ratesSynced = rateSync.recordsSuccessful;

      // Phase 3: Sync availability data
      const availabilitySync = await this.syncAvailabilityData(rooms, options);
      this.syncStatus.lastAvailabilitySync = new Date();
      this.syncStatus.availabilitySynced = availabilitySync.recordsSuccessful;

      const overallSuccess = roomSync.success && rateSync.success && availabilitySync.success;
      this.syncStatus.totalErrors = roomSync.recordsFailed + rateSync.recordsFailed + availabilitySync.recordsFailed;

      if (overallSuccess) {
        hotelNotification.success(
          'Inventory Sync Complete!',
          `Successfully synced ${this.syncStatus.roomsSynced} rooms, ${this.syncStatus.ratesSynced} rates, and ${this.syncStatus.availabilitySynced} availability records`,
          6
        );
      } else {
        hotelNotification.error(
          'Inventory Sync Issues',
          `Sync completed with ${this.syncStatus.totalErrors} errors. Check logs for details.`,
          8
        );
      }

      return {
        roomSync,
        rateSync,
        availabilitySync,
        overallSuccess
      };

    } catch (error) {
      console.error('Full inventory sync error:', error);
      hotelNotification.error(
        'Inventory Sync Failed',
        error instanceof Error ? error.message : 'Unknown error occurred',
        8
      );
      
      throw error;
    } finally {
      this.activeSync = false;
      this.syncStatus.isActive = false;
    }
  }

  // ===========================
  // ROOM INVENTORY SYNC
  // ===========================

  /**
   * Sync room configurations to Phobs
   */
  async syncRoomInventory(
    rooms: Room[],
    options: InventorySyncOptions = {}
  ): Promise<SyncResult> {
    const startTime = Date.now();
    let recordsProcessed = 0;
    let recordsSuccessful = 0;
    let recordsFailed = 0;
    const errors: string[] = [];

    try {
      hotelNotification.info(
        'Syncing Room Inventory',
        `Updating ${rooms.length} room configurations...`
      );

      for (const room of rooms) {
        recordsProcessed++;

        try {
          // Map room to Phobs format
          const mappingResult = this.dataMapperService.mapRoomToPhobs(room);
          if (!mappingResult.success) {
            throw new Error(`Mapping failed: ${mappingResult.errors.join(', ')}`);
          }

          const phobsRoom = mappingResult.data!;

          // Update room in Phobs (would call actual API)
          await this.updateRoomInPhobs(phobsRoom, options);
          
          recordsSuccessful++;

        } catch (error) {
          recordsFailed++;
          const errorMessage = `Room ${room.number}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMessage);
          console.error('Room sync error:', errorMessage);
        }
      }

      const duration = Date.now() - startTime;

      const result: SyncResult = {
        success: recordsFailed === 0,
        operation: 'availability',
        recordsProcessed,
        recordsSuccessful,
        recordsFailed,
        errors,
        duration
      };

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('Room inventory sync error:', error);
      
      return {
        success: false,
        operation: 'availability',
        recordsProcessed,
        recordsSuccessful,
        recordsFailed: recordsProcessed,
        errors: [error instanceof Error ? error.message : 'Room sync failed'],
        duration
      };
    }
  }

  // ===========================
  // RATE PLANS SYNC
  // ===========================

  /**
   * Sync rate plans to Phobs
   */
  async syncRatePlans(
    rooms: Room[],
    options: InventorySyncOptions = {}
  ): Promise<SyncResult> {
    const startTime = Date.now();
    let recordsProcessed = 0;
    let recordsSuccessful = 0;
    let recordsFailed = 0;
    const errors: string[] = [];

    try {
      hotelNotification.info(
        'Syncing Rate Plans',
        'Updating seasonal rates and channel-specific pricing...'
      );

      // Generate rate plans for each room type
      const ratePlans = this.generateRatePlans(rooms);

      for (const ratePlan of ratePlans) {
        recordsProcessed++;

        try {
          // Update rate plan in Phobs
          await this.updateRatePlanInPhobs(ratePlan, options);
          recordsSuccessful++;

        } catch (error) {
          recordsFailed++;
          const errorMessage = `Rate plan ${ratePlan.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMessage);
          console.error('Rate plan sync error:', errorMessage);
        }
      }

      const duration = Date.now() - startTime;

      const result: SyncResult = {
        success: recordsFailed === 0,
        operation: 'rates',
        recordsProcessed,
        recordsSuccessful,
        recordsFailed,
        errors,
        duration
      };

      // Update Phobs service with rate sync request
      if (recordsSuccessful > 0) {
        const ratesSyncRequest: RatesSyncRequest = {
          rateIds: ratePlans.map(rp => rp.rateId),
          roomIds: [], // TODO: Map room IDs
          dateRange: options.dateRange || this.getDefaultDateRange(),
          rates: ratePlans,
          forceUpdate: options.forceFullSync
        };

        await this.channelManagerService.syncRates(ratesSyncRequest);
      }

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('Rate plans sync error:', error);
      
      return {
        success: false,
        operation: 'rates',
        recordsProcessed,
        recordsSuccessful,
        recordsFailed: recordsProcessed,
        errors: [error instanceof Error ? error.message : 'Rate sync failed'],
        duration
      };
    }
  }

  // ===========================
  // AVAILABILITY SYNC
  // ===========================

  /**
   * Sync availability data to Phobs
   */
  async syncAvailabilityData(
    rooms: Room[],
    options: InventorySyncOptions = {}
  ): Promise<SyncResult> {
    const startTime = Date.now();
    let recordsProcessed = 0;
    let recordsSuccessful = 0;
    let recordsFailed = 0;
    const errors: string[] = [];

    try {
      hotelNotification.info(
        'Syncing Availability',
        'Updating room availability across all channels...'
      );

      const dateRange = options.dateRange || this.getDefaultDateRange();
      const availabilityData: PhobsAvailability[] = [];

      // Generate availability data for each room and date
      for (const room of rooms) {
        const roomAvailability = await this.generateRoomAvailability(room, dateRange);
        availabilityData.push(...roomAvailability);
        recordsProcessed += roomAvailability.length;
      }

      // Sync availability to Phobs in batches
      const batchSize = 100; // Process 100 availability records at a time
      for (let i = 0; i < availabilityData.length; i += batchSize) {
        const batch = availabilityData.slice(i, i + batchSize);
        
        try {
          const availabilitySyncRequest: AvailabilitySyncRequest = {
            roomIds: [], // TODO: Map room IDs
            dateRange,
            availability: batch,
            forceUpdate: options.forceFullSync
          };

          const syncResult = await this.channelManagerService.syncRoomAvailability(availabilitySyncRequest);
          recordsSuccessful += syncResult.recordsSuccessful;
          recordsFailed += syncResult.recordsFailed;
          errors.push(...syncResult.errors);

        } catch (error) {
          recordsFailed += batch.length;
          errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      const duration = Date.now() - startTime;

      return {
        success: recordsFailed === 0,
        operation: 'availability',
        recordsProcessed,
        recordsSuccessful,
        recordsFailed,
        errors,
        duration
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('Availability sync error:', error);
      
      return {
        success: false,
        operation: 'availability',
        recordsProcessed,
        recordsSuccessful,
        recordsFailed: recordsProcessed,
        errors: [error instanceof Error ? error.message : 'Availability sync failed'],
        duration
      };
    }
  }

  // ===========================
  // RATE CALCULATION
  // ===========================

  /**
   * Calculate dynamic rates based on various factors
   */
  calculateDynamicRate(
    baseRate: number,
    options: RateCalculationOptions
  ): number {
    let finalRate = baseRate;

    // Apply seasonal adjustment
    const seasonalMultipliers = {
      'A': 0.8,  // Winter - 20% discount
      'B': 1.0,  // Spring - base rate
      'C': 1.2,  // Early summer/fall - 20% premium
      'D': 1.5   // Peak summer - 50% premium
    };
    
    finalRate *= seasonalMultipliers[options.seasonalPeriod];

    // Apply channel-specific adjustments
    const channelAdjustments: { [key in OTAChannel]: number } = {
      'booking.com': 1.02,     // +2% to cover commission
      'expedia': 1.05,         // +5% to cover higher commission
      'airbnb': 1.01,          // +1% minimal adjustment
      'agoda': 1.03,           // +3% adjustment
      'hotels.com': 1.04,      // +4% adjustment
      'hostelworld': 0.98,     // -2% for budget channel
      'kayak': 1.02,           // +2% adjustment
      'trivago': 1.02,         // +2% adjustment
      'priceline': 1.05,       // +5% for higher commission
      'camping.info': 0.95,    // -5% for camping channel
      'pitchup.com': 0.95,     // -5% for camping channel
      'eurocamp': 1.10,        // +10% premium for tour operator
      'directBooking': 0.95    // -5% discount for direct bookings
    };

    finalRate *= channelAdjustments[options.channel];

    // Apply advance booking discount
    if (options.advanceBookingDays > 30) {
      finalRate *= 0.95; // 5% early bird discount
    } else if (options.advanceBookingDays < 7) {
      finalRate *= 1.1; // 10% last-minute premium
    }

    // Apply length of stay discount
    if (options.lengthOfStay >= 7) {
      finalRate *= 0.9; // 10% weekly discount
    } else if (options.lengthOfStay >= 3) {
      finalRate *= 0.95; // 5% short stay discount
    }

    // Round to 2 decimal places
    return Math.round(finalRate * 100) / 100;
  }

  // ===========================
  // STATUS AND MONITORING
  // ===========================

  /**
   * Get current inventory sync status
   */
  getSyncStatus(): InventorySyncStatus {
    return { ...this.syncStatus };
  }

  /**
   * Check if sync is currently active
   */
  isSyncActive(): boolean {
    return this.activeSync;
  }

  /**
   * Cancel active sync operation
   */
  async cancelSync(): Promise<boolean> {
    if (!this.activeSync) {
      return false;
    }

    try {
      // Set flag to stop sync
      this.activeSync = false;
      this.syncStatus.isActive = false;
      
      hotelNotification.warning(
        'Sync Cancelled',
        'Inventory synchronization has been cancelled by user',
        4
      );

      return true;
    } catch (error) {
      console.error('Error cancelling sync:', error);
      return false;
    }
  }

  // ===========================
  // PRIVATE HELPER METHODS
  // ===========================

  /**
   * Update room configuration in Phobs (placeholder for actual API call)
   */
  private async updateRoomInPhobs(
    phobsRoom: PhobsRoom,
    options: InventorySyncOptions
  ): Promise<void> {
    if (options.dryRun) {
      console.log('DRY RUN: Would update room:', phobsRoom.roomNumber);
      return;
    }

    // TODO: Implement actual Phobs API call
    // await this.channelManagerService.updateRoom(phobsRoom);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Update rate plan in Phobs (placeholder for actual API call)
   */
  private async updateRatePlanInPhobs(
    ratePlan: PhobsRatePlan,
    options: InventorySyncOptions
  ): Promise<void> {
    if (options.dryRun) {
      console.log('DRY RUN: Would update rate plan:', ratePlan.name);
      return;
    }

    // TODO: Implement actual Phobs API call
    // await this.channelManagerService.updateRatePlan(ratePlan);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  /**
   * Generate rate plans for rooms
   */
  private generateRatePlans(rooms: Room[]): PhobsRatePlan[] {
    const ratePlans: PhobsRatePlan[] = [];
    
    // Group rooms by type
    const roomsByType = rooms.reduce((acc, room) => {
      if (!acc[room.type]) acc[room.type] = [];
      acc[room.type].push(room);
      return acc;
    }, {} as { [key: string]: Room[] });

    // Create rate plan for each room type
    Object.entries(roomsByType).forEach(([roomType, roomsOfType]) => {
      const baseRoom = roomsOfType[0]; // Use first room as template
      
      const ratePlan: PhobsRatePlan = {
        rateId: createPhobsRateId(`rate_${roomType}_${Date.now()}`),
        name: `Standard Rate - ${baseRoom.nameEnglish}`,
        description: `Standard pricing for ${baseRoom.nameEnglish} rooms`,
        
        baseRate: baseRoom.seasonalRates.B, // Use spring rate as base
        currency: 'EUR',
        
        seasonalAdjustments: {
          'A': baseRoom.seasonalRates.A,
          'B': baseRoom.seasonalRates.B,
          'C': baseRoom.seasonalRates.C,
          'D': baseRoom.seasonalRates.D
        },
        
        channelRates: this.generateChannelRates(baseRoom.seasonalRates.B),
        
        minimumStay: 1,
        maximumStay: 30,
        advanceBookingDays: 365,
        
        isActive: true,
        validFrom: new Date(),
        validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        
        createdAt: new Date(),
        updatedAt: new Date()
      };

      ratePlans.push(ratePlan);
    });

    return ratePlans;
  }

  /**
   * Generate channel-specific rates
   */
  private generateChannelRates(baseRate: number): { [K in OTAChannel]?: { rate: number; isActive: boolean; commission: number } } {
    const channels: OTAChannel[] = ['booking.com', 'expedia', 'airbnb', 'agoda', 'hotels.com'];
    const channelRates: { [K in OTAChannel]?: { rate: number; isActive: boolean; commission: number } } = {};

    channels.forEach(channel => {
      const rate = this.calculateDynamicRate(baseRate, {
        seasonalPeriod: 'B', // Base season
        roomType: 'standard',
        channel,
        advanceBookingDays: 14,
        lengthOfStay: 2
      });

      channelRates[channel] = {
        rate,
        isActive: true,
        commission: this.getChannelCommissionRate(channel)
      };
    });

    return channelRates;
  }

  /**
   * Get commission rate for channel
   */
  private getChannelCommissionRate(channel: OTAChannel): number {
    const commissionRates: { [K in OTAChannel]: number } = {
      'booking.com': 0.15,
      'expedia': 0.18,
      'airbnb': 0.14,
      'agoda': 0.16,
      'hotels.com': 0.17,
      'hostelworld': 0.12,
      'kayak': 0.15,
      'trivago': 0.15,
      'priceline': 0.18,
      'camping.info': 0.10,
      'pitchup.com': 0.12,
      'eurocamp': 0.20,
      'directBooking': 0.00
    };

    return commissionRates[channel];
  }

  /**
   * Generate availability data for a room
   */
  private async generateRoomAvailability(
    room: Room,
    dateRange: DateRange
  ): Promise<PhobsAvailability[]> {
    const availability: PhobsAvailability[] = [];
    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);

    // Generate daily availability for the date range
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      // TODO: Check actual reservations for this room and date
      const isAvailable = Math.random() > 0.3; // 70% chance of availability (placeholder)
      
      const dailyAvailability: PhobsAvailability = {
        roomId: createPhobsRoomId(`phobs_room_${room.id}_${room.number}`), // Use generated Phobs room ID
        rateId: createPhobsRateId(`rate_${room.type}_${Date.now()}`), // Use generated rate ID
        date: new Date(currentDate),
        
        available: isAvailable ? 1 : 0,
        totalRooms: 1,
        rate: this.calculateDynamicRate(room.seasonalRates.B, {
          seasonalPeriod: this.getSeasonalPeriodForDate(currentDate),
          roomType: room.type,
          channel: 'directBooking',
          advanceBookingDays: Math.floor((currentDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
          lengthOfStay: 2
        }),
        currency: 'EUR',
        
        minimumStay: 1,
        maximumStay: 30,
        closeToArrival: false,
        closeToDeparture: false,
        stopSale: !isAvailable,
        
        channelAvailability: {},
        
        lastUpdated: new Date()
      };

      availability.push(dailyAvailability);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return availability;
  }

  /**
   * Get seasonal period for a specific date
   */
  private getSeasonalPeriodForDate(date: Date): SeasonalPeriod {
    const month = date.getMonth() + 1;
    
    if (month >= 12 || month <= 2) return 'A'; // Winter
    if (month >= 3 && month <= 5) return 'B'; // Spring
    if (month >= 6 && month <= 8) return 'D'; // Summer (peak)
    return 'C'; // Fall
  }

  /**
   * Get default date range for sync (next 90 days)
   */
  private getDefaultDateRange(): DateRange {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 90);

    return { startDate, endDate };
  }
}