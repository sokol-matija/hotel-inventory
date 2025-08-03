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
  PaymentStatus 
} from '../types';
import { SAMPLE_RESERVATIONS, SAMPLE_GUESTS } from '../sampleData';
import { HOTEL_POREC_ROOMS, HOTEL_POREC } from '../hotelData';

interface HotelContextType {
  // Data state
  reservations: Reservation[];
  guests: Guest[];
  rooms: Room[];
  invoices: Invoice[];
  payments: Payment[];
  fiscalRecords: FiscalRecord[];
  
  // Loading states
  isUpdating: boolean;
  lastUpdated: Date;
  
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
  refreshData: () => void;
}

const HotelContext = createContext<HotelContextType | undefined>(undefined);

const STORAGE_KEYS = {
  RESERVATIONS: 'hotel_reservations_v1',
  GUESTS: 'hotel_guests_v1',
  INVOICES: 'hotel_invoices_v1',
  PAYMENTS: 'hotel_payments_v1',
  FISCAL_RECORDS: 'hotel_fiscal_records_v1',
  LAST_SYNC: 'hotel_last_sync_v1'
};

export function HotelProvider({ children }: { children: React.ReactNode }) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [rooms] = useState<Room[]>(HOTEL_POREC_ROOMS);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [fiscalRecords, setFiscalRecords] = useState<FiscalRecord[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Initialize data from localStorage or use sample data
  useEffect(() => {
    // Initialize reservations
    const storedReservations = localStorage.getItem(STORAGE_KEYS.RESERVATIONS);
    if (storedReservations) {
      try {
        const parsed = JSON.parse(storedReservations);
        // Convert date strings back to Date objects
        const reservationsWithDates = parsed.map((res: any) => ({
          ...res,
          checkIn: new Date(res.checkIn),
          checkOut: new Date(res.checkOut),
          bookingDate: new Date(res.bookingDate),
          lastModified: new Date(res.lastModified)
        }));
        setReservations(reservationsWithDates);
      } catch (error) {
        console.error('Failed to parse stored reservations:', error);
        setReservations(SAMPLE_RESERVATIONS);
      }
    } else {
      setReservations(SAMPLE_RESERVATIONS);
    }

    // Initialize guests
    const storedGuests = localStorage.getItem(STORAGE_KEYS.GUESTS);
    if (storedGuests) {
      try {
        const parsed = JSON.parse(storedGuests);
        // Convert date strings back to Date objects for children
        const guestsWithDates = parsed.map((guest: any) => ({
          ...guest,
          dateOfBirth: guest.dateOfBirth ? new Date(guest.dateOfBirth) : undefined,
          children: guest.children?.map((child: any) => ({
            ...child,
            dateOfBirth: new Date(child.dateOfBirth)
          })) || []
        }));
        setGuests(guestsWithDates);
      } catch (error) {
        console.error('Failed to parse stored guests:', error);
        setGuests(SAMPLE_GUESTS);
      }
    } else {
      setGuests(SAMPLE_GUESTS);
    }

    // Initialize financial data (invoices, payments, fiscal records)
    const storedInvoices = localStorage.getItem(STORAGE_KEYS.INVOICES);
    if (storedInvoices) {
      try {
        const parsed = JSON.parse(storedInvoices);
        const invoicesWithDates = parsed.map((invoice: any) => ({
          ...invoice,
          issueDate: new Date(invoice.issueDate),
          dueDate: new Date(invoice.dueDate),
          paidDate: invoice.paidDate ? new Date(invoice.paidDate) : undefined,
          createdAt: new Date(invoice.createdAt),
          updatedAt: new Date(invoice.updatedAt),
          payments: invoice.payments?.map((payment: any) => ({
            ...payment,
            receivedDate: new Date(payment.receivedDate),
            processedDate: payment.processedDate ? new Date(payment.processedDate) : undefined,
            createdAt: new Date(payment.createdAt)
          })) || []
        }));
        setInvoices(invoicesWithDates);
      } catch (error) {
        console.error('Failed to parse stored invoices:', error);
        setInvoices([]);
      }
    } else {
      // Generate sample invoices from checked-out reservations
      generateSampleFinancialData();
    }

    const storedPayments = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
    if (storedPayments) {
      try {
        const parsed = JSON.parse(storedPayments);
        const paymentsWithDates = parsed.map((payment: any) => ({
          ...payment,
          receivedDate: new Date(payment.receivedDate),
          processedDate: payment.processedDate ? new Date(payment.processedDate) : undefined,
          createdAt: new Date(payment.createdAt)
        }));
        setPayments(paymentsWithDates);
      } catch (error) {
        console.error('Failed to parse stored payments:', error);
        setPayments([]);
      }
    }

    const storedFiscalRecords = localStorage.getItem(STORAGE_KEYS.FISCAL_RECORDS);
    if (storedFiscalRecords) {
      try {
        const parsed = JSON.parse(storedFiscalRecords);
        const fiscalRecordsWithDates = parsed.map((record: any) => ({
          ...record,
          submittedAt: new Date(record.submittedAt),
          createdAt: new Date(record.createdAt)
        }));
        setFiscalRecords(fiscalRecordsWithDates);
      } catch (error) {
        console.error('Failed to parse stored fiscal records:', error);
        setFiscalRecords([]);
      }
    }
  }, []);

  // Save to localStorage whenever data changes
  const saveReservationsToStorage = (updatedReservations: Reservation[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.RESERVATIONS, JSON.stringify(updatedReservations));
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to save reservations to localStorage:', error);
    }
  };

  const saveGuestsToStorage = (updatedGuests: Guest[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.GUESTS, JSON.stringify(updatedGuests));
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to save guests to localStorage:', error);
    }
  };

  const saveInvoicesToStorage = (updatedInvoices: Invoice[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(updatedInvoices));
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to save invoices to localStorage:', error);
    }
  };

  const savePaymentsToStorage = (updatedPayments: Payment[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(updatedPayments));
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to save payments to localStorage:', error);
    }
  };

  const saveFiscalRecordsToStorage = (updatedRecords: FiscalRecord[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.FISCAL_RECORDS, JSON.stringify(updatedRecords));
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to save fiscal records to localStorage:', error);
    }
  };

  // Generate sample financial data from checked-out reservations
  const generateSampleFinancialData = () => {
    const checkedOutReservations = SAMPLE_RESERVATIONS.filter(res => res.status === 'checked-out');
    
    const sampleInvoices: Invoice[] = checkedOutReservations.map((reservation, index) => {
      const invoiceDate = new Date(reservation.checkOut);
      invoiceDate.setHours(12, 0, 0, 0); // Set to noon for consistency
      
      const invoice: Invoice = {
        id: `inv-${Date.now()}-${index}`,
        invoiceNumber: `2025-001-${String(index + 1).padStart(4, '0')}`,
        reservationId: reservation.id,
        guestId: reservation.guestId,
        roomId: reservation.roomId,
        issueDate: invoiceDate,
        dueDate: new Date(invoiceDate.getTime() + (30 * 24 * 60 * 60 * 1000)), // 30 days
        paidDate: Math.random() > 0.3 ? invoiceDate : undefined, // 70% paid immediately
        status: Math.random() > 0.3 ? 'paid' : 'sent' as InvoiceStatus,
        subtotal: reservation.subtotal,
        vatAmount: reservation.vatAmount,
        tourismTax: reservation.tourismTax,
        petFee: reservation.petFee,
        parkingFee: reservation.parkingFee,
        additionalCharges: reservation.additionalCharges,
        totalAmount: reservation.totalAmount,
        fiscalData: {
          oib: HOTEL_POREC.taxId,
          jir: `jir-${Math.random().toString(36).substr(2, 16)}`,
          zki: `zki-${Math.random().toString(36).substr(2, 16)}`,
          fiscalReceiptUrl: `https://porezna-uprava.gov.hr/racun/${Math.random().toString(36).substr(2, 10)}`,
          operatorOib: '12345678901'
        },
        payments: [],
        remainingAmount: Math.random() > 0.3 ? 0 : reservation.totalAmount,
        notes: `Invoice generated for stay from ${reservation.checkIn.toLocaleDateString()} to ${reservation.checkOut.toLocaleDateString()}`,
        createdAt: invoiceDate,
        updatedAt: invoiceDate
      };

      // Generate payment if invoice is paid
      if (invoice.status === 'paid' && invoice.paidDate) {
        const payment: Payment = {
          id: `pay-${Date.now()}-${index}`,
          invoiceId: invoice.id,
          amount: invoice.totalAmount,
          method: ['cash', 'card', 'bank-transfer'][Math.floor(Math.random() * 3)] as PaymentMethod,
          status: 'paid',
          receivedDate: invoice.paidDate,
          processedDate: invoice.paidDate,
          processedBy: 'Front Desk Staff',
          notes: 'Payment received at checkout',
          createdAt: invoice.paidDate
        };
        invoice.payments = [payment];
      }

      return invoice;
    });

    setInvoices(sampleInvoices);
    saveInvoicesToStorage(sampleInvoices);
  };

  // Update reservation status with optimistic updates
  const updateReservationStatus = async (reservationId: string, newStatus: ReservationStatus): Promise<void> => {
    const originalReservations = [...reservations];
    
    // 1. Optimistic update (immediate UI change)
    const updatedReservations = reservations.map(reservation =>
      reservation.id === reservationId
        ? { ...reservation, status: newStatus, lastModified: new Date() }
        : reservation
    );
    
    setReservations(updatedReservations);
    setIsUpdating(true);

    try {
      // 2. Simulate API call delay (replace with real API later)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 3. Persist to localStorage
      saveReservationsToStorage(updatedReservations);
      
      // 4. Success feedback (handled by calling component)
      console.log(`Reservation ${reservationId} status updated to ${newStatus}`);
      
    } catch (error) {
      // 5. Rollback on failure
      console.error('Failed to update reservation status:', error);
      setReservations(originalReservations);
      throw error; // Re-throw for component error handling
    } finally {
      setIsUpdating(false);
    }
  };

  // Update reservation notes
  const updateReservationNotes = async (reservationId: string, notes: string): Promise<void> => {
    const originalReservations = [...reservations];
    
    // Optimistic update
    const updatedReservations = reservations.map(reservation =>
      reservation.id === reservationId
        ? { ...reservation, specialRequests: notes, lastModified: new Date() }
        : reservation
    );
    
    setReservations(updatedReservations);
    setIsUpdating(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Persist to localStorage
      saveReservationsToStorage(updatedReservations);
      
    } catch (error) {
      console.error('Failed to update reservation notes:', error);
      setReservations(originalReservations);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  // Update reservation (for moving rooms, changing dates, etc.)
  const updateReservation = async (reservationId: string, updates: Partial<Reservation>): Promise<void> => {
    const originalReservations = [...reservations];
    
    // Optimistic update
    const updatedReservations = reservations.map(reservation =>
      reservation.id === reservationId
        ? { ...reservation, ...updates, lastModified: new Date() }
        : reservation
    );
    
    setReservations(updatedReservations);
    setIsUpdating(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Persist to localStorage
      saveReservationsToStorage(updatedReservations);
      
      console.log(`Reservation ${reservationId} updated successfully`);
      
    } catch (error) {
      console.error('Failed to update reservation:', error);
      setReservations(originalReservations);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  // Create new reservation
  const createReservation = async (reservationData: Omit<Reservation, 'id' | 'bookingDate' | 'lastModified'>): Promise<void> => {
    const newReservation: Reservation = {
      ...reservationData,
      id: `res-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      bookingDate: new Date(),
      lastModified: new Date()
    };

    const updatedReservations = [...reservations, newReservation];
    setReservations(updatedReservations);
    setIsUpdating(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Persist to localStorage
      saveReservationsToStorage(updatedReservations);
      
      console.log(`Reservation ${newReservation.id} created successfully`);
      
    } catch (error) {
      console.error('Failed to create reservation:', error);
      setReservations(reservations); // Rollback
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  // Delete reservation
  const deleteReservation = async (reservationId: string): Promise<void> => {
    const originalReservations = [...reservations];
    
    // Optimistic update - remove the reservation immediately
    const updatedReservations = reservations.filter(reservation => reservation.id !== reservationId);
    setReservations(updatedReservations);
    setIsUpdating(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Persist to localStorage
      saveReservationsToStorage(updatedReservations);
      
      console.log(`Reservation ${reservationId} deleted successfully`);
      
    } catch (error) {
      console.error('Failed to delete reservation:', error);
      setReservations(originalReservations); // Rollback
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  // Create new guest
  const createGuest = async (guestData: Omit<Guest, 'id' | 'totalStays'>): Promise<void> => {
    const newGuest: Guest = {
      ...guestData,
      id: `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      totalStays: 0
    };

    const updatedGuests = [...guests, newGuest];
    setGuests(updatedGuests);
    setIsUpdating(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Persist to localStorage
      saveGuestsToStorage(updatedGuests);
      
      console.log(`Guest ${newGuest.name} created successfully`);
      
    } catch (error) {
      console.error('Failed to create guest:', error);
      setGuests(guests); // Rollback
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  // Update guest information
  const updateGuest = async (guestId: string, updates: Partial<Guest>): Promise<void> => {
    const originalGuests = [...guests];
    
    // Optimistic update
    const updatedGuests = guests.map(guest =>
      guest.id === guestId
        ? { ...guest, ...updates }
        : guest
    );
    
    setGuests(updatedGuests);
    setIsUpdating(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Persist to localStorage
      saveGuestsToStorage(updatedGuests);
      
      console.log(`Guest ${guestId} updated successfully`);
      
    } catch (error) {
      console.error('Failed to update guest:', error);
      setGuests(originalGuests); // Rollback
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
      guest.name.toLowerCase().includes(searchTerm) ||
      guest.email.toLowerCase().includes(searchTerm) ||
      guest.phone.toLowerCase().includes(searchTerm) ||
      guest.nationality.toLowerCase().includes(searchTerm)
    );
  };

  // Get guest stay history
  const getGuestStayHistory = (guestId: string): Reservation[] => {
    return reservations
      .filter(reservation => reservation.guestId === guestId)
      .sort((a, b) => b.checkIn.getTime() - a.checkIn.getTime());
  };

  // Refresh data from storage
  const refreshData = () => {
    const storedReservations = localStorage.getItem(STORAGE_KEYS.RESERVATIONS);
    if (storedReservations) {
      try {
        const parsed = JSON.parse(storedReservations);
        const reservationsWithDates = parsed.map((res: any) => ({
          ...res,
          checkIn: new Date(res.checkIn),
          checkOut: new Date(res.checkOut),
          bookingDate: new Date(res.bookingDate),
          lastModified: new Date(res.lastModified)
        }));
        setReservations(reservationsWithDates);
        setLastUpdated(new Date());
      } catch (error) {
        console.error('Failed to refresh reservations:', error);
      }
    }
  };

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
      roomId: reservation.roomId,
      issueDate: invoiceDate,
      dueDate: new Date(invoiceDate.getTime() + (30 * 24 * 60 * 60 * 1000)), // 30 days
      status: 'sent',
      subtotal: reservation.subtotal,
      vatAmount: reservation.vatAmount,
      tourismTax: reservation.tourismTax,
      petFee: reservation.petFee,
      parkingFee: reservation.parkingFee,
      additionalCharges: reservation.additionalCharges,
      totalAmount: reservation.totalAmount,
      fiscalData: {
        oib: HOTEL_POREC.taxId,
        jir: `jir-${Math.random().toString(36).substr(2, 16)}`,
        zki: `zki-${Math.random().toString(36).substr(2, 16)}`,
        operatorOib: '12345678901'
      },
      payments: [],
      remainingAmount: reservation.totalAmount,
      notes: `Invoice generated for stay from ${reservation.checkIn.toLocaleDateString()} to ${reservation.checkOut.toLocaleDateString()}`,
      createdAt: invoiceDate,
      updatedAt: invoiceDate
    };

    const updatedInvoices = [...invoices, invoice];
    setInvoices(updatedInvoices);
    setIsUpdating(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      saveInvoicesToStorage(updatedInvoices);
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
      saveInvoicesToStorage(updatedInvoices);
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
        const updatedPayments = [...invoice.payments, payment];
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
      saveInvoicesToStorage(updatedInvoices);
      savePaymentsToStorage(updatedPayments);
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
      savePaymentsToStorage(updatedPayments);
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
    const additionalRevenue = paidInvoices.reduce((sum, inv) => sum + inv.additionalCharges + inv.petFee + inv.parkingFee, 0);

    return {
      period,
      startDate,
      endDate,
      totalRevenue,
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
      bankTransfers: payments.filter(p => p.method === 'bank-transfer').reduce((sum, p) => sum + p.amount, 0),
      onlinePayments: payments.filter(p => p.method === 'booking-com').reduce((sum, p) => sum + p.amount, 0),
      totalInvoices: periodInvoices.length,
      averageBookingValue: totalRevenue / (paidInvoices.length || 1),
      occupancyRate: 0, // TODO: Calculate from reservations
      fiscalReportsGenerated: fiscalRecords.length,
      fiscalSubmissions: fiscalRecords.filter(r => r.isValid).length
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
      bank: periodPayments.filter(p => p.method === 'bank-transfer').reduce((sum, p) => sum + p.amount, 0),
      online: periodPayments.filter(p => p.method === 'booking-com').reduce((sum, p) => sum + p.amount, 0)
    };
  };

  const value: HotelContextType = {
    reservations,
    guests,
    rooms,
    invoices,
    payments,
    fiscalRecords,
    isUpdating,
    lastUpdated,
    updateReservationStatus,
    updateReservationNotes,
    updateReservation,
    createReservation,
    deleteReservation,
    createGuest,
    updateGuest,
    findGuestsByName,
    getGuestStayHistory,
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