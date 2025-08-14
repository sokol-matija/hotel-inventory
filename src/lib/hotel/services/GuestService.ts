// GuestService - Clean Supabase guest management
// Modern React patterns with proper error handling and TypeScript

import { supabase, Database } from '../../supabase';

// Database types
type GuestRow = Database['public']['Tables']['guests']['Row'];
type GuestInsert = Database['public']['Tables']['guests']['Insert'];
type GuestUpdate = Database['public']['Tables']['guests']['Update'];
// Note: guest_children table not yet implemented
// type GuestChildRow = Database['public']['Tables']['guest_children']['Row'];
// type GuestChildInsert = Database['public']['Tables']['guest_children']['Insert'];

// Application types
export interface Guest {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: Date;
  nationality?: string;
  passportNumber?: string;
  idCardNumber?: string;
  preferredLanguage: string;
  dietaryRestrictions: string[];
  specialNeeds?: string;
  hasPets: boolean;
  isVip: boolean;
  vipLevel: number;
  children: GuestChild[];
  totalStays: number;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GuestChild {
  id: string;
  guestId: string;
  firstName: string;
  dateOfBirth: Date;
  currentAge: number;
  discountCategory?: string;
}

export interface CreateGuestData {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: Date;
  nationality?: string;
  passportNumber?: string;
  idCardNumber?: string;
  preferredLanguage?: string;
  dietaryRestrictions?: string[];
  specialNeeds?: string;
  hasPets?: boolean;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  children?: Omit<GuestChild, 'id' | 'guestId' | 'currentAge'>[];
}

export interface UpdateGuestData extends Partial<CreateGuestData> {
  isVip?: boolean;
  vipLevel?: number;
}

export interface GuestSearchFilters {
  query?: string;
  nationality?: string;
  isVip?: boolean;
  hasPets?: boolean;
}

// Result types for error handling
export type GuestResult<T> = 
  | { success: true; data: T }
  | { success: false; error: string };

export class GuestService {
  private static instance: GuestService;

  private constructor() {}

  public static getInstance(): GuestService {
    if (!GuestService.instance) {
      GuestService.instance = new GuestService();
    }
    return GuestService.instance;
  }

  /**
   * Get all guests with optional filtering
   */
  async getGuests(filters: GuestSearchFilters = {}): Promise<GuestResult<Guest[]>> {
    try {
      let query = supabase
        .from('guests')
        .select('*')
        .order('last_name', { ascending: true });

      // Apply filters
      if (filters.query) {
        query = query.or(`first_name.ilike.%${filters.query}%,last_name.ilike.%${filters.query}%,email.ilike.%${filters.query}%`);
      }
      
      if (filters.nationality) {
        query = query.eq('nationality', filters.nationality);
      }
      
      if (filters.isVip !== undefined) {
        query = query.eq('is_vip', filters.isVip);
      }
      
      if (filters.hasPets !== undefined) {
        query = query.eq('has_pets', filters.hasPets);
      }

      const { data, error } = await query;

      if (error) throw error;

      const guests = (data || []).map(this.mapGuestFromDB);
      return { success: true, data: guests };
    } catch (error) {
      console.error('Error fetching guests:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch guests' 
      };
    }
  }

  /**
   * Get guest by ID
   */
  async getGuestById(id: string): Promise<GuestResult<Guest>> {
    try {
      const { data, error } = await supabase
        .from('guests')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Guest not found');

      const guest = this.mapGuestFromDB(data);
      return { success: true, data: guest };
    } catch (error) {
      console.error('Error fetching guest:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch guest' 
      };
    }
  }

  /**
   * Create a new guest
   */
  async createGuest(guestData: CreateGuestData): Promise<GuestResult<Guest>> {
    try {
      // Validate required fields
      if (!guestData.firstName?.trim() || !guestData.lastName?.trim()) {
        throw new Error('First name and last name are required');
      }

      const insertData: GuestInsert = {
        first_name: guestData.firstName.trim(),
        last_name: guestData.lastName.trim(),
        email: guestData.email?.trim() || null,
        phone: guestData.phone?.trim() || null,
        date_of_birth: guestData.dateOfBirth?.toISOString().split('T')[0] || null,
        nationality: guestData.nationality || null,
        passport_number: guestData.passportNumber?.trim() || null,
        id_card_number: guestData.idCardNumber?.trim() || null,
        preferred_language: guestData.preferredLanguage || 'en',
        dietary_restrictions: guestData.dietaryRestrictions || [],
        special_needs: guestData.specialNeeds?.trim() || null,
        has_pets: guestData.hasPets || false,
        emergency_contact_name: guestData.emergencyContactName?.trim() || null,
        emergency_contact_phone: guestData.emergencyContactPhone?.trim() || null,
      };

      const { data, error } = await supabase
        .from('guests')
        .insert(insertData)
        .select('*')
        .single();

      if (error) throw error;

      // TODO: Add children support when guest_children table is implemented
      // if (guestData.children && guestData.children.length > 0) {
      //   const childrenInserts = guestData.children.map(child => ({
      //     guest_id: data.id,
      //     first_name: child.firstName,
      //     date_of_birth: child.dateOfBirth.toISOString().split('T')[0],
      //     current_age: this.calculateAge(child.dateOfBirth),
      //     discount_category: child.discountCategory || null,
      //   }));
      // 
      //   const { error: childrenError } = await supabase
      //     .from('guest_children')
      //     .insert(childrenInserts);
      // 
      //   if (childrenError) {
      //     console.error('Error adding children:', childrenError);
      //     // Don't fail the guest creation, but log the error
      //   }
      // }

      // Fetch the complete guest with children
      const guestResult = await this.getGuestById(data.id);
      if (!guestResult.success) throw new Error(guestResult.error);

      return { success: true, data: guestResult.data };
    } catch (error) {
      console.error('Error creating guest:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create guest' 
      };
    }
  }

