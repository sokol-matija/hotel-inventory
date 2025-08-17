import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Reservation, 
  ReservationStatus, 
  Guest, 
  Room, 
  Invoice, 
  Payment, 
  FiscalRecord, 
  RevenueAnalytics,
  InvoiceStatus,
  PaymentMethod,
  PaymentStatus,
  Company,
  PricingTier
} from '../types';
import { hotelDataService } from '../services/HotelDataService';
import { realtimeService } from '../services/RealtimeService';
import { databasePricingService } from '../services/DatabasePricingService';
import { supabase, Database } from '../../supabase';
import { logger, logUserActivity, logBusinessOperation, trackError } from '../../logging/LoggingService';
import { performanceMonitor } from '../../monitoring/PerformanceMonitoringService';
import { auditTrail } from '../../audit/AuditTrailService';

interface HotelContextType {
  // Data state
  reservations: Reservation[];
  guests: Guest[];
  rooms: Room[];
  invoices: Invoice[];
  payments: Payment[];
  fiscalRecords: FiscalRecord[];
  companies: Company[];
  pricingTiers: PricingTier[];
  
  // Performance optimizations
  roomsByFloor: Record<number, Room[]>;
  roomLookup: Record<string, Room>;
  
  // Loading states
  isLoading: boolean;
  isUpdating: boolean;
  lastUpdated: Date;
  error: string | null;
  
  // Actions - Reservations
  updateReservationStatus: (id: string, newStatus: ReservationStatus) => Promise<void>;
  updateReservationNotes: (id: string, notes: string) => Promise<void>;
  updateReservation: (id: string, updates: Partial<Reservation>) => Promise<void>;
  createReservation: (reservationData: Omit<Reservation, 'id' | 'bookingDate' | 'lastModified'>) => Promise<void>;
  deleteReservation: (id: string) => Promise<void>;
  
  // Actions - Guests
  createGuest: (guest: Omit<Guest, 'id' | 'totalStays'>) => Promise<void>;
  updateGuest: (id: string, updates: Partial<Guest>) => Promise<void>;
  findGuestsByName: (query: string) => Guest[];
  getGuestStayHistory: (guestId: string) => Reservation[];
  
