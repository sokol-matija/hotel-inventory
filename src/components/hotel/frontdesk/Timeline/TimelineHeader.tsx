import React, { useState } from 'react';
import { format, addDays, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../../../ui/button';
import { Reservation } from '../../../../lib/hotel/types';
import type { Room } from '../../../../lib/queries/hooks/useRooms';
import { DayAvailability } from './types';

interface TimelineHeaderProps {
  startDate: Date;
  onNavigate: (action: 'PREV' | 'NEXT' | 'TODAY') => void;
  onDateSelect?: (date: Date) => void;
  rooms: Room[];
  reservations: Reservation[];
  onAvailabilityClick?: (date: Date, availabilityData: DayAvailability) => void;
}

function calculateDayAvailability(
  date: Date,
  rooms: Room[],
  reservations: Reservation[]
): DayAvailability {
  // Exclude virtual rooms (Floor 5) from availability count
  const realRooms = rooms.filter((r) => r.floor_number !== 5);

  const dateStart = new Date(date);
  dateStart.setHours(0, 0, 0, 0);
  const dateEnd = new Date(date);
  dateEnd.setHours(23, 59, 59, 999);

  const occupiedReservations = reservations.filter((reservation) => {
    const checkIn = new Date(reservation.check_in_date);
    const checkOut = new Date(reservation.check_out_date);
    return checkIn <= dateEnd && checkOut > dateStart;
  });

  const occupiedRoomIds = new Set(occupiedReservations.map((r) => r.room_id));
  const availableRooms = realRooms.filter((room) => !occupiedRoomIds.has(room.id));

  const roomsByType = {
    standard: realRooms.filter((r) => !r.is_premium && r.floor_number <= 2),
    premium: realRooms.filter((r) => r.is_premium && r.floor_number <= 3),
    suite: realRooms.filter((r) => r.floor_number === 4),
  };

  const availableByType = {
    standard: availableRooms.filter((r) => !r.is_premium && r.floor_number <= 2),
    premium: availableRooms.filter((r) => r.is_premium && r.floor_number <= 3),
    suite: availableRooms.filter((r) => r.floor_number === 4),
  };

  // Count only real-room occupancy (exclude virtual rooms from occupied count too)
  const realOccupiedCount = realRooms.filter((r) => occupiedRoomIds.has(r.id)).length;

  return {
    date,
    totalRooms: realRooms.length,
    availableRooms: availableRooms.length,
    occupiedRooms: realOccupiedCount,
    occupancyRate:
      realRooms.length > 0 ? Math.round((realOccupiedCount / realRooms.length) * 100) : 0,
    roomTypes: {
      standard: {
        total: roomsByType.standard.length,
        available: availableByType.standard.length,
        occupied: roomsByType.standard.length - availableByType.standard.length,
      },
      premium: {
        total: roomsByType.premium.length,
        available: availableByType.premium.length,
        occupied: roomsByType.premium.length - availableByType.premium.length,
      },
      suite: {
        total: roomsByType.suite.length,
        available: availableByType.suite.length,
        occupied: roomsByType.suite.length - availableByType.suite.length,
      },
    },
    availableRoomsList: availableRooms,
    occupiedReservations,
  };
}

export function TimelineHeader({
  startDate,
  onNavigate,
  onDateSelect,
  rooms,
  reservations,
  onAvailabilityClick,
}: TimelineHeaderProps) {
  const dates = Array.from({ length: 14 }, (_, i) => addDays(startDate, i));
  const [showFreeRooms, setShowFreeRooms] = useState(true);

  const handleAvailabilityClick = (date: Date) => {
    const availabilityData = calculateDayAvailability(date, rooms, reservations);
    onAvailabilityClick?.(date, availabilityData);
  };

  return (
    <div className="sticky top-0 z-10 border-b border-gray-200 bg-white">
      {/* Navigation row */}
      <div className="flex items-center justify-between border-b border-gray-100 p-4">
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('PREV')}
            aria-label="Previous 14 days"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => onNavigate('TODAY')}>
            Today
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('NEXT')}
            aria-label="Next 14 days"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          {onDateSelect && (
            <input
              type="date"
              value={format(startDate, 'yyyy-MM-dd')}
              onChange={(e) => {
                const d = new Date(e.target.value + 'T00:00:00');
                if (!isNaN(d.getTime())) onDateSelect(d);
              }}
              className="h-9 rounded-md border border-gray-300 px-2 text-sm"
              title="Jump to date"
            />
          )}
        </div>

        <div className="text-lg font-semibold text-gray-900">
          {format(startDate, 'MMMM yyyy')} - 14 Day View
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-500">
            Hotel Porec - {rooms.filter((r) => r.floor_number !== 5).length} Rooms
          </div>
          <Button
            variant={showFreeRooms ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowFreeRooms(!showFreeRooms)}
            className="text-xs"
          >
            {showFreeRooms ? 'Free Rooms' : 'Occupied'}
          </Button>
        </div>
      </div>

      {/* Availability row */}
      <div className="bg-gray-25 border-b border-gray-200">
        <div className="grid grid-cols-[180px_repeat(14,minmax(44px,1fr))] gap-0">
          <div className="border-r border-gray-200 bg-gray-50 p-2 text-center text-sm font-medium text-gray-700">
            Available
          </div>
          {dates.map((date) => {
            const availability = calculateDayAvailability(date, rooms, reservations);
            return (
              <button
                key={date.toISOString()}
                type="button"
                className="cursor-pointer border-r border-gray-200 p-2 text-center transition-all hover:bg-gray-50"
                title={`${format(date, 'EEEE, MMMM dd, yyyy')} - Click for detailed breakdown`}
                aria-label={`${format(date, 'EEEE, MMMM dd, yyyy')} — ${showFreeRooms ? `${availability.availableRooms} rooms available` : `${availability.occupiedRooms} rooms occupied`}. Click for detailed breakdown.`}
                onClick={() => handleAvailabilityClick(date)}
              >
                <div
                  className={`inline-flex h-6 min-w-[30px] items-center justify-center rounded-md px-2 text-xs font-bold shadow-sm ${
                    showFreeRooms
                      ? availability.availableRooms === 0
                        ? 'bg-red-500 text-white'
                        : availability.availableRooms <= 5
                          ? 'bg-orange-500 text-white'
                          : 'bg-green-500 text-white'
                      : availability.occupiedRooms === 0
                        ? 'bg-gray-300 text-gray-700'
                        : 'bg-blue-500 text-white'
                  }`}
                >
                  {showFreeRooms ? availability.availableRooms : availability.occupiedRooms}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Date headers */}
      <div className="relative z-20 border-b border-gray-200">
        <div className="grid grid-cols-[180px_repeat(28,minmax(22px,1fr))] border-b border-gray-200">
          <div className="border-r border-gray-200 bg-gray-50 p-3 text-sm font-medium text-gray-700">
            Rooms
          </div>
          {dates.map((date) => {
            const isToday = isSameDay(date, new Date());
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;

            return (
              <React.Fragment key={date.toISOString()}>
                {/* AM half */}
                <div
                  className={`border-r border-gray-300 p-1 text-center text-xs ${
                    isToday
                      ? 'bg-blue-50 font-semibold text-blue-700'
                      : isWeekend
                        ? 'bg-orange-50 text-orange-700'
                        : 'bg-gray-50 text-gray-600'
                  } relative`}
                  title={`${format(date, 'EEEE, MMMM dd, yyyy')} - Morning (Check-out at 11:00 AM)`}
                >
                  <div className="font-medium">{format(date, 'EEE')}</div>
                  <div className="font-bold">{format(date, 'dd')}</div>
                  <div className="absolute right-0 bottom-0 left-0 h-0.5 bg-red-400 opacity-30"></div>
                </div>

                {/* PM half */}
                <div
                  className={`border-r border-gray-200 p-1 text-center text-xs ${
                    isToday
                      ? 'bg-blue-50 font-semibold text-blue-700'
                      : isWeekend
                        ? 'bg-orange-50 text-orange-700'
                        : 'bg-gray-50 text-gray-600'
                  } relative`}
                  title={`${format(date, 'EEEE, MMMM dd, yyyy')} - Afternoon (Check-in at 3:00 PM)`}
                >
                  <div className="font-medium opacity-30">{format(date, 'EEE')}</div>
                  <div className="font-bold opacity-30">{format(date, 'dd')}</div>
                  <div className="absolute right-0 bottom-0 left-0 h-0.5 bg-green-400 opacity-30"></div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
