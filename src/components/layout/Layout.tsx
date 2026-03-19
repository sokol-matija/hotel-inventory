import React, { useState } from 'react';
import { Outlet, useNavigate } from '@tanstack/react-router';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import { useAuth } from '../auth/AuthProvider';
import LanguageSwitcher from '../ui/LanguageSwitcher';

export default function Layout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (!user) return null;

  return (
    <div className="relative flex h-screen bg-gray-50">
      {/* Background decorative image */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <img
          src="/mozaik_gp1.webp"
          alt="Decorative background"
          className="absolute right-0 bottom-0 h-64 w-full object-cover opacity-10"
        />
      </div>

      {/* Desktop Sidebar */}
      <div className="relative z-10 hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile Navigation */}
      <MobileNav isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />

      {/* Main Content */}
      <main className="relative z-10 flex-1 overflow-auto">
        {/* Mobile Header */}
        <div className="border-b border-gray-200 bg-white p-4 lg:hidden">
          <div className="flex items-center justify-between">
            <div className="flex-shrink-0">
              <LanguageSwitcher />
            </div>
            <div className="flex flex-1 items-center justify-center">
              <button
                className="flex h-12 w-32 cursor-pointer items-center justify-center"
                onClick={() => navigate({ to: '/dashboard' })}
              >
                <img
                  src="/LOGO1-hires.png"
                  alt="Hotel Porec Logo"
                  className="h-full w-full object-contain"
                />
              </button>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="flex-shrink-0 rounded-md p-2 text-gray-600 hover:bg-gray-100"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Page Content */}
        <div className="p-4 lg:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
