import React, { useState } from 'react';
import { Outlet } from '@tanstack/react-router';
import { Menu } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { SupabaseHotelProvider } from '../../../lib/hotel/state/SupabaseHotelContext';
import HotelSidebar from '../shared/HotelSidebar';
import MobileNav from '../../layout/MobileNav';
import FloatingCreateButton from './FloatingCreateButton';

function FrontDeskContent() {
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
        <HotelSidebar />
      </div>

      {/* Mobile Navigation */}
      <MobileNav 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content with Internal Routing */}
      <main className="flex-1 flex flex-col relative z-10">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white shadow-sm border-b p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img 
              src="/Icon_512x512.png" 
              alt="Hotel Logo" 
              className="w-8 h-8"
            />
            <h1 className="text-lg font-semibold text-gray-900">Front Desk</h1>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>

      {/* Floating Action Button for creating unallocated reservations */}
      <FloatingCreateButton />
    </div>
  );
}

export default function FrontDeskLayout() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <SupabaseHotelProvider>
      <FrontDeskContent />
    </SupabaseHotelProvider>
  );
}