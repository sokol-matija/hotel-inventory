/**
 * NFC Room Cleaning Landing Page
 * This is what opens when someone scans an NFC tag
 * Can be triggered via curl or physical NFC tap
 */

import { useEffect, useState } from 'react';
import { useSearch } from '@tanstack/react-router';
import { CheckCircle2, AlertCircle, Loader2, Hotel, MapPin, Link, Tag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface CleaningResult {
  success: boolean;
  message: string;
  roomNumber?: string;
  timestamp?: string;
  error?: string;
}

export const NFCCleanRoomPage = () => {
  const searchParams = useSearch({ strict: false });
  const [result, setResult] = useState<CleaningResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    // Get room ID from URL parameter
    const roomId = (searchParams as { roomId?: string }).roomId;

    if (!roomId) {
      setResult({
        success: false,
        message: 'No room ID provided',
        error: 'roomId parameter is missing',
      });
      setIsLoading(false);
      return;
    }

    // Call the edge function
    callCleanRoomFunction(roomId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally runs once on mount — NFC tap triggers a single action

  async function callCleanRoomFunction(roomId: string) {
    try {
      // Get the anon key from environment
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const endpoint = `https://gkbpthurkucotikjefra.supabase.co/functions/v1/nfc-clean-room?roomId=${roomId}`;

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${anonKey}`,
        },
      });

      const data = await response.json();

      setResult({
        success: data.success,
        message: data.message || data.error,
        roomNumber: data.roomNumber,
        timestamp: data.timestamp,
        error: data.error,
      });

      // Show toast notification on the NFC page
      if (data.success) {
        toast.success('Success', {
          description: `Room ${data.roomNumber} has been marked as clean!`,
        });
      } else {
        toast.error('Error', {
          description: data.error || 'Could not mark room as clean',
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[NFC CLEAN ERROR]', errorMessage);

      setResult({
        success: false,
        message: `Error: ${errorMessage}`,
        error: errorMessage,
      });

      // Show error toast notification
      toast.error('Error', { description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        {/* Loading State */}
        {isLoading && (
          <Card className="shadow-xl">
            <CardContent className="space-y-3 pt-6 text-center">
              <Loader2 className="mx-auto h-16 w-16 animate-spin text-blue-600" />
              <p className="text-lg font-semibold text-gray-700">Processing...</p>
              <p className="text-sm text-gray-500">Marking room as clean...</p>
            </CardContent>
          </Card>
        )}

        {/* Success State */}
        {!isLoading && result?.success && (
          <Card className="border-green-200 bg-green-50 shadow-xl">
            <CardHeader className="pb-3 text-center">
              <CheckCircle2 className="mx-auto mb-3 h-16 w-16 text-green-600" />
              <CardTitle className="text-2xl text-green-700">Success!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 rounded border border-green-200 bg-white p-3">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-600" />
                <strong className="text-lg text-green-800">
                  Room {result.roomNumber} marked as clean
                </strong>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="font-semibold text-green-600">Clean</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Time:</span>
                  <span className="text-gray-700">
                    {result.timestamp ? new Date(result.timestamp).toLocaleTimeString() : 'N/A'}
                  </span>
                </div>
              </div>

              <div className="rounded border border-green-200 bg-green-100 p-3 text-sm text-green-800">
                <Hotel className="mr-1 inline h-4 w-4" /> The front desk has been notified! Room is
                now ready for the next guest.
              </div>

              <button
                onClick={() => (window.location.href = '/')}
                className="mt-4 w-full rounded-lg bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700"
              >
                Back to Dashboard
              </button>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {!isLoading && !result?.success && (
          <Card className="border-red-200 bg-red-50 shadow-xl">
            <CardHeader className="pb-3 text-center">
              <AlertCircle className="mx-auto mb-3 h-16 w-16 text-red-600" />
              <CardTitle className="text-2xl text-red-700">Error</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 rounded border border-red-200 bg-white p-3">
                <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" />
                <strong className="text-red-800">
                  {result?.message || 'Unknown error occurred'}
                </strong>
              </div>

              <div className="rounded border border-red-200 bg-red-100 p-3 text-sm text-red-800">
                <p>Could not mark room as clean</p>
                {result?.error && <p className="mt-1 text-xs">{result.error}</p>}
              </div>

              <div className="space-y-2 text-xs text-gray-600">
                <p>
                  <MapPin className="mr-1 inline h-3.5 w-3.5" /> Please try again or contact
                  management
                </p>
                <p>
                  <Link className="mr-1 inline h-3.5 w-3.5" /> Room ID:{' '}
                  {(searchParams as { roomId?: string }).roomId || 'Not provided'}
                </p>
              </div>

              <button
                onClick={() => (window.location.href = '/')}
                className="mt-4 w-full rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
              >
                Back to Dashboard
              </button>
            </CardContent>
          </Card>
        )}

        {/* Info Footer */}
        <div className="mt-6 text-center text-xs text-gray-500">
          <p className="flex items-center justify-center gap-1">
            <Tag className="h-3.5 w-3.5" /> NFC Room Cleaning System
          </p>
          <p>Tap sticker to mark room as clean</p>
        </div>
      </div>
    </div>
  );
};
