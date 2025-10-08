// FrontDeskV2Layout - Clean front desk module with dedicated sidebar
import React, { useState, useMemo } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Menu, TrendingUp, Users, Home, DollarSign } from 'lucide-react';
import FrontDeskV2Sidebar from './components/FrontDeskV2Sidebar';
// import { GuestProvider } from '../../../lib/hotel/contexts/GuestContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import GuestCrudPage from './pages/GuestCrudPage';
import { useHotel } from '../../../lib/hotel/state/SupabaseHotelContext';

// Dashboard component
function DashboardPage() {
  const { rooms, isLoading, roomsByFloor } = useHotel();
  
  // Format room type for display
  const formatRoomType = (roomType: string) => {
    return roomType.charAt(0).toUpperCase() + roomType.slice(1) + ' Room';
  };
  
  // Get floor 3 rooms (301-318)
  const floor3Rooms = useMemo(() => {
    return rooms
      .filter(room => room.floor === 3)
      .sort((a, b) => a.number.localeCompare(b.number));
  }, [rooms]);
  
  if (isLoading) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading rooms...</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex-1 overflow-auto p-6">
      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Guests in Hotel
            </CardTitle>
            <Users className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-gray-500">Currently staying</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Room Occupancy
            </CardTitle>
            <Home className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0/55</div>
            <div className="flex items-center space-x-2">
              <span className="inline-block px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                0.0%
              </span>
              <span className="text-xs text-gray-500">occupied</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Today's Check-ins
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-gray-500">arrivals today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Today's Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€0</div>
            <p className="text-xs text-gray-500">from check-ins</p>
          </CardContent>
        </Card>
      </div>

      {/* Status Legend */}
      <div className="flex flex-wrap items-center gap-4 mb-6 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-orange-500"></div>
          <span>Confirmed</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span>Checked In</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-gray-500"></div>
          <span>Checked Out</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span>Room Closure</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span>Unallocated</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded border-2 border-red-500"></div>
          <span>Payment Pending</span>
        </div>
      </div>

      {/* Timeline Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Front Desk Timeline</CardTitle>
              <p className="text-sm text-gray-500">Hotel Porec - Timeline View</p>
            </div>
            <div className="flex items-center space-x-2">
              <button className="px-3 py-1 text-sm border rounded-md hover:bg-gray-50">
                Drag to Create
              </button>
              <button className="px-3 py-1 text-sm border rounded-md hover:bg-gray-50">
                Expand Reservations
              </button>
              <button className="px-3 py-1 text-sm border rounded-md hover:bg-gray-50">
                Move Reservations
              </button>
              <button className="px-3 py-1 text-sm border rounded-md hover:bg-gray-50">
                Fullscreen
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Room Status Overview - August 14, 2025</h3>
              <div className="flex items-center space-x-2">
                <button className="px-2 py-1 text-sm">←</button>
                <span className="text-sm font-medium">Today</span>
                <button className="px-2 py-1 text-sm">→</button>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <h4 className="font-medium">Floor 3</h4>
                  <span className="text-sm text-gray-500">{floor3Rooms.length} rooms</span>
                  <span className="px-2 py-1 text-xs bg-gray-900 text-white rounded-full">
                    100% occupied
                  </span>
                </div>
              </div>

              {/* Room Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {floor3Rooms.map((room) => {
                  const isPremium = room.isPremium;
                  
                  return (
                    <div key={room.id} className="border rounded-lg p-3 bg-gray-50 hover:bg-gray-100 cursor-pointer">
                      <div className="font-medium text-sm mb-1 flex items-center">
                        {isPremium && <span className="text-yellow-500 mr-1">⭐</span>}
                        {room.number}
                      </div>
                      <div className="text-xs text-gray-500 mb-2">{formatRoomType(room.type)}</div>
                      <div className="text-xs text-gray-400 italic">
                        Click to create<br />booking
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function FrontDeskV2Layout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 relative">
      {/* Background decorative image */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <img 
          src="/mozaik_gp1.png" 
          alt="Decorative background" 
          className="absolute bottom-0 right-0 w-full h-64 object-cover opacity-10"
        />
      </div>
      
      {/* Desktop Sidebar */}
      <div className="hidden lg:block relative z-10">
        <FrontDeskV2Sidebar />
      </div>

      {/* Mobile Navigation */}
      <div 
        className={`lg:hidden fixed inset-0 z-50 bg-black bg-opacity-50 transition-opacity ${
          isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
      >
        <div 
          className={`fixed left-0 top-0 h-full w-64 bg-white transform transition-transform ${
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <FrontDeskV2Sidebar />
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative z-10">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white shadow-sm border-b p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img 
              src="/Icon_512x512.png" 
              alt="Hotel Porec" 
              className="h-8 w-8 rounded"
            />
            <div>
              <h1 className="font-semibold text-gray-900">Front Desk V2</h1>
              <p className="text-xs text-gray-500">Clean Architecture</p>
            </div>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 rounded-md hover:bg-gray-100"
          >
            <Menu className="h-6 w-6 text-gray-600" />
          </button>
        </div>

        {/* Content Area with Routes */}
        <div className="flex-1">
          <Routes>
            <Route index element={<DashboardPage />} />
            <Route path="guests" element={<GuestCrudPage />} />
            <Route path="timeline" element={<div className="p-6"><h1>Timeline Page - Coming Soon</h1></div>} />
            <Route path="reservations" element={<div className="p-6"><h1>Reservations Page - Coming Soon</h1></div>} />
            <Route path="payments" element={<div className="p-6"><h1>Payments Page - Coming Soon</h1></div>} />
            <Route path="reports" element={<div className="p-6"><h1>Reports Page - Coming Soon</h1></div>} />
            <Route path="settings" element={<div className="p-6"><h1>Settings Page - Coming Soon</h1></div>} />
          </Routes>
        </div>
      </main>
    </div>
  );
}