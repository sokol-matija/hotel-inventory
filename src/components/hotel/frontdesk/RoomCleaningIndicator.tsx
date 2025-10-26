// Simple Room Cleaning Status Indicator
// Shows if room is clean or dirty with real-time updates

import { useEffect, useState } from 'react'
import { RoomCleaningService } from '@/services/RoomCleaningService'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RoomCleaningIndicatorProps {
  roomId: string
  className?: string
  showLabel?: boolean
}

export const RoomCleaningIndicator = ({
  roomId,
  className,
  showLabel = true,
}: RoomCleaningIndicatorProps) => {
  const [isClean, setIsClean] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const service = RoomCleaningService.getInstance()

    // Get initial status
    service.getRoomStatus(roomId).then((status) => {
      if (status) {
        setIsClean(status.isClean)
      }
      setIsLoading(false)
    })

    // Subscribe to real-time changes
    const subscription = service.subscribeToRoomStatus(roomId, (clean) => {
      setIsClean(clean)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [roomId])

  if (isLoading) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className="h-4 w-4 rounded-full bg-gray-300 animate-pulse" />
        {showLabel && <span className="text-sm text-gray-500">Loading...</span>}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-2 py-1 rounded',
        isClean ? 'bg-green-100' : 'bg-red-100',
        className
      )}
    >
      {isClean ? (
        <CheckCircle2 className="h-4 w-4 text-green-600" />
      ) : (
        <AlertCircle className="h-4 w-4 text-red-600" />
      )}
      {showLabel && (
        <span className={cn('text-sm font-medium', isClean ? 'text-green-700' : 'text-red-700')}>
          {isClean ? 'Clean' : 'Dirty'}
        </span>
      )}
    </div>
  )
}
