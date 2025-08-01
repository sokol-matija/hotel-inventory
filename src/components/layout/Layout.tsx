import React, { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import MobileNav from './MobileNav'
import { useAuth } from '../auth/AuthProvider'
import LanguageSwitcher from '../ui/LanguageSwitcher'

export default function Layout() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  if (!user) return null

  return (
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
        <Sidebar />
      </div>

      {/* Mobile Navigation */}
      <MobileNav 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative z-10">
        {/* Mobile Header */}
        <div className="lg:hidden bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex-shrink-0">
              <LanguageSwitcher />
            </div>
            <div className="flex items-center justify-center flex-1">
              <div 
                className="w-32 h-12 flex items-center justify-center cursor-pointer"
                onClick={() => navigate('/dashboard')}
              >
                <img 
                  src="/LOGO1-hires.png" 
                  alt="Hotel Porec Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 rounded-md text-gray-600 hover:bg-gray-100 flex-shrink-0"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
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
  )
}