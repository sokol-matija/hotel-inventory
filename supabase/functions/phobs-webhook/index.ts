// Phobs Channel Manager Webhook Handler - Edge Function
// Handles real-time notifications from Phobs API for OTA channel events
// Processes: reservation.created, reservation.modified, reservation.cancelled, availability.updated, rates.updated

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-phobs-signature, x-phobs-timestamp',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

// Phobs Webhook Event Types
type PhobsEventType = 
  | 'reservation.created'
  | 'reservation.modified'
  | 'reservation.cancelled'
  | 'availability.updated'
  | 'rates.updated'
  | 'channel.status_changed'
  | 'sync.completed'
  | 'sync.failed'

// OTA Channel Types
type OTAChannel = 
  | 'booking.com'
  | 'expedia'
  | 'airbnb'
  | 'agoda'
  | 'hotels.com'
  | 'hostelworld'
  | 'kayak'
  | 'trivago'
  | 'priceline'
  | 'camping.info'
  | 'pitchup.com'
  | 'eurocamp'
  | 'directBooking'

interface PhobsWebhookEvent {
  eventId: string
  eventType: PhobsEventType
  timestamp: string
  hotelId: string
  data: any
}

interface PhobsReservation {
  phobsReservationId: string
  phobsGuestId: string
  roomId: string
  checkIn: string
  checkOut: string
  numberOfGuests: number
  adults: number
  children: number
  guest: {
    firstName: string
    lastName: string
    email: string
    phone?: string
    country: string
    countryCode: string
    language: string
  }
  channel: OTAChannel
  bookingReference: string
  status: 'new' | 'confirmed' | 'modified' | 'cancelled' | 'checked_in' | 'checked_out' | 'no_show'
  totalAmount: number
  currency: 'EUR'
  commission: number
  netAmount: number
  roomRate: number
  taxes: number
  fees: number
  paymentMethod: string
  paymentStatus: 'pending' | 'confirmed' | 'paid' | 'cancelled'
  specialRequests: string
  guestNotes: string
  bookingDate: string
  lastModified: string
}

interface ConflictDetectionResult {
  hasConflicts: boolean
  conflicts: Array<{
    type: 'double_booking' | 'rate_mismatch' | 'availability_mismatch'
    severity: 'low' | 'medium' | 'high' | 'critical'
    message: string
    data: any
  }>
}

