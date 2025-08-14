import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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

  // Load all data from database
  const loadAllData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🏨 Loading hotel data from Supabase...');
      
      // Load all data in parallel
      const [
        roomsData,
        guestsData,
        reservationsData
      ] = await Promise.all([
        hotelDataService.getRooms(),
        hotelDataService.getGuests(),
        hotelDataService.getReservations()
      ]);

      setRooms(roomsData);
      setGuests(guestsData);
      setReservations(reservationsData);
      
      // TODO: Load financial data (invoices, payments, etc.)
      // For now, initialize empty arrays
      setInvoices([]);
      setPayments([]);
      setFiscalRecords([]);
      setCompanies([]);
      setPricingTiers([]);
      
      setLastUpdated(new Date());
      console.log('✅ Hotel data loaded successfully');
      console.log(`📊 Loaded: ${roomsData.length} rooms, ${guestsData.length} guests, ${reservationsData.length} reservations`);
      
    } catch (err) {
      console.error('❌ Failed to load hotel data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize data on mount
  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Setup real-time subscriptions
  useEffect(() => {
    console.log('🔄 Setting up real-time subscriptions...');
    
    const unsubscribe = realtimeService.subscribeToHotelTimeline(
      // Reservation changes
      (payload) => {
        console.log('🔄 Reservation change:', payload.eventType);
        
        if (payload.eventType === 'INSERT' && payload.new) {
          setReservations(prev => [...prev, payload.new as Reservation]);
        } else if (payload.eventType === 'UPDATE' && payload.new) {
          setReservations(prev => 
            prev.map(r => r.id === payload.new!.id ? payload.new as Reservation : r)
          );
        } else if (payload.eventType === 'DELETE' && payload.old) {
          setReservations(prev => 
            prev.filter(r => r.id !== payload.old!.id)
          );
        }
        
        setLastUpdated(new Date());
      },
      // Room changes
      (payload) => {
        console.log('🔄 Room change:', payload.eventType);
        
        if (payload.eventType === 'UPDATE' && payload.new) {
          setRooms(prev => 
            prev.map(r => r.id === payload.new!.id ? payload.new as Room : r)
          );
        }
        
        setLastUpdated(new Date());
      },
      // Guest changes
      (payload) => {
        console.log('🔄 Guest change:', payload.eventType);
        
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
      }
    );

    // Cleanup subscriptions on unmount
    return () => {
      console.log('🔄 Cleaning up real-time subscriptions...');
      unsubscribe();
    };
  }, []);

  // Reservation actions
  const updateReservationStatus = useCallback(async (id: string, newStatus: ReservationStatus) => {
    setIsUpdating(true);
    try {
      await hotelDataService.updateReservation(id, { status: newStatus });
      // Real-time subscription will handle the UI update
    } catch (err) {
      console.error('Failed to update reservation status:', err);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, []);

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
    setIsUpdating(true);
    try {
      let guestId = reservationData.guestId;
      
      // If new guest, create guest first
      if (reservationData.isNewGuest && reservationData.guest) {
        console.log('Creating new guest:', reservationData.guest);
        const newGuest = await hotelDataService.createGuest({
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
        });
        guestId = newGuest.id;
        console.log('New guest created with ID:', guestId);
      }
      
      // Create reservation with proper guest ID
      const finalReservationData = {
        ...reservationData,
        guestId: guestId
      };
      
      await hotelDataService.createReservation(finalReservationData);
      // Real-time subscription will handle the UI update
    } catch (err) {
      console.error('Failed to create reservation:', err);
      throw err;
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

  // Placeholder implementations for financial features
  // TODO: Implement these with proper database backing
  const createCompany = useCallback(async (company: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>) => {
    console.warn('createCompany not implemented yet');
    throw new Error('Company management not implemented');
  }, []);

  const updateCompany = useCallback(async (id: string, updates: Partial<Company>) => {
    console.warn('updateCompany not implemented yet');
    throw new Error('Company management not implemented');
  }, []);

  const deleteCompany = useCallback(async (id: string) => {
    console.warn('deleteCompany not implemented yet');
    throw new Error('Company management not implemented');
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

  // Pricing tier placeholders
  const createPricingTier = useCallback(async (pricingTier: Omit<PricingTier, 'id' | 'createdAt' | 'updatedAt'>) => {
    console.warn('createPricingTier not implemented yet');
    throw new Error('Pricing tier management not implemented');
  }, []);

  const updatePricingTier = useCallback(async (id: string, updates: Partial<PricingTier>) => {
    console.warn('updatePricingTier not implemented yet');
    throw new Error('Pricing tier management not implemented');
  }, []);

  const deletePricingTier = useCallback(async (id: string) => {
    console.warn('deletePricingTier not implemented yet');
    throw new Error('Pricing tier management not implemented');
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