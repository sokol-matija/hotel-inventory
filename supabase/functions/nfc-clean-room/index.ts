// NFC Room Cleaning - Simple Test Edge Function
// Marks a room as clean when NFC tag is tapped
// No authentication required - public endpoint

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Use service role key for database operations
    // This allows the function to update the database without client authentication
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables')
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Server configuration error',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse query parameters
    const url = new URL(req.url)
    const roomParam = url.searchParams.get('roomId') // Can be room number (101) or UUID
    const hotelId = url.searchParams.get('hotelId') || 'gkbpthurkucotikjefra'

    console.log(`[NFC TAP] Room Param: ${roomParam}, Hotel: ${hotelId}`)

    // Validation: roomParam is required
    if (!roomParam) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'roomId parameter is required (room number or UUID)',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Step 1: Verify room exists - try both UUID and room number
    let roomQuery = supabase
      .from('rooms')
      .select('id, room_number, floor_number, is_clean')

    // If roomParam looks like a number, search by room_number
    // Otherwise, search by ID (UUID)
    const isRoomNumber = /^\d+$/.test(roomParam)

    if (isRoomNumber) {
      roomQuery = roomQuery.eq('room_number', roomParam)
    } else {
      roomQuery = roomQuery.eq('id', roomParam)
    }

    const { data: room, error: roomError } = await roomQuery.single()

    if (roomError || !room) {
      console.error(`Room not found: ${roomParam}`, roomError)
      return new Response(
        JSON.stringify({
          success: false,
          error: `Room ${roomParam} not found`,
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Step 2: Update room.is_clean = true
    const { error: updateError } = await supabase
      .from('rooms')
      .update({
        is_clean: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', room.id)

    if (updateError) {
      console.error(`Update failed for room ${room.id}:`, updateError)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to update room status',
          details: updateError.message,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`✅ Room ${room.room_number} marked as clean`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Room ${room.room_number} marked as clean`,
        roomId: room.id,
        roomNumber: room.room_number,
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[NFC TAP ERROR]', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
