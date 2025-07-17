import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://gkbpthurkucotikjefra.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrYnB0aHVya3Vjb3Rpa2plZnJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3MzMxNTksImV4cCI6MjA2ODMwOTE1OX0.pXbrXBCeJHgXzHGTB4WatYfWsaFFkrlr8ChUkVIV6SY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
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
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role_id: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role_id?: number
          is_active?: boolean
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
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}