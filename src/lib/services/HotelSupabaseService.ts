// HotelSupabaseService - Main service for hotel management data operations
// Replaces localStorage operations with Supabase database calls

import { supabase } from '../supabase';
import { 
  Reservation, 
  Guest, 
  Company, 
  PricingTier, 
  Invoice, 
  Payment, 
  FiscalRecord,
  ReservationStatus 
} from '../hotel/types';

export interface HotelSupabaseServiceInterface {
  // Guests
  getGuests(): Promise<Guest[]>;
  createGuest(guest: Omit<Guest, 'id' | 'totalStays'>): Promise<Guest>;
  updateGuest(id: string, updates: Partial<Guest>): Promise<void>;
  deleteGuest(id: string): Promise<void>;
  findGuestsByName(query: string): Promise<Guest[]>;
  
  // Reservations
  getReservations(): Promise<Reservation[]>;
  createReservation(reservation: Omit<Reservation, 'id' | 'bookingDate' | 'lastModified'>): Promise<Reservation>;
  updateReservation(id: string, updates: Partial<Reservation>): Promise<void>;
  updateReservationStatus(id: string, status: ReservationStatus): Promise<void>;
  deleteReservation(id: string): Promise<void>;
  
  // Companies
  getCompanies(): Promise<Company[]>;
  createCompany(company: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>): Promise<Company>;
  updateCompany(id: string, updates: Partial<Company>): Promise<void>;
  deleteCompany(id: string): Promise<void>;
  findCompaniesByName(query: string): Promise<Company[]>;
  findCompanyByOIB(oib: string): Promise<Company | null>;
  
  // Pricing Tiers
  getPricingTiers(): Promise<PricingTier[]>;
  createPricingTier(tier: Omit<PricingTier, 'id' | 'createdAt' | 'updatedAt'>): Promise<PricingTier>;
  updatePricingTier(id: string, updates: Partial<PricingTier>): Promise<void>;
  deletePricingTier(id: string): Promise<void>;
  getActivePricingTiers(): Promise<PricingTier[]>;
  getDefaultPricingTier(): Promise<PricingTier | null>;
  
  // Invoices
  getInvoices(): Promise<Invoice[]>;
  createInvoice(invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>): Promise<Invoice>;
  updateInvoice(id: string, updates: Partial<Invoice>): Promise<void>;
  deleteInvoice(id: string): Promise<void>;
  getInvoicesByGuest(guestId: string): Promise<Invoice[]>;
  getInvoicesByCompany(companyId: string): Promise<Invoice[]>;
  
  // Payments
  getPayments(): Promise<Payment[]>;
  createPayment(payment: Omit<Payment, 'id' | 'createdAt'>): Promise<Payment>;
  updatePayment(id: string, updates: Partial<Payment>): Promise<void>;
  deletePayment(id: string): Promise<void>;
  getPaymentsByInvoice(invoiceId: string): Promise<Payment[]>;
  
  // Fiscal Records
  getFiscalRecords(): Promise<FiscalRecord[]>;
  createFiscalRecord(record: Omit<FiscalRecord, 'id' | 'createdAt'>): Promise<FiscalRecord>;
  updateFiscalRecord(id: string, updates: Partial<FiscalRecord>): Promise<void>;
  deleteFiscalRecord(id: string): Promise<void>;
}

class HotelSupabaseService implements HotelSupabaseServiceInterface {
  private static instance: HotelSupabaseService;
  
  static getInstance(): HotelSupabaseService {
    if (!HotelSupabaseService.instance) {
      HotelSupabaseService.instance = new HotelSupabaseService();
    }
    return HotelSupabaseService.instance;
  }

  // =====================================
  // GUEST OPERATIONS
  // =====================================
  
  async getGuests(): Promise<Guest[]> {
    const { data, error } = await supabase
      .from('guests')
      .select('*')
      .order('last_name', { ascending: true });
      
    if (error) throw error;
    return this.mapGuestsFromDatabase(data || []);
  }
  
  async createGuest(guestData: Omit<Guest, 'id' | 'totalStays'>): Promise<Guest> {
    const dbGuest = this.mapGuestToDatabase(guestData);
    
    const { data, error } = await supabase
      .from('guests')
      .insert(dbGuest)
      .select()
      .single();
      
    if (error) throw error;
    return this.mapGuestFromDatabase(data);
  }
  
  async updateGuest(id: string, updates: Partial<Guest>): Promise<void> {
    const dbUpdates = this.mapGuestToDatabase(updates);
    
    const { error } = await supabase
      .from('guests')
      .update(dbUpdates)
      .eq('id', id);
      
    if (error) throw error;
  }
  
  async deleteGuest(id: string): Promise<void> {
    const { error } = await supabase
      .from('guests')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  }
  
