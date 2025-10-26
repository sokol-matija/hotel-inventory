// NFC Testing Utilities
// Simulate NFC tag taps for testing without physical NFC hardware

import { supabaseUrl } from '@/lib/supabase'

export interface NFCTestConfig {
  roomId: string
  hotelId?: string
}

export interface NFCTestResult {
  success: boolean
  message: string
  timestamp: Date
  roomNumber?: string
  error?: string
}

/**
 * Simulate an NFC tag tap by calling the edge function
 * This is what happens when you physically tap an NFC tag with your phone
 */
export async function simulateNFCTap(config: NFCTestConfig): Promise<NFCTestResult> {
  const { roomId, hotelId = 'gkbpthurkucotikjefra' } = config

  const endpoint = `${supabaseUrl}/functions/v1/nfc-clean-room`
  const url = `${endpoint}?roomId=${roomId}&hotelId=${hotelId}`

  console.log(`[NFC TEST] Simulating tap for room: ${roomId}`)
  console.log(`[NFC TEST] URL: ${url}`)

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    const result: NFCTestResult = {
      success: data.success,
      message: data.message || data.error,
      timestamp: new Date(data.timestamp),
      roomNumber: data.roomNumber,
      error: data.error,
    }

    console.log('[NFC TEST RESULT]', result)
    return result
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[NFC TEST ERROR]', errorMessage)

    return {
      success: false,
      message: `NFC tap failed: ${errorMessage}`,
      timestamp: new Date(),
      error: errorMessage,
    }
  }
}

/**
 * Generate the NFC URI that would be encoded on a physical tag
 * Example: https://api.example.com/functions/v1/nfc-clean-room?roomId=123&hotelId=xyz
 */
export function generateNFCUri(roomId: string, hotelId: string = 'gkbpthurkucotikjefra'): string {
  return `${supabaseUrl}/functions/v1/nfc-clean-room?roomId=${roomId}&hotelId=${hotelId}`
}

/**
 * Format the NFC URI for QR code generation
 * Can be printed or displayed in app
 */
export function getNFCQRCodeData(roomId: string, roomNumber: string): {
  uri: string
  label: string
} {
  return {
    uri: generateNFCUri(roomId),
    label: `Room ${roomNumber} - Tap to mark clean`,
  }
}

/**
 * Get test room IDs from your hotel
 * In a real scenario, these would come from your database
 */
export const TEST_ROOMS = [
  { id: 'room-101', number: '101' },
  { id: 'room-102', number: '102' },
  { id: 'room-103', number: '103' },
  { id: 'room-201', number: '201' },
  { id: 'room-202', number: '202' },
]

/**
 * Batch test multiple rooms
 * Useful for testing the NFC system with multiple rooms
 */
export async function batchTestNFCTaps(roomIds: string[]): Promise<NFCTestResult[]> {
  console.log(`[NFC BATCH TEST] Testing ${roomIds.length} rooms`)

  const results = await Promise.allSettled(
    roomIds.map((roomId) => simulateNFCTap({ roomId }))
  )

  return results
    .map((result) => {
      if (result.status === 'fulfilled') {
        return result.value
      }
      return {
        success: false,
        message: 'Batch test failed',
        timestamp: new Date(),
        error: result.reason?.message,
      }
    })
}
