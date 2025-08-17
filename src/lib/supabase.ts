import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://gkbpthurkucotikjefra.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrYnB0aHVya3Vjb3Rpa2plZnJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3MzMxNTksImV4cCI6MjA2ODMwOTE1OX0.pXbrXBCeJHgXzHGTB4WatYfWsaFFkrlr8ChUkVIV6SY'

// Hotel Porec database types
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      // Hotel Management Tables
      hotels: {
        Row: {
          address: Json
          business_name: string
          contact_info: Json
          created_at: string | null
          default_currency: string | null
          id: string
          is_active: boolean | null
          name: string
          oib: string
          slug: string
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          address: Json
          business_name: string
          contact_info: Json
          created_at?: string | null
          default_currency?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          oib: string
          slug: string
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: Json
          business_name?: string
          contact_info?: Json
          created_at?: string | null
          default_currency?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          oib?: string
          slug?: string
          timezone?: string | null
          updated_at?: string | null
        }
      }
      room_types: {
        Row: {
          amenities: string[] | null
          base_rate: number
          code: string
          created_at: string | null
          default_occupancy: number
          display_order: number | null
          hotel_id: string
          id: string
          is_active: boolean | null
          max_occupancy: number
          name_croatian: string
          name_english: string
          name_german: string | null
          name_italian: string | null
          updated_at: string | null
        }
        Insert: {
          amenities?: string[] | null
          base_rate: number
          code: string
          created_at?: string | null
          default_occupancy?: number
          display_order?: number | null
          hotel_id: string
          id?: string
          is_active?: boolean | null
          max_occupancy?: number
          name_croatian: string
          name_english: string
          name_german?: string | null
          name_italian?: string | null
          updated_at?: string | null
        }
        Update: {
          amenities?: string[] | null
          base_rate?: number
          code?: string
          created_at?: string | null
          default_occupancy?: number
          display_order?: number | null
          hotel_id?: string
          id?: string
          is_active?: boolean | null
          max_occupancy?: number
          name_croatian?: string
          name_english?: string
          name_german?: string | null
          name_italian?: string | null
          updated_at?: string | null
        }
      }
      rooms: {
        Row: {
          amenities_additional: string[] | null
          building: string | null
          cleaning_buffer_days: number | null
          created_at: string | null
          floor: number
          hotel_id: string
          id: string
          is_active: boolean | null
          is_cleaned: boolean | null
          is_out_of_order: boolean | null
          is_premium: boolean | null
          maintenance_notes: string | null
          max_occupancy_override: number | null
          minimum_stay_override: number | null
          number: string
          room_group_id: string | null
          room_type_id: string
          updated_at: string | null
        }
        Insert: {
          amenities_additional?: string[] | null
          building?: string | null
          cleaning_buffer_days?: number | null
          created_at?: string | null
          floor: number
          hotel_id: string
          id?: string
          is_active?: boolean | null
          is_cleaned?: boolean | null
          is_out_of_order?: boolean | null
          is_premium?: boolean | null
          maintenance_notes?: string | null
          max_occupancy_override?: number | null
          minimum_stay_override?: number | null
          number: string
          room_group_id?: string | null
          room_type_id: string
          updated_at?: string | null
        }
        Update: {
          amenities_additional?: string[] | null
          building?: string | null
          cleaning_buffer_days?: number | null
          created_at?: string | null
          floor?: number
          hotel_id?: string
          id?: string
          is_active?: boolean | null
          is_cleaned?: boolean | null
          is_out_of_order?: boolean | null
          is_premium?: boolean | null
          maintenance_notes?: string | null
          max_occupancy_override?: number | null
          minimum_stay_override?: number | null
          number?: string
          room_group_id?: string | null
          room_type_id?: string
          updated_at?: string | null
        }
      }
      guests: {
        Row: {
          average_rating: number | null
          communication_preferences: Json | null
          created_at: string | null
          date_of_birth: string | null
          dietary_restrictions: string[] | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          first_name: string
          has_pets: boolean | null
          id: string
          id_card_number: string | null
          is_vip: boolean | null
          last_name: string
          last_stay_date: string | null
          marketing_consent: boolean | null
          nationality: string | null
          passport_number: string | null
          phone: string | null
          preferred_language: string | null
          special_needs: string | null
          total_spent: number | null
          total_stays: number | null
          updated_at: string | null
          vip_level: number | null
        }
        Insert: {
          average_rating?: number | null
          communication_preferences?: Json | null
          created_at?: string | null
          date_of_birth?: string | null
          dietary_restrictions?: string[] | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          first_name: string
          has_pets?: boolean | null
          id?: string
          id_card_number?: string | null
          is_vip?: boolean | null
          last_name: string
          last_stay_date?: string | null
          marketing_consent?: boolean | null
          nationality?: string | null
          passport_number?: string | null
          phone?: string | null
          preferred_language?: string | null
          special_needs?: string | null
          total_spent?: number | null
          total_stays?: number | null
          updated_at?: string | null
          vip_level?: number | null
        }
        Update: {
          average_rating?: number | null
          communication_preferences?: Json | null
          created_at?: string | null
          date_of_birth?: string | null
          dietary_restrictions?: string[] | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          first_name?: string
          has_pets?: boolean | null
          id?: string
          id_card_number?: string | null
          is_vip?: boolean | null
          last_name?: string
          last_stay_date?: string | null
          marketing_consent?: boolean | null
          nationality?: string | null
          passport_number?: string | null
          phone?: string | null
          preferred_language?: string | null
          special_needs?: string | null
          total_spent?: number | null
          total_stays?: number | null
          updated_at?: string | null
          vip_level?: number | null
        }
      }
      reservations: {
        Row: {
          accessibility_needs: string[] | null
          additional_services_subtotal: number | null
          additional_services_vat: number | null
          adults: number
          balance_due: number | null
          base_room_rate: number
          booked_by: string | null
          booking_date: string | null
          booking_reference: string | null
          booking_source: string | null
          cancellation_date: string | null
          check_in: string
          check_in_time: string | null
          check_out: string
          check_out_time: string | null
          checked_in_by: string | null
          checked_out_by: string | null
          children: number | null
          children_discount: number | null
          company_discount: number | null
          company_id: string | null
          confirmation_number: string
          created_at: string | null
          has_pets: boolean | null
          hotel_id: string
          id: string
          notes: string | null
          number_of_nights: number | null
          paid_amount: number | null
          parking_fee_subtotal: number | null
          parking_fee_vat: number | null
          parking_required: boolean | null
          payment_status: string
          pet_count: number | null
          pet_fee_subtotal: number | null
          pet_fee_vat: number | null
          price_list_id: string | null
          pricing_tier_id: string | null
          primary_guest_id: string
          promotional_discount: number | null
          room_id: string
          seasonal_period: string
          short_stay_supplement: number | null
          special_requests: string | null
          status: string
          subtotal_accommodation: number
          total_amount: number
          total_guests: number | null
          total_vat_amount: number
          tourism_tax: number | null
          updated_at: string | null
          vat_accommodation: number
        }
        Insert: {
          accessibility_needs?: string[] | null
          additional_services_subtotal?: number | null
          additional_services_vat?: number | null
          adults?: number
          balance_due?: number | null
          base_room_rate: number
          booked_by?: string | null
          booking_date?: string | null
          booking_reference?: string | null
          booking_source?: string | null
          cancellation_date?: string | null
          check_in: string
          check_in_time?: string | null
          check_out: string
          check_out_time?: string | null
          checked_in_by?: string | null
          checked_out_by?: string | null
          children?: number | null
          children_discount?: number | null
          company_discount?: number | null
          company_id?: string | null
          confirmation_number: string
          created_at?: string | null
          has_pets?: boolean | null
          hotel_id: string
          id?: string
          notes?: string | null
          number_of_nights?: number | null
          paid_amount?: number | null
          parking_fee_subtotal?: number | null
          parking_fee_vat?: number | null
          parking_required?: boolean | null
          payment_status?: string
          pet_count?: number | null
          pet_fee_subtotal?: number | null
          pet_fee_vat?: number | null
          price_list_id?: string | null
          pricing_tier_id?: string | null
          primary_guest_id: string
          promotional_discount?: number | null
          room_id: string
          seasonal_period: string
          short_stay_supplement?: number | null
          special_requests?: string | null
          status?: string
          subtotal_accommodation: number
          total_amount: number
          total_guests?: number | null
          total_vat_amount: number
          tourism_tax?: number | null
          updated_at?: string | null
          vat_accommodation: number
        }
        Update: {
          accessibility_needs?: string[] | null
          additional_services_subtotal?: number | null
          additional_services_vat?: number | null
          adults?: number
          balance_due?: number | null
          base_room_rate?: number
          booked_by?: string | null
          booking_date?: string | null
          booking_reference?: string | null
          booking_source?: string | null
          cancellation_date?: string | null
          check_in?: string
          check_in_time?: string | null
          check_out?: string
          check_out_time?: string | null
          checked_in_by?: string | null
          checked_out_by?: string | null
          children?: number | null
          children_discount?: number | null
          company_discount?: number | null
          company_id?: string | null
          confirmation_number?: string
          created_at?: string | null
          has_pets?: boolean | null
          hotel_id?: string
          id?: string
          notes?: string | null
          number_of_nights?: number | null
          paid_amount?: number | null
          parking_fee_subtotal?: number | null
          parking_fee_vat?: number | null
          parking_required?: boolean | null
          payment_status?: string
          pet_count?: number | null
          pet_fee_subtotal?: number | null
          pet_fee_vat?: number | null
          price_list_id?: string | null
          pricing_tier_id?: string | null
          primary_guest_id?: string
          promotional_discount?: number | null
          room_id?: string
          seasonal_period?: string
          short_stay_supplement?: number | null
          special_requests?: string | null
          status?: string
          subtotal_accommodation?: number
          total_amount?: number
          total_guests?: number | null
          total_vat_amount?: number
          tourism_tax?: number | null
          updated_at?: string | null
          vat_accommodation?: number
        }
      }
      // Financial Management Tables
      companies: {
        Row: {
          id: number
          name: string
          oib: string
          address: string
          city: string
          postal_code: string
          country: string | null
          contact_person: string
          email: string
          phone: string | null
          fax: string | null
          pricing_tier_id: number | null
          room_allocation_guarantee: number | null
          is_active: boolean | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          name: string
          oib: string
          address: string
          city: string
          postal_code: string
          country?: string | null
          contact_person: string
          email: string
          phone?: string | null
          fax?: string | null
          pricing_tier_id?: number | null
          room_allocation_guarantee?: number | null
          is_active?: boolean | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          name?: string
          oib?: string
          address?: string
          city?: string
          postal_code?: string
          country?: string | null
          contact_person?: string
          email?: string
          phone?: string | null
          fax?: string | null
          pricing_tier_id?: number | null
          room_allocation_guarantee?: number | null
          is_active?: boolean | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      pricing_tiers: {
        Row: {
          id: number
          name: string
          description: string | null
          seasonal_rate_a: number | null
          seasonal_rate_b: number | null
          seasonal_rate_c: number | null
          seasonal_rate_d: number | null
          is_percentage_discount: boolean | null
          minimum_stay: number | null
          valid_from: string
          valid_to: string | null
          is_active: boolean | null
          is_default: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          name: string
          description?: string | null
          seasonal_rate_a?: number | null
          seasonal_rate_b?: number | null
          seasonal_rate_c?: number | null
          seasonal_rate_d?: number | null
          is_percentage_discount?: boolean | null
          minimum_stay?: number | null
          valid_from: string
          valid_to?: string | null
          is_active?: boolean | null
          is_default?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          name?: string
          description?: string | null
          seasonal_rate_a?: number | null
          seasonal_rate_b?: number | null
          seasonal_rate_c?: number | null
          seasonal_rate_d?: number | null
          is_percentage_discount?: boolean | null
          minimum_stay?: number | null
          valid_from?: string
          valid_to?: string | null
          is_active?: boolean | null
          is_default?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      invoices: {
        Row: {
          id: number
          reservation_id: number | null
          guest_id: number | null
          company_id: number | null
          invoice_number: string
          issue_date: string
          due_date: string
          subtotal: number
          vat_amount: number
          total_amount: number
          balance_due: number
          payment_status: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          reservation_id?: number | null
          guest_id?: number | null
          company_id?: number | null
          invoice_number: string
          issue_date: string
          due_date: string
          subtotal: number
          vat_amount: number
          total_amount: number
          balance_due?: number
          payment_status?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          reservation_id?: number | null
          guest_id?: number | null
          company_id?: number | null
          invoice_number?: string
          issue_date?: string
          due_date?: string
          subtotal?: number
          vat_amount?: number
          total_amount?: number
          balance_due?: number
          payment_status?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      payments: {
        Row: {
          id: number
          invoice_id: number | null
          reservation_id: number | null
          amount: number
          currency: string | null
          payment_method: string | null
          payment_reference: string | null
          card_last_four: string | null
          card_type: string | null
          authorization_code: string | null
          status: string | null
          received_date: string | null
          processed_date: string | null
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: number
          invoice_id?: number | null
          reservation_id?: number | null
          amount: number
          currency?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          card_last_four?: string | null
          card_type?: string | null
          authorization_code?: string | null
          status?: string | null
          received_date?: string | null
          processed_date?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: number
          invoice_id?: number | null
          reservation_id?: number | null
          amount?: number
          currency?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          card_last_four?: string | null
          card_type?: string | null
          authorization_code?: string | null
          status?: string | null
          received_date?: string | null
          processed_date?: string | null
          notes?: string | null
          created_at?: string | null
        }
      }
      fiscal_records: {
        Row: {
          id: number
          hotel_id: string | null
          invoice_id: number | null
          fiscal_number: string
          zki: string
          jir: string | null
          fiscal_verification_url: string | null
          submitted_at: string | null
          status: string | null
          error_message: string | null
          raw_response: Json | null
          created_at: string | null
        }
        Insert: {
          id?: number
          hotel_id?: string | null
          invoice_id?: number | null
          fiscal_number: string
          zki: string
          jir?: string | null
          fiscal_verification_url?: string | null
          submitted_at?: string | null
          status?: string | null
          error_message?: string | null
          raw_response?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: number
          hotel_id?: string | null
          invoice_id?: number | null
          fiscal_number?: string
          zki?: string
          jir?: string | null
          fiscal_verification_url?: string | null
          submitted_at?: string | null
          status?: string | null
          error_message?: string | null
          raw_response?: Json | null
          created_at?: string | null
        }
      }
      // Inventory Management Tables (existing)
      user_roles: {
        Row: {
          id: number
          name: string
          description: string | null
          created_at: string
        }
        Insert: {
          id?: number
          name: string
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          name?: string
          description?: string | null
          created_at?: string
        }
      }
      user_profiles: {
        Row: {
          id: string
          user_id: string
          role_id: number
          is_active: boolean
          push_notifications_enabled: boolean
          push_subscription: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role_id: number
          is_active?: boolean
          push_notifications_enabled?: boolean
          push_subscription?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role_id?: number
          is_active?: boolean
          push_notifications_enabled?: boolean
          push_subscription?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      categories: {
        Row: {
          id: number
          name: string
          description: string | null
          requires_expiration: boolean
          created_at: string
        }
        Insert: {
          id?: number
          name: string
          description?: string | null
          requires_expiration?: boolean
          created_at?: string
        }
        Update: {
          id?: number
          name?: string
          description?: string | null
          requires_expiration?: boolean
          created_at?: string
        }
      }
      locations: {
        Row: {
          id: number
          name: string
          type: string
          description: string | null
          is_refrigerated: boolean
          created_at: string
        }
        Insert: {
          id?: number
          name: string
          type?: string
          description?: string | null
          is_refrigerated?: boolean
          created_at?: string
        }
        Update: {
          id?: number
          name?: string
          type?: string
          description?: string | null
          is_refrigerated?: boolean
          created_at?: string
        }
      }
      items: {
        Row: {
          id: number
          name: string
          description: string | null
          category_id: number
          unit: string
          price: number | null
          minimum_stock: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          description?: string | null
          category_id: number
          unit?: string
          price?: number | null
          minimum_stock?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          description?: string | null
          category_id?: number
          unit?: string
          price?: number | null
          minimum_stock?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      inventory: {
        Row: {
          id: number
          item_id: number
          location_id: number
          quantity: number
          expiration_date: string | null
          cost_per_unit: number | null
          display_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          item_id: number
          location_id: number
          quantity?: number
          expiration_date?: string | null
          cost_per_unit?: number | null
          display_order: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          item_id?: number
          location_id?: number
          quantity?: number
          expiration_date?: string | null
          cost_per_unit?: number | null
          display_order?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined
  }
})