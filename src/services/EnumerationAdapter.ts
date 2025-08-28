/**
 * Enumeration Compatibility Layer
 * Provides seamless integration between old text-based enums and new lookup tables
 */

import { supabase } from '@/lib/supabase'

export interface ReservationStatus {
  id: number
  code: string
  name: string
  color: string
  icon: string
  description?: string
  display_order: number
}

export interface BookingSource {
  id: number
  code: string
  name: string
  default_commission_rate: number
  color: string
  icon: string
  display_order: number
}

export interface RoomType {
  id: number
  code: string
  name: string
  max_occupancy: number
  color: string
  icon: string
  description?: string
  display_order: number
}

export interface EnhancedReservation {
  id: number
  guest_id: number
  room_id: number
  check_in_date: string
  check_out_date: string
  adults: number
  children_count: number
  status: string
  booking_source: string
  // Enhanced fields from lookup tables
  status_info: ReservationStatus
  booking_source_info: BookingSource
  total_amount: number
  [key: string]: any
}

export interface EnhancedRoom {
  id: number
  room_number: string
  room_type: string
  // Enhanced fields from lookup tables
  room_type_info: RoomType
  // Dynamic pricing fields
  current_season_code?: string
  current_season_rate?: number
  [key: string]: any
}

export class EnumerationAdapter {
  private static instance: EnumerationAdapter
  private statusCache: Map<string, ReservationStatus> = new Map()
  private sourceCache: Map<string, BookingSource> = new Map()
  private roomTypeCache: Map<string, RoomType> = new Map()

  static getInstance(): EnumerationAdapter {
    if (!EnumerationAdapter.instance) {
      EnumerationAdapter.instance = new EnumerationAdapter()
    }
    return EnumerationAdapter.instance
  }

  async loadCaches(): Promise<void> {
    await Promise.all([
      this.loadStatusCache(),
      this.loadSourceCache(),
      this.loadRoomTypeCache()
    ])
  }

  private async loadStatusCache(): Promise<void> {
    const { data: statuses } = await supabase
      .from('reservation_statuses')
      .select('*')
      .eq('is_active', true)
      .order('display_order')

    if (statuses) {
      this.statusCache.clear()
      statuses.forEach(status => {
        this.statusCache.set(status.code, status)
      })
    }
  }

  private async loadSourceCache(): Promise<void> {
    const { data: sources } = await supabase
      .from('booking_sources')
      .select('*')
      .eq('is_active', true)
      .order('display_order')

    if (sources) {
      this.sourceCache.clear()
      sources.forEach(source => {
        this.sourceCache.set(source.code, source)
      })
    }
  }

  private async loadRoomTypeCache(): Promise<void> {
    const { data: roomTypes } = await supabase
      .from('room_types')
      .select('*')
      .eq('is_active', true)
      .order('display_order')

    if (roomTypes) {
      this.roomTypeCache.clear()
      roomTypes.forEach(type => {
        this.roomTypeCache.set(type.code, type)
      })
    }
  }

  // Get enhanced reservation with enum info
  async getEnhancedReservation(reservationId: string | number): Promise<EnhancedReservation | null> {
    const { data: reservation, error } = await supabase
      .from('reservations_with_enums')
      .select('*')
      .eq('id', reservationId)
      .single()

    if (error || !reservation) return null

    return {
      ...reservation,
      status_info: this.getStatusInfo(reservation.status_code || reservation.status),
      booking_source_info: this.getSourceInfo(reservation.booking_source_code || reservation.booking_source)
    }
  }

  // Get enhanced rooms with enum and pricing info
  async getEnhancedRooms(): Promise<EnhancedRoom[]> {
    const { data: rooms, error } = await supabase
      .from('rooms_with_enums')
      .select('*')
      .order('room_number')

    if (error || !rooms) return []

    return rooms.map(room => ({
      ...room,
      room_type_info: this.getRoomTypeInfo(room.room_type_code || room.room_type)
    }))
  }

  // Get room pricing for specific date
  async getRoomPricing(roomId: number, date: Date = new Date()): Promise<{
    season_code: string
    season_name: string
    base_rate: number
    currency: string
  } | null> {
    const { data: pricing, error } = await supabase
      .rpc('get_room_price', {
        p_room_id: roomId,
        p_date: date.toISOString().split('T')[0]
      })

    if (error || !pricing || pricing.length === 0) return null
    return pricing[0]
  }

  // Helper methods for getting enum info
  getStatusInfo(code: string): ReservationStatus {
    return this.statusCache.get(code) || {
      id: 0,
      code,
      name: code,
      color: '#6B7280',
      icon: 'help-circle',
      display_order: 999
    }
  }

  getSourceInfo(code: string): BookingSource {
    return this.sourceCache.get(code) || {
      id: 0,
      code,
      name: code,
      default_commission_rate: 0,
      color: '#6B7280',
      icon: 'help-circle',
      display_order: 999
    }
  }

  getRoomTypeInfo(code: string): RoomType {
    return this.roomTypeCache.get(code) || {
      id: 0,
      code,
      name: code,
      max_occupancy: 2,
      color: '#6B7280',
      icon: 'bed',
      display_order: 999
    }
  }

  // Get all available options for dropdowns
  async getReservationStatuses(): Promise<ReservationStatus[]> {
    if (this.statusCache.size === 0) await this.loadStatusCache()
    return Array.from(this.statusCache.values()).sort((a, b) => a.display_order - b.display_order)
  }

  async getBookingSources(): Promise<BookingSource[]> {
    if (this.sourceCache.size === 0) await this.loadSourceCache()
    return Array.from(this.sourceCache.values()).sort((a, b) => a.display_order - b.display_order)
  }

  async getRoomTypes(): Promise<RoomType[]> {
    if (this.roomTypeCache.size === 0) await this.loadRoomTypeCache()
    return Array.from(this.roomTypeCache.values()).sort((a, b) => a.display_order - b.display_order)
  }

  // Update methods that maintain compatibility
  async updateReservationStatus(reservationId: number, newStatus: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Update both the old text field and new foreign key
      const statusInfo = this.getStatusInfo(newStatus)
      
      const { error } = await supabase
        .from('reservations')
        .update({
          status: newStatus, // For backward compatibility
          status_id: statusInfo.id > 0 ? statusInfo.id : null
        })
        .eq('id', reservationId)

      if (error) throw error
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  async updateReservationSource(reservationId: number, newSource: string): Promise<{ success: boolean; error?: string }> {
    try {
      const sourceInfo = this.getSourceInfo(newSource)
      
      const { error } = await supabase
        .from('reservations')
        .update({
          booking_source: newSource, // For backward compatibility
          booking_source_id: sourceInfo.id > 0 ? sourceInfo.id : null
        })
        .eq('id', reservationId)

      if (error) throw error
      return { success: true }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  // Refresh caches
  async refreshCaches(): Promise<void> {
    await this.loadCaches()
  }
}

export const enumerationAdapter = EnumerationAdapter.getInstance()

// Auto-load caches on import
enumerationAdapter.loadCaches()