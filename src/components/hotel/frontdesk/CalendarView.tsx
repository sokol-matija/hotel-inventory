import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Users, Home, TrendingUp, DollarSign } from 'lucide-react';
import { RESERVATION_STATUS_COLORS } from '../../../lib/hotel/calendarUtils';
import { useReservations } from '../../../lib/queries/hooks/useReservations';
import { useRooms } from '../../../lib/queries/hooks/useRooms';
import { Reservation } from '../../../lib/hotel/types';
import HotelTimeline from './HotelTimeline';

// Hotel overview stats component
function HotelOverviewStats({ reservations }: { reservations: Reservation[] }) {
  const { data: rooms = [] } = useRooms();
  const today = new Date();

  // Calculate current occupancy for today
  const todayOccupancy = reservations.filter(
    (reservation) =>
      today >= new Date(reservation.check_in_date) && today < new Date(reservation.check_out_date)
  );

  const occupiedRooms = todayOccupancy.length;
  const totalRooms = rooms.length; // Use dynamic room count instead of static HOTEL_POREC_ROOMS.length
  const occupancyRate = totalRooms > 0 ? (occupiedRooms / totalRooms) * 100 : 0;

  // Calculate total guests in hotel today
  const totalGuests = todayOccupancy.reduce(
    (sum, reservation) => sum + (reservation.number_of_guests ?? reservation.adults ?? 1),
    0
  );

  // Calculate total revenue for today's check-ins
  const todayCheckIns = reservations.filter(
    (reservation) => new Date(reservation.check_in_date).toDateString() === today.toDateString()
  );
  // TODO: Phase 9 — derive from reservation_charges once all consumers migrated
  const todayRevenue = todayCheckIns.reduce((_sum, _reservation) => _sum + 0, 0);

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Guests in Hotel</CardTitle>
          <Users className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalGuests}</div>
          <p className="text-muted-foreground text-xs">Currently staying</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Room Occupancy</CardTitle>
          <Home className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {occupiedRooms}/{totalRooms}
          </div>
          <div className="flex items-center space-x-2">
            <Badge
              variant={
                occupancyRate > 80 ? 'default' : occupancyRate > 60 ? 'secondary' : 'destructive'
              }
            >
              {occupancyRate.toFixed(1)}%
            </Badge>
            <p className="text-muted-foreground text-xs">occupied</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Today's Check-ins</CardTitle>
          <TrendingUp className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{todayCheckIns.length}</div>
          <p className="text-muted-foreground text-xs">arrivals today</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
          <DollarSign className="text-muted-foreground h-4 w-4" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">€{todayRevenue.toFixed(0)}</div>
          <p className="text-muted-foreground text-xs">from check-ins</p>
        </CardContent>
      </Card>
    </div>
  );
}

// Status legend component
function StatusLegend() {
  return (
    <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
      {Object.entries(RESERVATION_STATUS_COLORS).map(([status, colors]) => (
        <div key={status} className="flex items-center space-x-2">
          <div
            className="h-4 w-4 rounded border-2"
            style={{
              backgroundColor: colors.backgroundColor,
              borderColor: colors.borderColor,
            }}
          />
          <span className="text-sm text-gray-600">{colors.label}</span>
        </div>
      ))}
    </div>
  );
}

// Main calendar view component - updated
export default function CalendarView() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const { data: reservations = [] } = useReservations();

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-white' : ''}`}>
      <div className="space-y-6 p-6">
        {/* Hotel Overview Stats */}
        {!isFullscreen && <HotelOverviewStats reservations={reservations} />}

        {/* Status Legend */}
        {!isFullscreen && <StatusLegend />}

        {/* Hotel Timeline */}
        <Card className="h-[calc(100vh-400px)]">
          <CardContent className="h-full p-0">
            <HotelTimeline
              isFullscreen={isFullscreen}
              onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
