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
    <div className="relative flex h-screen bg-gray-50">
      {/* Background decorative image */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <img
          src="/mozaik_gp1.png"
          alt="Decorative background"
          className="absolute right-0 bottom-0 h-64 w-full object-cover opacity-10"
        />
      </div>

      {/* Desktop Sidebar */}
      <div className="relative z-10 hidden lg:block">
        <HotelSidebar />
      </div>

      {/* Mobile Navigation */}
      <MobileNav isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

      {/* Main Content with Internal Routing */}
      <main className="relative z-10 flex flex-1 flex-col">
        {/* Mobile Header */}
        <div className="flex items-center justify-between border-b bg-white p-4 shadow-sm lg:hidden">
          <div className="flex items-center space-x-3">
            <img src="/Icon_512x512.png" alt="Hotel Logo" className="h-8 w-8" />
            <h1 className="text-lg font-semibold text-gray-900">Front Desk</h1>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="rounded-md p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
          >
            <Menu className="h-6 w-6" />
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
