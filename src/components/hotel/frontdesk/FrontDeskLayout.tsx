import React from 'react';
import { HotelProvider } from '../../../lib/hotel/state/HotelContext';
import CalendarView from './CalendarView';

export default function FrontDeskLayout() {
  return (
    <HotelProvider>
      <div className="min-h-screen bg-gray-50">
        <CalendarView />
      </div>
    </HotelProvider>
  );
}