  // Actions - Companies (Corporate Billing)
  createCompany: (company: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateCompany: (id: string, updates: Partial<Company>) => Promise<void>;
  deleteCompany: (id: string) => Promise<void>;
  findCompaniesByName: (query: string) => Company[];
  findCompanyByOIB: (oib: string) => Company | undefined;
  validateOIB: (oib: string) => boolean;
  
  // Actions - Pricing Tiers
  createPricingTier: (pricingTier: Omit<PricingTier, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updatePricingTier: (id: string, updates: Partial<PricingTier>) => Promise<void>;
  deletePricingTier: (id: string) => Promise<void>;
  findPricingTiersByName: (query: string) => PricingTier[];
  getActivePricingTiers: () => PricingTier[];
  getDefaultPricingTier: () => PricingTier | undefined;
  
  // Financial actions - Invoices
  generateInvoice: (reservationId: string) => Promise<Invoice>;
  updateInvoiceStatus: (invoiceId: string, status: InvoiceStatus) => Promise<void>;
  getInvoicesByGuest: (guestId: string) => Invoice[];
  getInvoicesByDateRange: (start: Date, end: Date) => Invoice[];
  getOverdueInvoices: () => Invoice[];
  
  // Financial actions - Payments
  addPayment: (payment: Omit<Payment, 'id' | 'createdAt'>) => Promise<void>;
  updatePaymentStatus: (paymentId: string, status: PaymentStatus) => Promise<void>;
  getPaymentsByInvoice: (invoiceId: string) => Payment[];
  getPaymentsByMethod: (method: PaymentMethod) => Payment[];
  
  // Revenue analytics
  calculateRevenueAnalytics: (
    period: 'daily' | 'weekly' | 'monthly' | 'yearly',
    startDate: Date,
    endDate: Date
  ) => RevenueAnalytics;
  
  // Financial utilities
  getTotalRevenue: (startDate: Date, endDate: Date) => number;
  getUnpaidInvoices: () => Invoice[];
  getPaymentSummary: (startDate: Date, endDate: Date) => {
    total: number;
    cash: number;
    card: number;
    bank: number;
    online: number;
  };
  
  // Sync utilities
  refreshData: () => Promise<void>;
}

const HotelContext = createContext<HotelContextType | undefined>(undefined);

export function SupabaseHotelProvider({ children }: { children: React.ReactNode }) {
  // State management
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [fiscalRecords, setFiscalRecords] = useState<FiscalRecord[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [error, setError] = useState<string | null>(null);
  
  // Performance optimization: Memoized room data grouping
  const roomsByFloor = useMemo(() => {
    const grouped: Record<number, Room[]> = {};
    rooms.forEach(room => {
      if (!grouped[room.floor]) grouped[room.floor] = [];
      grouped[room.floor].push(room);
    });
    return grouped;
  }, [rooms]);
  
  // Performance optimization: Memoized room lookup
  const roomLookup = useMemo(() => {
    const lookup: Record<string, Room> = {};
    rooms.forEach(room => {
      lookup[room.id] = room;
    });
    return lookup;
  }, [rooms]);

  // Database mapping functions for financial entities
  const mapCompanyFromDB = useCallback((companyRow: Database['public']['Tables']['companies']['Row']): Company => {
    return {
      id: companyRow.id.toString(),
      name: companyRow.name,
      oib: companyRow.oib,
      address: {
        street: companyRow.address,
        city: companyRow.city,
        postalCode: companyRow.postal_code,
        country: companyRow.country || 'Croatia'
      },
      contactPerson: companyRow.contact_person,
      email: companyRow.email,
      phone: companyRow.phone || '',
      fax: companyRow.fax || undefined,
      vatNumber: undefined, // Not in current schema
      businessRegistrationNumber: undefined, // Not in current schema
      discountPercentage: undefined, // Not in current schema
      paymentTerms: undefined, // Not in current schema
      isActive: companyRow.is_active || true,
      notes: companyRow.notes || '',
      createdAt: new Date(companyRow.created_at || ''),
      updatedAt: new Date(companyRow.updated_at || '')
    };
  }, []);

  const mapPricingTierFromDB = useCallback((tierRow: Database['public']['Tables']['pricing_tiers']['Row']): PricingTier => {
    return {
      id: tierRow.id.toString(),
      name: tierRow.name,
      description: tierRow.description || '',
      discountPercentage: (tierRow.seasonal_rate_a || 0) * 100, // Convert from decimal to percentage
      isDefault: tierRow.is_default || false,
      isActive: tierRow.is_active || true,
      seasonalRates: {
        A: tierRow.seasonal_rate_a || 0,
        B: tierRow.seasonal_rate_b || 0,
        C: tierRow.seasonal_rate_c || 0,
        D: tierRow.seasonal_rate_d || 0
      },
      roomTypeMultipliers: {}, // Not in current schema, default to empty
      minimumStayRequirement: tierRow.minimum_stay || undefined,
      advanceBookingDiscount: undefined, // Not in current schema
      lastMinuteDiscount: undefined, // Not in current schema
      validFrom: tierRow.valid_from ? new Date(tierRow.valid_from) : undefined,
      validTo: tierRow.valid_to ? new Date(tierRow.valid_to) : undefined,
      applicableServices: [], // Not in current schema, default to empty array
      createdAt: new Date(tierRow.created_at || ''),
      updatedAt: new Date(tierRow.updated_at || '')
    };
  }, []);

  // Load companies from database
  const loadCompanies = useCallback(async (): Promise<Company[]> => {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data?.map(mapCompanyFromDB) || [];
  }, [mapCompanyFromDB]);

  // Load pricing tiers from database
  const loadPricingTiers = useCallback(async (): Promise<PricingTier[]> => {
    const { data, error } = await supabase
      .from('pricing_tiers')
      .select('*')
      .eq('is_active', true)
      .order('is_default', { ascending: false }); // Show default first

    if (error) throw error;
    return data?.map(mapPricingTierFromDB) || [];
  }, [mapPricingTierFromDB]);

  // Load all data from database with comprehensive error handling
  const loadAllData = useCallback(async () => {
    const operationStart = performance.now();
    setIsLoading(true);
    setError(null);
    
    try {
      logger.info('HotelContext', 'Starting hotel data load from Supabase');
      logUserActivity('data_load_started');
      
      // Load all data in parallel with individual error handling
      const results = await performanceMonitor.measureAsync(
        'load_all_hotel_data',
        async () => {
          return Promise.allSettled([
            performanceMonitor.measureAsync('load_rooms', () => hotelDataService.getRooms()),
            performanceMonitor.measureAsync('load_guests', () => hotelDataService.getGuests()),
            performanceMonitor.measureAsync('load_reservations', () => hotelDataService.getReservations()),
            performanceMonitor.measureAsync('load_companies', () => loadCompanies()),
            performanceMonitor.measureAsync('load_pricing_tiers', () => loadPricingTiers())
          ]);
        },
        'database_operation'
      );
      
      // Process rooms data
      if (results[0].status === 'fulfilled') {
        setRooms(results[0].value);
        logger.info('HotelContext', `Loaded ${results[0].value.length} rooms`);
        performanceMonitor.recordDatabaseOperation('load_rooms', 'rooms', performance.now() - operationStart, results[0].value.length, 'SELECT');
      } else {
        const error = results[0].reason;
        logger.error('HotelContext', 'Failed to load rooms', error);
        trackError(error instanceof Error ? error : new Error('Failed to load rooms'), { operation: 'load_rooms' });
        setError('Failed to load room data');
      }
      
      // Process guests data
      if (results[1].status === 'fulfilled') {
        setGuests(results[1].value);
        logger.info('HotelContext', `Loaded ${results[1].value.length} guests`);
        performanceMonitor.recordDatabaseOperation('load_guests', 'guests', performance.now() - operationStart, results[1].value.length, 'SELECT');
      } else {
        const error = results[1].reason;
        logger.warn('HotelContext', 'Failed to load guests - continuing with empty array', error);
        trackError(error instanceof Error ? error : new Error('Failed to load guests'), { operation: 'load_guests', critical: false });
      }
      
      // Process reservations data
      if (results[2].status === 'fulfilled') {
        setReservations(results[2].value);
        logger.info('HotelContext', `Loaded ${results[2].value.length} reservations`);
        performanceMonitor.recordDatabaseOperation('load_reservations', 'reservations', performance.now() - operationStart, results[2].value.length, 'SELECT');
      } else {
        const error = results[2].reason;
        logger.warn('HotelContext', 'Failed to load reservations - continuing with empty array', error);
        trackError(error instanceof Error ? error : new Error('Failed to load reservations'), { operation: 'load_reservations', critical: false });
      }
      
      // Process companies data
      if (results[3].status === 'fulfilled') {
        setCompanies(results[3].value);
        logger.info('HotelContext', `Loaded ${results[3].value.length} companies`);
        performanceMonitor.recordDatabaseOperation('load_companies', 'companies', performance.now() - operationStart, results[3].value.length, 'SELECT');
      } else {
        const error = results[3].reason;
        logger.warn('HotelContext', 'Failed to load companies - continuing with empty array', error);
        trackError(error instanceof Error ? error : new Error('Failed to load companies'), { operation: 'load_companies', critical: false });
        setCompanies([]);
      }
      
      // Process pricing tiers data
      if (results[4].status === 'fulfilled') {
        setPricingTiers(results[4].value);
        logger.info('HotelContext', `Loaded ${results[4].value.length} pricing tiers`);
        performanceMonitor.recordDatabaseOperation('load_pricing_tiers', 'pricing_tiers', performance.now() - operationStart, results[4].value.length, 'SELECT');
      } else {
        const error = results[4].reason;
        logger.warn('HotelContext', 'Failed to load pricing tiers - continuing with empty array', error);
        trackError(error instanceof Error ? error : new Error('Failed to load pricing tiers'), { operation: 'load_pricing_tiers', critical: false });
        setPricingTiers([]);
      }
      
      // TODO: Load remaining financial data (invoices, payments, fiscal records)
      setInvoices([]);
      setPayments([]);
      setFiscalRecords([]);
      
      setLastUpdated(new Date());
      
      // Log summary of successfully loaded data
      const roomCount = results[0].status === 'fulfilled' ? results[0].value.length : 0;
      const guestCount = results[1].status === 'fulfilled' ? results[1].value.length : 0;
      const reservationCount = results[2].status === 'fulfilled' ? results[2].value.length : 0;
      const companyCount = results[3].status === 'fulfilled' ? results[3].value.length : 0;
      const pricingTierCount = results[4].status === 'fulfilled' ? results[4].value.length : 0;
      const totalDuration = performance.now() - operationStart;
      
      logger.info('HotelContext', 'Hotel data loading completed', {
        roomCount,
        guestCount,
        reservationCount,
        companyCount,
        pricingTierCount,
        totalDuration: Math.round(totalDuration)
      });
      
      logUserActivity('data_load_completed', {
        roomCount,
        guestCount,
        reservationCount,
        companyCount,
        pricingTierCount,
        duration: Math.round(totalDuration)
      });
      
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load data');
      logger.error('HotelContext', 'Failed to load hotel data', error);
      trackError(error, { operation: 'loadAllData', critical: true });
      setError(error.message);
    } finally {
      setIsLoading(false);
      performanceMonitor.recordSystemMetrics();
    }
  }, []);

  // Initialize data on mount
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Setup real-time subscriptions
  useEffect(() => {
    logger.info('HotelContext', 'Setting up real-time subscriptions');
    
    const unsubscribe = realtimeService.subscribeToHotelTimeline(
      // Reservation changes
      (payload) => {
        logger.debug('RealtimeService', `Reservation ${payload.eventType}`, {
          reservationId: payload.new?.id || payload.old?.id,
          eventType: payload.eventType
        });
        
        if (payload.eventType === 'INSERT' && payload.new) {
          setReservations(prev => [...prev, payload.new as Reservation]);
          auditTrail.logReservationCreate(payload.new.id, payload.new);
        } else if (payload.eventType === 'UPDATE' && payload.new) {
          setReservations(prev => 
            prev.map(r => r.id === payload.new!.id ? payload.new as Reservation : r)
          );
          auditTrail.logReservationUpdate(payload.new.id, payload.old, payload.new);
        } else if (payload.eventType === 'DELETE' && payload.old) {
          setReservations(prev => 
            prev.filter(r => r.id !== payload.old!.id)
          );
          auditTrail.logReservationDelete(payload.old.id, payload.old);
        }
        
        setLastUpdated(new Date());
        performanceMonitor.recordUserInteraction('realtime_reservation_update', 'HotelContext', 0, true);
      },
      // Room changes
      (payload) => {
        logger.debug('RealtimeService', `Room ${payload.eventType}`, {
          roomId: payload.new?.id || payload.old?.id,
          eventType: payload.eventType
        });
        
        if (payload.eventType === 'UPDATE' && payload.new) {
          setRooms(prev => 
            prev.map(r => r.id === payload.new!.id ? payload.new as Room : r)
          );
        }
        
        setLastUpdated(new Date());
        performanceMonitor.recordUserInteraction('realtime_room_update', 'HotelContext', 0, true);
      },
      // Guest changes
      (payload) => {
        logger.debug('RealtimeService', `Guest ${payload.eventType}`, {
          guestId: payload.new?.id || payload.old?.id,
          eventType: payload.eventType
        });
        
        if (payload.eventType === 'INSERT' && payload.new) {
          setGuests(prev => [...prev, payload.new as Guest]);
        } else if (payload.eventType === 'UPDATE' && payload.new) {
          setGuests(prev => 
            prev.map(g => g.id === payload.new!.id ? payload.new as Guest : g)
          );
        } else if (payload.eventType === 'DELETE' && payload.old) {
          setGuests(prev => 
            prev.filter(g => g.id !== payload.old!.id)
          );
        }
        
        setLastUpdated(new Date());
        performanceMonitor.recordUserInteraction('realtime_guest_update', 'HotelContext', 0, true);
      }
    );

    // Cleanup subscriptions on unmount
    return () => {
      logger.info('HotelContext', 'Cleaning up real-time subscriptions');
      unsubscribe();
    };
  }, []);

  // Reservation actions
  const updateReservationStatus = useCallback(async (id: string, newStatus: ReservationStatus) => {
    const operationStart = performance.now();
    setIsUpdating(true);
    
    try {
      logger.info('HotelContext', 'Updating reservation status', { reservationId: id, newStatus });
      
      const oldReservation = reservations.find(r => r.id === id);
      await performanceMonitor.measureAsync(
        'update_reservation_status',
        () => hotelDataService.updateReservation(id, { status: newStatus }),
        'database_operation'
      );
      
      logBusinessOperation('update', 'reservation', id, { oldStatus: oldReservation?.status, newStatus });
      auditTrail.logAuditEvent('update', 'reservation', id, 
        { status: oldReservation?.status }, 
        { status: newStatus }, 
        'success'
      );
      
      const duration = performance.now() - operationStart;
      performanceMonitor.recordDatabaseOperation('update_reservation_status', 'reservations', duration, 1, 'UPDATE');
      
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update reservation status');
      logger.error('HotelContext', 'Failed to update reservation status', { reservationId: id, newStatus, error: error.message });
      trackError(error, { operation: 'updateReservationStatus', reservationId: id, newStatus });
      
      auditTrail.logAuditEvent('update', 'reservation', id, undefined, { status: newStatus }, 'failure', error.message);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  }, [reservations]);

  const updateReservationNotes = useCallback(async (id: string, notes: string) => {
    setIsUpdating(true);
    try {
      await hotelDataService.updateReservation(id, { specialRequests: notes });
      // Real-time subscription will handle the UI update
    } catch (err) {
      console.error('Failed to update reservation notes:', err);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  const updateReservation = useCallback(async (id: string, updates: Partial<Reservation>) => {
    setIsUpdating(true);
    try {
      await hotelDataService.updateReservation(id, updates);
      // Real-time subscription will handle the UI update
    } catch (err) {
      console.error('Failed to update reservation:', err);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  const createReservation = useCallback(async (reservationData: any) => {
    const operationStart = performance.now();
    setIsUpdating(true);
    
    try {
      logger.info('HotelContext', 'Creating new reservation', { 
        roomId: reservationData.roomId,
        isNewGuest: reservationData.isNewGuest,
        checkIn: reservationData.checkIn,
        checkOut: reservationData.checkOut
      });
      
      let guestId = reservationData.guestId;
      
      // If new guest, create guest first
      if (reservationData.isNewGuest && reservationData.guest) {
        logger.info('HotelContext', 'Creating new guest for reservation', {
          firstName: reservationData.guest.firstName,
          lastName: reservationData.guest.lastName
        });
        
        const newGuest = await performanceMonitor.measureAsync(
          'create_guest_for_reservation',
          () => hotelDataService.createGuest({
            firstName: reservationData.guest.firstName,
            lastName: reservationData.guest.lastName || '',
            fullName: `${reservationData.guest.firstName} ${reservationData.guest.lastName || ''}`.trim(),
            email: reservationData.guest.email,
            phone: reservationData.guest.phone,
            nationality: reservationData.guest.nationality,
            preferredLanguage: reservationData.guest.preferredLanguage || 'en',
            dietaryRestrictions: [],
            hasPets: reservationData.guest.hasPets || false,
            vipLevel: 0,
            dateOfBirth: undefined,
            children: [],
            emergencyContactName: undefined,
            emergencyContactPhone: undefined,
            createdAt: new Date(),
            updatedAt: new Date()
          }),
          'database_operation'
        );
        
        guestId = newGuest.id;
        logger.info('HotelContext', 'New guest created', { guestId });
        logBusinessOperation('create', 'guest', guestId, reservationData.guest);
      }
      
      // Create reservation with proper guest ID
      const finalReservationData = {
        ...reservationData,
        guestId: guestId
      };
      
      const newReservation = await performanceMonitor.measureAsync(
        'create_reservation',
        () => hotelDataService.createReservation(finalReservationData),
        'database_operation'
      );
      
      logBusinessOperation('create', 'reservation', newReservation?.id || 'unknown', finalReservationData);
      auditTrail.logReservationCreate(newReservation?.id || 'unknown', finalReservationData);
      
      const duration = performance.now() - operationStart;
      performanceMonitor.recordDatabaseOperation('create_reservation', 'reservations', duration, 1, 'INSERT');
      performanceMonitor.recordUserInteraction('create_reservation', 'HotelContext', duration, true);
      
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create reservation');
      logger.error('HotelContext', 'Failed to create reservation', { 
        error: error.message,
        reservationData: {
          roomId: reservationData.roomId,
          isNewGuest: reservationData.isNewGuest
        }
      });
      trackError(error, { operation: 'createReservation', reservationData });
      
      auditTrail.logAuditEvent('create', 'reservation', 'unknown', undefined, reservationData, 'failure', error.message);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  const deleteReservation = useCallback(async (id: string) => {
    setIsUpdating(true);
    try {
      await hotelDataService.deleteReservation(id);
      // Real-time subscription will handle the UI update
    } catch (err) {
      console.error('Failed to delete reservation:', err);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  // Guest actions
  const createGuest = useCallback(async (guest: Omit<Guest, 'id' | 'totalStays'>) => {
    setIsUpdating(true);
    try {
      await hotelDataService.createGuest(guest);
      // Real-time subscription will handle the UI update
    } catch (err) {
      console.error('Failed to create guest:', err);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  const updateGuest = useCallback(async (id: string, updates: Partial<Guest>) => {
    setIsUpdating(true);
    try {
      await hotelDataService.updateGuest(id, updates);
      // Real-time subscription will handle the UI update
    } catch (err) {
      console.error('Failed to update guest:', err);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  // Search and utility functions
  const findGuestsByName = useCallback((query: string): Guest[] => {
    return guests.filter(guest => 
      guest.fullName.toLowerCase().includes(query.toLowerCase())
    );
  }, [guests]);

  const getGuestStayHistory = useCallback((guestId: string): Reservation[] => {
    return reservations
      .filter(reservation => reservation.guestId === guestId)
      .sort((a, b) => b.checkIn.getTime() - a.checkIn.getTime());
  }, [reservations]);

  // Refresh data manually
  const refreshData = useCallback(async () => {
    await loadAllData();
  }, [loadAllData]);

  // Financial implementations - Company management
  const createCompany = useCallback(async (company: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>) => {
    const operationStart = performance.now();
    setIsUpdating(true);
    
    try {
      logger.info('HotelContext', 'Creating new company', { 
        name: company.name, 
        oib: company.oib 
      });
      
      const result = await performanceMonitor.measureAsync(
        'create_company',
        async () => {
          const { data, error } = await supabase
            .from('companies')
            .insert({
              name: company.name,
              oib: company.oib,
              address: company.address.street,
              city: company.address.city,
              postal_code: company.address.postalCode,
              country: company.address.country || 'Croatia',
              contact_person: company.contactPerson,
              email: company.email,
              phone: company.phone,
              fax: company.fax,
              is_active: true
            })
            .select()
            .single();

          if (error) throw error;
          return data;
        },
        'database_operation'
      );
      
      // Update local state
      const newCompany = mapCompanyFromDB(result);
      setCompanies(prev => [...prev, newCompany]);
      
      const duration = performance.now() - operationStart;
      performanceMonitor.recordDatabaseOperation('create_company', 'companies', duration, 1, 'INSERT');
      
      logBusinessOperation('create', 'company', newCompany.id, company);
      auditTrail.logAuditEvent('create', 'company', newCompany.id, undefined, company, 'success');
      
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create company');
      logger.error('HotelContext', 'Failed to create company', { 
        error: error.message,
        companyName: company.name,
        oib: company.oib
      });
      trackError(error, { operation: 'createCompany', company });
      
      auditTrail.logAuditEvent('create', 'company', 'unknown', undefined, company, 'failure', error.message);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  }, [mapCompanyFromDB]);

  const updateCompany = useCallback(async (id: string, updates: Partial<Company>) => {
    setIsUpdating(true);
    try {
      const updateData: any = {};
      
      if (updates.name) updateData.name = updates.name;
      if (updates.oib) updateData.oib = updates.oib;
      if (updates.address) {
        updateData.address = updates.address.street;
        updateData.city = updates.address.city;
        updateData.postal_code = updates.address.postalCode;
        updateData.country = updates.address.country;
      }
      if (updates.contactPerson) updateData.contact_person = updates.contactPerson;
      if (updates.email) updateData.email = updates.email;
      if (updates.phone) updateData.phone = updates.phone;
      if (updates.fax !== undefined) updateData.fax = updates.fax;
      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('companies')
        .update(updateData)
        .eq('id', parseInt(id))
        .select()
        .single();

      if (error) throw error;
      
      // Update local state
      const updatedCompany = mapCompanyFromDB(data);
      setCompanies(prev => prev.map(c => c.id === id ? updatedCompany : c));
      
    } catch (err) {
      console.error('Failed to update company:', err);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, [mapCompanyFromDB]);

  const deleteCompany = useCallback(async (id: string) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('companies')
        .update({ is_active: false })
        .eq('id', parseInt(id));

      if (error) throw error;
      
      // Update local state (soft delete - mark as inactive)
      setCompanies(prev => prev.map(c => c.id === id ? { ...c, isActive: false } : c));
      
    } catch (err) {
      console.error('Failed to delete company:', err);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  const findCompaniesByName = useCallback((query: string): Company[] => {
    return companies.filter(company => 
      company.name.toLowerCase().includes(query.toLowerCase())
    );
  }, [companies]);

  const findCompanyByOIB = useCallback((oib: string): Company | undefined => {
    return companies.find(company => company.oib === oib);
  }, [companies]);

  const validateOIB = useCallback((oib: string): boolean => {
    // Basic Croatian OIB validation
    return /^\d{11}$/.test(oib);
  }, []);

  // Pricing tier management
  const createPricingTier = useCallback(async (pricingTier: Omit<PricingTier, 'id' | 'createdAt' | 'updatedAt'>) => {
    setIsUpdating(true);
    try {
      const { data, error } = await supabase
        .from('pricing_tiers')
        .insert({
          name: pricingTier.name,
          description: pricingTier.description || null,
          seasonal_rate_a: pricingTier.seasonalRates?.A || 0,
          seasonal_rate_b: pricingTier.seasonalRates?.B || 0,
          seasonal_rate_c: pricingTier.seasonalRates?.C || 0,
          seasonal_rate_d: pricingTier.seasonalRates?.D || 0,
          is_percentage_discount: true,
          minimum_stay: pricingTier.minimumStayRequirement || null,
          valid_from: pricingTier.validFrom?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
          valid_to: pricingTier.validTo?.toISOString().split('T')[0] || null,
          is_active: pricingTier.isActive !== false,
          is_default: pricingTier.isDefault || false
        })
        .select()
        .single();

      if (error) throw error;
      
      // Update local state
      const newPricingTier = mapPricingTierFromDB(data);
      setPricingTiers(prev => [...prev, newPricingTier]);
      
    } catch (err) {
      console.error('Failed to create pricing tier:', err);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, [mapPricingTierFromDB]);

  const updatePricingTier = useCallback(async (id: string, updates: Partial<PricingTier>) => {
    setIsUpdating(true);
    try {
      const { data, error } = await supabase
        .from('pricing_tiers')
        .update({
          name: updates.name,
          description: updates.description,
          seasonal_rate_a: updates.seasonalRates?.A,
          seasonal_rate_b: updates.seasonalRates?.B,
          seasonal_rate_c: updates.seasonalRates?.C,
          seasonal_rate_d: updates.seasonalRates?.D,
          minimum_stay: updates.minimumStayRequirement,
          valid_from: updates.validFrom?.toISOString().split('T')[0],
          valid_to: updates.validTo?.toISOString().split('T')[0],
          is_active: updates.isActive,
          is_default: updates.isDefault,
          updated_at: new Date().toISOString()
        })
        .eq('id', parseInt(id))
        .select()
        .single();

      if (error) throw error;
      
      // Update local state
      const updatedPricingTier = mapPricingTierFromDB(data);
      setPricingTiers(prev => prev.map(pt => pt.id === id ? updatedPricingTier : pt));
      
    } catch (err) {
      console.error('Failed to update pricing tier:', err);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, [mapPricingTierFromDB]);

  const deletePricingTier = useCallback(async (id: string) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('pricing_tiers')
        .update({ is_active: false })
        .eq('id', parseInt(id));

      if (error) throw error;
      
      // Update local state (soft delete - mark as inactive)
      setPricingTiers(prev => prev.map(pt => pt.id === id ? { ...pt, isActive: false } : pt));
      
    } catch (err) {
      console.error('Failed to delete pricing tier:', err);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  const findPricingTiersByName = useCallback((query: string): PricingTier[] => {
    return pricingTiers.filter(tier => 
      tier.name.toLowerCase().includes(query.toLowerCase())
    );
  }, [pricingTiers]);

  const getActivePricingTiers = useCallback((): PricingTier[] => {
    return pricingTiers.filter(tier => tier.isActive);
  }, [pricingTiers]);

  const getDefaultPricingTier = useCallback((): PricingTier | undefined => {
    return pricingTiers.find(tier => tier.isDefault);
  }, [pricingTiers]);

  // Financial placeholders - TODO: Implement properly
  const generateInvoice = useCallback(async (reservationId: string): Promise<Invoice> => {
    console.warn('generateInvoice not implemented yet');
    throw new Error('Invoice generation not implemented');
  }, []);

  const updateInvoiceStatus = useCallback(async (invoiceId: string, status: InvoiceStatus) => {
    console.warn('updateInvoiceStatus not implemented yet');
    throw new Error('Invoice management not implemented');
  }, []);

  const getInvoicesByGuest = useCallback((guestId: string): Invoice[] => {
    return invoices.filter(invoice => invoice.guestId === guestId);
  }, [invoices]);

  const getInvoicesByDateRange = useCallback((start: Date, end: Date): Invoice[] => {
    return invoices.filter(invoice => 
      invoice.issueDate >= start && invoice.issueDate <= end
    );
  }, [invoices]);

  const getOverdueInvoices = useCallback((): Invoice[] => {
    const today = new Date();
    return invoices.filter(invoice => 
      invoice.status !== 'paid' && invoice.dueDate < today
    );
  }, [invoices]);

  const addPayment = useCallback(async (payment: Omit<Payment, 'id' | 'createdAt'>) => {
    console.warn('addPayment not implemented yet');
    throw new Error('Payment management not implemented');
  }, []);

  const updatePaymentStatus = useCallback(async (paymentId: string, status: PaymentStatus) => {
    console.warn('updatePaymentStatus not implemented yet');
    throw new Error('Payment management not implemented');
  }, []);

  const getPaymentsByInvoice = useCallback((invoiceId: string): Payment[] => {
    return payments.filter(payment => payment.invoiceId === invoiceId);
  }, [payments]);

  const getPaymentsByMethod = useCallback((method: PaymentMethod): Payment[] => {
    return payments.filter(payment => payment.method === method);
  }, [payments]);

  const calculateRevenueAnalytics = useCallback((
    period: 'daily' | 'weekly' | 'monthly' | 'yearly',
    startDate: Date,
    endDate: Date
  ): RevenueAnalytics => {
    // Placeholder implementation
    return {
      period,
      startDate,
      endDate,
      totalRevenue: 0,
      totalBookings: 0,
      roomRevenue: 0,
      taxRevenue: 0,
      additionalRevenue: 0,
      vatCollected: 0,
      tourismTaxCollected: 0,
      directBookings: 0,
      bookingComRevenue: 0,
      otherSourcesRevenue: 0,
      cashPayments: 0,
      cardPayments: 0,
      bankTransfers: 0,
      onlinePayments: 0,
      totalInvoices: 0,
      averageBookingValue: 0,
      occupancyRate: 0,
      fiscalReportsGenerated: 0,
      fiscalSubmissions: 0,
      periods: []
    };
  }, []);

  const getTotalRevenue = useCallback((startDate: Date, endDate: Date): number => {
    return invoices
      .filter(invoice => invoice.issueDate >= startDate && invoice.issueDate <= endDate)
      .reduce((total, invoice) => total + invoice.totalAmount, 0);
  }, [invoices]);

  const getUnpaidInvoices = useCallback((): Invoice[] => {
    return invoices.filter(invoice => invoice.status !== 'paid');
  }, [invoices]);

  const getPaymentSummary = useCallback((startDate: Date, endDate: Date) => {
    const relevantPayments = payments.filter(payment => 
      payment.receivedDate >= startDate && payment.receivedDate <= endDate
    );

    return {
      total: relevantPayments.reduce((sum, payment) => sum + payment.amount, 0),
      cash: relevantPayments.filter(p => p.method === 'cash').reduce((sum, p) => sum + p.amount, 0),
      card: relevantPayments.filter(p => p.method === 'card').reduce((sum, p) => sum + p.amount, 0),
      bank: relevantPayments.filter(p => p.method === 'bank_transfer').reduce((sum, p) => sum + p.amount, 0),
      online: relevantPayments.filter(p => p.method === 'online').reduce((sum, p) => sum + p.amount, 0)
    };
  }, [payments]);

  const contextValue: HotelContextType = {
    // Data state
    reservations,
    guests,
    rooms,
    invoices,
    payments,
    fiscalRecords,
    companies,
    pricingTiers,
    
    // Performance optimizations
    roomsByFloor,
    roomLookup,
    
    // Loading states
    isLoading,
    isUpdating,
    lastUpdated,
    error,
    
    // Actions - Reservations
    updateReservationStatus,
    updateReservationNotes,
    updateReservation,
    createReservation,
    deleteReservation,
    
    // Actions - Guests
    createGuest,
    updateGuest,
    findGuestsByName,
    getGuestStayHistory,
    
    // Actions - Companies
    createCompany,
    updateCompany,
    deleteCompany,
    findCompaniesByName,
    findCompanyByOIB,
    validateOIB,
    
    // Actions - Pricing Tiers
    createPricingTier,
    updatePricingTier,
    deletePricingTier,
    findPricingTiersByName,
    getActivePricingTiers,
    getDefaultPricingTier,
    
    // Financial actions - Invoices
    generateInvoice,
    updateInvoiceStatus,
    getInvoicesByGuest,
    getInvoicesByDateRange,
    getOverdueInvoices,
    
    // Financial actions - Payments
    addPayment,
    updatePaymentStatus,
    getPaymentsByInvoice,
    getPaymentsByMethod,
    
    // Revenue analytics
    calculateRevenueAnalytics,
    
    // Financial utilities
    getTotalRevenue,
    getUnpaidInvoices,
    getPaymentSummary,
    
    // Sync utilities
    refreshData
  };

  return (
    <HotelContext.Provider value={contextValue}>
      {children}
    </HotelContext.Provider>
  );
}

export function useHotel() {
  const context = useContext(HotelContext);
  if (context === undefined) {
    throw new Error('useHotel must be used within a SupabaseHotelProvider');
  }
  return context;
}