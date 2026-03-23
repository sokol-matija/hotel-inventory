import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { simulateNFCTap, generateNFCUri, batchTestNFCTaps, NFCTestResult } from '@/utils/nfcTest';
import { supabase } from '@/lib/supabase';
import { CheckCircle2, Loader2, Copy, Smartphone } from 'lucide-react';

interface RoomStatus {
  id: string;
  number: string;
  is_cleaned: boolean;
  last_updated: Date | null;
}

export const NFCTestPage = () => {
  const [rooms, setRooms] = useState<RoomStatus[]>([]);
  const [testRoomId, setTestRoomId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<{ [key: string]: NFCTestResult }>({});
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [copiedUri, setCopiedUri] = useState<string | null>(null);

  // Fetch rooms on mount
  useEffect(() => {
    loadRooms();
  }, []);

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
          );
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function loadRooms() {
    try {
      const { data, error } = await supabase
        .from('rooms')
        .select('id, number, is_cleaned')
        .limit(10);

      if (error) throw error;

      setRooms(
        (data || []).map((room) => ({
          id: room.id,
          number: room.number,
          is_cleaned: room.is_cleaned || false,
          last_updated: null,
        }))
      );
    } catch (error) {
      console.error('Failed to load rooms:', error);
    }
  }

  async function handleSimulateNFCTap(roomId: string) {
    setIsLoading(true);
    setSelectedRoom(roomId);

    try {
      const result = await simulateNFCTap({ roomId });
      setTestResults((prev) => ({
        ...prev,
        [roomId]: result,
      }));
    } catch (error) {
      setTestResults((prev) => ({
        ...prev,
        [roomId]: {
          success: false,
          message: 'Error occurred',
          timestamp: new Date(),
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      }));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleBatchTest() {
    setIsLoading(true);

    try {
      const roomIds = rooms.map((r) => r.id);
      await batchTestNFCTaps(roomIds);
      await loadRooms();
    } catch (error) {
      console.error('Batch test failed:', error);
    } finally {
      setIsLoading(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopiedUri(text);
    setTimeout(() => setCopiedUri(null), 2000);
  }

  function toggleRoomCleanStatus(roomId: string) {
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;

    // Mark as dirty for testing
    supabase
      .from('rooms')
      .update({ is_cleaned: false })
      .eq('id', roomId)
      .then(() => {});
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">🏷️ NFC Room Cleaning Test</h1>
        <p className="text-gray-600">
          Simulate NFC tag taps and test the room cleaning indicator system
        </p>
      </div>

      {/* Instructions */}
      <div className="rounded border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-2">
          <Smartphone className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
          <div>
            <strong className="text-blue-900">How it works:</strong>
            <ol className="mt-2 ml-4 list-decimal space-y-1 text-sm text-blue-800">
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
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              'Run Batch Test (All Rooms)'
            )}
          </Button>

          <div className="space-y-2">
            <label htmlFor="nfc-room-id" className="block text-sm font-medium">
              Test Single Room by ID
            </label>
            <div className="flex gap-2">
              <Input
                id="nfc-room-id"
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
                const result = testResults[room.id];

                return (
                  <div
                    key={room.id}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-gray-50"
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
                        <div className="mt-2 rounded bg-blue-50 p-2 text-sm">
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
                );
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
              const uri = generateNFCUri(room.id);

              return (
                <div
                  key={room.id}
                  className="flex items-center justify-between rounded border bg-gray-50 p-2"
                >
                  <div>
                    <p className="text-sm font-medium">Room {room.number}</p>
                    <p className="text-xs break-all text-gray-500">{uri}</p>
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
              );
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
              <h4 className="mb-1 font-semibold">Step 1: Get NFC Tags</h4>
              <p className="text-gray-600">
                Buy blank NFC tags online (NTAG213 or NTAG215, ~$0.50 each). You need one per room.
              </p>
            </div>

            <div>
              <h4 className="mb-1 font-semibold">Step 2: Download NFC Tools App</h4>
              <p className="text-gray-600">Install "NFC Tools" app (free):</p>
              <ul className="mt-1 ml-4 space-y-1">
                <li>
                  📱 iOS: <code className="rounded bg-gray-100 px-2 py-1">Apple App Store</code>
                </li>
                <li>
                  🤖 Android:{' '}
                  <code className="rounded bg-gray-100 px-2 py-1">Google Play Store</code>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-1 font-semibold">Step 3: Write URI to Tag</h4>
              <ol className="ml-4 list-decimal space-y-1">
                <li>Open NFC Tools app</li>
                <li>Click "Write"</li>
                <li>Click "Add a record" → "URI"</li>
                <li>Paste the URI from above</li>
                <li>Tap NFC tag with your phone to write</li>
              </ol>
            </div>

            <div>
              <h4 className="mb-1 font-semibold">Step 4: Attach & Test</h4>
              <ol className="ml-4 list-decimal space-y-1">
                <li>Stick NFC tag on room door</li>
                <li>Tap tag with any smartphone to test</li>
                <li>Phone should open the browser with the cleaning endpoint</li>
                <li>Watch the room status update in real-time!</li>
              </ol>
            </div>

            <div className="flex items-start gap-2 rounded border border-green-200 bg-green-50 p-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
              <div className="text-sm text-green-800">
                <strong>No authentication needed!</strong> The NFC tag contains a direct link to the
                Edge Function. Any staff member can tap it with any phone to mark the room clean.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
