import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { simulateNFCTap, generateNFCUri, batchTestNFCTaps } from '@/utils/nfcTest'
import { supabase } from '@/lib/supabase'
import { AlertCircle, CheckCircle2, Loader2, Copy, Smartphone } from 'lucide-react'

interface RoomStatus {
  id: string
  number: string
  is_cleaned: boolean
  last_updated: Date | null
}

export const NFCTestPage = () => {
  const [rooms, setRooms] = useState<RoomStatus[]>([])
  const [testRoomId, setTestRoomId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [testResults, setTestResults] = useState<{ [key: string]: any }>({})
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null)
  const [copiedUri, setCopiedUri] = useState<string | null>(null)

  // Fetch rooms on mount
  useEffect(() => {
    loadRooms()
  }, [])

  // Subscribe to room changes
  useEffect(() => {
    const subscription = supabase
      .channel('rooms-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms',
        },
        (payload) => {
          setRooms((prev) =>
            prev.map((room) =>
              room.id === payload.new.id
                ? { ...room, is_cleaned: payload.new.is_cleaned, last_updated: new Date() }
                : room
            )
          )
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function loadRooms() {
    try {
      const { data, error } = await supabase.from('rooms').select('id, number, is_cleaned').limit(10)

      if (error) throw error

      setRooms(
        (data || []).map((room) => ({
          id: room.id,
          number: room.number,
          is_cleaned: room.is_cleaned || false,
          last_updated: null,
        }))
      )
    } catch (error) {
      console.error('Failed to load rooms:', error)
    }
  }

  async function handleSimulateNFCTap(roomId: string) {
    setIsLoading(true)
    setSelectedRoom(roomId)

    try {
      const result = await simulateNFCTap({ roomId })
      setTestResults((prev) => ({
        ...prev,
        [roomId]: result,
      }))
    } catch (error) {
      setTestResults((prev) => ({
        ...prev,
        [roomId]: { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      }))
    } finally {
      setIsLoading(false)
    }
  }

  async function handleBatchTest() {
    setIsLoading(true)

    try {
      const roomIds = rooms.map((r) => r.id)
      await batchTestNFCTaps(roomIds)
      await loadRooms()
    } catch (error) {
      console.error('Batch test failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    setCopiedUri(text)
    setTimeout(() => setCopiedUri(null), 2000)
  }

  function toggleRoomCleanStatus(roomId: string) {
    const room = rooms.find((r) => r.id === roomId)
    if (!room) return

    // Mark as dirty for testing
    supabase
      .from('rooms')
      .update({ is_cleaned: false })
      .eq('id', roomId)
      .then(() => console.log(`Room ${roomId} marked as dirty for next test`))
  }

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">🏷️ NFC Room Cleaning Test</h1>
        <p className="text-gray-600">
          Simulate NFC tag taps and test the room cleaning indicator system
        </p>
      </div>

      {/* Instructions */}
      <div className="border border-blue-200 bg-blue-50 rounded p-4">
        <div className="flex items-start gap-2">
          <Smartphone className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <strong className="text-blue-900">How it works:</strong>
            <ol className="mt-2 space-y-1 ml-4 list-decimal text-sm text-blue-800">
              <li>Click "Simulate NFC Tap" below to simulate an NFC tag being scanned</li>
              <li>Watch the room status update in real-time</li>
              <li>Copy the NFC URI to test with real NFC tags (see below)</li>
              <li>When ready, encode URI on physical NFC tag using NFC Tools app</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Test Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Test Controls</CardTitle>
          <CardDescription>Run tests on your rooms</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleBatchTest} disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              'Run Batch Test (All Rooms)'
            )}
          </Button>

          <div className="space-y-2">
            <label className="block text-sm font-medium">Test Single Room by ID</label>
            <div className="flex gap-2">
              <Input
                placeholder="Enter room ID (e.g., room-101)"
                value={testRoomId}
                onChange={(e) => setTestRoomId(e.target.value)}
              />
              <Button
                onClick={() => handleSimulateNFCTap(testRoomId)}
                disabled={!testRoomId || isLoading}
              >
                {isLoading && selectedRoom === testRoomId ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Tap'
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Room List */}
      <Card>
        <CardHeader>
          <CardTitle>Rooms</CardTitle>
          <CardDescription>{rooms.length} rooms loaded</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {rooms.length === 0 ? (
              <p className="text-gray-500">No rooms found</p>
            ) : (
              rooms.map((room) => {
                const result = testResults[room.id]

                return (
                  <div
                    key={room.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">Room {room.number}</span>
                        <Badge variant={room.is_cleaned ? 'default' : 'destructive'}>
                          {room.is_cleaned ? '✅ Clean' : '❌ Dirty'}
                        </Badge>
                        {result && (
                          <Badge variant={result.success ? 'default' : 'destructive'}>
                            {result.success ? '✓ Success' : '✗ Failed'}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">ID: {room.id}</p>

                      {/* Show test result */}
                      {result && (
                        <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                          <p>{result.message}</p>
                          {result.timestamp && (
                            <p className="text-gray-600">
                              {new Date(result.timestamp).toLocaleTimeString()}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSimulateNFCTap(room.id)}
                        disabled={isLoading}
                      >
                        {isLoading && selectedRoom === room.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Tap'
                        )}
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleRoomCleanStatus(room.id)}
                        title="Mark as dirty for next test"
                      >
                        Reset
                      </Button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* NFC URI Copy */}
      <Card>
        <CardHeader>
          <CardTitle>NFC Tag URIs</CardTitle>
          <CardDescription>Copy these URIs to encode on physical NFC tags</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {rooms.map((room) => {
              const uri = generateNFCUri(room.id)

              return (
                <div key={room.id} className="flex items-center justify-between p-2 border rounded bg-gray-50">
                  <div>
                    <p className="text-sm font-medium">Room {room.number}</p>
                    <p className="text-xs text-gray-500 break-all">{uri}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(uri)}
                    className="ml-2"
                  >
                    {copiedUri === uri ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Physical NFC Tag Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>📱 How to Setup Physical NFC Tags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 text-sm">
            <div>
              <h4 className="font-semibold mb-1">Step 1: Get NFC Tags</h4>
              <p className="text-gray-600">
                Buy blank NFC tags online (NTAG213 or NTAG215, ~$0.50 each). You need one per room.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-1">Step 2: Download NFC Tools App</h4>
              <p className="text-gray-600">
                Install "NFC Tools" app (free):
              </p>
              <ul className="ml-4 mt-1 space-y-1">
                <li>
                  📱 iOS: <code className="bg-gray-100 px-2 py-1 rounded">Apple App Store</code>
                </li>
                <li>
                  🤖 Android: <code className="bg-gray-100 px-2 py-1 rounded">Google Play Store</code>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-1">Step 3: Write URI to Tag</h4>
              <ol className="ml-4 space-y-1 list-decimal">
                <li>Open NFC Tools app</li>
                <li>Click "Write"</li>
                <li>Click "Add a record" → "URI"</li>
                <li>Paste the URI from above</li>
                <li>Tap NFC tag with your phone to write</li>
              </ol>
            </div>

            <div>
              <h4 className="font-semibold mb-1">Step 4: Attach & Test</h4>
              <ol className="ml-4 space-y-1 list-decimal">
                <li>Stick NFC tag on room door</li>
                <li>Tap tag with any smartphone to test</li>
                <li>Phone should open the browser with the cleaning endpoint</li>
                <li>Watch the room status update in real-time!</li>
              </ol>
            </div>

            <div className="border border-green-200 bg-green-50 rounded p-3 flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-green-800">
                <strong>No authentication needed!</strong> The NFC tag contains a direct link to the Edge
                Function. Any staff member can tap it with any phone to mark the room clean.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