  async findGuestsByName(query: string): Promise<Guest[]> {
    const { data, error } = await supabase
      .from('guests')
      .select('*')
      .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
      .order('last_name', { ascending: true });
      
    if (error) throw error;
    return this.mapGuestsFromDatabase(data || []);
  }

  // =====================================
  // RESERVATION OPERATIONS  
  // =====================================
  
  async getReservations(): Promise<Reservation[]> {
    const { data, error } = await supabase
      .from('reservations')
      .select(`
        *,
        guest:guests(*),
        room:rooms(*),
        company:companies(*),
        pricing_tier:pricing_tiers(*)
      `)
      .order('check_in_date', { ascending: true });
      
    if (error) throw error;
    return this.mapReservationsFromDatabase(data || []);
  }
  
  async createReservation(reservationData: Omit<Reservation, 'id' | 'bookingDate' | 'lastModified'>): Promise<Reservation> {
    const dbReservation = this.mapReservationToDatabase(reservationData);
    
    const { data, error } = await supabase
      .from('reservations')
      .insert(dbReservation)
      .select(`
        *,
        guest:guests(*),
        room:rooms(*),
        company:companies(*),
        pricing_tier:pricing_tiers(*)
      `)
      .single();
      
    if (error) throw error;
    return this.mapReservationFromDatabase(data);
  }
  
  async updateReservation(id: string, updates: Partial<Reservation>): Promise<void> {
    const dbUpdates = this.mapReservationToDatabase(updates);
    
    const { error } = await supabase
      .from('reservations')
      .update({ ...dbUpdates, last_modified: new Date().toISOString() })
      .eq('id', id);
      
    if (error) throw error;
  }
  
  async updateReservationStatus(id: string, status: ReservationStatus): Promise<void> {
    const updates: any = { 
      status, 
      last_modified: new Date().toISOString() 
    };
    
    // Set check-in/check-out timestamps based on status
    if (status === 'checked-in') {
      updates.checked_in_at = new Date().toISOString();
    } else if (status === 'checked-out') {
      updates.checked_out_at = new Date().toISOString();
    }
    
    const { error } = await supabase
      .from('reservations')
      .update(updates)
      .eq('id', id);
      
    if (error) throw error;
  }
  
  async deleteReservation(id: string): Promise<void> {
    const { error } = await supabase
      .from('reservations')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  }

  // =====================================
  // COMPANY OPERATIONS
  // =====================================
  
  async getCompanies(): Promise<Company[]> {
    const { data, error } = await supabase
      .from('companies')
      .select(`
        *,
        pricing_tier:pricing_tiers(*)
      `)
      .eq('is_active', true)
      .order('name', { ascending: true });
      
    if (error) throw error;
    return this.mapCompaniesFromDatabase(data || []);
  }
  
  async createCompany(companyData: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>): Promise<Company> {
    const dbCompany = this.mapCompanyToDatabase(companyData);
    
    const { data, error } = await supabase
      .from('companies')
      .insert(dbCompany)
      .select(`
        *,
        pricing_tier:pricing_tiers(*)
      `)
      .single();
      
    if (error) throw error;
    return this.mapCompanyFromDatabase(data);
  }
  
  async updateCompany(id: string, updates: Partial<Company>): Promise<void> {
    const dbUpdates = this.mapCompanyToDatabase(updates);
    
    const { error } = await supabase
      .from('companies')
      .update(dbUpdates)
      .eq('id', id);
      
    if (error) throw error;
  }
  
  async deleteCompany(id: string): Promise<void> {
    const { error } = await supabase
      .from('companies')
      .update({ is_active: false })
      .eq('id', id);
      
    if (error) throw error;
  }
  
  async findCompaniesByName(query: string): Promise<Company[]> {
    const { data, error } = await supabase
      .from('companies')
      .select(`
        *,
        pricing_tier:pricing_tiers(*)
      `)
      .ilike('name', `%${query}%`)
      .eq('is_active', true)
      .order('name', { ascending: true });
      
    if (error) throw error;
    return this.mapCompaniesFromDatabase(data || []);
  }
  
  async findCompanyByOIB(oib: string): Promise<Company | null> {
    const { data, error } = await supabase
      .from('companies')
      .select(`
        *,
        pricing_tier:pricing_tiers(*)
      `)
      .eq('oib', oib)
      .eq('is_active', true)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') return null; // No rows found
      throw error;
    }
    
