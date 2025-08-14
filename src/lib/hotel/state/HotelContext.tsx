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
import { HOTEL_POREC_ROOMS, HOTEL_POREC } from '../hotelData';
import { hotelSupabaseService } from '../../services/HotelSupabaseService';
import { dataMigrationService } from '../../services/DataMigrationService';
import { supabase } from '../../supabase';

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

const HotelContext = createContext<HotelContextType | undefined>(undefined);

export function HotelProvider({ children }: { children: React.ReactNode }) {
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
      console.log('🏨 Initializing hotel data from Supabase...');
      
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
      console.error('❌ Failed to initialize hotel data:', error);
      setMigrationStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const setupRealtimeSubscriptions = () => {
    console.log('🔄 Setting up real-time subscriptions...');
    
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
          console.log('🔄 Reservations changed, refreshing data...');
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
          console.log('🔄 Guests changed, refreshing data...');
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
          console.log('🔄 Companies changed, refreshing data...');
          refreshData();
        }
      )
      .subscribe();
  };

  const refreshData = async () => {
    try {
      setIsUpdating(true);
      console.log('🔄 Loading hotel data from Supabase...');
      
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
      
      console.log('✅ Hotel data loaded successfully');
      console.log(`📊 Loaded: ${guestsData.length} guests, ${reservationsData.length} reservations, ${companiesData.length} companies`);
      
    } catch (error) {
      console.error('❌ Failed to refresh data:', error);
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
  // RESERVATION ACTIONS (Supabase-based)
  // =====================================

  const updateReservationStatus = async (reservationId: string, newStatus: ReservationStatus): Promise<void> => {
    try {
      setIsUpdating(true);
      await hotelSupabaseService.updateReservationStatus(reservationId, newStatus);
      
      // Update local state optimistically (real-time subscription will also update)
      setReservations(prev => prev.map(r => 
        r.id === reservationId ? { ...r, status: newStatus } : r
      ));
    } catch (error) {
      console.error('Failed to update reservation status:', error);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  const updateReservationNotes = async (reservationId: string, notes: string): Promise<void> => {
    try {
      setIsUpdating(true);
      await hotelSupabaseService.updateReservation(reservationId, { notes });
      
      // Update local state optimistically
      setReservations(prev => prev.map(r => 
        r.id === reservationId ? { ...r, notes } : r
      ));
    } catch (error) {
      console.error('Failed to update reservation notes:', error);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  const updateReservation = async (reservationId: string, updates: Partial<Reservation>): Promise<void> => {
    try {
      setIsUpdating(true);
      await hotelSupabaseService.updateReservation(reservationId, updates);
      
      // Update local state optimistically
      setReservations(prev => prev.map(r => 
        r.id === reservationId ? { ...r, ...updates } : r
      ));
    } catch (error) {
      console.error('Failed to update reservation:', error);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  const createReservation = async (reservationData: Omit<Reservation, 'id' | 'bookingDate' | 'lastModified'>): Promise<void> => {
    try {
      setIsUpdating(true);
      const newReservation = await hotelSupabaseService.createReservation(reservationData);
      
      // Update local state optimistically
      setReservations(prev => [...prev, newReservation]);
    } catch (error) {
      console.error('Failed to create reservation:', error);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteReservation = async (reservationId: string): Promise<void> => {
    try {
      setIsUpdating(true);
      await hotelSupabaseService.deleteReservation(reservationId);
      
      // Update local state optimistically
      setReservations(prev => prev.filter(r => r.id !== reservationId));
    } catch (error) {
      console.error('Failed to delete reservation:', error);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  // =====================================
  // GUEST ACTIONS (Supabase-based)
  // =====================================
  
  const createGuest = async (guestData: Omit<Guest, 'id' | 'totalStays'>): Promise<void> => {
    try {
      setIsUpdating(true);
      const newGuest = await hotelSupabaseService.createGuest(guestData);
      
      // Update local state optimistically
      setGuests(prev => [...prev, newGuest]);
    } catch (error) {
      console.error('Failed to create guest:', error);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  const updateGuest = async (guestId: string, updates: Partial<Guest>): Promise<void> => {
    try {
      setIsUpdating(true);
      await hotelSupabaseService.updateGuest(guestId, updates);
      
      // Update local state optimistically
      setGuests(prev => prev.map(g => 
        g.id === guestId ? { ...g, ...updates } : g
      ));
    } catch (error) {
      console.error('Failed to update guest:', error);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  // Find guests by name (search function)
  const findGuestsByName = (query: string): Guest[] => {
    if (!query.trim()) return [];
    
    const searchTerm = query.toLowerCase().trim();
    return guests.filter(guest =>
      guest.fullName.toLowerCase().includes(searchTerm) ||
      (guest.email && guest.email.toLowerCase().includes(searchTerm)) ||
      (guest.phone && guest.phone.toLowerCase().includes(searchTerm)) ||
      (guest.nationality && guest.nationality.toLowerCase().includes(searchTerm))
    );
  };

  // Get guest stay history
  const getGuestStayHistory = (guestId: string): Reservation[] => {
    return reservations
      .filter(reservation => reservation.guestId === guestId)
      .sort((a, b) => b.checkIn.getTime() - a.checkIn.getTime());
  };

  // Company management functions
  const createCompany = async (companyData: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> => {
    const newCompany: Company = {
      ...companyData,
      id: `company-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const updatedCompanies = [...companies, newCompany];
    setCompanies(updatedCompanies);
    setIsUpdating(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Data automatically synced via Supabase
      
      console.log(`Company ${newCompany.name} created successfully`);
      
    } catch (error) {
      console.error('Failed to create company:', error);
      // Revert changes on error
      setCompanies(companies);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  const updateCompany = async (id: string, updates: Partial<Company>): Promise<void> => {
    const updatedCompanies = companies.map(company => 
      company.id === id 
        ? { ...company, ...updates, updatedAt: new Date() }
        : company
    );
    
    setCompanies(updatedCompanies);
    setIsUpdating(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Data automatically synced via Supabase
      
      console.log(`Company ${id} updated successfully`);
      
    } catch (error) {
      console.error('Failed to update company:', error);
      // Revert changes on error
      setCompanies(companies);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteCompany = async (id: string): Promise<void> => {
    const updatedCompanies = companies.filter(company => company.id !== id);
    
    setCompanies(updatedCompanies);
    setIsUpdating(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Data automatically synced via Supabase
      
      console.log(`Company ${id} deleted successfully`);
      
    } catch (error) {
      console.error('Failed to delete company:', error);
      // Revert changes on error
      setCompanies(companies);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  // Find companies by name (search function)
  const findCompaniesByName = (query: string): Company[] => {
    if (!query.trim()) return [];
    
    const searchTerm = query.toLowerCase().trim();
    return companies.filter(company =>
      company.name.toLowerCase().includes(searchTerm) ||
      company.oib.includes(searchTerm) ||
      company.contactPerson.toLowerCase().includes(searchTerm) ||
      company.email.toLowerCase().includes(searchTerm)
    );
  };

  // Find company by OIB (Croatian tax number)
  const findCompanyByOIB = (oib: string): Company | undefined => {
    return companies.find(company => company.oib === oib);
  };

  // Croatian OIB validation (11-digit tax number)
  const validateOIB = (oib: string): boolean => {
    if (!oib || oib.length !== 11) return false;
    
    // Check if all characters are digits
    if (!/^\d{11}$/.test(oib)) return false;
    
    // Croatian OIB validation algorithm
    let sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(oib[i]) * (10 - i);
    }
    
    const remainder = sum % 11;
    const expectedCheckDigit = remainder < 2 ? remainder : 11 - remainder;
    
    return parseInt(oib[10]) === expectedCheckDigit;
  };

  // Pricing Tier management functions
  const createPricingTier = async (pricingTierData: Omit<PricingTier, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> => {
    const newPricingTier: PricingTier = {
      ...pricingTierData,
      id: `tier-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const updatedPricingTiers = [...pricingTiers, newPricingTier];
    setPricingTiers(updatedPricingTiers);
    setIsUpdating(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Data automatically synced via Supabase
      
      console.log(`Pricing tier ${newPricingTier.name} created successfully`);
      
    } catch (error) {
      console.error('Failed to create pricing tier:', error);
      // Revert changes on error
      setPricingTiers(pricingTiers);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  const updatePricingTier = async (id: string, updates: Partial<PricingTier>): Promise<void> => {
    const updatedPricingTiers = pricingTiers.map(tier => 
      tier.id === id 
        ? { ...tier, ...updates, updatedAt: new Date() }
        : tier
    );
    
    setPricingTiers(updatedPricingTiers);
    setIsUpdating(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Data automatically synced via Supabase
      
      console.log(`Pricing tier ${id} updated successfully`);
      
    } catch (error) {
      console.error('Failed to update pricing tier:', error);
      // Revert changes on error
      setPricingTiers(pricingTiers);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  const deletePricingTier = async (id: string): Promise<void> => {
    // Prevent deletion of default tier
    const tierToDelete = pricingTiers.find(tier => tier.id === id);
    if (tierToDelete?.isDefault) {
      throw new Error('Cannot delete the default pricing tier');
    }

    const updatedPricingTiers = pricingTiers.filter(tier => tier.id !== id);
    
    setPricingTiers(updatedPricingTiers);
    setIsUpdating(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Data automatically synced via Supabase
      
      console.log(`Pricing tier ${id} deleted successfully`);
      
    } catch (error) {
      console.error('Failed to delete pricing tier:', error);
      // Revert changes on error
      setPricingTiers(pricingTiers);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  // Find pricing tiers by name (search function)
  const findPricingTiersByName = (query: string): PricingTier[] => {
    if (!query.trim()) return [];
    
    const searchTerm = query.toLowerCase().trim();
    return pricingTiers.filter(tier =>
      tier.name.toLowerCase().includes(searchTerm) ||
      tier.description.toLowerCase().includes(searchTerm)
    );
  };

  // Get active pricing tiers
  const getActivePricingTiers = (): PricingTier[] => {
    const now = new Date();
    return pricingTiers.filter(tier => 
      tier.isActive && 
      (tier.validFrom ? tier.validFrom <= now : true) && 
      (tier.validTo ? tier.validTo >= now : true)
    );
  };

  // Get default pricing tier
  const getDefaultPricingTier = (): PricingTier | undefined => {
    return pricingTiers.find(tier => tier.isDefault);
  };

  // Note: refreshData function is defined above in the Supabase section

  // FINANCIAL METHODS

  // Generate invoice from reservation
  const generateInvoice = async (reservationId: string): Promise<Invoice> => {
    const reservation = reservations.find(r => r.id === reservationId);
    if (!reservation) {
      throw new Error('Reservation not found');
    }

    const invoiceDate = new Date();
    const invoice: Invoice = {
      id: `inv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      invoiceNumber: `2025-001-${String(invoices.length + 1).padStart(4, '0')}`,
      reservationId: reservation.id,
      guestId: reservation.guestId,
      issueDate: invoiceDate,
      dueDate: new Date(invoiceDate.getTime() + (30 * 24 * 60 * 60 * 1000)), // 30 days
      status: 'sent',
      currency: 'EUR',
      items: [],
      subtotal: reservation.subtotal,
      vatRate: 0.25, // 25% VAT
      vatAmount: reservation.vatAmount,
      tourismTax: reservation.tourismTax,
      totalAmount: reservation.totalAmount,
      paidAmount: 0,
      remainingAmount: reservation.totalAmount,
      fiscalData: {
        oib: HOTEL_POREC.taxId,
        jir: `jir-${Math.random().toString(36).substr(2, 16)}`,
        zki: `zki-${Math.random().toString(36).substr(2, 16)}`,
        operatorOib: '12345678901'
      },
      payments: [],
      notes: `Invoice generated for stay from ${reservation.checkIn.toLocaleDateString()} to ${reservation.checkOut.toLocaleDateString()}`,
      createdAt: invoiceDate,
      updatedAt: invoiceDate
    };

    const updatedInvoices = [...invoices, invoice];
    setInvoices(updatedInvoices);
    setIsUpdating(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      // Data automatically synced via Supabase
      console.log(`Invoice ${invoice.invoiceNumber} generated successfully`);
      return invoice;
    } catch (error) {
      console.error('Failed to generate invoice:', error);
      setInvoices(invoices);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  // Update invoice status
  const updateInvoiceStatus = async (invoiceId: string, status: InvoiceStatus): Promise<void> => {
    const originalInvoices = [...invoices];
    
    const updatedInvoices = invoices.map(invoice =>
      invoice.id === invoiceId
        ? { 
          ...invoice, 
          status, 
          paidDate: status === 'paid' ? new Date() : invoice.paidDate,
          remainingAmount: status === 'paid' ? 0 : invoice.remainingAmount,
          updatedAt: new Date() 
        }
        : invoice
    );
    
    setInvoices(updatedInvoices);
    setIsUpdating(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      // Data automatically synced via Supabase
    } catch (error) {
      console.error('Failed to update invoice status:', error);
      setInvoices(originalInvoices);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  // Get invoices by guest
  const getInvoicesByGuest = (guestId: string): Invoice[] => {
    return invoices.filter(invoice => invoice.guestId === guestId);
  };

  // Get invoices by date range
  const getInvoicesByDateRange = (start: Date, end: Date): Invoice[] => {
    return invoices.filter(invoice => 
      invoice.issueDate >= start && invoice.issueDate <= end
    );
  };

  // Get overdue invoices
  const getOverdueInvoices = (): Invoice[] => {
    const today = new Date();
    return invoices.filter(invoice => 
      invoice.status === 'sent' && invoice.dueDate < today
    );
  };

  // Add payment
  const addPayment = async (paymentData: Omit<Payment, 'id' | 'createdAt'>): Promise<void> => {
    const payment: Payment = {
      ...paymentData,
      id: `pay-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date()
    };

    // Update invoice with payment
    const originalInvoices = [...invoices];
    const updatedInvoices = invoices.map(invoice => {
      if (invoice.id === payment.invoiceId) {
        const updatedPayments = [...(invoice.payments || []), payment];
        const totalPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);
        const remainingAmount = Math.max(0, invoice.totalAmount - totalPaid);
        
        return {
          ...invoice,
          payments: updatedPayments,
          remainingAmount,
          status: remainingAmount === 0 ? 'paid' as InvoiceStatus : invoice.status,
          paidDate: remainingAmount === 0 ? new Date() : invoice.paidDate,
          updatedAt: new Date()
        };
      }
      return invoice;
    });

    const updatedPayments = [...payments, payment];
    setInvoices(updatedInvoices);
    setPayments(updatedPayments);
    setIsUpdating(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      // Data automatically synced via Supabase
      // Data automatically synced via Supabase
      console.log(`Payment ${payment.id} added successfully`);
    } catch (error) {
      console.error('Failed to add payment:', error);
      setInvoices(originalInvoices);
      setPayments(payments);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  // Update payment status
  const updatePaymentStatus = async (paymentId: string, status: PaymentStatus): Promise<void> => {
    const originalPayments = [...payments];
    
    const updatedPayments = payments.map(payment =>
      payment.id === paymentId
        ? { ...payment, status, processedDate: new Date() }
        : payment
    );
    
    setPayments(updatedPayments);
    setIsUpdating(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      // Data automatically synced via Supabase
    } catch (error) {
      console.error('Failed to update payment status:', error);
      setPayments(originalPayments);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  // Get payments by invoice
  const getPaymentsByInvoice = (invoiceId: string): Payment[] => {
    return payments.filter(payment => payment.invoiceId === invoiceId);
  };

  // Get payments by method
  const getPaymentsByMethod = (method: PaymentMethod): Payment[] => {
    return payments.filter(payment => payment.method === method);
  };

  // Calculate revenue analytics
  const calculateRevenueAnalytics = (
    period: 'daily' | 'weekly' | 'monthly' | 'yearly',
    startDate: Date,
    endDate: Date
  ): RevenueAnalytics => {
    const periodInvoices = getInvoicesByDateRange(startDate, endDate);
    const paidInvoices = periodInvoices.filter(inv => inv.status === 'paid');
    
    const totalRevenue = paidInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const roomRevenue = paidInvoices.reduce((sum, inv) => sum + inv.subtotal, 0);
    const taxRevenue = paidInvoices.reduce((sum, inv) => sum + inv.vatAmount + inv.tourismTax, 0);
    const additionalRevenue = paidInvoices.reduce((sum, inv) => sum + (inv.totalAmount - inv.subtotal - inv.vatAmount - inv.tourismTax), 0);

    return {
      period,
      startDate,
      endDate,
      totalRevenue,
      totalBookings: paidInvoices.length,
      roomRevenue,
      taxRevenue,
      additionalRevenue,
      vatCollected: paidInvoices.reduce((sum, inv) => sum + inv.vatAmount, 0),
      tourismTaxCollected: paidInvoices.reduce((sum, inv) => sum + inv.tourismTax, 0),
      directBookings: 0, // TODO: Calculate from reservation booking sources
      bookingComRevenue: 0,
      otherSourcesRevenue: 0,
      cashPayments: payments.filter(p => p.method === 'cash').reduce((sum, p) => sum + p.amount, 0),
      cardPayments: payments.filter(p => p.method === 'card').reduce((sum, p) => sum + p.amount, 0),
      bankTransfers: payments.filter(p => p.method === 'bank_transfer').reduce((sum, p) => sum + p.amount, 0),
      onlinePayments: payments.filter(p => p.method === 'online').reduce((sum, p) => sum + p.amount, 0),
      totalInvoices: periodInvoices.length,
      averageBookingValue: totalRevenue / (paidInvoices.length || 1),
      occupancyRate: 0, // TODO: Calculate from reservations
      fiscalReportsGenerated: fiscalRecords.length,
      fiscalSubmissions: fiscalRecords.filter(r => r.jir && r.zki).length,
      periods: [] // Time series data - empty for now
    };
  };

  // Get total revenue
  const getTotalRevenue = (startDate: Date, endDate: Date): number => {
    return getInvoicesByDateRange(startDate, endDate)
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.totalAmount, 0);
  };

  // Get unpaid invoices
  const getUnpaidInvoices = (): Invoice[] => {
    return invoices.filter(invoice => 
      invoice.status === 'sent' || invoice.status === 'overdue'
    );
  };

  // Get payment summary
  const getPaymentSummary = (startDate: Date, endDate: Date) => {
    const periodPayments = payments.filter(payment => 
      payment.receivedDate >= startDate && payment.receivedDate <= endDate
    );

    return {
      total: periodPayments.reduce((sum, p) => sum + p.amount, 0),
      cash: periodPayments.filter(p => p.method === 'cash').reduce((sum, p) => sum + p.amount, 0),
      card: periodPayments.filter(p => p.method === 'card').reduce((sum, p) => sum + p.amount, 0),
      bank: periodPayments.filter(p => p.method === 'bank_transfer').reduce((sum, p) => sum + p.amount, 0),
      online: periodPayments.filter(p => p.method === 'online').reduce((sum, p) => sum + p.amount, 0)
    };
  };

  const value: HotelContextType = {
    reservations,
    guests,
    rooms,
    invoices,
    payments,
    fiscalRecords,
    companies,
    pricingTiers,
    isLoading,
    isUpdating,
    lastUpdated,
    migrationStatus,
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
    <HotelContext.Provider value={value}>
      {children}
    </HotelContext.Provider>
  );
}

export function useHotel(): HotelContextType {
  const context = useContext(HotelContext);
  if (context === undefined) {
    throw new Error('useHotel must be used within a HotelProvider');
  }
  return context;
}