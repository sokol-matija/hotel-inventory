// Simple Room Cleaning Service
// No logging, just updates room status and provides real-time subscriptions

import { supabase, Database } from '@/lib/supabase'

type Room = Database['public']['Tables']['rooms']['Row']

export class RoomCleaningService {
  private static instance: RoomCleaningService

  static getInstance(): RoomCleaningService {
    if (!RoomCleaningService.instance) {
      RoomCleaningService.instance = new RoomCleaningService()
    }
    return RoomCleaningService.instance
  }

  /**
   * Mark room as clean (called by NFC tap)
   */
  async markRoomAsClean(roomId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('rooms')
        .update({
          is_cleaned: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', roomId)

      if (error) {
        return { success: false, error: error.message }
      }

      console.log(`✅ Room ${roomId} marked as clean`)
      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: errorMessage }
    }
  }

  /**
   * Mark room as dirty (called on checkout)
   */
  async markRoomAsDirty(roomId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('rooms')
        .update({
          is_cleaned: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', roomId)

      if (error) {
        return { success: false, error: error.message }
      }

      console.log(`❌ Room ${roomId} marked as dirty`)
      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: errorMessage }
    }
  }

  /**
   * Get room cleaning status
   */
  async getRoomStatus(roomId: string): Promise<{
    isClean: boolean
    lastUpdated: string | null
  } | null> {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('is_cleaned, updated_at')
        .eq('id', roomId)
        .single()

      if (error || !data) {
        return null
      }

      return {
        isClean: data.is_cleaned || false,
        lastUpdated: data.updated_at,
      }
    } catch (error) {
      console.error(`Failed to get room status for ${roomId}:`, error)
      return null
    }
  }

  /**
   * Subscribe to room cleaning status changes
   * Fires callback whenever room is_cleaned is updated
   */
  subscribeToRoomStatus(
    roomId: string,
    callback: (isClean: boolean) => void
  ): {
    unsubscribe: () => Promise<void>
  } {
    const subscription = supabase
      .channel(`room:${roomId}:cleaning`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          const isClean = (payload.new as Room).is_cleaned || false
          callback(isClean)
        }
      )
      .subscribe()

    return {
      unsubscribe: async () => {
        await subscription.unsubscribe()
      },
    }
  }

  /**
   * Get all rooms with cleaning status
   */
  async getAllRoomsStatus(): Promise<
    Array<{
      id: string
      number: string
      isClean: boolean
    }>
  > {
    try {
      const { data, error } = await supabase.from('rooms').select('id, number, is_cleaned')

      if (error) {
        console.error('Failed to fetch rooms:', error)
        return []
      }

      return (data || []).map((room) => ({
        id: room.id,
        number: room.number,
        isClean: room.is_cleaned || false,
      }))
    } catch (error) {
      console.error('Failed to get all rooms status:', error)
      return []
    }
  }

  /**
   * Mark multiple rooms as clean/dirty
   */
  async updateMultipleRooms(
    roomIds: string[],
    isClean: boolean
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('rooms')
        .update({
          is_cleaned: isClean,
          updated_at: new Date().toISOString(),
        })
        .in('id', roomIds)

      if (error) {
        return { success: false, error: error.message }
      }

      console.log(`Updated ${roomIds.length} rooms to ${isClean ? 'clean' : 'dirty'}`)
      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: errorMessage }
    }
  }

  /**
   * Generate NFC URI for a room
   * This is what gets encoded on the physical NFC tag
   */
  generateNFCUri(roomId: string, hotelId: string = 'gkbpthurkucotikjefra'): string {
    const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://gkbpthurkucotikjefra.supabase.co'
    return `${supabaseUrl}/functions/v1/nfc-clean-room?roomId=${roomId}&hotelId=${hotelId}`
  }
}
