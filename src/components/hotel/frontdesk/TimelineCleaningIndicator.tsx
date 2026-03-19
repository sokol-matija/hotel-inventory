// Compact Room Cleaning Status Indicator for Timeline
// Shows a small dot indicator for room cleaning status with real-time updates

import { useEffect, useState } from 'react';
import { RoomCleaningService } from '@/services/RoomCleaningService';
import { cn } from '@/lib/utils';

interface TimelineCleaningIndicatorProps {
  roomId: string;
  className?: string;
}

export const TimelineCleaningIndicator = ({
  roomId,
  className,
}: TimelineCleaningIndicatorProps) => {
  const [state, setState] = useState({ isClean: false, isLoading: true });

  useEffect(() => {
    const service = RoomCleaningService.getInstance();

    // Get initial status
    service.getRoomStatus(roomId).then((status) => {
      setState({ isClean: status?.isClean ?? false, isLoading: false });
    });

    // Subscribe to real-time changes
    const subscription = service.subscribeToRoomStatus(roomId, (clean) => {
      setState((prev) => ({ ...prev, isClean: clean }));
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [roomId]);

  const { isClean, isLoading } = state;

  if (isLoading) {
    return (
      <div
        className={cn('h-2.5 w-2.5 animate-pulse rounded-full bg-gray-300', className)}
        title="Loading cleaning status..."
      />
    );
  }

  return (
    <div
      className={cn(
        'h-2.5 w-2.5 rounded-full transition-all duration-300',
        isClean ? 'bg-blue-500' : 'bg-red-500',
        className
      )}
      title={isClean ? 'Room clean' : 'Room dirty'}
    />
  );
};
