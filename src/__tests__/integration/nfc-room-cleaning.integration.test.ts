/**
 * NFC Room Cleaning Integration Tests
 * Tests the complete flow: simulate tap → edge function → database update → real-time notification
 */

import { supabase } from '@/lib/supabase'
import { RoomCleaningService } from '@/services/RoomCleaningService'
import { simulateNFCTap } from '@/utils/nfcTest'

describe('NFC Room Cleaning Integration', () => {
  const testRoomId = 'test-room-001'
  const service = RoomCleaningService.getInstance()

  // Setup: Create or get a test room
  beforeAll(async () => {
    // In a real test, you'd create a test room
    // For now, we'll use an existing room from the database
  })

  describe('RoomCleaningService', () => {
    it('should mark room as clean', async () => {
      const result = await service.markRoomAsClean(testRoomId)
      expect(result.success).toBe(true)

      // Verify in database
      const status = await service.getRoomStatus(testRoomId)
      expect(status?.isClean).toBe(true)
    })

    it('should mark room as dirty', async () => {
      const result = await service.markRoomAsDirty(testRoomId)
      expect(result.success).toBe(true)

      // Verify in database
      const status = await service.getRoomStatus(testRoomId)
      expect(status?.isClean).toBe(false)
    })

    it('should get room status', async () => {
      await service.markRoomAsClean(testRoomId)
      const status = await service.getRoomStatus(testRoomId)

      expect(status).not.toBeNull()
      expect(status?.isClean).toBe(true)
      expect(status?.lastUpdated).toBeDefined()
    })

    it('should get all rooms status', async () => {
      const rooms = await service.getAllRoomsStatus()
      expect(Array.isArray(rooms)).toBe(true)
      expect(rooms.length).toBeGreaterThan(0)

      // Verify structure
      rooms.forEach((room) => {
        expect(room.id).toBeDefined()
        expect(room.number).toBeDefined()
        expect(typeof room.isClean).toBe('boolean')
      })
    })

    it('should update multiple rooms', async () => {
      const roomIds = [testRoomId]
      const result = await service.updateMultipleRooms(roomIds, true)
      expect(result.success).toBe(true)
    })

    it('should generate valid NFC URI', () => {
      const uri = service.generateNFCUri(testRoomId)
      expect(uri).toContain('/nfc-clean-room')
      expect(uri).toContain(`roomId=${testRoomId}`)
      expect(uri).toContain('hotelId=')
    })

    it('should subscribe to room status changes', (done) => {
      const subscription = service.subscribeToRoomStatus(testRoomId, (isClean) => {
        expect(typeof isClean).toBe('boolean')
        subscription.unsubscribe().then(() => done())
      })

      // Trigger an update to test subscription
      service.markRoomAsClean(testRoomId)
    })
  })

  describe('NFC Tap Simulation', () => {
    it('should simulate NFC tap successfully', async () => {
      const result = await simulateNFCTap({ roomId: testRoomId })

      expect(result.success).toBe(true)
      expect(result.message).toBeDefined()
      expect(result.timestamp).toBeInstanceOf(Date)
    })

    it('should handle invalid room ID', async () => {
      const result = await simulateNFCTap({ roomId: 'invalid-room-id' })

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should update database on successful tap', async () => {
      // Mark dirty first
      await service.markRoomAsDirty(testRoomId)

      // Simulate tap
      const tapResult = await simulateNFCTap({ roomId: testRoomId })
      expect(tapResult.success).toBe(true)

      // Verify database updated
      const status = await service.getRoomStatus(testRoomId)
      expect(status?.isClean).toBe(true)
    })
  })

  describe('Real-time Subscriptions', () => {
    it('should notify listeners when room status changes', (done) => {
      let updateCount = 0

      const subscription = service.subscribeToRoomStatus(testRoomId, (isClean) => {
        updateCount++

        if (updateCount === 1) {
          // First update from subscription
          expect(typeof isClean).toBe('boolean')

          // Cleanup and finish test
          setTimeout(() => {
            subscription.unsubscribe().then(() => done())
          }, 500)
        }
      })

      // Trigger an update
      service.markRoomAsClean(testRoomId)
    })
  })

  describe('Edge Cases', () => {
    it('should handle rapid consecutive taps', async () => {
      const promises = []

      // Simulate 5 rapid taps
      for (let i = 0; i < 5; i++) {
        promises.push(simulateNFCTap({ roomId: testRoomId }))
      }

      const results = await Promise.all(promises)

      // All should succeed
      results.forEach((result) => {
        expect(result.success).toBe(true)
      })
    })

    it('should handle multiple rooms simultaneously', async () => {
      const roomIds = ['test-room-001', 'test-room-002', 'test-room-003']

      const results = await Promise.all(
        roomIds.map((roomId) => simulateNFCTap({ roomId }))
      )

      // Check how many succeeded (some may fail if rooms don't exist)
      const successCount = results.filter((r) => r.success).length
      expect(successCount).toBeGreaterThan(0)
    })
  })

  // Cleanup
  afterAll(async () => {
    // Clean up test data if needed
  })
})