  /**
   * Update guest
   */
  async updateGuest(id: string, updates: UpdateGuestData): Promise<GuestResult<Guest>> {
    try {
      const updateData: GuestUpdate = {};

      // Map application fields to database fields
      if (updates.firstName !== undefined) updateData.first_name = updates.firstName.trim();
      if (updates.lastName !== undefined) updateData.last_name = updates.lastName.trim();
      if (updates.email !== undefined) updateData.email = updates.email?.trim() || null;
      if (updates.phone !== undefined) updateData.phone = updates.phone?.trim() || null;
      if (updates.dateOfBirth !== undefined) updateData.date_of_birth = updates.dateOfBirth?.toISOString().split('T')[0] || null;
      if (updates.nationality !== undefined) updateData.nationality = updates.nationality || null;
      if (updates.passportNumber !== undefined) updateData.passport_number = updates.passportNumber?.trim() || null;
      if (updates.idCardNumber !== undefined) updateData.id_card_number = updates.idCardNumber?.trim() || null;
      if (updates.preferredLanguage !== undefined) updateData.preferred_language = updates.preferredLanguage;
      if (updates.dietaryRestrictions !== undefined) updateData.dietary_restrictions = updates.dietaryRestrictions;
      if (updates.specialNeeds !== undefined) updateData.special_needs = updates.specialNeeds?.trim() || null;
      if (updates.hasPets !== undefined) updateData.has_pets = updates.hasPets;
      if (updates.isVip !== undefined) updateData.is_vip = updates.isVip;
      if (updates.vipLevel !== undefined) updateData.vip_level = updates.vipLevel;
      if (updates.emergencyContactName !== undefined) updateData.emergency_contact_name = updates.emergencyContactName?.trim() || null;
      if (updates.emergencyContactPhone !== undefined) updateData.emergency_contact_phone = updates.emergencyContactPhone?.trim() || null;

      updateData.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('guests')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      // Fetch updated guest
      const guestResult = await this.getGuestById(id);
      if (!guestResult.success) throw new Error(guestResult.error);

      return { success: true, data: guestResult.data };
    } catch (error) {
      console.error('Error updating guest:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update guest' 
      };
    }
  }

  /**
   * Delete guest
   */
  async deleteGuest(id: string): Promise<GuestResult<void>> {
    try {
      // Check if guest has any reservations
      const { data: reservations } = await supabase
        .from('reservations')
        .select('id')
        .eq('primary_guest_id', id)
        .limit(1);

      if (reservations && reservations.length > 0) {
        throw new Error('Cannot delete guest with existing reservations');
      }

      const { error } = await supabase
        .from('guests')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return { success: true, data: undefined };
    } catch (error) {
      console.error('Error deleting guest:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete guest' 
      };
    }
  }

  /**
   * Add child to guest
   */
  async addChildToGuest(guestId: string, childData: any): Promise<GuestResult<any>> {
    console.warn('Child management not yet implemented - guest_children table needed');
    return { success: false, error: 'Child management not yet implemented' };
  }

  /**
   * Remove child from guest
   */
  async removeChildFromGuest(childId: string): Promise<GuestResult<void>> {
    console.warn('Child management not yet implemented - guest_children table needed');
    return { success: false, error: 'Child management not yet implemented' };
  }

  /**
   * Search guests by name or email
   */
  async searchGuests(query: string): Promise<GuestResult<Guest[]>> {
    if (!query.trim()) {
      return { success: true, data: [] };
    }

    return this.getGuests({ query: query.trim() });
  }

  // Private helper methods
  private mapGuestFromDB(row: any): Guest {
    return {
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      fullName: `${row.first_name} ${row.last_name}`.trim(),
      email: row.email,
      phone: row.phone,
      dateOfBirth: row.date_of_birth ? new Date(row.date_of_birth) : undefined,
      nationality: row.nationality,
      passportNumber: row.passport_number,
      idCardNumber: row.id_card_number,
      preferredLanguage: row.preferred_language || 'en',
      dietaryRestrictions: row.dietary_restrictions || [],
      specialNeeds: row.special_needs,
      hasPets: row.has_pets || false,
      isVip: row.is_vip || false,
      vipLevel: row.vip_level || 0,
      children: [], // TODO: Load children when guest_children table is implemented
      totalStays: row.total_stays || 0,
      emergencyContactName: row.emergency_contact_name,
      emergencyContactPhone: row.emergency_contact_phone,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  // TODO: Implement when guest_children table is added
  // private mapGuestChildFromDB(row: any): any {
  //   return {
  //     id: row.id,
  //     guestId: row.guest_id,
  //     firstName: row.first_name,
  //     dateOfBirth: new Date(row.date_of_birth),
  //     currentAge: row.current_age || this.calculateAge(new Date(row.date_of_birth)),
  //     discountCategory: row.discount_category || undefined,
  //   };
  // }

  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
      age--;
    }
    
    return Math.max(0, age);
  }
}

export const guestService = GuestService.getInstance();