interface ProcessingResult {
  success: boolean
  message: string
  internalReservationId?: string
  conflicts?: ConflictDetectionResult
  error?: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get webhook secret for signature verification
    const webhookSecret = Deno.env.get('PHOBS_WEBHOOK_SECRET')
    if (!webhookSecret) {
      console.error('PHOBS_WEBHOOK_SECRET not configured')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse webhook payload
    const payload = await req.text()
    const phobsSignature = req.headers.get('x-phobs-signature')
    const phobsTimestamp = req.headers.get('x-phobs-timestamp')

    console.log('Received Phobs webhook:', {
      signature: phobsSignature ? 'present' : 'missing',
      timestamp: phobsTimestamp,
      payloadSize: payload.length
    })

    // Verify webhook signature
    if (!phobsSignature || !phobsTimestamp) {
      console.error('Missing required webhook headers')
      return new Response(
        JSON.stringify({ error: 'Missing webhook signature or timestamp' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Verify signature to ensure request is from Phobs
    const isValidSignature = await verifyWebhookSignature(
      payload,
      phobsSignature,
      phobsTimestamp,
      webhookSecret
    )

    if (!isValidSignature) {
      console.error('Invalid webhook signature')
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse event data
    let event: PhobsWebhookEvent
    try {
      event = JSON.parse(payload)
    } catch (parseError) {
      console.error('Failed to parse webhook payload:', parseError)
      return new Response(
        JSON.stringify({ error: 'Invalid JSON payload' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Processing Phobs event:', {
      eventId: event.eventId,
      eventType: event.eventType,
      hotelId: event.hotelId
    })

    // Log webhook event to database for monitoring
    await logWebhookEvent(supabase, event, req.headers)

    // Process event based on type
    let result: ProcessingResult

    switch (event.eventType) {
      case 'reservation.created':
        result = await handleReservationCreated(supabase, event.data.reservation)
        break
        
      case 'reservation.modified':
        result = await handleReservationModified(supabase, event.data.reservation)
        break
        
      case 'reservation.cancelled':
        result = await handleReservationCancelled(supabase, event.data.reservation)
        break
        
      case 'availability.updated':
        result = await handleAvailabilityUpdated(supabase, event.data)
        break
        
      case 'rates.updated':
        result = await handleRatesUpdated(supabase, event.data)
        break
        
      case 'channel.status_changed':
        result = await handleChannelStatusChanged(supabase, event.data)
        break
        
      case 'sync.completed':
      case 'sync.failed':
        result = await handleSyncEvent(supabase, event.data)
        break
        
      default:
        console.warn('Unknown event type:', event.eventType)
        result = {
          success: false,
          message: `Unknown event type: ${event.eventType}`
        }
    }

    // Update processing status in database
    await updateWebhookEventStatus(supabase, event.eventId, result)

    // Send notifications if needed
    if (result.success && event.eventType.startsWith('reservation.')) {
      await sendNotifications(supabase, event, result)
    }

    console.log('Webhook processing completed:', {
      eventId: event.eventId,
      success: result.success,
      message: result.message
    })

    return new Response(
      JSON.stringify({
        success: result.success,
        message: result.message,
        eventId: event.eventId,
        processedAt: new Date().toISOString()
      }),
      { 
        status: result.success ? 200 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Webhook processing error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

/**
 * Verify webhook signature using HMAC-SHA256
 */
async function verifyWebhookSignature(
  payload: string,
  signature: string,
  timestamp: string,
  secret: string
): Promise<boolean> {
  try {
    // Check timestamp to prevent replay attacks (allow 5 minutes tolerance)
    const eventTime = parseInt(timestamp) * 1000
    const currentTime = Date.now()
    const timeDiff = Math.abs(currentTime - eventTime)
    
    if (timeDiff > 5 * 60 * 1000) { // 5 minutes
      console.error('Webhook timestamp too old:', { eventTime, currentTime, timeDiff })
      return false
    }

    // Create signature string: timestamp.payload
    const signaturePayload = `${timestamp}.${payload}`
    
    // Create HMAC-SHA256 signature
    const encoder = new TextEncoder()
    const keyData = encoder.encode(secret)
    const payloadData = encoder.encode(signaturePayload)
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    
    const signatureBytes = await crypto.subtle.sign('HMAC', cryptoKey, payloadData)
    const computedSignature = Array.from(new Uint8Array(signatureBytes))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    
    // Compare signatures (expected format: sha256=<signature>)
    const expectedSignature = `sha256=${computedSignature}`
    
    return signature === expectedSignature
  } catch (error) {
    console.error('Signature verification error:', error)
    return false
  }
}

/**
 * Log webhook event to database for monitoring and debugging
 */
async function logWebhookEvent(
  supabase: any,
  event: PhobsWebhookEvent,
  headers: Headers
): Promise<void> {
  try {
    const { error } = await supabase
      .from('phobs_webhook_events')
      .insert({
        event_id: event.eventId,
        event_type: event.eventType,
        hotel_id: event.hotelId,
        timestamp: new Date(event.timestamp),
        data: event.data,
        headers: Object.fromEntries(headers.entries()),
        status: 'processing',
        created_at: new Date()
      })

    if (error) {
      console.error('Failed to log webhook event:', error)
    }
  } catch (error) {
    console.error('Error logging webhook event:', error)
  }
}

/**
 * Handle new reservation from OTA channel
 */
async function handleReservationCreated(
  supabase: any,
  reservation: PhobsReservation
): Promise<ProcessingResult> {
  try {
    console.log('Processing new reservation:', {
      phobsId: reservation.phobsReservationId,
      guest: `${reservation.guest.firstName} ${reservation.guest.lastName}`,
      channel: reservation.channel,
      checkIn: reservation.checkIn,
      checkOut: reservation.checkOut
    })

    // Check for conflicts (double bookings, rate mismatches)
    const conflicts = await detectConflicts(supabase, reservation)
    
    if (conflicts.hasConflicts) {
      console.warn('Conflicts detected for new reservation:', conflicts)
      // For now, we'll still process but flag the conflicts
    }

    // Create guest record if not exists
    const guestId = await createOrUpdateGuest(supabase, reservation.guest, reservation.phobsGuestId)
    
    // Create internal reservation record
    const { data: newReservation, error: reservationError } = await supabase
      .from('hotel_reservations')
      .insert({
        phobs_reservation_id: reservation.phobsReservationId,
        room_id: reservation.roomId,
        guest_id: guestId,
        check_in: new Date(reservation.checkIn),
        check_out: new Date(reservation.checkOut),
        adults: reservation.adults,
        children: reservation.children,
        status: 'confirmed',
        booking_source: reservation.channel,
        booking_reference: reservation.bookingReference,
        special_requests: reservation.specialRequests,
        total_amount: reservation.totalAmount,
        room_rate: reservation.roomRate,
        taxes: reservation.taxes,
        fees: reservation.fees,
        commission: reservation.commission,
        net_amount: reservation.netAmount,
        payment_method: reservation.paymentMethod,
        payment_status: reservation.paymentStatus,
        booking_date: new Date(reservation.bookingDate),
        last_modified: new Date(reservation.lastModified),
        sync_status: 'completed',
        sync_errors: conflicts.hasConflicts ? conflicts.conflicts.map(c => c.message) : [],
        created_at: new Date()
      })
      .select()
      .single()

    if (reservationError) {
      throw new Error(`Failed to create reservation: ${reservationError.message}`)
    }

    return {
      success: true,
      message: `Reservation created successfully for ${reservation.guest.firstName} ${reservation.guest.lastName}`,
      internalReservationId: newReservation.id,
      conflicts: conflicts.hasConflicts ? conflicts : undefined
    }

  } catch (error) {
    console.error('Error creating reservation:', error)
    return {
      success: false,
      message: 'Failed to create reservation',
      error: error.message
    }
  }
}

/**
 * Handle reservation modification from OTA channel
 */
async function handleReservationModified(
  supabase: any,
  reservation: PhobsReservation
): Promise<ProcessingResult> {
  try {
    console.log('Processing reservation modification:', {
      phobsId: reservation.phobsReservationId,
      guest: `${reservation.guest.firstName} ${reservation.guest.lastName}`,
      channel: reservation.channel
    })

    // Find existing reservation
    const { data: existingReservation, error: findError } = await supabase
      .from('hotel_reservations')
      .select('*')
      .eq('phobs_reservation_id', reservation.phobsReservationId)
      .single()

    if (findError || !existingReservation) {
      throw new Error(`Reservation not found: ${reservation.phobsReservationId}`)
    }

    // Update reservation
    const { error: updateError } = await supabase
      .from('hotel_reservations')
      .update({
        check_in: new Date(reservation.checkIn),
        check_out: new Date(reservation.checkOut),
        adults: reservation.adults,
        children: reservation.children,
        special_requests: reservation.specialRequests,
        total_amount: reservation.totalAmount,
        room_rate: reservation.roomRate,
        taxes: reservation.taxes,
        fees: reservation.fees,
        payment_status: reservation.paymentStatus,
        last_modified: new Date(reservation.lastModified),
        sync_status: 'completed',
        updated_at: new Date()
      })
      .eq('phobs_reservation_id', reservation.phobsReservationId)

    if (updateError) {
      throw new Error(`Failed to update reservation: ${updateError.message}`)
    }

    return {
      success: true,
      message: `Reservation modified successfully for ${reservation.guest.firstName} ${reservation.guest.lastName}`,
      internalReservationId: existingReservation.id
    }

  } catch (error) {
    console.error('Error modifying reservation:', error)
    return {
      success: false,
      message: 'Failed to modify reservation',
      error: error.message
    }
  }
}

/**
 * Handle reservation cancellation from OTA channel
 */
async function handleReservationCancelled(
  supabase: any,
  reservation: PhobsReservation
): Promise<ProcessingResult> {
  try {
    console.log('Processing reservation cancellation:', {
      phobsId: reservation.phobsReservationId,
      guest: `${reservation.guest.firstName} ${reservation.guest.lastName}`,
      channel: reservation.channel
    })

    // Update reservation status to cancelled
    const { error: updateError } = await supabase
      .from('hotel_reservations')
      .update({
        status: 'cancelled',
        last_modified: new Date(reservation.lastModified),
        sync_status: 'completed',
        updated_at: new Date()
      })
      .eq('phobs_reservation_id', reservation.phobsReservationId)

    if (updateError) {
      throw new Error(`Failed to cancel reservation: ${updateError.message}`)
    }

    return {
      success: true,
      message: `Reservation cancelled for ${reservation.guest.firstName} ${reservation.guest.lastName}`
    }

  } catch (error) {
    console.error('Error cancelling reservation:', error)
    return {
      success: false,
      message: 'Failed to cancel reservation',
      error: error.message
    }
  }
}

/**
 * Handle other event types (availability, rates, etc.)
 */
async function handleAvailabilityUpdated(supabase: any, data: any): Promise<ProcessingResult> {
  // TODO: Implement availability update handling
  console.log('Availability updated:', data)
  return { success: true, message: 'Availability update processed' }
}

async function handleRatesUpdated(supabase: any, data: any): Promise<ProcessingResult> {
  // TODO: Implement rates update handling
  console.log('Rates updated:', data)
  return { success: true, message: 'Rates update processed' }
}

async function handleChannelStatusChanged(supabase: any, data: any): Promise<ProcessingResult> {
  // TODO: Implement channel status change handling
  console.log('Channel status changed:', data)
  return { success: true, message: 'Channel status change processed' }
}

async function handleSyncEvent(supabase: any, data: any): Promise<ProcessingResult> {
  // TODO: Implement sync event handling
  console.log('Sync event:', data)
  return { success: true, message: 'Sync event processed' }
}

/**
 * Helper Functions
 */

async function detectConflicts(
  supabase: any,
  reservation: PhobsReservation
): Promise<ConflictDetectionResult> {
  const conflicts = []

  try {
    // Check for double bookings (room already occupied for the same dates)
    const { data: existingReservations, error } = await supabase
      .from('hotel_reservations')
      .select('*')
      .eq('room_id', reservation.roomId)
      .neq('status', 'cancelled')
      .or(`and(check_in.lte.${reservation.checkIn},check_out.gt.${reservation.checkIn}),and(check_in.lt.${reservation.checkOut},check_out.gte.${reservation.checkOut})`)

    if (error) {
      console.error('Error checking for conflicts:', error)
    } else if (existingReservations && existingReservations.length > 0) {
      conflicts.push({
        type: 'double_booking' as const,
        severity: 'critical' as const,
        message: `Room ${reservation.roomId} already has reservations for overlapping dates`,
        data: existingReservations
      })
    }

  } catch (error) {
    console.error('Conflict detection error:', error)
  }

  return {
    hasConflicts: conflicts.length > 0,
    conflicts
  }
}

async function createOrUpdateGuest(
  supabase: any,
  guestData: PhobsReservation['guest'],
  phobsGuestId: string
): Promise<string> {
  // Check if guest already exists
  const { data: existingGuest } = await supabase
    .from('hotel_guests')
    .select('id')
    .eq('phobs_guest_id', phobsGuestId)
    .single()

  if (existingGuest) {
    // Update existing guest
    await supabase
      .from('hotel_guests')
      .update({
        first_name: guestData.firstName,
        last_name: guestData.lastName,
        email: guestData.email,
        phone: guestData.phone,
        country: guestData.country,
        preferred_language: guestData.language,
        updated_at: new Date()
      })
      .eq('id', existingGuest.id)

    return existingGuest.id
  } else {
    // Create new guest
    const { data: newGuest, error } = await supabase
      .from('hotel_guests')
      .insert({
        phobs_guest_id: phobsGuestId,
        first_name: guestData.firstName,
        last_name: guestData.lastName,
        full_name: `${guestData.firstName} ${guestData.lastName}`,
        email: guestData.email,
        phone: guestData.phone,
        nationality: guestData.country,
        preferred_language: guestData.language,
        is_vip: false,
        total_stays: 1,
        created_at: new Date()
      })
      .select('id')
      .single()

    if (error) {
      throw new Error(`Failed to create guest: ${error.message}`)
    }

    return newGuest.id
  }
}

async function updateWebhookEventStatus(
  supabase: any,
  eventId: string,
  result: ProcessingResult
): Promise<void> {
  try {
    await supabase
      .from('phobs_webhook_events')
      .update({
        status: result.success ? 'completed' : 'failed',
        result: result,
        processed_at: new Date()
      })
      .eq('event_id', eventId)
  } catch (error) {
    console.error('Failed to update webhook event status:', error)
  }
}

async function sendNotifications(
  supabase: any,
  event: PhobsWebhookEvent,
  result: ProcessingResult
): Promise<void> {
  try {
    // Send NTFY notification for new reservations
    if (event.eventType === 'reservation.created' && result.success) {
      const reservation = event.data.reservation as PhobsReservation
      
      // TODO: Integrate with existing ntfyService
      // This would send a notification to Room 401 or general hotel staff
      console.log('Sending notification for new OTA reservation:', {
        guest: `${reservation.guest.firstName} ${reservation.guest.lastName}`,
        channel: reservation.channel,
        room: reservation.roomId
      })
    }
  } catch (error) {
    console.error('Failed to send notifications:', error)
  }
}

/* To deploy this function:
1. Install Supabase CLI: npm install -g supabase
2. Login: supabase login
3. Link to your project: supabase link --project-ref YOUR_PROJECT_REF
4. Deploy: supabase functions deploy phobs-webhook

Required environment variables in Supabase:
- PHOBS_WEBHOOK_SECRET: Secret key for verifying webhook signatures
- SUPABASE_URL: Your Supabase project URL
- SUPABASE_SERVICE_ROLE_KEY: Service role key for database operations

Required database tables:
- phobs_webhook_events: Log all webhook events for monitoring
- hotel_reservations: Store reservation data
- hotel_guests: Store guest data

Set webhook URL in Phobs dashboard:
https://YOUR_PROJECT_REF.supabase.co/functions/v1/phobs-webhook
*/