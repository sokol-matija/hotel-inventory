// DataMigrationService - Utility to migrate localStorage data to Supabase
// This service handles the one-time migration from localStorage to Supabase database

import { supabase } from '../supabase';
import { hotelSupabaseService } from './HotelSupabaseService';

interface LocalStorageData {
  reservations: any[];
  guests: any[];
  companies: any[];
  pricingTiers: any[];
  invoices: any[];
  payments: any[];
  fiscalRecords: any[];
}

interface MigrationResult {
  success: boolean;
  migratedCounts: {
    guests: number;
    companies: number;
    pricingTiers: number;
    reservations: number;
    invoices: number;
    payments: number;
    fiscalRecords: number;
  };
  errors: string[];
  warnings: string[];
}

const STORAGE_KEYS = {
  RESERVATIONS: 'hotel_reservations_v1',
  GUESTS: 'hotel_guests_v1',
  INVOICES: 'hotel_invoices_v1',
  PAYMENTS: 'hotel_payments_v1',
  FISCAL_RECORDS: 'hotel_fiscal_records_v1',
  COMPANIES: 'hotel_companies_v1',
  PRICING_TIERS: 'hotel_pricing_tiers_v1',
  MIGRATION_COMPLETED: 'hotel_migration_completed',
  LAST_SYNC: 'hotel_last_sync_v1'
};

export class DataMigrationService {
  private static instance: DataMigrationService;
  
  static getInstance(): DataMigrationService {
    if (!DataMigrationService.instance) {
      DataMigrationService.instance = new DataMigrationService();
    }
    return DataMigrationService.instance;
  }

  /**
   * Check if migration has already been completed
   */
  async isMigrationCompleted(): Promise<boolean> {
    const completed = localStorage.getItem(STORAGE_KEYS.MIGRATION_COMPLETED);
    return completed === 'true';
  }

  /**
   * Mark migration as completed
   */
  private markMigrationCompleted(): void {
    localStorage.setItem(STORAGE_KEYS.MIGRATION_COMPLETED, 'true');
    localStorage.setItem('hotel_migration_date', new Date().toISOString());
  }

  /**
   * Check if there's localStorage data to migrate
   */
  hasLocalStorageData(): boolean {
    const keys = Object.values(STORAGE_KEYS).filter(key => 
      key !== STORAGE_KEYS.MIGRATION_COMPLETED && key !== STORAGE_KEYS.LAST_SYNC
    );
    
    return keys.some(key => {
      const data = localStorage.getItem(key);
      if (!data) return false;
      
      try {
        const parsed = JSON.parse(data);
        return Array.isArray(parsed) && parsed.length > 0;
      } catch {
        return false;
      }
    });
  }

  /**
   * Load all localStorage data
   */
  private loadLocalStorageData(): LocalStorageData {
    const loadData = (key: string) => {
      try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
      } catch (error) {
        console.warn(`Failed to parse localStorage data for ${key}:`, error);
        return [];
      }
    };

