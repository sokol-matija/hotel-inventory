// Admin Testing Page
// Manual triggers for automated system functions

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { supabase } from '@/lib/supabase'
import { RefreshCw, CheckCircle2, XCircle, Clock, Info, Loader2 } from 'lucide-react'

interface ResetResult {
  success: boolean
  message?: string
  roomsReset?: number
  executionTime?: string
  triggerSource?: string
  error?: string
}

interface RoomCleaningLog {
  id: number
  rooms_reset: number
  executed_at: string
  triggered_by: string
}

export const AdminTestingPage = () => {
  const [isResetting, setIsResetting] = useState(false)
  const [lastResult, setLastResult] = useState<ResetResult | null>(null)
  const [recentLogs, setRecentLogs] = useState<RoomCleaningLog[]>([])
  const [isLoadingLogs, setIsLoadingLogs] = useState(true)

  // Load recent reset logs on mount
  useEffect(() => {
    loadRecentLogs()
  }, [])

  const loadRecentLogs = async () => {
    setIsLoadingLogs(true)
    try {
      const { data, error } = await supabase
        .from('room_cleaning_reset_log')
        .select('*')
        .order('executed_at', { ascending: false })
        .limit(10)

      if (error) throw error
      setRecentLogs(data || [])
    } catch (error) {
      console.error('Failed to load logs:', error)
    } finally {
      setIsLoadingLogs(false)
    }
  }

  const handleResetRoomCleaning = async () => {
    setIsResetting(true)
    setLastResult(null)

    try {
      const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
      const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Missing Supabase configuration')
      }

      // Get the current user's session for authentication
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session) {
        throw new Error('Not authenticated')
      }

      // Call the Edge Function
      const response = await fetch(`${supabaseUrl}/functions/v1/reset-room-cleaning`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: supabaseAnonKey,
        },
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reset room cleaning')
      }

      setLastResult({
        success: true,
        message: result.message,
        roomsReset: result.roomsReset,
        executionTime: result.executionTime,
        triggerSource: result.triggerSource,
      })

      // Reload logs to show the new entry
      setTimeout(() => loadRecentLogs(), 500)
    } catch (error) {
      console.error('Reset failed:', error)
      setLastResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    } finally {
      setIsResetting(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Admin Testing</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manual triggers for automated system functions
        </p>
      </div>

      {/* Room Cleaning Reset Section */}
      <Card className="border-blue-200 dark:border-blue-900">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Daily Room Cleaning Reset
              </CardTitle>
              <CardDescription className="mt-2">
                Automatically runs daily at 7:00 AM (Europe/Zagreb timezone)
              </CardDescription>
            </div>
            <Badge variant="outline" className="gap-1">
              <Clock className="h-3 w-3" />
              Scheduled: 7:00 AM
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>What does this do?</AlertTitle>
            <AlertDescription>
              Marks all rooms as "dirty" (needs cleaning) if they were occupied yesterday. This
              ensures housekeeping knows which rooms need attention each morning.
            </AlertDescription>
          </Alert>

          {/* Manual Trigger Button */}
          <div className="flex items-center gap-4">
            <Button
              onClick={handleResetRoomCleaning}
              disabled={isResetting}
              size="lg"
              className="gap-2"
            >
              {isResetting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Trigger Manual Reset
                </>
              )}
            </Button>
            <p className="text-sm text-gray-500">
              Use this to test the automated function manually
            </p>
          </div>

          {/* Last Result */}
          {lastResult && (
            <Alert
              variant={lastResult.success ? 'default' : 'destructive'}
              className={lastResult.success ? 'border-green-200 bg-green-50' : ''}
            >
              {lastResult.success ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <AlertTitle>
                {lastResult.success ? 'Success!' : 'Error'}
              </AlertTitle>
              <AlertDescription>
                {lastResult.success ? (
                  <div className="space-y-1">
                    <p className="font-medium">{lastResult.message}</p>
                    <div className="text-sm space-y-0.5">
                      <p>Rooms affected: {lastResult.roomsReset}</p>
                      <p>Execution time: {formatDate(lastResult.executionTime!)}</p>
                      <p>Trigger source: {lastResult.triggerSource}</p>
                    </div>
                  </div>
                ) : (
                  <p>{lastResult.error}</p>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Recent Execution Logs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Execution Log</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={loadRecentLogs}
              disabled={isLoadingLogs}
              className="gap-2"
            >
              {isLoadingLogs ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              Refresh
            </Button>
          </div>
          <CardDescription>Last 10 executions (automatic and manual)</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingLogs ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : recentLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No execution logs yet. Trigger a reset to see logs here.
            </div>
          ) : (
            <div className="space-y-2">
              {recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-sm font-medium">
                        {log.rooms_reset} room{log.rooms_reset !== 1 ? 's' : ''} reset
                      </p>
                      <p className="text-xs text-gray-500">{formatDate(log.executed_at)}</p>
                    </div>
                  </div>
                  <Badge
                    variant={log.triggered_by === 'automatic' ? 'default' : 'secondary'}
                    className="capitalize"
                  >
                    {log.triggered_by}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Future Testing Functions Placeholder */}
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-gray-400">Future Testing Functions</CardTitle>
          <CardDescription>Additional admin testing tools will appear here</CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
