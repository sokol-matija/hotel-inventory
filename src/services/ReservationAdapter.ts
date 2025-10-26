/**
 * Compatibility Layer for Database Migration
 * Ensures frontend continues working during schema transition
 */

import { supabase } from '@/lib/supabase'

console.log('[RESERVATION ADAPTER] Module loaded')

export interface LegacyReservation {
  id: string
  guest_id: string
  room_id: string
  check_in_date: string
  check_out_date: string
  adults: number
  children_count: number
  internal_notes?: string
  special_requests?: string
  status: string
  has_pets?: boolean
  parking_required?: boolean
  pet_count?: number
  // Add other fields that might be needed by the UI
  [key: string]: any
}

export interface NormalizedReservationData {
  reservation: LegacyReservation
  allGuests: Array<{
    id: string
    first_name: string
    last_name: string
    email?: string
    phone?: string
    is_primary: boolean
    guest_type: 'adult' | 'child'
  }>
  guestStays: Array<{
    guest_id: string
    check_in: string
    check_out: string
  }>
}

export class ReservationAdapter {
  private static instance: ReservationAdapter
  private useNewSchema = false // Feature flag for migration

  static getInstance(): ReservationAdapter {
    if (!ReservationAdapter.instance) {
      ReservationAdapter.instance = new ReservationAdapter()
    }
    return ReservationAdapter.instance
  }

  async enableNewSchema(): Promise<void> {
    // Check if new tables exist
    const { data: tables } = await supabase.rpc('check_tables_exist', {
      table_names: ['guest_stays', 'reservation_guests']
    })
    
    if (tables && tables.length === 2) {
      this.useNewSchema = true
      console.log('✅ New schema enabled')
    }
  }

  async getReservationWithGuests(reservationId: string): Promise<NormalizedReservationData> {
    if (this.useNewSchema) {
      return this.getReservationNewSchema(reservationId)
    }
    return this.getReservationLegacySchema(reservationId)
  }

  private async getReservationNewSchema(reservationId: string): Promise<NormalizedReservationData> {
    // Query new normalized schema
    const { data: reservation } = await supabase
      .from('reservations')
      .select(`
        *,
        reservation_guests!inner(
          guest:guests(*)
        ),
        guest_stays(
          guest_id,
          check_in,
          check_out
        )
      `)
      .eq('id', reservationId)
      .single()

    if (!reservation) throw new Error('Reservation not found')

    const allGuests = reservation.reservation_guests.map((rg: any) => ({
      ...rg.guest,
      is_primary: rg.guest.id === reservation.guest_id,
      guest_type: 'adult' as const
    }))

    const guestStays = reservation.guest_stays || []

    return {
      reservation: reservation as LegacyReservation,
      allGuests,
      guestStays
    }
  }

  private async getReservationLegacySchema(reservationId: string): Promise<NormalizedReservationData> {
    // Current legacy approach with text parsing
    const { data: reservation } = await supabase
      .from('reservations')
      .select(`
        *,
        primary_guest:guests!guest_id(*)
      `)
      .eq('id', reservationId)
      .single()

    if (!reservation) throw new Error('Reservation not found')

    const allGuests = [reservation.primary_guest]

    // Parse additional adults from notes (current workaround)
    const notesText = reservation.notes || reservation.special_requests || ''
    const additionalAdultsMatch = notesText.match(/additional_adults:([^|]+)/)
    
    if (additionalAdultsMatch) {
      const additionalIds = additionalAdultsMatch[1].split(',')
        .map((id: string) => id.trim())
        .filter(Boolean)

      for (const guestId of additionalIds) {
        const { data: guest } = await supabase
          .from('guests')
          .select('*')
          .eq('id', guestId)
          .single()

        if (guest) {
          allGuests.push({
            ...guest,
            is_primary: false,
            guest_type: 'adult' as const
          })
        } else {
          // Create placeholder for missing guest
          allGuests.push({
            id: guestId,
            first_name: 'Guest',
            last_name: `#${guestId.slice(-4)}`,
            email: null,
            phone: null,
            is_primary: false,
            guest_type: 'adult' as const
          })
        }
      }
    }

    // Legacy: all guests have same stay period
    const guestStays = allGuests.map(guest => ({
      guest_id: guest.id,
      check_in: reservation.check_in_date,
      check_out: reservation.check_out_date
    }))

    return {
      reservation: reservation as LegacyReservation,
      allGuests: allGuests.map(g => ({
        ...g,
        is_primary: g.id === reservation.guest_id
      })),
      guestStays
    }
  }

