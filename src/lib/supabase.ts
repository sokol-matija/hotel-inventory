import { createClient } from '@supabase/supabase-js'

export const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://gkbpthurkucotikjefra.supabase.co'
export const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || ''

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
          is_clean: boolean | null
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
          is_clean?: boolean | null
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
          is_clean?: boolean | null
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
      // New Normalized Schema Tables
      reservation_guests: {
        Row: {
          id: number
          reservation_id: number
          guest_id: number
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          reservation_id: number
          guest_id: number
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          reservation_id?: number
          guest_id?: number
          created_at?: string | null
          updated_at?: string | null
        }
      }
      guest_stays: {
        Row: {
          id: number
          reservation_id: number
          guest_id: number
          check_in: string
          check_out: string
          actual_check_in: string | null
          actual_check_out: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          reservation_id: number
          guest_id: number
          check_in: string
          check_out: string
          actual_check_in?: string | null
          actual_check_out?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          reservation_id?: number
          guest_id?: number
          check_in?: string
          check_out?: string
          actual_check_in?: string | null
          actual_check_out?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      daily_guest_services: {
        Row: {
          id: number
          guest_stay_id: number
          service_date: string
          parking_spots: number | null
          pet_fee: boolean | null
          extra_towels: number | null
          extra_bed: boolean | null
          minibar_consumed: Json | null
          tourism_tax_paid: boolean | null
          tourism_tax_amount: number | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: number
          guest_stay_id: number
          service_date: string
          parking_spots?: number | null
          pet_fee?: boolean | null
          extra_towels?: number | null
          extra_bed?: boolean | null
          minibar_consumed?: Json | null
          tourism_tax_paid?: boolean | null
          tourism_tax_amount?: number | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: number
          guest_stay_id?: number
          service_date?: string
          parking_spots?: number | null
          pet_fee?: boolean | null
          extra_towels?: number | null
          extra_bed?: boolean | null
          minibar_consumed?: Json | null
          tourism_tax_paid?: boolean | null
          tourism_tax_amount?: number | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      // Enumeration Tables
      reservation_statuses: {
        Row: {
          id: number
          code: string
          name: string
          color: string | null
          icon: string | null
          description: string | null
          is_active: boolean | null
          display_order: number | null
          created_at: string | null
        }
        Insert: {
          id?: number
          code: string
          name: string
          color?: string | null
          icon?: string | null
          description?: string | null
          is_active?: boolean | null
          display_order?: number | null
          created_at?: string | null
        }
        Update: {
          id?: number
          code?: string
          name?: string
          color?: string | null
          icon?: string | null
          description?: string | null
          is_active?: boolean | null
          display_order?: number | null
          created_at?: string | null
        }
      }
      booking_sources: {
        Row: {
          id: number
          code: string
          name: string
          default_commission_rate: number | null
          api_config: Json | null
          color: string | null
          icon: string | null
          is_active: boolean | null
          display_order: number | null
          created_at: string | null
        }
        Insert: {
          id?: number
          code: string
          name: string
          default_commission_rate?: number | null
          api_config?: Json | null
          color?: string | null
          icon?: string | null
          is_active?: boolean | null
          display_order?: number | null
          created_at?: string | null
        }
        Update: {
          id?: number
          code?: string
          name?: string
          default_commission_rate?: number | null
          api_config?: Json | null
          color?: string | null
          icon?: string | null
          is_active?: boolean | null
          display_order?: number | null
          created_at?: string | null
        }
      }
      room_types: {
        Row: {
          id: number
          code: string
          name: string
          max_occupancy: number
          base_area_sqm: number | null
          description: string | null
          color: string | null
          icon: string | null
          is_active: boolean | null
          display_order: number | null
          created_at: string | null
        }
        Insert: {
          id?: number
          code: string
          name: string
          max_occupancy: number
          base_area_sqm?: number | null
          description?: string | null
          color?: string | null
          icon?: string | null
          is_active?: boolean | null
          display_order?: number | null
          created_at?: string | null
        }
        Update: {
          id?: number
          code?: string
          name?: string
          max_occupancy?: number
          base_area_sqm?: number | null
          description?: string | null
          color?: string | null
          icon?: string | null
          is_active?: boolean | null
          display_order?: number | null
          created_at?: string | null
        }
      }
      // Dynamic Pricing Tables
      pricing_seasons: {
        Row: {
          id: number
          hotel_id: number | null
          name: string
          code: string
          start_date: string
          end_date: string
          year_pattern: number | null
          priority: number | null
          is_active: boolean | null
          color: string | null
          created_at: string | null
        }
        Insert: {
          id?: number
          hotel_id?: number | null
          name: string
          code: string
          start_date: string
          end_date: string
          year_pattern?: number | null
          priority?: number | null
          is_active?: boolean | null
          color?: string | null
          created_at?: string | null
        }
        Update: {
          id?: number
          hotel_id?: number | null
          name?: string
          code?: string
          start_date?: string
          end_date?: string
          year_pattern?: number | null
          priority?: number | null
          is_active?: boolean | null
          color?: string | null
          created_at?: string | null
        }
      }
      room_pricing: {
        Row: {
          id: number
          room_id: number | null
          season_id: number | null
          base_rate: number
          currency: string | null
          valid_from: string
          valid_to: string | null
          created_at: string | null
        }
        Insert: {
          id?: number
          room_id?: number | null
          season_id?: number | null
          base_rate: number
          currency?: string | null
          valid_from: string
          valid_to?: string | null
          created_at?: string | null
        }
        Update: {
          id?: number
          room_id?: number | null
          season_id?: number | null
          base_rate?: number
          currency?: string | null
          valid_from?: string
          valid_to?: string | null
          created_at?: string | null
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