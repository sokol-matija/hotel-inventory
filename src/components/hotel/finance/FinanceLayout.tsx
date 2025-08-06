import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useAuth } from '../../auth/AuthProvider';
import { HotelProvider } from '../../../lib/hotel/state/HotelContext';
import HotelSidebar from '../shared/HotelSidebar';
import MobileNav from '../../layout/MobileNav';
import InvoicePaymentPage from './InvoicePaymentPage';
import RevenueAnalyticsPage from './RevenueAnalyticsPage';
import FiscalCompliancePage from './FiscalCompliancePage';
import FiscalizationTestPage from './EracuniTestPage'; // Renamed: now uses proven fiscalization system

export default function FinanceLayout() {
  const { user } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (!user) return null;

  return (
    <HotelProvider>
      <div className="flex h-screen bg-gray-50 relative">
        {/* Background decorative image */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <img 
            src="/mozaik_gp1 copy.png" 
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
              <h1 className="text-lg font-semibold text-gray-900">Finance</h1>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>

          {/* Content Area with Internal Routes */}
          <div className="flex-1 overflow-auto">
            <Routes>
              <Route index element={<InvoicePaymentPage />} />
              <Route path="invoices" element={<InvoicePaymentPage />} />
              <Route path="revenue-analytics" element={<RevenueAnalyticsPage />} />
              <Route path="fiscal-compliance" element={<FiscalCompliancePage />} />
              <Route path="eracuni-test" element={<FiscalizationTestPage />} />
              <Route path="fiscalization-test" element={<FiscalizationTestPage />} />
              <Route path="*" element={<Navigate to="/hotel/finance" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </HotelProvider>
  );
}