  async createReservationWithGuests(reservationData: {
    room_id: string
    check_in: string
    check_out: string
    guests: Array<{
      first_name: string
      last_name: string
      email?: string
      phone?: string
      guest_type: 'adult' | 'child'
      check_in?: string
      check_out?: string
    }>
    status?: string
  }): Promise<{ reservationId: string; success: boolean }> {

    if (this.useNewSchema) {
      return this.createReservationNewSchema(reservationData)
    }
    return this.createReservationLegacySchema(reservationData)
  }

  private async createReservationNewSchema(reservationData: any): Promise<{ reservationId: string; success: boolean }> {
    const { data: reservation, error: reservationError } = await supabase
      .from('reservations')
      .insert({
        room_id: reservationData.room_id,
        check_in: reservationData.check_in,
        check_out: reservationData.check_out,
        adults: reservationData.guests.filter((g: any) => g.guest_type === 'adult').length,
        children_count: reservationData.guests.filter((g: any) => g.guest_type === 'child').length,
        status: reservationData.status || 'confirmed'
      })
      .select()
      .single()

    if (reservationError) throw reservationError

    // Create guests and relationships
    for (let i = 0; i < reservationData.guests.length; i++) {
      const guestData = reservationData.guests[i]
      
      // Create guest
      const { data: guest, error: guestError } = await supabase
        .from('guests')
        .insert({
          first_name: guestData.first_name,
          last_name: guestData.last_name,
          email: guestData.email,
          phone: guestData.phone
        })
        .select()
        .single()

      if (guestError) throw guestError

      // Set primary guest
      if (i === 0) {
        await supabase
          .from('reservations')
          .update({ guest_id: guest.id })
          .eq('id', reservation.id)
      }

      // Create reservation-guest relationship
      await supabase
        .from('reservation_guests')
        .insert({
          reservation_id: reservation.id,
          guest_id: guest.id
        })

      // Create guest stay
      await supabase
        .from('guest_stays')
        .insert({
          reservation_id: reservation.id,
          guest_id: guest.id,
          check_in: guestData.check_in || reservationData.check_in,
          check_out: guestData.check_out || reservationData.check_out
        })
    }

    // Notification removed - now handled in ModernCreateBookingModal

    return { reservationId: reservation.id, success: true }
  }

  private async createReservationLegacySchema(reservationData: any): Promise<{ reservationId: string; success: boolean }> {
    // Legacy creation with text storage
    const primaryGuest = reservationData.guests[0]
    
    // Create primary guest
    const { data: guest, error: guestError } = await supabase
      .from('guests')
      .insert({
        first_name: primaryGuest.first_name,
        last_name: primaryGuest.last_name,
        email: primaryGuest.email,
        phone: primaryGuest.phone
      })
      .select()
      .single()

    if (guestError) throw guestError

    // Create additional guests and store IDs in notes
    const additionalGuests = reservationData.guests.slice(1)
    const additionalGuestIds: string[] = []

    for (const guestData of additionalGuests) {
      const { data: additionalGuest, error } = await supabase
        .from('guests')
        .insert({
          first_name: guestData.first_name,
          last_name: guestData.last_name,
          email: guestData.email,
          phone: guestData.phone
        })
        .select()
        .single()

      if (!error && additionalGuest) {
        additionalGuestIds.push(additionalGuest.id)
      }
    }

    // Create reservation with guest IDs in notes
    const notes = additionalGuestIds.length > 0 
      ? `additional_adults:${additionalGuestIds.join(',')}`
      : ''

    const { data: reservation, error: reservationError } = await supabase
      .from('reservations')
      .insert({
        room_id: reservationData.room_id,
        check_in_date: reservationData.check_in,
        check_out_date: reservationData.check_out,
        guest_id: guest.id,
        adults: reservationData.guests.filter((g: any) => g.guest_type === 'adult').length,
        children_count: reservationData.guests.filter((g: any) => g.guest_type === 'child').length,
        internal_notes: notes,
        status: reservationData.status || 'confirmed'
      })
      .select()
      .single()

    if (reservationError) throw reservationError

    // Notification removed - now handled in ModernCreateBookingModal

    return { reservationId: reservation.id, success: true }
  }
}

export const reservationAdapter = ReservationAdapter.getInstance()