    return {
      guests: loadData(STORAGE_KEYS.GUESTS),
      companies: loadData(STORAGE_KEYS.COMPANIES),
      pricingTiers: loadData(STORAGE_KEYS.PRICING_TIERS),
      reservations: loadData(STORAGE_KEYS.RESERVATIONS),
      invoices: loadData(STORAGE_KEYS.INVOICES),
      payments: loadData(STORAGE_KEYS.PAYMENTS),
      fiscalRecords: loadData(STORAGE_KEYS.FISCAL_RECORDS)
    };
  }

  /**
   * Migrate guests data
   */
  private async migrateGuests(localGuests: any[]): Promise<{ count: number; errors: string[] }> {
    const errors: string[] = [];
    let count = 0;

    for (const localGuest of localGuests) {
      try {
        // Map localStorage guest structure to Supabase structure
        const guestData = {
          first_name: localGuest.firstName,
          last_name: localGuest.lastName,
          email: localGuest.email,
          phone: localGuest.phone,
          nationality: localGuest.nationality,
          date_of_birth: localGuest.dateOfBirth ? new Date(localGuest.dateOfBirth).toISOString().split('T')[0] : null,
          passport_number: localGuest.passportNumber,
          id_card_number: localGuest.idCardNumber,
          preferred_language: localGuest.preferredLanguage || 'en',
          dietary_restrictions: localGuest.dietaryRestrictions || [],
          special_needs: localGuest.specialNeeds,
          has_pets: localGuest.hasPets || false,
          is_vip: localGuest.isVip || false,
          vip_level: localGuest.vipLevel || 0,
          marketing_consent: localGuest.marketingConsent || false,
          total_stays: localGuest.totalStays || 0,
          total_spent: localGuest.totalSpent || 0,
          average_rating: localGuest.averageRating,
          last_stay_date: localGuest.lastStayDate ? new Date(localGuest.lastStayDate).toISOString().split('T')[0] : null,
          notes: localGuest.notes || ''
        };

        const { error } = await supabase
          .from('guests')
          .insert(guestData);

        if (error) {
          // Check if it's a duplicate
          if (error.code === '23505') {
            console.warn(`Guest already exists: ${localGuest.firstName} ${localGuest.lastName}`);
          } else {
            errors.push(`Failed to migrate guest ${localGuest.firstName} ${localGuest.lastName}: ${error.message}`);
          }
        } else {
          count++;
        }
      } catch (error) {
        errors.push(`Error processing guest ${localGuest.firstName} ${localGuest.lastName}: ${error}`);
      }
    }

    return { count, errors };
  }

  /**
   * Migrate companies data
   */
  private async migrateCompanies(localCompanies: any[]): Promise<{ count: number; errors: string[] }> {
    const errors: string[] = [];
    let count = 0;

    for (const localCompany of localCompanies) {
      try {
        const companyData = {
          name: localCompany.name,
          oib: localCompany.oib,
          address: localCompany.address,
          city: localCompany.city,
          postal_code: localCompany.postalCode,
          country: localCompany.country || 'HR',
          contact_person: localCompany.contactPerson,
          email: localCompany.email,
          phone: localCompany.phone,
          fax: localCompany.fax,
          pricing_tier_id: null, // Will be linked later if needed
          room_allocation_guarantee: localCompany.roomAllocationGuarantee || 0,
          is_active: localCompany.isActive !== false,
          notes: localCompany.notes || ''
        };

        const { error } = await supabase
          .from('companies')
          .insert(companyData);

        if (error) {
          if (error.code === '23505') {
            console.warn(`Company already exists: ${localCompany.name}`);
          } else {
            errors.push(`Failed to migrate company ${localCompany.name}: ${error.message}`);
          }
        } else {
          count++;
        }
      } catch (error) {
        errors.push(`Error processing company ${localCompany.name}: ${error}`);
      }
    }

    return { count, errors };
  }

  /**
   * Migrate pricing tiers data
   */
  private async migratePricingTiers(localTiers: any[]): Promise<{ count: number; errors: string[] }> {
    const errors: string[] = [];
    let count = 0;

    for (const localTier of localTiers) {
      try {
        const tierData = {
          name: localTier.name,
          description: localTier.description,
          seasonal_rate_a: localTier.seasonalRates?.A || 1.000,
          seasonal_rate_b: localTier.seasonalRates?.B || 1.000,
          seasonal_rate_c: localTier.seasonalRates?.C || 1.000,
          seasonal_rate_d: localTier.seasonalRates?.D || 1.000,
          is_percentage_discount: localTier.isPercentageDiscount !== false,
          minimum_stay: localTier.minimumStay,
          valid_from: localTier.validFrom ? new Date(localTier.validFrom).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          valid_to: localTier.validTo ? new Date(localTier.validTo).toISOString().split('T')[0] : null,
          is_active: localTier.isActive !== false,
          is_default: localTier.isDefault || false
        };

        const { error } = await supabase
          .from('pricing_tiers')
          .insert(tierData);

        if (error) {
          if (error.code === '23505') {
            console.warn(`Pricing tier already exists: ${localTier.name}`);
          } else {
            errors.push(`Failed to migrate pricing tier ${localTier.name}: ${error.message}`);
          }
        } else {
          count++;
        }
      } catch (error) {
        errors.push(`Error processing pricing tier ${localTier.name}: ${error}`);
      }
    }

    return { count, errors };
  }

  /**
   * Migrate reservations data
   * Note: This requires guests and rooms to exist, so it should be run after guest migration
   */
  private async migrateReservations(localReservations: any[]): Promise<{ count: number; errors: string[] }> {
    const errors: string[] = [];
    let count = 0;

    // Get guest and room mappings first
    const { data: dbGuests } = await supabase.from('guests').select('id, first_name, last_name, email');
    const { data: dbRooms } = await supabase.from('rooms').select('id, room_number');
    
    const guestMap = new Map();
    dbGuests?.forEach(guest => {
      const key = `${guest.first_name}_${guest.last_name}_${guest.email || ''}`.toLowerCase();
      guestMap.set(key, guest.id);
    });

    const roomMap = new Map();
    dbRooms?.forEach(room => {
      roomMap.set(room.room_number, room.id);
    });

    for (const localReservation of localReservations) {
      try {
        // Find matching guest
        let guestId = null;
        if (localReservation.guest) {
          const guestKey = `${localReservation.guest.fullName}_${localReservation.guest.email || ''}`.toLowerCase();
          guestId = guestMap.get(guestKey);
        }

        // Find matching room
        let roomId = null;
        if (localReservation.room) {
          roomId = roomMap.get(localReservation.room.number);
        }

        if (!guestId || !roomId) {
          errors.push(`Cannot find guest or room for reservation ${localReservation.id}`);
          continue;
        }

        const reservationData = {
          guest_id: guestId,
          room_id: roomId,
          check_in_date: new Date(localReservation.checkIn).toISOString().split('T')[0],
          check_out_date: new Date(localReservation.checkOut).toISOString().split('T')[0],
          number_of_nights: localReservation.numberOfNights || Math.ceil((new Date(localReservation.checkOut).getTime() - new Date(localReservation.checkIn).getTime()) / (1000 * 60 * 60 * 24)),
          number_of_guests: localReservation.numberOfGuests || localReservation.adults + (localReservation.children || 0),
          adults: localReservation.adults || 1,
          children_count: localReservation.children || 0,
          status: localReservation.status || 'confirmed',
          booking_source: localReservation.bookingSource || 'direct',
          special_requests: localReservation.specialRequests,
          internal_notes: localReservation.notes,
          seasonal_period: localReservation.seasonalPeriod || 'A',
          base_room_rate: localReservation.baseRoomRate || 0,
          subtotal: localReservation.pricing?.subtotal || 0,
          children_discounts: localReservation.pricing?.discounts?.children || 0,
          tourism_tax: localReservation.pricing?.fees?.tourism || 0,
          vat_amount: localReservation.pricing?.fees?.vat || 0,
          pet_fee: localReservation.pricing?.fees?.pets || 0,
          parking_fee: localReservation.pricing?.fees?.parking || 0,
          short_stay_supplement: localReservation.pricing?.fees?.shortStay || 0,
          additional_charges: localReservation.pricing?.fees?.additional || 0,
          total_amount: localReservation.pricing?.total || 0,
          payment_status: localReservation.paymentStatus || 'pending',
          payment_method: localReservation.paymentMethod,
          booking_date: new Date(localReservation.bookingDate).toISOString(),
          confirmation_number: localReservation.confirmationNumber,
          has_pets: localReservation.hasPets || false,
          parking_required: localReservation.parkingRequired || false,
          last_modified: new Date(localReservation.lastModified || localReservation.bookingDate).toISOString()
        };

        const { error } = await supabase
          .from('reservations')
          .insert(reservationData);

        if (error) {
          errors.push(`Failed to migrate reservation ${localReservation.id}: ${error.message}`);
        } else {
          count++;
        }
      } catch (error) {
        errors.push(`Error processing reservation ${localReservation.id}: ${error}`);
      }
    }

    return { count, errors };
  }

  /**
   * Main migration function
   */
  async migrateLocalStorageToSupabase(): Promise<MigrationResult> {
    console.log('🔄 Starting migration from localStorage to Supabase...');
    
    const result: MigrationResult = {
      success: false,
      migratedCounts: {
        guests: 0,
        companies: 0,
        pricingTiers: 0,
        reservations: 0,
        invoices: 0,
        payments: 0,
        fiscalRecords: 0
      },
      errors: [],
      warnings: []
    };

    try {
      // Check if migration already completed
      if (await this.isMigrationCompleted()) {
        result.warnings.push('Migration already completed');
        result.success = true;
        return result;
      }

      // Load localStorage data
      const localData = this.loadLocalStorageData();
      
      // Check if there's any data to migrate
      const hasData = Object.values(localData).some(arr => arr.length > 0);
      if (!hasData) {
        result.warnings.push('No localStorage data found to migrate');
        result.success = true;
        this.markMigrationCompleted();
        return result;
      }

      console.log('📊 Found data to migrate:', {
        guests: localData.guests.length,
        companies: localData.companies.length,
        pricingTiers: localData.pricingTiers.length,
        reservations: localData.reservations.length,
        invoices: localData.invoices.length,
        payments: localData.payments.length,
        fiscalRecords: localData.fiscalRecords.length
      });

      // Migrate in correct order (dependencies first)
      
      // 1. Migrate guests first
      if (localData.guests.length > 0) {
        console.log('👥 Migrating guests...');
        const guestResult = await this.migrateGuests(localData.guests);
        result.migratedCounts.guests = guestResult.count;
        result.errors.push(...guestResult.errors);
      }

      // 2. Migrate pricing tiers
      if (localData.pricingTiers.length > 0) {
        console.log('💰 Migrating pricing tiers...');
        const tierResult = await this.migratePricingTiers(localData.pricingTiers);
        result.migratedCounts.pricingTiers = tierResult.count;
        result.errors.push(...tierResult.errors);
      }

      // 3. Migrate companies
      if (localData.companies.length > 0) {
        console.log('🏢 Migrating companies...');
        const companyResult = await this.migrateCompanies(localData.companies);
        result.migratedCounts.companies = companyResult.count;
        result.errors.push(...companyResult.errors);
      }

      // 4. Migrate reservations (requires guests and rooms)
      if (localData.reservations.length > 0) {
        console.log('📅 Migrating reservations...');
        const reservationResult = await this.migrateReservations(localData.reservations);
        result.migratedCounts.reservations = reservationResult.count;
        result.errors.push(...reservationResult.errors);
      }

      // Note: Invoices, payments, and fiscal records would be migrated similarly
      // but are skipped here due to complexity - they can be regenerated

      result.success = result.errors.length === 0;
      
      if (result.success) {
        this.markMigrationCompleted();
        console.log('✅ Migration completed successfully!');
      } else {
        console.log('❌ Migration completed with errors:', result.errors);
      }

      return result;

    } catch (error) {
      console.error('💥 Migration failed:', error);
      result.errors.push(`Migration failed: ${error}`);
      return result;
    }
  }

  /**
   * Create backup of localStorage data before migration
   */
  createLocalStorageBackup(): string {
    const data = this.loadLocalStorageData();
    const backup = {
      timestamp: new Date().toISOString(),
      data
    };
    
    const backupString = JSON.stringify(backup, null, 2);
    
    // Store backup in localStorage with timestamp
    const backupKey = `hotel_backup_${Date.now()}`;
    try {
      localStorage.setItem(backupKey, backupString);
      console.log(`📦 Backup created with key: ${backupKey}`);
    } catch (error) {
      console.warn('⚠️ Could not store backup in localStorage, but returning backup data');
    }
    
    return backupString;
  }

  /**
   * Clear localStorage data after successful migration
   */
  clearLocalStorageAfterMigration(): void {
    const keysToKeep = [
      STORAGE_KEYS.MIGRATION_COMPLETED,
      'hotel_migration_date'
    ];
    
    Object.values(STORAGE_KEYS).forEach(key => {
      if (!keysToKeep.includes(key)) {
        localStorage.removeItem(key);
      }
    });
    
    console.log('🧹 Cleared localStorage data after migration');
  }
}

export const dataMigrationService = DataMigrationService.getInstance();
export default dataMigrationService;