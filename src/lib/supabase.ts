// Test commit in worktree test-a using /git:commit skill
// Test change for /git:commit skill
import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '12.2.3 (519615d)';
  };
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string;
          created_at: string | null;
          description: string | null;
          id: number;
          new_values: Json | null;
          old_values: Json | null;
          record_id: string | null;
          table_name: string;
          user_id: string | null;
        };
        Insert: {
          action: string;
          created_at?: string | null;
          description?: string | null;
          id?: number;
          new_values?: Json | null;
          old_values?: Json | null;
          record_id?: string | null;
          table_name: string;
          user_id?: string | null;
        };
        Update: {
          action?: string;
          created_at?: string | null;
          description?: string | null;
          id?: number;
          new_values?: Json | null;
          old_values?: Json | null;
          record_id?: string | null;
          table_name?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      booking_sources: {
        Row: {
          api_config: Json | null;
          code: string;
          color: string | null;
          created_at: string | null;
          default_commission_rate: number | null;
          display_order: number | null;
          icon: string | null;
          id: number;
          is_active: boolean | null;
          name: string;
        };
        Insert: {
          api_config?: Json | null;
          code: string;
          color?: string | null;
          created_at?: string | null;
          default_commission_rate?: number | null;
          display_order?: number | null;
          icon?: string | null;
          id?: number;
          is_active?: boolean | null;
          name: string;
        };
        Update: {
          api_config?: Json | null;
          code?: string;
          color?: string | null;
          created_at?: string | null;
          default_commission_rate?: number | null;
          display_order?: number | null;
          icon?: string | null;
          id?: number;
          is_active?: boolean | null;
          name?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          created_at: string | null;
          description: string | null;
          id: number;
          name: string;
          requires_expiration: boolean | null;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          id?: number;
          name: string;
          requires_expiration?: boolean | null;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          id?: number;
          name?: string;
          requires_expiration?: boolean | null;
        };
        Relationships: [];
      };
      companies: {
        Row: {
          address: string;
          city: string;
          contact_person: string;
          country: string | null;
          created_at: string | null;
          email: string;
          fax: string | null;
          id: number;
          is_active: boolean | null;
          name: string;
          notes: string | null;
          oib: string | null;
          phone: string | null;
          postal_code: string;
          pricing_tier_id: number | null;
          room_allocation_guarantee: number | null;
          updated_at: string | null;
        };
        Insert: {
          address: string;
          city: string;
          contact_person: string;
          country?: string | null;
          created_at?: string | null;
          email: string;
          fax?: string | null;
          id?: number;
          is_active?: boolean | null;
          name: string;
          notes?: string | null;
          oib?: string | null;
          phone?: string | null;
          postal_code: string;
          pricing_tier_id?: number | null;
          room_allocation_guarantee?: number | null;
          updated_at?: string | null;
        };
        Update: {
          address?: string;
          city?: string;
          contact_person?: string;
          country?: string | null;
          created_at?: string | null;
          email?: string;
          fax?: string | null;
          id?: number;
          is_active?: boolean | null;
          name?: string;
          notes?: string | null;
          oib?: string | null;
          phone?: string | null;
          postal_code?: string;
          pricing_tier_id?: number | null;
          room_allocation_guarantee?: number | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'companies_pricing_tier_fkey';
            columns: ['pricing_tier_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_tiers';
            referencedColumns: ['id'];
          },
        ];
      };
      fiscal_records: {
        Row: {
          business_space_code: string | null;
          created_at: string | null;
          id: number;
          invoice_id: number;
          jir: string | null;
          operator_oib: string | null;
          qr_code_data: string | null;
          register_number: number | null;
          response_message: string | null;
          response_status: string | null;
          submitted_at: string | null;
          zki: string;
        };
        Insert: {
          business_space_code?: string | null;
          created_at?: string | null;
          id?: number;
          invoice_id: number;
          jir?: string | null;
          operator_oib?: string | null;
          qr_code_data?: string | null;
          register_number?: number | null;
          response_message?: string | null;
          response_status?: string | null;
          submitted_at?: string | null;
          zki: string;
        };
        Update: {
          business_space_code?: string | null;
          created_at?: string | null;
          id?: number;
          invoice_id?: number;
          jir?: string | null;
          operator_oib?: string | null;
          qr_code_data?: string | null;
          register_number?: number | null;
          response_message?: string | null;
          response_status?: string | null;
          submitted_at?: string | null;
          zki?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'fiscal_records_invoice_fkey';
            columns: ['invoice_id'];
            isOneToOne: false;
            referencedRelation: 'invoices';
            referencedColumns: ['id'];
          },
        ];
      };
      guest_children: {
        Row: {
          age: number | null;
          created_at: string | null;
          date_of_birth: string;
          discount_category: string | null;
          guest_id: number | null;
          id: number;
          name: string;
          reservation_id: number | null;
        };
        Insert: {
          age?: number | null;
          created_at?: string | null;
          date_of_birth: string;
          discount_category?: string | null;
          guest_id?: number | null;
          id?: number;
          name: string;
          reservation_id?: number | null;
        };
        Update: {
          age?: number | null;
          created_at?: string | null;
          date_of_birth?: string;
          discount_category?: string | null;
          guest_id?: number | null;
          id?: number;
          name?: string;
          reservation_id?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'guest_children_guest_fkey';
            columns: ['guest_id'];
            isOneToOne: false;
            referencedRelation: 'guest_stats';
            referencedColumns: ['guest_id'];
          },
          {
            foreignKeyName: 'guest_children_guest_fkey';
            columns: ['guest_id'];
            isOneToOne: false;
            referencedRelation: 'guests';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'guest_children_reservation_fk';
            columns: ['reservation_id'];
            isOneToOne: false;
            referencedRelation: 'reservation_with_all_guests';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'guest_children_reservation_fk';
            columns: ['reservation_id'];
            isOneToOne: false;
            referencedRelation: 'reservations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'guest_children_reservation_fk';
            columns: ['reservation_id'];
            isOneToOne: false;
            referencedRelation: 'reservations_with_enums';
            referencedColumns: ['id'];
          },
        ];
      };
      guest_stays: {
        Row: {
          actual_check_in: string | null;
          actual_check_out: string | null;
          check_in: string;
          check_out: string;
          created_at: string | null;
          guest_id: number;
          id: number;
          reservation_id: number;
          updated_at: string | null;
        };
        Insert: {
          actual_check_in?: string | null;
          actual_check_out?: string | null;
          check_in: string;
          check_out: string;
          created_at?: string | null;
          guest_id: number;
          id?: number;
          reservation_id: number;
          updated_at?: string | null;
        };
        Update: {
          actual_check_in?: string | null;
          actual_check_out?: string | null;
          check_in?: string;
          check_out?: string;
          created_at?: string | null;
          guest_id?: number;
          id?: number;
          reservation_id?: number;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'guest_stays_guest_id_fkey';
            columns: ['guest_id'];
            isOneToOne: false;
            referencedRelation: 'guest_stats';
            referencedColumns: ['guest_id'];
          },
          {
            foreignKeyName: 'guest_stays_guest_id_fkey';
            columns: ['guest_id'];
            isOneToOne: false;
            referencedRelation: 'guests';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'guest_stays_reservation_id_fkey';
            columns: ['reservation_id'];
            isOneToOne: false;
            referencedRelation: 'reservation_with_all_guests';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'guest_stays_reservation_id_fkey';
            columns: ['reservation_id'];
            isOneToOne: false;
            referencedRelation: 'reservations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'guest_stays_reservation_id_fkey';
            columns: ['reservation_id'];
            isOneToOne: false;
            referencedRelation: 'reservations_with_enums';
            referencedColumns: ['id'];
          },
        ];
      };
      guests: {
        Row: {
          average_rating: number | null;
          country_code: string | null;
          created_at: string | null;
          date_of_birth: string | null;
          dietary_restrictions: string[] | null;
          email: string | null;
          first_name: string;
          full_name: string | null;
          has_pets: boolean | null;
          id: number;
          id_card_number: string | null;
          is_vip: boolean | null;
          last_name: string;
          marketing_consent: boolean | null;
          nationality: string | null;
          notes: string | null;
          passport_number: string | null;
          phone: string | null;
          preferred_language: string | null;
          special_needs: string | null;
          updated_at: string | null;
          vip_level: number | null;
        };
        Insert: {
          average_rating?: number | null;
          country_code?: string | null;
          created_at?: string | null;
          date_of_birth?: string | null;
          dietary_restrictions?: string[] | null;
          email?: string | null;
          first_name: string;
          full_name?: string | null;
          has_pets?: boolean | null;
          id?: number;
          id_card_number?: string | null;
          is_vip?: boolean | null;
          last_name: string;
          marketing_consent?: boolean | null;
          nationality?: string | null;
          notes?: string | null;
          passport_number?: string | null;
          phone?: string | null;
          preferred_language?: string | null;
          special_needs?: string | null;
          updated_at?: string | null;
          vip_level?: number | null;
        };
        Update: {
          average_rating?: number | null;
          country_code?: string | null;
          created_at?: string | null;
          date_of_birth?: string | null;
          dietary_restrictions?: string[] | null;
          email?: string | null;
          first_name?: string;
          full_name?: string | null;
          has_pets?: boolean | null;
          id?: number;
          id_card_number?: string | null;
          is_vip?: boolean | null;
          last_name?: string;
          marketing_consent?: boolean | null;
          nationality?: string | null;
          notes?: string | null;
          passport_number?: string | null;
          phone?: string | null;
          preferred_language?: string | null;
          special_needs?: string | null;
          updated_at?: string | null;
          vip_level?: number | null;
        };
        Relationships: [];
      };
      hotels: {
        Row: {
          address: Json | null;
          contact_info: Json | null;
          created_at: string | null;
          id: number;
          name: string;
          oib: string | null;
          updated_at: string | null;
        };
        Insert: {
          address?: Json | null;
          contact_info?: Json | null;
          created_at?: string | null;
          id?: number;
          name: string;
          oib?: string | null;
          updated_at?: string | null;
        };
        Update: {
          address?: Json | null;
          contact_info?: Json | null;
          created_at?: string | null;
          id?: number;
          name?: string;
          oib?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      inventory: {
        Row: {
          cost_per_unit: number | null;
          created_at: string | null;
          display_order: number;
          expiration_date: string | null;
          id: number;
          item_id: number;
          location_id: number;
          quantity: number;
          updated_at: string | null;
        };
        Insert: {
          cost_per_unit?: number | null;
          created_at?: string | null;
          display_order: number;
          expiration_date?: string | null;
          id?: number;
          item_id: number;
          location_id: number;
          quantity?: number;
          updated_at?: string | null;
        };
        Update: {
          cost_per_unit?: number | null;
          created_at?: string | null;
          display_order?: number;
          expiration_date?: string | null;
          id?: number;
          item_id?: number;
          location_id?: number;
          quantity?: number;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'inventory_item_id_fkey';
            columns: ['item_id'];
            isOneToOne: false;
            referencedRelation: 'items';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'inventory_location_id_fkey';
            columns: ['location_id'];
            isOneToOne: false;
            referencedRelation: 'locations';
            referencedColumns: ['id'];
          },
        ];
      };
      invoice_lines: {
        Row: {
          charge_type: string;
          description: string;
          id: number;
          invoice_id: number;
          quantity: number;
          sort_order: number | null;
          total: number;
          unit_price: number;
          vat_rate: number | null;
        };
        Insert: {
          charge_type: string;
          description: string;
          id?: number;
          invoice_id: number;
          quantity?: number;
          sort_order?: number | null;
          total: number;
          unit_price: number;
          vat_rate?: number | null;
        };
        Update: {
          charge_type?: string;
          description?: string;
          id?: number;
          invoice_id?: number;
          quantity?: number;
          sort_order?: number | null;
          total?: number;
          unit_price?: number;
          vat_rate?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'invoice_lines_invoice_id_fkey';
            columns: ['invoice_id'];
            isOneToOne: false;
            referencedRelation: 'invoices';
            referencedColumns: ['id'];
          },
        ];
      };
      invoices: {
        Row: {
          balance_due: number | null;
          company_id: number | null;
          created_at: string | null;
          due_date: string | null;
          email_sent_at: string | null;
          guest_id: number | null;
          id: number;
          invoice_number: string;
          issue_date: string | null;
          notes: string | null;
          paid_amount: number | null;
          paid_date: string | null;
          pdf_path: string | null;
          reservation_id: number;
          status: string | null;
          subtotal: number;
          total_amount: number;
          updated_at: string | null;
        };
        Insert: {
          balance_due?: number | null;
          company_id?: number | null;
          created_at?: string | null;
          due_date?: string | null;
          email_sent_at?: string | null;
          guest_id?: number | null;
          id?: number;
          invoice_number: string;
          issue_date?: string | null;
          notes?: string | null;
          paid_amount?: number | null;
          paid_date?: string | null;
          pdf_path?: string | null;
          reservation_id: number;
          status?: string | null;
          subtotal: number;
          total_amount: number;
          updated_at?: string | null;
        };
        Update: {
          balance_due?: number | null;
          company_id?: number | null;
          created_at?: string | null;
          due_date?: string | null;
          email_sent_at?: string | null;
          guest_id?: number | null;
          id?: number;
          invoice_number?: string;
          issue_date?: string | null;
          notes?: string | null;
          paid_amount?: number | null;
          paid_date?: string | null;
          pdf_path?: string | null;
          reservation_id?: number;
          status?: string | null;
          subtotal?: number;
          total_amount?: number;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'invoices_company_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'companies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'invoices_guest_fkey';
            columns: ['guest_id'];
            isOneToOne: false;
            referencedRelation: 'guest_stats';
            referencedColumns: ['guest_id'];
          },
          {
            foreignKeyName: 'invoices_guest_fkey';
            columns: ['guest_id'];
            isOneToOne: false;
            referencedRelation: 'guests';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'invoices_reservation_fkey';
            columns: ['reservation_id'];
            isOneToOne: false;
            referencedRelation: 'reservation_with_all_guests';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'invoices_reservation_fkey';
            columns: ['reservation_id'];
            isOneToOne: false;
            referencedRelation: 'reservations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'invoices_reservation_fkey';
            columns: ['reservation_id'];
            isOneToOne: false;
            referencedRelation: 'reservations_with_enums';
            referencedColumns: ['id'];
          },
        ];
      };
      items: {
        Row: {
          category_id: number;
          created_at: string | null;
          description: string | null;
          id: number;
          is_active: boolean | null;
          minimum_stock: number | null;
          name: string;
          price: number | null;
          unit: string | null;
          updated_at: string | null;
        };
        Insert: {
          category_id: number;
          created_at?: string | null;
          description?: string | null;
          id?: number;
          is_active?: boolean | null;
          minimum_stock?: number | null;
          name: string;
          price?: number | null;
          unit?: string | null;
          updated_at?: string | null;
        };
        Update: {
          category_id?: number;
          created_at?: string | null;
          description?: string | null;
          id?: number;
          is_active?: boolean | null;
          minimum_stock?: number | null;
          name?: string;
          price?: number | null;
          unit?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'items_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
        ];
      };
      labels: {
        Row: {
          bg_color: string | null;
          color: string | null;
          created_at: string;
          hotel_id: number;
          id: string;
          name: string;
          updated_at: string;
        };
        Insert: {
          bg_color?: string | null;
          color?: string | null;
          created_at?: string;
          hotel_id: number;
          id?: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          bg_color?: string | null;
          color?: string | null;
          created_at?: string;
          hotel_id?: number;
          id?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'labels_hotel_id_fkey';
            columns: ['hotel_id'];
            isOneToOne: false;
            referencedRelation: 'hotels';
            referencedColumns: ['id'];
          },
        ];
      };
      locations: {
        Row: {
          created_at: string | null;
          description: string | null;
          id: number;
          is_refrigerated: boolean | null;
          name: string;
          type: string | null;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          id?: number;
          is_refrigerated?: boolean | null;
          name: string;
          type?: string | null;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          id?: number;
          is_refrigerated?: boolean | null;
          name?: string;
          type?: string | null;
        };
        Relationships: [];
      };
      pricing_seasons: {
        Row: {
          code: string;
          color: string | null;
          created_at: string | null;
          end_date: string;
          hotel_id: number | null;
          id: number;
          is_active: boolean | null;
          name: string;
          priority: number | null;
          start_date: string;
          year_pattern: number | null;
        };
        Insert: {
          code: string;
          color?: string | null;
          created_at?: string | null;
          end_date: string;
          hotel_id?: number | null;
          id?: number;
          is_active?: boolean | null;
          name: string;
          priority?: number | null;
          start_date: string;
          year_pattern?: number | null;
        };
        Update: {
          code?: string;
          color?: string | null;
          created_at?: string | null;
          end_date?: string;
          hotel_id?: number | null;
          id?: number;
          is_active?: boolean | null;
          name?: string;
          priority?: number | null;
          start_date?: string;
          year_pattern?: number | null;
        };
        Relationships: [];
      };
      pricing_tiers: {
        Row: {
          created_at: string | null;
          description: string | null;
          discount_percentage: number | null;
          id: number;
          is_active: boolean | null;
          is_default: boolean | null;
          minimum_stay: number | null;
          name: string;
          updated_at: string | null;
          valid_from: string;
          valid_to: string | null;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          discount_percentage?: number | null;
          id?: number;
          is_active?: boolean | null;
          is_default?: boolean | null;
          minimum_stay?: number | null;
          name: string;
          updated_at?: string | null;
          valid_from: string;
          valid_to?: string | null;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          discount_percentage?: number | null;
          id?: number;
          is_active?: boolean | null;
          is_default?: boolean | null;
          minimum_stay?: number | null;
          name?: string;
          updated_at?: string | null;
          valid_from?: string;
          valid_to?: string | null;
        };
        Relationships: [];
      };
      reservation_charges: {
        Row: {
          charge_type: string;
          created_at: string | null;
          description: string;
          id: number;
          quantity: number;
          reservation_id: number;
          sort_order: number | null;
          stay_date: string | null;
          total: number;
          unit_price: number;
          updated_at: string | null;
          vat_rate: number | null;
        };
        Insert: {
          charge_type: string;
          created_at?: string | null;
          description: string;
          id?: number;
          quantity?: number;
          reservation_id: number;
          sort_order?: number | null;
          stay_date?: string | null;
          total: number;
          unit_price: number;
          updated_at?: string | null;
          vat_rate?: number | null;
        };
        Update: {
          charge_type?: string;
          created_at?: string | null;
          description?: string;
          id?: number;
          quantity?: number;
          reservation_id?: number;
          sort_order?: number | null;
          stay_date?: string | null;
          total?: number;
          unit_price?: number;
          updated_at?: string | null;
          vat_rate?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'reservation_charges_reservation_id_fkey';
            columns: ['reservation_id'];
            isOneToOne: false;
            referencedRelation: 'reservation_with_all_guests';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reservation_charges_reservation_id_fkey';
            columns: ['reservation_id'];
            isOneToOne: false;
            referencedRelation: 'reservations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reservation_charges_reservation_id_fkey';
            columns: ['reservation_id'];
            isOneToOne: false;
            referencedRelation: 'reservations_with_enums';
            referencedColumns: ['id'];
          },
        ];
      };
      reservation_guests: {
        Row: {
          created_at: string | null;
          guest_id: number;
          id: number;
          reservation_id: number;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string | null;
          guest_id: number;
          id?: number;
          reservation_id: number;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string | null;
          guest_id?: number;
          id?: number;
          reservation_id?: number;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'reservation_guests_guest_id_fkey';
            columns: ['guest_id'];
            isOneToOne: false;
            referencedRelation: 'guest_stats';
            referencedColumns: ['guest_id'];
          },
          {
            foreignKeyName: 'reservation_guests_guest_id_fkey';
            columns: ['guest_id'];
            isOneToOne: false;
            referencedRelation: 'guests';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reservation_guests_reservation_id_fkey';
            columns: ['reservation_id'];
            isOneToOne: false;
            referencedRelation: 'reservation_with_all_guests';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reservation_guests_reservation_id_fkey';
            columns: ['reservation_id'];
            isOneToOne: false;
            referencedRelation: 'reservations';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reservation_guests_reservation_id_fkey';
            columns: ['reservation_id'];
            isOneToOne: false;
            referencedRelation: 'reservations_with_enums';
            referencedColumns: ['id'];
          },
        ];
      };
      reservation_statuses: {
        Row: {
          code: string;
          color: string | null;
          created_at: string | null;
          description: string | null;
          display_order: number | null;
          icon: string | null;
          id: number;
          is_active: boolean | null;
          name: string;
        };
        Insert: {
          code: string;
          color?: string | null;
          created_at?: string | null;
          description?: string | null;
          display_order?: number | null;
          icon?: string | null;
          id?: number;
          is_active?: boolean | null;
          name: string;
        };
        Update: {
          code?: string;
          color?: string | null;
          created_at?: string | null;
          description?: string | null;
          display_order?: number | null;
          icon?: string | null;
          id?: number;
          is_active?: boolean | null;
          name?: string;
        };
        Relationships: [];
      };
      reservations: {
        Row: {
          adults: number;
          booking_date: string | null;
          booking_reference: string | null;
          booking_source_id: number | null;
          check_in_date: string;
          check_out_date: string;
          checked_in_at: string | null;
          checked_out_at: string | null;
          children_count: number | null;
          company_id: number | null;
          confirmation_number: string | null;
          created_at: string | null;
          guest_id: number;
          has_pets: boolean | null;
          id: number;
          internal_notes: string | null;
          is_r1: boolean | null;
          label_id: string | null;
          last_modified: string | null;
          number_of_guests: number;
          number_of_nights: number | null;
          parking_required: boolean | null;
          pricing_tier_id: number | null;
          room_id: number;
          special_requests: string | null;
          status_id: number | null;
          updated_at: string | null;
        };
        Insert: {
          adults?: number;
          booking_date?: string | null;
          booking_reference?: string | null;
          booking_source_id?: number | null;
          check_in_date: string;
          check_out_date: string;
          checked_in_at?: string | null;
          checked_out_at?: string | null;
          children_count?: number | null;
          company_id?: number | null;
          confirmation_number?: string | null;
          created_at?: string | null;
          guest_id: number;
          has_pets?: boolean | null;
          id?: number;
          internal_notes?: string | null;
          is_r1?: boolean | null;
          label_id?: string | null;
          last_modified?: string | null;
          number_of_guests?: number;
          number_of_nights?: number | null;
          parking_required?: boolean | null;
          pricing_tier_id?: number | null;
          room_id: number;
          special_requests?: string | null;
          status_id?: number | null;
          updated_at?: string | null;
        };
        Update: {
          adults?: number;
          booking_date?: string | null;
          booking_reference?: string | null;
          booking_source_id?: number | null;
          check_in_date?: string;
          check_out_date?: string;
          checked_in_at?: string | null;
          checked_out_at?: string | null;
          children_count?: number | null;
          company_id?: number | null;
          confirmation_number?: string | null;
          created_at?: string | null;
          guest_id?: number;
          has_pets?: boolean | null;
          id?: number;
          internal_notes?: string | null;
          is_r1?: boolean | null;
          label_id?: string | null;
          last_modified?: string | null;
          number_of_guests?: number;
          number_of_nights?: number | null;
          parking_required?: boolean | null;
          pricing_tier_id?: number | null;
          room_id?: number;
          special_requests?: string | null;
          status_id?: number | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'reservations_booking_source_id_fkey';
            columns: ['booking_source_id'];
            isOneToOne: false;
            referencedRelation: 'booking_sources';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reservations_company_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'companies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reservations_guest_id_fkey';
            columns: ['guest_id'];
            isOneToOne: false;
            referencedRelation: 'guest_stats';
            referencedColumns: ['guest_id'];
          },
          {
            foreignKeyName: 'reservations_guest_id_fkey';
            columns: ['guest_id'];
            isOneToOne: false;
            referencedRelation: 'guests';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reservations_label_id_fkey';
            columns: ['label_id'];
            isOneToOne: false;
            referencedRelation: 'labels';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reservations_pricing_tier_fkey';
            columns: ['pricing_tier_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_tiers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reservations_room_id_fkey';
            columns: ['room_id'];
            isOneToOne: false;
            referencedRelation: 'rooms';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reservations_room_id_fkey';
            columns: ['room_id'];
            isOneToOne: false;
            referencedRelation: 'rooms_with_enums';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reservations_status_id_fkey';
            columns: ['status_id'];
            isOneToOne: false;
            referencedRelation: 'reservation_statuses';
            referencedColumns: ['id'];
          },
        ];
      };
      room_cleaning_reset_log: {
        Row: {
          executed_at: string | null;
          id: number;
          rooms_reset: number;
          triggered_by: string | null;
        };
        Insert: {
          executed_at?: string | null;
          id?: number;
          rooms_reset: number;
          triggered_by?: string | null;
        };
        Update: {
          executed_at?: string | null;
          id?: number;
          rooms_reset?: number;
          triggered_by?: string | null;
        };
        Relationships: [];
      };
      room_pricing: {
        Row: {
          base_rate: number;
          created_at: string | null;
          currency: string | null;
          id: number;
          room_id: number | null;
          season_id: number | null;
          valid_from: string;
          valid_to: string | null;
        };
        Insert: {
          base_rate: number;
          created_at?: string | null;
          currency?: string | null;
          id?: number;
          room_id?: number | null;
          season_id?: number | null;
          valid_from: string;
          valid_to?: string | null;
        };
        Update: {
          base_rate?: number;
          created_at?: string | null;
          currency?: string | null;
          id?: number;
          room_id?: number | null;
          season_id?: number | null;
          valid_from?: string;
          valid_to?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'room_pricing_room_id_fkey';
            columns: ['room_id'];
            isOneToOne: false;
            referencedRelation: 'rooms';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'room_pricing_room_id_fkey';
            columns: ['room_id'];
            isOneToOne: false;
            referencedRelation: 'rooms_with_enums';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'room_pricing_season_id_fkey';
            columns: ['season_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_seasons';
            referencedColumns: ['id'];
          },
        ];
      };
      room_types: {
        Row: {
          base_area_sqm: number | null;
          code: string;
          color: string | null;
          created_at: string | null;
          description: string | null;
          display_order: number | null;
          icon: string | null;
          id: number;
          is_active: boolean | null;
          max_occupancy: number;
          name: string;
        };
        Insert: {
          base_area_sqm?: number | null;
          code: string;
          color?: string | null;
          created_at?: string | null;
          description?: string | null;
          display_order?: number | null;
          icon?: string | null;
          id?: number;
          is_active?: boolean | null;
          max_occupancy: number;
          name: string;
        };
        Update: {
          base_area_sqm?: number | null;
          code?: string;
          color?: string | null;
          created_at?: string | null;
          description?: string | null;
          display_order?: number | null;
          icon?: string | null;
          id?: number;
          is_active?: boolean | null;
          max_occupancy?: number;
          name?: string;
        };
        Relationships: [];
      };
      rooms: {
        Row: {
          amenities: Json | null;
          created_at: string | null;
          floor_number: number;
          id: number;
          is_active: boolean | null;
          is_clean: boolean | null;
          is_premium: boolean | null;
          max_occupancy: number | null;
          room_number: string;
          room_type_id: number | null;
          updated_at: string | null;
        };
        Insert: {
          amenities?: Json | null;
          created_at?: string | null;
          floor_number: number;
          id?: number;
          is_active?: boolean | null;
          is_clean?: boolean | null;
          is_premium?: boolean | null;
          max_occupancy?: number | null;
          room_number: string;
          room_type_id?: number | null;
          updated_at?: string | null;
        };
        Update: {
          amenities?: Json | null;
          created_at?: string | null;
          floor_number?: number;
          id?: number;
          is_active?: boolean | null;
          is_clean?: boolean | null;
          is_premium?: boolean | null;
          max_occupancy?: number | null;
          room_number?: string;
          room_type_id?: number | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'rooms_room_type_id_fkey';
            columns: ['room_type_id'];
            isOneToOne: false;
            referencedRelation: 'room_types';
            referencedColumns: ['id'];
          },
        ];
      };
      user_profiles: {
        Row: {
          created_at: string | null;
          id: string;
          is_active: boolean | null;
          push_notifications_enabled: boolean | null;
          push_subscription: string | null;
          role_id: number;
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          push_notifications_enabled?: boolean | null;
          push_subscription?: string | null;
          role_id: number;
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          push_notifications_enabled?: boolean | null;
          push_subscription?: string | null;
          role_id?: number;
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_profiles_role_id_fkey';
            columns: ['role_id'];
            isOneToOne: false;
            referencedRelation: 'user_roles';
            referencedColumns: ['id'];
          },
        ];
      };
      user_roles: {
        Row: {
          created_at: string | null;
          description: string | null;
          id: number;
          name: string;
        };
        Insert: {
          created_at?: string | null;
          description?: string | null;
          id?: number;
          name: string;
        };
        Update: {
          created_at?: string | null;
          description?: string | null;
          id?: number;
          name?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      guest_stats: {
        Row: {
          first_stay: string | null;
          guest_id: number | null;
          last_stay: string | null;
          total_reservations: number | null;
          total_spent: number | null;
        };
        Relationships: [];
      };
      reservation_with_all_guests: {
        Row: {
          adults: number | null;
          all_guests: Json | null;
          booking_date: string | null;
          booking_reference: string | null;
          booking_source_code: string | null;
          booking_source_id: number | null;
          check_in_date: string | null;
          check_out_date: string | null;
          checked_in_at: string | null;
          checked_out_at: string | null;
          children_count: number | null;
          company_id: number | null;
          confirmation_number: string | null;
          created_at: string | null;
          guest_id: number | null;
          has_pets: boolean | null;
          id: number | null;
          internal_notes: string | null;
          is_r1: boolean | null;
          label_id: string | null;
          last_modified: string | null;
          number_of_guests: number | null;
          number_of_nights: number | null;
          parking_required: boolean | null;
          pricing_tier_id: number | null;
          room_id: number | null;
          special_requests: string | null;
          status_code: string | null;
          status_id: number | null;
          updated_at: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'reservations_booking_source_id_fkey';
            columns: ['booking_source_id'];
            isOneToOne: false;
            referencedRelation: 'booking_sources';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reservations_company_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'companies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reservations_guest_id_fkey';
            columns: ['guest_id'];
            isOneToOne: false;
            referencedRelation: 'guest_stats';
            referencedColumns: ['guest_id'];
          },
          {
            foreignKeyName: 'reservations_guest_id_fkey';
            columns: ['guest_id'];
            isOneToOne: false;
            referencedRelation: 'guests';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reservations_label_id_fkey';
            columns: ['label_id'];
            isOneToOne: false;
            referencedRelation: 'labels';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reservations_pricing_tier_fkey';
            columns: ['pricing_tier_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_tiers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reservations_room_id_fkey';
            columns: ['room_id'];
            isOneToOne: false;
            referencedRelation: 'rooms';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reservations_room_id_fkey';
            columns: ['room_id'];
            isOneToOne: false;
            referencedRelation: 'rooms_with_enums';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reservations_status_id_fkey';
            columns: ['status_id'];
            isOneToOne: false;
            referencedRelation: 'reservation_statuses';
            referencedColumns: ['id'];
          },
        ];
      };
      reservations_with_enums: {
        Row: {
          adults: number | null;
          booking_date: string | null;
          booking_reference: string | null;
          booking_source_code: string | null;
          booking_source_color: string | null;
          booking_source_icon: string | null;
          booking_source_id: number | null;
          booking_source_name: string | null;
          check_in_date: string | null;
          check_out_date: string | null;
          checked_in_at: string | null;
          checked_out_at: string | null;
          children_count: number | null;
          company_id: number | null;
          confirmation_number: string | null;
          created_at: string | null;
          default_commission_rate: number | null;
          guest_id: number | null;
          has_pets: boolean | null;
          id: number | null;
          internal_notes: string | null;
          is_r1: boolean | null;
          label_id: string | null;
          last_modified: string | null;
          number_of_guests: number | null;
          number_of_nights: number | null;
          parking_required: boolean | null;
          pricing_tier_id: number | null;
          room_id: number | null;
          special_requests: string | null;
          status_code: string | null;
          status_color: string | null;
          status_icon: string | null;
          status_id: number | null;
          status_name: string | null;
          updated_at: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'reservations_booking_source_id_fkey';
            columns: ['booking_source_id'];
            isOneToOne: false;
            referencedRelation: 'booking_sources';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reservations_company_fkey';
            columns: ['company_id'];
            isOneToOne: false;
            referencedRelation: 'companies';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reservations_guest_id_fkey';
            columns: ['guest_id'];
            isOneToOne: false;
            referencedRelation: 'guest_stats';
            referencedColumns: ['guest_id'];
          },
          {
            foreignKeyName: 'reservations_guest_id_fkey';
            columns: ['guest_id'];
            isOneToOne: false;
            referencedRelation: 'guests';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reservations_label_id_fkey';
            columns: ['label_id'];
            isOneToOne: false;
            referencedRelation: 'labels';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reservations_pricing_tier_fkey';
            columns: ['pricing_tier_id'];
            isOneToOne: false;
            referencedRelation: 'pricing_tiers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reservations_room_id_fkey';
            columns: ['room_id'];
            isOneToOne: false;
            referencedRelation: 'rooms';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reservations_room_id_fkey';
            columns: ['room_id'];
            isOneToOne: false;
            referencedRelation: 'rooms_with_enums';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reservations_status_id_fkey';
            columns: ['status_id'];
            isOneToOne: false;
            referencedRelation: 'reservation_statuses';
            referencedColumns: ['id'];
          },
        ];
      };
      rooms_with_enums: {
        Row: {
          amenities: Json | null;
          created_at: string | null;
          floor_number: number | null;
          id: number | null;
          is_active: boolean | null;
          is_clean: boolean | null;
          is_premium: boolean | null;
          max_occupancy: number | null;
          room_number: string | null;
          room_type_code: string | null;
          room_type_color: string | null;
          room_type_description: string | null;
          room_type_icon: string | null;
          room_type_id: number | null;
          room_type_name: string | null;
          type_max_occupancy: number | null;
          updated_at: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'rooms_room_type_id_fkey';
            columns: ['room_type_id'];
            isOneToOne: false;
            referencedRelation: 'room_types';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Functions: {
      check_tables_exist: {
        Args: { table_names: string[] };
        Returns: {
          table_name: string;
        }[];
      };
      get_next_available_virtual_room: {
        Args: { p_check_in: string; p_check_out: string };
        Returns: number;
      };
      get_room_price: {
        Args: { p_date?: string; p_room_id: number };
        Returns: {
          base_rate: number;
          currency: string;
          room_id: number;
          season_code: string;
          season_name: string;
        }[];
      };
      log_audit_entry: {
        Args: {
          p_action: string;
          p_description: string;
          p_new_values?: Json;
          p_old_values?: Json;
          p_record_id: number;
          p_table_name: string;
          p_user_id: string;
        };
        Returns: undefined;
      };
      log_inventory_quantity_update: {
        Args: {
          p_inventory_id: number;
          p_item_name: string;
          p_location_name: string;
          p_new_quantity: number;
          p_old_quantity: number;
        };
        Returns: undefined;
      };
      migrate_all_reservations_to_daily_details: {
        Args: never;
        Returns: {
          reservation_id: number;
          rows_inserted: number;
          status: string;
        }[];
      };
      migrate_enumeration_data: {
        Args: never;
        Returns: {
          reservations_migrated: number;
          rooms_migrated: number;
          unmapped_room_types: string[];
          unmapped_sources: string[];
          unmapped_statuses: string[];
        }[];
      };
      migrate_reservation_guests: { Args: never; Returns: number };
      migrate_reservation_to_daily_details: {
        Args: { p_reservation_id: number };
        Returns: number;
      };
      reset_daily_room_cleaning:
        | {
            Args: never;
            Returns: {
              execution_time: string;
              rooms_reset: number;
            }[];
          }
        | {
            Args: { trigger_source?: string };
            Returns: {
              execution_time: string;
              rooms_reset: number;
            }[];
          };
      set_current_user_for_audit: {
        Args: { user_uuid: string };
        Returns: undefined;
      };
      show_limit: { Args: never; Returns: number };
      show_trgm: { Args: { '': string }; Returns: string[] };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
});
