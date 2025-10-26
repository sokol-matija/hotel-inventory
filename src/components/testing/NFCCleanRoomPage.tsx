/**
 * NFC Room Cleaning Landing Page
 * This is what opens when someone scans an NFC tag
 * Can be triggered via curl or physical NFC tap
 */

import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

interface CleaningResult {
  success: boolean
  message: string
  roomNumber?: string
  timestamp?: string
  error?: string
}

export const NFCCleanRoomPage = () => {
  const [searchParams] = useSearchParams()
  const [result, setResult] = useState<CleaningResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    // Get room ID from URL parameter
    const roomId = searchParams.get('roomId')

    if (!roomId) {
      setResult({
        success: false,
        message: 'No room ID provided',
        error: 'roomId parameter is missing',
      })
      setIsLoading(false)
      return
    }

    // Call the edge function
    callCleanRoomFunction(roomId)
  }, [searchParams])

  async function callCleanRoomFunction(roomId: string) {
    try {
      // Import supabase from the lib
      const { supabase } = await import('@/lib/supabase')

      // Get the anon key from environment
      const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrYnB0aHVya3Vjb3Rpa2plZnJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3MzMxNTksImV4cCI6MjA2ODMwOTE1OX0.pXbrXBCeJHgXzHGTB4WatYfWsaFFkrlr8ChUkVIV6SY'

      const endpoint = `https://gkbpthurkucotikjefra.supabase.co/functions/v1/nfc-clean-room?roomId=${roomId}`

      console.log(`[NFC CLEAN] Calling: ${endpoint}`)

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
        },
      })

      const data = await response.json()

      console.log('[NFC CLEAN] Response:', data)

      setResult({
        success: data.success,
        message: data.message || data.error,
        roomNumber: data.roomNumber,
        timestamp: data.timestamp,
        error: data.error,
      })

      // Show toast notification on the NFC page
      if (data.success) {
        toast({
          title: '✅ Success',
          description: `Room ${data.roomNumber} has been marked as clean!`,
          variant: 'default',
        })
      } else {
        toast({
          title: '❌ Error',
          description: data.error || 'Could not mark room as clean',
          variant: 'destructive',
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('[NFC CLEAN ERROR]', errorMessage)

      setResult({
        success: false,
        message: `Error: ${errorMessage}`,
        error: errorMessage,
      })

      // Show error toast notification
      toast({
        title: '❌ Error',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        {/* Loading State */}
        {isLoading && (
          <Card className="shadow-xl">
            <CardContent className="pt-6 text-center space-y-3">
              <Loader2 className="h-16 w-16 animate-spin text-blue-600 mx-auto" />
              <p className="text-lg font-semibold text-gray-700">Processing...</p>
              <p className="text-sm text-gray-500">Marking room as clean...</p>
            </CardContent>
          </Card>
        )}

        {/* Success State */}
        {!isLoading && result?.success && (
          <Card className="shadow-xl border-green-200 bg-green-50">
            <CardHeader className="text-center pb-3">
              <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-3" />
              <CardTitle className="text-2xl text-green-700">Success! ✅</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border border-green-200 bg-white rounded p-3 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                <strong className="text-lg text-green-800">Room {result.roomNumber} marked as clean</strong>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="font-semibold text-green-600">✅ Clean</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Time:</span>
                  <span className="text-gray-700">
                    {result.timestamp ? new Date(result.timestamp).toLocaleTimeString() : 'N/A'}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-green-100 rounded text-sm text-green-800 border border-green-200">
                🏨 The front desk has been notified! Room is now ready for the next guest.
              </div>

              <button
                onClick={() => window.location.href = '/'}
                className="w-full mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Back to Dashboard
              </button>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {!isLoading && !result?.success && (
          <Card className="shadow-xl border-red-200 bg-red-50">
            <CardHeader className="text-center pb-3">
              <AlertCircle className="h-16 w-16 text-red-600 mx-auto mb-3" />
              <CardTitle className="text-2xl text-red-700">Error ❌</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border border-red-200 bg-white rounded p-3 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                <strong className="text-red-800">{result?.message || 'Unknown error occurred'}</strong>
              </div>

              <div className="p-3 bg-red-100 rounded text-sm text-red-800 border border-red-200">
                <p>❌ Could not mark room as clean</p>
                {result?.error && <p className="mt-1 text-xs">{result.error}</p>}
              </div>

              <div className="space-y-2 text-xs text-gray-600">
                <p>📍 Please try again or contact management</p>
                <p>🔗 Room ID: {searchParams.get('roomId') || 'Not provided'}</p>
              </div>

              <button
                onClick={() => window.location.href = '/'}
                className="w-full mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Back to Dashboard
              </button>
            </CardContent>
          </Card>
        )}

        {/* Info Footer */}
        <div className="mt-6 text-center text-xs text-gray-500">
          <p>🏷️ NFC Room Cleaning System</p>
          <p>Tap sticker to mark room as clean</p>
        </div>
      </div>
    </div>
  )
}
