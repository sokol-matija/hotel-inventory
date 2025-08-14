// HotelSupabaseContext - Supabase-enabled version of HotelContext
// This replaces localStorage operations with Supabase database calls while maintaining the same API

import React, { createContext, useContext, useState, useEffect } from 'react';
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
import { HOTEL_POREC_ROOMS } from '../hotelData';
import { hotelSupabaseService } from '../../services/HotelSupabaseService';
import { dataMigrationService } from '../../services/DataMigrationService';
import { supabase } from '../../supabase';

interface HotelSupabaseContextType {
  // Data state
  reservations: Reservation[];
  guests: Guest[];
  rooms: Room[];
  invoices: Invoice[];
  payments: Payment[];
  fiscalRecords: FiscalRecord[];
  companies: Company[];
  pricingTiers: PricingTier[];
  
  // Loading states
  isLoading: boolean;
  isUpdating: boolean;
  lastUpdated: Date;
  migrationStatus: 'pending' | 'completed' | 'error';
  
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
  
  // Migration utilities
  triggerDataMigration: () => Promise<void>;
  
  // Sync utilities
  refreshData: () => Promise<void>;
}

const HotelSupabaseContext = createContext<HotelSupabaseContextType | undefined>(undefined);

export function HotelSupabaseProvider({ children }: { children: React.ReactNode }) {
  // Data states
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [rooms] = useState<Room[]>(HOTEL_POREC_ROOMS);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [fiscalRecords, setFiscalRecords] = useState<FiscalRecord[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([]);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [migrationStatus, setMigrationStatus] = useState<'pending' | 'completed' | 'error'>('pending');

  // Initialize data from Supabase and handle migration
  useEffect(() => {
    initializeData();
    setupRealtimeSubscriptions();
    
    return () => {
      // Cleanup subscriptions
      supabase.removeAllChannels();
    };
  }, []);

  const initializeData = async () => {
    try {
      setIsLoading(true);
      
      // Check if migration is needed
      const migrationCompleted = await dataMigrationService.isMigrationCompleted();
      if (!migrationCompleted && dataMigrationService.hasLocalStorageData()) {
        console.log('🔄 Migration needed - triggering automatic migration...');
        await triggerDataMigration();
      } else {
        setMigrationStatus('completed');
      }
      
      // Load all data from Supabase
      await refreshData();
      
    } catch (error) {
      console.error('Failed to initialize hotel data:', error);
      setMigrationStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const setupRealtimeSubscriptions = () => {
    // Subscribe to reservations changes
    const reservationsChannel = supabase
      .channel('reservations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservations'
        },
        () => {
          console.log('Reservations changed, refreshing data...');
          refreshData();
        }
      )
      .subscribe();

    // Subscribe to guests changes
    const guestsChannel = supabase
      .channel('guests-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'guests'
        },
        () => {
          console.log('Guests changed, refreshing data...');
          refreshData();
        }
      )
      .subscribe();

    // Subscribe to companies changes
    const companiesChannel = supabase
      .channel('companies-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'companies'
        },
        () => {
          console.log('Companies changed, refreshing data...');
          refreshData();
        }
      )
      .subscribe();
  };

  const refreshData = async () => {
    try {
      setIsUpdating(true);
      
      // Load all data in parallel
      const [
        guestsData,
        reservationsData,
        companiesData,
        pricingTiersData,
        invoicesData,
        paymentsData,
        fiscalRecordsData
      ] = await Promise.all([
        hotelSupabaseService.getGuests(),
        hotelSupabaseService.getReservations(),
        hotelSupabaseService.getCompanies(),
        hotelSupabaseService.getPricingTiers(),
        hotelSupabaseService.getInvoices(),
        hotelSupabaseService.getPayments(),
        hotelSupabaseService.getFiscalRecords()
      ]);
      
      setGuests(guestsData);
      setReservations(reservationsData);
      setCompanies(companiesData);
      setPricingTiers(pricingTiersData);
      setInvoices(invoicesData);
      setPayments(paymentsData);
      setFiscalRecords(fiscalRecordsData);
      setLastUpdated(new Date());
      
    } catch (error) {
      console.error('Failed to refresh data:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const triggerDataMigration = async () => {
    try {
      setMigrationStatus('pending');
      console.log('🚀 Starting data migration from localStorage to Supabase...');
      
      // Create backup first
      const backup = dataMigrationService.createLocalStorageBackup();
      console.log('📦 Created backup of localStorage data');
      
      // Perform migration
      const result = await dataMigrationService.migrateLocalStorageToSupabase();
      
      if (result.success) {
        console.log('✅ Migration completed successfully:', result.migratedCounts);
        setMigrationStatus('completed');
        
        // Clear localStorage after successful migration
        dataMigrationService.clearLocalStorageAfterMigration();
        
        // Refresh data from Supabase
        await refreshData();
      } else {
        console.error('❌ Migration failed:', result.errors);
        setMigrationStatus('error');
      }
      
    } catch (error) {
      console.error('💥 Migration process failed:', error);
      setMigrationStatus('error');
    }
  };

  // =====================================
  // RESERVATION ACTIONS
  // =====================================
  
  const updateReservationStatus = async (id: string, newStatus: ReservationStatus) => {
    try {
      setIsUpdating(true);
      await hotelSupabaseService.updateReservationStatus(id, newStatus);
      
      // Update local state
      setReservations(prev => prev.map(r => 
        r.id === id ? { ...r, status: newStatus } : r
      ));
    } catch (error) {
      console.error('Failed to update reservation status:', error);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  const updateReservationNotes = async (id: string, notes: string) => {
    try {
      setIsUpdating(true);
      await hotelSupabaseService.updateReservation(id, { notes });
      
      // Update local state
      setReservations(prev => prev.map(r => 
        r.id === id ? { ...r, notes } : r
      ));
    } catch (error) {
      console.error('Failed to update reservation notes:', error);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  const updateReservation = async (id: string, updates: Partial<Reservation>) => {
    try {
      setIsUpdating(true);
      await hotelSupabaseService.updateReservation(id, updates);
      
      // Update local state
      setReservations(prev => prev.map(r => 
        r.id === id ? { ...r, ...updates } : r
      ));
    } catch (error) {
      console.error('Failed to update reservation:', error);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  const createReservation = async (reservationData: Omit<Reservation, 'id' | 'bookingDate' | 'lastModified'>) => {
    try {
      setIsUpdating(true);
      const newReservation = await hotelSupabaseService.createReservation(reservationData);
      
      // Update local state
      setReservations(prev => [...prev, newReservation]);
    } catch (error) {
      console.error('Failed to create reservation:', error);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteReservation = async (id: string) => {
    try {
      setIsUpdating(true);
      await hotelSupabaseService.deleteReservation(id);
      
      // Update local state
      setReservations(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      console.error('Failed to delete reservation:', error);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  // =====================================
  // GUEST ACTIONS
  // =====================================
  
  const createGuest = async (guestData: Omit<Guest, 'id' | 'totalStays'>) => {
    try {
      setIsUpdating(true);
      const newGuest = await hotelSupabaseService.createGuest(guestData);
      
      // Update local state
      setGuests(prev => [...prev, newGuest]);
    } catch (error) {
      console.error('Failed to create guest:', error);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  const updateGuest = async (id: string, updates: Partial<Guest>) => {
    try {
      setIsUpdating(true);
      await hotelSupabaseService.updateGuest(id, updates);
      
      // Update local state
      setGuests(prev => prev.map(g => 
        g.id === id ? { ...g, ...updates } : g
      ));
    } catch (error) {
      console.error('Failed to update guest:', error);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  const findGuestsByName = (query: string): Guest[] => {
    const searchTerm = query.toLowerCase();
    return guests.filter(guest => 
      guest.firstName.toLowerCase().includes(searchTerm) ||
      guest.lastName.toLowerCase().includes(searchTerm) ||
      `${guest.firstName} ${guest.lastName}`.toLowerCase().includes(searchTerm)
    );
  };

  const getGuestStayHistory = (guestId: string): Reservation[] => {
    return reservations.filter(r => r.guestId === guestId);
  };

  // =====================================
  // COMPANY ACTIONS
  // =====================================
  
  const createCompany = async (companyData: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      setIsUpdating(true);
      const newCompany = await hotelSupabaseService.createCompany(companyData);
      
      // Update local state
      setCompanies(prev => [...prev, newCompany]);
    } catch (error) {
      console.error('Failed to create company:', error);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  const updateCompany = async (id: string, updates: Partial<Company>) => {
    try {
      setIsUpdating(true);
      await hotelSupabaseService.updateCompany(id, updates);
      
      // Update local state
      setCompanies(prev => prev.map(c => 
        c.id === id ? { ...c, ...updates } : c
      ));
    } catch (error) {
      console.error('Failed to update company:', error);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteCompany = async (id: string) => {
    try {
      setIsUpdating(true);
      await hotelSupabaseService.deleteCompany(id);
      
      // Update local state
      setCompanies(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      console.error('Failed to delete company:', error);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  const findCompaniesByName = (query: string): Company[] => {
    const searchTerm = query.toLowerCase();
    return companies.filter(company => 
      company.name.toLowerCase().includes(searchTerm)
    );
  };

  const findCompanyByOIB = (oib: string): Company | undefined => {
    return companies.find(company => company.oib === oib);
  };

  const validateOIB = (oib: string): boolean => {
    // Croatian OIB validation logic
    if (!/^\d{11}$/.test(oib)) return false;
    
    let sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(oib[i]) * (10 - i);
    }
    
    const remainder = sum % 11;
    const checkDigit = remainder < 2 ? remainder : 11 - remainder;
    
    return checkDigit === parseInt(oib[10]);
  };

  // =====================================
  // PRICING TIER ACTIONS
  // =====================================
  
  const createPricingTier = async (tierData: Omit<PricingTier, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      setIsUpdating(true);
      const newTier = await hotelSupabaseService.createPricingTier(tierData);
      
      // Update local state
      setPricingTiers(prev => [...prev, newTier]);
    } catch (error) {
      console.error('Failed to create pricing tier:', error);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  const updatePricingTier = async (id: string, updates: Partial<PricingTier>) => {
    try {
      setIsUpdating(true);
      await hotelSupabaseService.updatePricingTier(id, updates);
      
      // Update local state
      setPricingTiers(prev => prev.map(pt => 
        pt.id === id ? { ...pt, ...updates } : pt
      ));
    } catch (error) {
      console.error('Failed to update pricing tier:', error);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  const deletePricingTier = async (id: string) => {
    try {
      setIsUpdating(true);
      await hotelSupabaseService.deletePricingTier(id);
      
      // Update local state
      setPricingTiers(prev => prev.filter(pt => pt.id !== id));
    } catch (error) {
      console.error('Failed to delete pricing tier:', error);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  const findPricingTiersByName = (query: string): PricingTier[] => {
    const searchTerm = query.toLowerCase();
    return pricingTiers.filter(tier => 
      tier.name.toLowerCase().includes(searchTerm)
    );
  };

  const getActivePricingTiers = (): PricingTier[] => {
    return pricingTiers.filter(tier => tier.isActive);
  };

  const getDefaultPricingTier = (): PricingTier | undefined => {
    return pricingTiers.find(tier => tier.isDefault && tier.isActive);
  };

  // =====================================
  // FINANCIAL ACTIONS (Simplified for now)
  // =====================================
  
  const generateInvoice = async (reservationId: string): Promise<Invoice> => {
    // TODO: Implement invoice generation
    throw new Error('Invoice generation not implemented yet');
  };

  const updateInvoiceStatus = async (invoiceId: string, status: InvoiceStatus): Promise<void> => {
    // TODO: Implement invoice status update
    throw new Error('Invoice status update not implemented yet');
  };

  const getInvoicesByGuest = (guestId: string): Invoice[] => {
    return invoices.filter(invoice => invoice.guestId === guestId);
  };

  const getInvoicesByDateRange = (start: Date, end: Date): Invoice[] => {
    return invoices.filter(invoice => {
      const issueDate = new Date(invoice.issueDate);
      return issueDate >= start && issueDate <= end;
    });
  };

  const getOverdueInvoices = (): Invoice[] => {
    const now = new Date();
    return invoices.filter(invoice => 
      invoice.status !== 'paid' && new Date(invoice.dueDate) < now
    );
  };

  const addPayment = async (paymentData: Omit<Payment, 'id' | 'createdAt'>): Promise<void> => {
    // TODO: Implement payment creation
    throw new Error('Payment creation not implemented yet');
  };

  const updatePaymentStatus = async (paymentId: string, status: PaymentStatus): Promise<void> => {
    // TODO: Implement payment status update
    throw new Error('Payment status update not implemented yet');
  };

  const getPaymentsByInvoice = (invoiceId: string): Payment[] => {
    return payments.filter(payment => payment.invoiceId === invoiceId);
  };

  const getPaymentsByMethod = (method: PaymentMethod): Payment[] => {
    return payments.filter(payment => payment.method === method);
  };

  const calculateRevenueAnalytics = (
    period: 'daily' | 'weekly' | 'monthly' | 'yearly',
    startDate: Date,
    endDate: Date
  ): RevenueAnalytics => {
    // TODO: Implement revenue analytics
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
  };

  const getTotalRevenue = (startDate: Date, endDate: Date): number => {
    return reservations
      .filter(r => {
        const checkIn = new Date(r.checkIn);
        return checkIn >= startDate && checkIn <= endDate && r.status === 'checked-out';
      })
      .reduce((total, r) => total + r.totalAmount, 0);
  };

  const getUnpaidInvoices = (): Invoice[] => {
    return invoices.filter(invoice => invoice.status !== 'paid');
  };

  const getPaymentSummary = (startDate: Date, endDate: Date) => {
    const relevantPayments = payments.filter(p => {
      const receivedDate = new Date(p.receivedDate);
      return receivedDate >= startDate && receivedDate <= endDate;
    });

    return {
      total: relevantPayments.reduce((sum, p) => sum + p.amount, 0),
      cash: relevantPayments.filter(p => p.method === 'cash').reduce((sum, p) => sum + p.amount, 0),
      card: relevantPayments.filter(p => p.method === 'card').reduce((sum, p) => sum + p.amount, 0),
      bank: relevantPayments.filter(p => p.method === 'bank_transfer').reduce((sum, p) => sum + p.amount, 0),
      online: relevantPayments.filter(p => p.method === 'online').reduce((sum, p) => sum + p.amount, 0)
    };
  };

  // Context value
  const value: HotelSupabaseContextType = {
    // Data
    reservations,
    guests,
    rooms,
    invoices,
    payments,
    fiscalRecords,
    companies,
    pricingTiers,
    
    // Loading states
    isLoading,
    isUpdating,
    lastUpdated,
    migrationStatus,
    
    // Actions
    updateReservationStatus,
    updateReservationNotes,
    updateReservation,
    createReservation,
    deleteReservation,
    createGuest,
    updateGuest,
    findGuestsByName,
    getGuestStayHistory,
    createCompany,
    updateCompany,
    deleteCompany,
    findCompaniesByName,
    findCompanyByOIB,
    validateOIB,
    createPricingTier,
    updatePricingTier,
    deletePricingTier,
    findPricingTiersByName,
    getActivePricingTiers,
    getDefaultPricingTier,
    generateInvoice,
    updateInvoiceStatus,
    getInvoicesByGuest,
    getInvoicesByDateRange,
    getOverdueInvoices,
    addPayment,
    updatePaymentStatus,
    getPaymentsByInvoice,
    getPaymentsByMethod,
    calculateRevenueAnalytics,
    getTotalRevenue,
    getUnpaidInvoices,
    getPaymentSummary,
    triggerDataMigration,
    refreshData
  };

  return (
    <HotelSupabaseContext.Provider value={value}>
      {children}
    </HotelSupabaseContext.Provider>
  );
}

export function useHotelSupabase() {
  const context = useContext(HotelSupabaseContext);
  if (context === undefined) {
    throw new Error('useHotelSupabase must be used within a HotelSupabaseProvider');
  }
  return context;
}

export default HotelSupabaseContext;