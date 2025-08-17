import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Users, Home, TrendingUp, DollarSign } from 'lucide-react';
import { RESERVATION_STATUS_COLORS } from '../../../lib/hotel/calendarUtils';
import { useHotel } from '../../../lib/hotel/state/SupabaseHotelContext';
import HotelTimeline from './HotelTimeline';

// Hotel overview stats component
function HotelOverviewStats({ reservations }: { reservations: any[] }) {
  const { rooms } = useHotel(); // Get dynamic rooms from Supabase
  const today = new Date();
  
  // Calculate current occupancy for today
  const todayOccupancy = reservations.filter(reservation => 
    today >= reservation.checkIn && today < reservation.checkOut
  );
  
  const occupiedRooms = todayOccupancy.length;
  const totalRooms = rooms.length; // Use dynamic room count instead of static HOTEL_POREC_ROOMS.length
  const occupancyRate = (occupiedRooms / totalRooms) * 100;
  
  // Calculate total guests in hotel today
  const totalGuests = todayOccupancy.reduce((sum, reservation) => 
    sum + reservation.numberOfGuests, 0
  );
  
  // Calculate total revenue for today's check-ins
  const todayCheckIns = reservations.filter(reservation =>
    reservation.checkIn.toDateString() === today.toDateString()
  );
  const todayRevenue = todayCheckIns.reduce((sum, reservation) => 
    sum + reservation.totalAmount, 0
  );
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Guests in Hotel</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalGuests}</div>
          <p className="text-xs text-muted-foreground">
            Currently staying
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Room Occupancy</CardTitle>
          <Home className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{occupiedRooms}/{totalRooms}</div>
          <div className="flex items-center space-x-2">
            <Badge variant={occupancyRate > 80 ? "default" : occupancyRate > 60 ? "secondary" : "destructive"}>
              {occupancyRate.toFixed(1)}%
            </Badge>
            <p className="text-xs text-muted-foreground">
              occupied
            </p>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Today's Check-ins</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{todayCheckIns.length}</div>
          <p className="text-xs text-muted-foreground">
            arrivals today
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">€{todayRevenue.toFixed(0)}</div>
          <p className="text-xs text-muted-foreground">
            from check-ins
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Status legend component
function StatusLegend() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
      {Object.entries(RESERVATION_STATUS_COLORS).map(([status, colors]) => (
        <div key={status} className="flex items-center space-x-2">
          <div 
            className="w-4 h-4 rounded border-2"
            style={{ 
              backgroundColor: colors.backgroundColor,
              borderColor: colors.borderColor 
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
  const { reservations } = useHotel();
  
  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-white' : ''}`}>
      <div className="p-6 space-y-6">
        {/* Hotel Overview Stats */}
        {!isFullscreen && <HotelOverviewStats reservations={reservations} />}
        
        {/* Status Legend */}
        {!isFullscreen && <StatusLegend />}
        
        {/* Hotel Timeline */}
        <Card className="h-[calc(100vh-400px)]">
          <CardContent className="p-0 h-full">
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