    return this.mapCompanyFromDatabase(data);
  }

  // =====================================
  // PRICING TIER OPERATIONS
  // =====================================
  
  async getPricingTiers(): Promise<PricingTier[]> {
    const { data, error } = await supabase
      .from('pricing_tiers')
      .select('*')
      .order('name', { ascending: true });
      
    if (error) throw error;
    return this.mapPricingTiersFromDatabase(data || []);
  }
  
  async createPricingTier(tierData: Omit<PricingTier, 'id' | 'createdAt' | 'updatedAt'>): Promise<PricingTier> {
    const dbTier = this.mapPricingTierToDatabase(tierData);
    
    const { data, error } = await supabase
      .from('pricing_tiers')
      .insert(dbTier)
      .select()
      .single();
      
    if (error) throw error;
    return this.mapPricingTierFromDatabase(data);
  }
  
  async updatePricingTier(id: string, updates: Partial<PricingTier>): Promise<void> {
    const dbUpdates = this.mapPricingTierToDatabase(updates);
    
    const { error } = await supabase
      .from('pricing_tiers')
      .update(dbUpdates)
      .eq('id', id);
      
    if (error) throw error;
  }
  
  async deletePricingTier(id: string): Promise<void> {
    const { error } = await supabase
      .from('pricing_tiers')
      .update({ is_active: false })
      .eq('id', id);
      
    if (error) throw error;
  }
  
  async getActivePricingTiers(): Promise<PricingTier[]> {
    const { data, error } = await supabase
      .from('pricing_tiers')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });
      
    if (error) throw error;
    return this.mapPricingTiersFromDatabase(data || []);
  }
  
  async getDefaultPricingTier(): Promise<PricingTier | null> {
    const { data, error } = await supabase
      .from('pricing_tiers')
      .select('*')
      .eq('is_default', true)
      .eq('is_active', true)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    
    return this.mapPricingTierFromDatabase(data);
  }

  // =====================================
  // INVOICE OPERATIONS
  // =====================================
  
  async getInvoices(): Promise<Invoice[]> {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        guest:guests(*),
        company:companies(*),
        reservation:reservations(*)
      `)
      .order('issue_date', { ascending: false });
      
    if (error) throw error;
    return this.mapInvoicesFromDatabase(data || []);
  }
  
  async createInvoice(invoiceData: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>): Promise<Invoice> {
    const dbInvoice = this.mapInvoiceToDatabase(invoiceData);
    
    const { data, error } = await supabase
      .from('invoices')
      .insert(dbInvoice)
      .select(`
        *,
        guest:guests(*),
        company:companies(*),
        reservation:reservations(*)
      `)
      .single();
      
    if (error) throw error;
    return this.mapInvoiceFromDatabase(data);
  }
  
  async updateInvoice(id: string, updates: Partial<Invoice>): Promise<void> {
    const dbUpdates = this.mapInvoiceToDatabase(updates);
    
    const { error } = await supabase
      .from('invoices')
      .update(dbUpdates)
      .eq('id', id);
      
    if (error) throw error;
  }
  
  async deleteInvoice(id: string): Promise<void> {
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  }
  
  async getInvoicesByGuest(guestId: string): Promise<Invoice[]> {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        guest:guests(*),
        company:companies(*),
        reservation:reservations(*)
      `)
      .eq('guest_id', guestId)
      .order('issue_date', { ascending: false });
      
    if (error) throw error;
    return this.mapInvoicesFromDatabase(data || []);
  }
  
  async getInvoicesByCompany(companyId: string): Promise<Invoice[]> {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        guest:guests(*),
        company:companies(*),
        reservation:reservations(*)
      `)
      .eq('company_id', companyId)
      .order('issue_date', { ascending: false });
      
    if (error) throw error;
    return this.mapInvoicesFromDatabase(data || []);
  }

  // =====================================
  // PAYMENT OPERATIONS
  // =====================================
  
  async getPayments(): Promise<Payment[]> {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        invoice:invoices(*),
        reservation:reservations(*)
      `)
      .order('received_date', { ascending: false });
      
    if (error) throw error;
    return this.mapPaymentsFromDatabase(data || []);
  }
  
  async createPayment(paymentData: Omit<Payment, 'id' | 'createdAt'>): Promise<Payment> {
    const dbPayment = this.mapPaymentToDatabase(paymentData);
    
    const { data, error } = await supabase
      .from('payments')
      .insert(dbPayment)
      .select(`
        *,
        invoice:invoices(*),
        reservation:reservations(*)
      `)
      .single();
      
    if (error) throw error;
    return this.mapPaymentFromDatabase(data);
  }
  
  async updatePayment(id: string, updates: Partial<Payment>): Promise<void> {
    const dbUpdates = this.mapPaymentToDatabase(updates);
    
    const { error } = await supabase
      .from('payments')
      .update(dbUpdates)
      .eq('id', id);
      
    if (error) throw error;
  }
  
  async deletePayment(id: string): Promise<void> {
    const { error } = await supabase
      .from('payments')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  }
  
  async getPaymentsByInvoice(invoiceId: string): Promise<Payment[]> {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        invoice:invoices(*),
        reservation:reservations(*)
      `)
      .eq('invoice_id', invoiceId)
      .order('received_date', { ascending: false });
      
    if (error) throw error;
    return this.mapPaymentsFromDatabase(data || []);
  }

  // =====================================
  // FISCAL RECORD OPERATIONS
  // =====================================
  
  async getFiscalRecords(): Promise<FiscalRecord[]> {
    const { data, error } = await supabase
      .from('fiscal_records')
      .select(`
        *,
        invoice:invoices(*)
      `)
      .order('submitted_at', { ascending: false });
      
    if (error) throw error;
    return this.mapFiscalRecordsFromDatabase(data || []);
  }
  
  async createFiscalRecord(recordData: Omit<FiscalRecord, 'id' | 'createdAt'>): Promise<FiscalRecord> {
    const dbRecord = this.mapFiscalRecordToDatabase(recordData);
    
    const { data, error } = await supabase
      .from('fiscal_records')
      .insert(dbRecord)
      .select(`
        *,
        invoice:invoices(*)
      `)
      .single();
      
    if (error) throw error;
    return this.mapFiscalRecordFromDatabase(data);
  }
  
  async updateFiscalRecord(id: string, updates: Partial<FiscalRecord>): Promise<void> {
    const dbUpdates = this.mapFiscalRecordToDatabase(updates);
    
    const { error } = await supabase
      .from('fiscal_records')
      .update(dbUpdates)
      .eq('id', id);
      
    if (error) throw error;
  }
  
  async deleteFiscalRecord(id: string): Promise<void> {
    const { error } = await supabase
      .from('fiscal_records')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  }

  // =====================================
  // MAPPING FUNCTIONS (Database ↔ TypeScript)
  // =====================================
  
  private mapGuestsFromDatabase(dbGuests: any[]): Guest[] {
    return dbGuests.map(guest => this.mapGuestFromDatabase(guest));
  }
  
  private mapGuestFromDatabase(dbGuest: any): Guest {
    return {
      id: dbGuest.id.toString(),
      firstName: dbGuest.first_name,
      lastName: dbGuest.last_name,
      fullName: `${dbGuest.first_name} ${dbGuest.last_name}`.trim(),
      email: dbGuest.email,
      phone: dbGuest.phone,
      dateOfBirth: dbGuest.date_of_birth ? new Date(dbGuest.date_of_birth) : undefined,
      nationality: dbGuest.nationality,
      passportNumber: dbGuest.passport_number,
      idCardNumber: dbGuest.id_card_number,
      preferredLanguage: dbGuest.preferred_language || 'en',
      dietaryRestrictions: dbGuest.dietary_restrictions || [],
      specialNeeds: dbGuest.special_needs,
      hasPets: dbGuest.has_pets || false,
      isVip: dbGuest.is_vip || false,
      vipLevel: dbGuest.vip_level || 0,
      children: [], // Will be loaded separately if needed
      totalStays: dbGuest.total_stays || 0,
      emergencyContactName: dbGuest.emergency_contact_name,
      emergencyContactPhone: dbGuest.emergency_contact_phone,
      createdAt: new Date(dbGuest.created_at),
      updatedAt: new Date(dbGuest.updated_at)
    };
  }
  
  private mapGuestToDatabase(guest: Partial<Guest>): any {
    return {
      first_name: guest.firstName,
      last_name: guest.lastName,
      email: guest.email,
      phone: guest.phone,
      date_of_birth: guest.dateOfBirth?.toISOString()?.split('T')[0],
      nationality: guest.nationality,
      passport_number: guest.passportNumber,
      id_card_number: guest.idCardNumber,
      preferred_language: guest.preferredLanguage,
      dietary_restrictions: guest.dietaryRestrictions,
      special_needs: guest.specialNeeds,
      has_pets: guest.hasPets,
      is_vip: guest.isVip,
      vip_level: guest.vipLevel,
      emergency_contact_name: guest.emergencyContactName,
      emergency_contact_phone: guest.emergencyContactPhone,
      total_stays: guest.totalStays,
      updated_at: new Date().toISOString()
    };
  }

  // =====================================
  // RESERVATION MAPPING FUNCTIONS
  // =====================================
  
  private mapReservationsFromDatabase(dbReservations: any[]): Reservation[] {
    return dbReservations.map(res => this.mapReservationFromDatabase(res));
  }
  
  private mapReservationFromDatabase(dbReservation: any): Reservation {
    return {
      id: dbReservation.id.toString(),
      roomId: dbReservation.room_id,
      guestId: dbReservation.guest_id,
      guest: dbReservation.guest ? this.mapGuestFromDatabase(dbReservation.guest) : undefined,
      checkIn: new Date(dbReservation.check_in_date),
      checkOut: new Date(dbReservation.check_out_date),
      numberOfGuests: dbReservation.number_of_guests,
      adults: dbReservation.adults,
      children: dbReservation.children || [],
      bookingSource: dbReservation.booking_source,
      status: dbReservation.status,
      specialRequests: dbReservation.special_requests || '',
      
      // Corporate booking
      companyId: dbReservation.company_id,
      pricingTierId: dbReservation.pricing_tier_id,
      
      // Pricing object for service consistency
      pricing: {
        subtotal: parseFloat(dbReservation.subtotal || '0'),
        tourismTax: parseFloat(dbReservation.tourism_tax || '0'),
        vatRate: parseFloat(dbReservation.vat_rate || '0.25'),
        vatAmount: parseFloat(dbReservation.vat_amount || '0'),
        total: parseFloat(dbReservation.total_amount || '0'),
        roomRate: parseFloat(dbReservation.room_rate || '0'),
        seasonalPeriod: dbReservation.seasonal_period || 'C',
        discounts: parseFloat(dbReservation.discounts || '0'),
        additionalCharges: parseFloat(dbReservation.additional_charges || '0')
      },
      
      // Flat properties for backward compatibility
      seasonalPeriod: dbReservation.seasonal_period || 'C',
      baseRoomRate: parseFloat(dbReservation.room_rate || '0'),
      numberOfNights: Math.max(1, Math.ceil((new Date(dbReservation.check_out_date).getTime() - new Date(dbReservation.check_in_date).getTime()) / (1000 * 60 * 60 * 24))),
      subtotal: parseFloat(dbReservation.subtotal || '0'),
      childrenDiscounts: parseFloat(dbReservation.discounts || '0'),
      tourismTax: parseFloat(dbReservation.tourism_tax || '0'),
      vatAmount: parseFloat(dbReservation.vat_amount || '0'),
      petFee: parseFloat(dbReservation.pet_fee || '0'),
      parkingFee: parseFloat(dbReservation.parking_fee || '0'),
      shortStaySuplement: parseFloat(dbReservation.short_stay_supplement || '0'),
      additionalCharges: parseFloat(dbReservation.additional_charges || '0'),
      roomServiceItems: [],
      totalAmount: parseFloat(dbReservation.total_amount || '0'),
      
      // Payment status
      paymentStatus: dbReservation.payment_status || 'pending',
      
      // Timestamps
      checkedInAt: dbReservation.checked_in_at ? new Date(dbReservation.checked_in_at) : undefined,
      checkedOutAt: dbReservation.checked_out_at ? new Date(dbReservation.checked_out_at) : undefined,
      
      // Booking metadata
      bookingDate: new Date(dbReservation.booking_date || dbReservation.created_at),
      lastModified: new Date(dbReservation.last_modified || dbReservation.updated_at || dbReservation.created_at),
      notes: dbReservation.notes || ''
    };
  }
  
  private mapReservationToDatabase(reservation: Partial<Reservation>): any {
    return {
      room_id: reservation.roomId,
      guest_id: reservation.guestId || reservation.guest?.id,
      check_in_date: reservation.checkIn?.toISOString()?.split('T')[0],
      check_out_date: reservation.checkOut?.toISOString()?.split('T')[0],
      number_of_guests: reservation.numberOfGuests,
      adults: reservation.adults,
      children: reservation.children,
      booking_source: reservation.bookingSource,
      status: reservation.status,
      special_requests: reservation.specialRequests,
      total_amount: reservation.totalAmount,
      booking_date: reservation.bookingDate?.toISOString(),
      notes: reservation.notes,
      company_id: reservation.companyId,
      pricing_tier_id: reservation.pricingTierId,
      subtotal: reservation.pricing?.subtotal || reservation.subtotal,
      tourism_tax: reservation.pricing?.tourismTax || reservation.tourismTax,
      vat_rate: reservation.pricing?.vatRate,
      vat_amount: reservation.pricing?.vatAmount || reservation.vatAmount,
      room_rate: reservation.pricing?.roomRate || reservation.baseRoomRate,
      seasonal_period: reservation.pricing?.seasonalPeriod || reservation.seasonalPeriod,
      discounts: reservation.pricing?.discounts || reservation.childrenDiscounts,
      additional_charges: reservation.pricing?.additionalCharges || reservation.additionalCharges,
      pet_fee: reservation.petFee,
      parking_fee: reservation.parkingFee,
      short_stay_supplement: reservation.shortStaySuplement,
      payment_status: reservation.paymentStatus,
      checked_in_at: reservation.checkedInAt?.toISOString(),
      checked_out_at: reservation.checkedOutAt?.toISOString(),
      last_modified: new Date().toISOString()
    };
  }
  
  // =====================================
  // COMPANY MAPPING FUNCTIONS
  // =====================================
  
  private mapCompaniesFromDatabase(dbCompanies: any[]): Company[] {
    return dbCompanies.map(company => this.mapCompanyFromDatabase(company));
  }
  
  private mapCompanyFromDatabase(dbCompany: any): Company {
    return {
      id: dbCompany.id.toString(),
      name: dbCompany.name,
      oib: dbCompany.oib,
      address: {
        street: dbCompany.address_street,
        city: dbCompany.address_city,
        postalCode: dbCompany.address_postal_code,
        country: dbCompany.address_country || 'Croatia'
      },
      contactPerson: dbCompany.contact_person,
      email: dbCompany.email,
      phone: dbCompany.phone,
      vatNumber: dbCompany.vat_number,
      businessRegistrationNumber: dbCompany.business_registration_number,
      pricingTierId: dbCompany.pricing_tier_id,
      pricingTier: dbCompany.pricing_tier ? this.mapPricingTierFromDatabase(dbCompany.pricing_tier) : undefined,
      discountPercentage: parseFloat(dbCompany.discount_percentage || '0'),
      paymentTerms: dbCompany.payment_terms || 30,
      billingAddress: dbCompany.billing_address_street ? {
        street: dbCompany.billing_address_street,
        city: dbCompany.billing_address_city,
        postalCode: dbCompany.billing_address_postal_code,
        country: dbCompany.billing_address_country || 'Croatia'
      } : undefined,
      notes: dbCompany.notes || '',
      isActive: dbCompany.is_active !== false,
      createdAt: new Date(dbCompany.created_at),
      updatedAt: new Date(dbCompany.updated_at)
    };
  }
  
  private mapCompanyToDatabase(company: Partial<Company>): any {
    return {
      name: company.name,
      oib: company.oib,
      address_street: company.address?.street,
      address_city: company.address?.city,
      address_postal_code: company.address?.postalCode,
      address_country: company.address?.country,
      contact_person: company.contactPerson,
      email: company.email,
      phone: company.phone,
      vat_number: company.vatNumber,
      business_registration_number: company.businessRegistrationNumber,
      pricing_tier_id: company.pricingTierId,
      discount_percentage: company.discountPercentage,
      payment_terms: company.paymentTerms,
      billing_address_street: company.billingAddress?.street,
      billing_address_city: company.billingAddress?.city,
      billing_address_postal_code: company.billingAddress?.postalCode,
      billing_address_country: company.billingAddress?.country,
      notes: company.notes,
      is_active: company.isActive,
      updated_at: new Date().toISOString()
    };
  }
  
  // =====================================
  // PRICING TIER MAPPING FUNCTIONS
  // =====================================
  
  private mapPricingTiersFromDatabase(dbTiers: any[]): PricingTier[] {
    return dbTiers.map(tier => this.mapPricingTierFromDatabase(tier));
  }
  
  private mapPricingTierFromDatabase(dbTier: any): PricingTier {
    return {
      id: dbTier.id.toString(),
      name: dbTier.name,
      description: dbTier.description || '',
      discountPercentage: parseFloat(dbTier.discount_percentage || '0'),
      isDefault: dbTier.is_default || false,
      isActive: dbTier.is_active !== false,
      seasonalRates: {
        A: parseFloat(dbTier.rate_period_a || '0'),
        B: parseFloat(dbTier.rate_period_b || '0'),
        C: parseFloat(dbTier.rate_period_c || '0'),
        D: parseFloat(dbTier.rate_period_d || '0')
      },
      roomTypeMultipliers: dbTier.room_type_multipliers || {},
      minimumStayRequirement: dbTier.minimum_stay_requirement || 1,
      advanceBookingDiscount: parseFloat(dbTier.advance_booking_discount || '0'),
      lastMinuteDiscount: parseFloat(dbTier.last_minute_discount || '0'),
      validFrom: dbTier.valid_from ? new Date(dbTier.valid_from) : undefined,
      validTo: dbTier.valid_to ? new Date(dbTier.valid_to) : undefined,
      applicableServices: dbTier.applicable_services || [],
      createdAt: new Date(dbTier.created_at),
      updatedAt: new Date(dbTier.updated_at)
    };
  }
  
  private mapPricingTierToDatabase(tier: Partial<PricingTier>): any {
    return {
      name: tier.name,
      description: tier.description,
      discount_percentage: tier.discountPercentage,
      is_default: tier.isDefault,
      is_active: tier.isActive,
      rate_period_a: tier.seasonalRates?.A,
      rate_period_b: tier.seasonalRates?.B,
      rate_period_c: tier.seasonalRates?.C,
      rate_period_d: tier.seasonalRates?.D,
      room_type_multipliers: tier.roomTypeMultipliers,
      minimum_stay_requirement: tier.minimumStayRequirement,
      advance_booking_discount: tier.advanceBookingDiscount,
      last_minute_discount: tier.lastMinuteDiscount,
      valid_from: tier.validFrom?.toISOString()?.split('T')[0],
      valid_to: tier.validTo?.toISOString()?.split('T')[0],
      applicable_services: tier.applicableServices,
      updated_at: new Date().toISOString()
    };
  }
  
  // =====================================
  // INVOICE MAPPING FUNCTIONS
  // =====================================
  
  private mapInvoicesFromDatabase(dbInvoices: any[]): Invoice[] {
    return dbInvoices.map(invoice => this.mapInvoiceFromDatabase(invoice));
  }
  
  private mapInvoiceFromDatabase(dbInvoice: any): Invoice {
    return {
      id: dbInvoice.id.toString(),
      invoiceNumber: dbInvoice.invoice_number,
      reservationId: dbInvoice.reservation_id,
      guestId: dbInvoice.guest_id,
      companyId: dbInvoice.company_id,
      guest: dbInvoice.guest ? this.mapGuestFromDatabase(dbInvoice.guest) : undefined,
      company: dbInvoice.company ? this.mapCompanyFromDatabase(dbInvoice.company) : undefined,
      issueDate: new Date(dbInvoice.issue_date),
      dueDate: new Date(dbInvoice.due_date),
      serviceDate: dbInvoice.service_date ? new Date(dbInvoice.service_date) : undefined,
      status: dbInvoice.status,
      currency: dbInvoice.currency || 'EUR',
      items: dbInvoice.items || [],
      subtotal: parseFloat(dbInvoice.subtotal || '0'),
      vatRate: parseFloat(dbInvoice.vat_rate || '0.25'),
      vatAmount: parseFloat(dbInvoice.vat_amount || '0'),
      tourismTax: parseFloat(dbInvoice.tourism_tax || '0'),
      totalAmount: parseFloat(dbInvoice.total_amount || '0'),
      paidAmount: parseFloat(dbInvoice.paid_amount || '0'),
      remainingAmount: parseFloat(dbInvoice.remaining_amount || '0'),
      paymentMethod: dbInvoice.payment_method,
      payments: [], // Will be loaded separately if needed
      notes: dbInvoice.notes || '',
      issuedBy: dbInvoice.issued_by,
      pdfPath: dbInvoice.pdf_path,
      isEmailSent: dbInvoice.is_email_sent || false,
      emailSentAt: dbInvoice.email_sent_at ? new Date(dbInvoice.email_sent_at) : undefined,
      createdAt: new Date(dbInvoice.created_at),
      updatedAt: new Date(dbInvoice.updated_at)
    };
  }
  
  private mapInvoiceToDatabase(invoice: Partial<Invoice>): any {
    return {
      invoice_number: invoice.invoiceNumber,
      reservation_id: invoice.reservationId,
      guest_id: invoice.guestId,
      company_id: invoice.companyId,
      issue_date: invoice.issueDate?.toISOString()?.split('T')[0],
      due_date: invoice.dueDate?.toISOString()?.split('T')[0],
      service_date: invoice.serviceDate?.toISOString()?.split('T')[0],
      status: invoice.status,
      currency: invoice.currency,
      items: invoice.items,
      subtotal: invoice.subtotal,
      vat_rate: invoice.vatRate,
      vat_amount: invoice.vatAmount,
      tourism_tax: invoice.tourismTax,
      total_amount: invoice.totalAmount,
      paid_amount: invoice.paidAmount,
      remaining_amount: invoice.remainingAmount,
      payment_method: invoice.paymentMethod,
      notes: invoice.notes,
      issued_by: invoice.issuedBy,
      pdf_path: invoice.pdfPath,
      is_email_sent: invoice.isEmailSent,
      email_sent_at: invoice.emailSentAt?.toISOString(),
      updated_at: new Date().toISOString()
    };
  }
  
  // =====================================
  // PAYMENT MAPPING FUNCTIONS
  // =====================================
  
  private mapPaymentsFromDatabase(dbPayments: any[]): Payment[] {
    return dbPayments.map(payment => this.mapPaymentFromDatabase(payment));
  }
  
  private mapPaymentFromDatabase(dbPayment: any): Payment {
    return {
      id: dbPayment.id.toString(),
      invoiceId: dbPayment.invoice_id,
      reservationId: dbPayment.reservation_id,
      amount: parseFloat(dbPayment.amount || '0'),
      currency: dbPayment.currency || 'EUR',
      method: dbPayment.method,
      status: dbPayment.status,
      receivedDate: new Date(dbPayment.received_date),
      processedDate: dbPayment.processed_date ? new Date(dbPayment.processed_date) : undefined,
      transactionId: dbPayment.transaction_id,
      referenceNumber: dbPayment.reference_number,
      notes: dbPayment.notes || '',
      processingFee: parseFloat(dbPayment.processing_fee || '0'),
      netAmount: parseFloat(dbPayment.net_amount || '0'),
      exchangeRate: parseFloat(dbPayment.exchange_rate || '1'),
      originalAmount: parseFloat(dbPayment.original_amount || '0'),
      originalCurrency: dbPayment.original_currency,
      gatewayResponse: dbPayment.gateway_response,
      isRefund: dbPayment.is_refund || false,
      parentPaymentId: dbPayment.parent_payment_id,
      processedBy: dbPayment.processed_by,
      createdAt: new Date(dbPayment.created_at)
    };
  }
  
  private mapPaymentToDatabase(payment: Partial<Payment>): any {
    return {
      invoice_id: payment.invoiceId,
      reservation_id: payment.reservationId,
      amount: payment.amount,
      currency: payment.currency,
      method: payment.method,
      status: payment.status,
      received_date: payment.receivedDate?.toISOString(),
      processed_date: payment.processedDate?.toISOString(),
      transaction_id: payment.transactionId,
      reference_number: payment.referenceNumber,
      notes: payment.notes,
      processing_fee: payment.processingFee,
      net_amount: payment.netAmount,
      exchange_rate: payment.exchangeRate,
      original_amount: payment.originalAmount,
      original_currency: payment.originalCurrency,
      gateway_response: payment.gatewayResponse,
      is_refund: payment.isRefund,
      parent_payment_id: payment.parentPaymentId
    };
  }
  
  // =====================================
  // FISCAL RECORD MAPPING FUNCTIONS
  // =====================================
  
  private mapFiscalRecordsFromDatabase(dbRecords: any[]): FiscalRecord[] {
    return dbRecords.map(record => this.mapFiscalRecordFromDatabase(record));
  }
  
  private mapFiscalRecordFromDatabase(dbRecord: any): FiscalRecord {
    return {
      id: dbRecord.id.toString(),
      invoiceId: dbRecord.invoice_id,
      jir: dbRecord.jir,
      zki: dbRecord.zki,
      brojRacuna: dbRecord.broj_racuna,
      oznakaSljednostiRacuna: dbRecord.oznaka_sljednosti_racuna,
      naknadnaDostavaPoruke: dbRecord.naknada_dostava_poruke || false,
      paragonBroj: dbRecord.paragon_broj,
      specificniNamjetRacuna: dbRecord.specificki_namjet_racuna,
      dateTimeSubmitted: new Date(dbRecord.submitted_at),
      dateTimeReceived: dbRecord.received_at ? new Date(dbRecord.received_at) : undefined,
      ukupanIznos: parseFloat(dbRecord.ukupan_iznos || '0'),
      naknadaZaZastituOkolisa: parseFloat(dbRecord.naknada_za_zastitu_okolisa || '0'),
      ukupanIznosPorezaPoStopama: dbRecord.ukupan_iznos_poreza_po_stopama || {},
      ukupanIznosOslobodjenjaPorstopa: dbRecord.ukupan_iznos_oslobodjenja_porstopa || {},
      ukupanIznosNeporezivo: parseFloat(dbRecord.ukupan_iznos_neporezivo || '0'),
      ukupanIznosPoreza: parseFloat(dbRecord.ukupan_iznos_poreza || '0'),
      ukupanIznosNaplata: parseFloat(dbRecord.ukupan_iznos_naplata || '0'),
      nacinPlacanja: dbRecord.nacin_placanja || 'G',
      oibOper: dbRecord.oib_oper,
      nap: dbRecord.nap || '',
      status: dbRecord.status || 'submitted',
      errorMessage: dbRecord.error_message,
      xmlRequest: dbRecord.xml_request,
      xmlResponse: dbRecord.xml_response,
      createdAt: new Date(dbRecord.created_at)
    };
  }
  
  private mapFiscalRecordToDatabase(record: Partial<FiscalRecord>): any {
    return {
      invoice_id: record.invoiceId,
      jir: record.jir,
      zki: record.zki,
      broj_racuna: record.brojRacuna,
      oznaka_sljednosti_racuna: record.oznakaSljednostiRacuna,
      naknada_dostava_poruke: record.naknadnaDostavaPoruke,
      paragon_broj: record.paragonBroj,
      specificki_namjet_racuna: record.specificniNamjetRacuna,
      submitted_at: record.dateTimeSubmitted?.toISOString(),
      received_at: record.dateTimeReceived?.toISOString(),
      ukupan_iznos: record.ukupanIznos,
      naknada_za_zastitu_okolisa: record.naknadaZaZastituOkolisa,
      ukupan_iznos_poreza_po_stopama: record.ukupanIznosPorezaPoStopama,
      ukupan_iznos_oslobodjenja_porstopa: record.ukupanIznosOslobodjenjaPorstopa,
      ukupan_iznos_neporezivo: record.ukupanIznosNeporezivo,
      ukupan_iznos_poreza: record.ukupanIznosPoreza,
      ukupan_iznos_naplata: record.ukupanIznosNaplata,
      nacin_placanja: record.nacinPlacanja,
      oib_oper: record.oibOper,
      nap: record.nap,
      status: record.status,
      error_message: record.errorMessage,
      xml_request: record.xmlRequest,
      xml_response: record.xmlResponse
    };
  }
}

export const hotelSupabaseService = HotelSupabaseService.getInstance();
export default hotelSupabaseService;