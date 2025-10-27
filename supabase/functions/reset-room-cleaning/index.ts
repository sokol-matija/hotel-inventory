// Reset Room Cleaning Status - Manual Trigger Edge Function
// Calls the PostgreSQL function to reset room cleaning status for occupied rooms
// Requires authentication

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Use service role key for database operations
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

    console.log('[RESET ROOM CLEANING] Manual trigger initiated')

    // Call the PostgreSQL function with 'manual' trigger source
    const { data, error } = await supabase.rpc('reset_daily_room_cleaning', {
      trigger_source: 'manual',
    })

    if (error) {
      console.error('[RESET ROOM CLEANING] Error:', error)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to reset room cleaning status',
          details: error.message,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const result = Array.isArray(data) ? data[0] : data
    const roomsReset = result?.rooms_reset || 0
    const executionTime = result?.execution_time || new Date().toISOString()

    console.log(`✅ Room cleaning reset complete: ${roomsReset} rooms affected`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully reset ${roomsReset} room(s)`,
        roomsReset,
        executionTime,
        triggerSource: 'manual',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[RESET ROOM CLEANING ERROR]', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
