import { useState, useMemo, useCallback } from 'react';
import type {
  HotelTimelineService,
  OccupancyData,
} from '@/lib/hotel/services/HotelTimelineService';
import type { CalendarEvent, Reservation } from '@/lib/hotel/types';
import type { Room } from '@/lib/queries/hooks/useRooms';

export interface TimelineNavigationState {
  currentDate: Date;
  overviewDate: Date;
  overviewPeriod: 'AM' | 'PM';
  calendarEvents: CalendarEvent[];
  currentOccupancy: OccupancyData;
  timelineStats: {
    totalReservations: number;
    occupiedRooms: number;
    availableRooms: number;
    checkInsToday: number;
    checkOutsToday: number;
  };
}

export interface TimelineNavigationActions {
  handleNavigate: (action: 'PREV' | 'NEXT' | 'TODAY') => void;
  handleOverviewNavigate: (action: 'PREV' | 'NEXT' | 'TODAY') => void;
  toggleOverviewPeriod: (period: 'AM' | 'PM') => void;
}

interface Params {
  reservations: Reservation[];
  rooms: Room[];
  timelineService: HotelTimelineService;
}

export function useTimelineNavigation({
  reservations,
  rooms,
  timelineService,
}: Params): TimelineNavigationState & TimelineNavigationActions {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [overviewDate, setOverviewDate] = useState(new Date());
  const [overviewPeriod, setOverviewPeriod] = useState<'AM' | 'PM'>('AM');

  const handleNavigate = useCallback(
    (action: 'PREV' | 'NEXT' | 'TODAY') => {
      setCurrentDate(timelineService.navigateTimeline(currentDate, action));
    },
    [currentDate, timelineService]
  );

  const handleOverviewNavigate = useCallback(
    (action: 'PREV' | 'NEXT' | 'TODAY') => {
      setOverviewDate(timelineService.navigateOverview(overviewDate, action));
    },
    [overviewDate, timelineService]
  );

  const toggleOverviewPeriod = useCallback((period: 'AM' | 'PM') => {
    setOverviewPeriod(period);
  }, []);

  const calendarEvents = useMemo(
    () => timelineService.generateCalendarEvents(reservations, currentDate, rooms),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reservations, currentDate, rooms]
  );

  const currentOccupancy = useMemo(
    () =>
      timelineService.calculateOccupancyDataByPeriod(
        reservations,
        overviewDate,
        rooms,
        overviewPeriod
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reservations, overviewDate, rooms, overviewPeriod]
  );

  const timelineStats = useMemo(
    () => timelineService.getTimelineStats(reservations, currentDate, rooms),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reservations, currentDate, rooms]
  );

  return {
    currentDate,
    overviewDate,
    overviewPeriod,
    calendarEvents,
    currentOccupancy,
    timelineStats,
    handleNavigate,
    handleOverviewNavigate,
    toggleOverviewPeriod,
  };
}
