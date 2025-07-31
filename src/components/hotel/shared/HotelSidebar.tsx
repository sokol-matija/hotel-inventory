import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '../../ui/button'
import { useAuth } from '../../auth/AuthProvider'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from '../../ui/LanguageSwitcher'
import { 
  CalendarDays, 
  Users, 
  CreditCard, 
  FileText,
  LogOut,
  UserCheck,
  ArrowLeft,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

// Hotel Front Desk specific navigation items
const hotelSidebarItems = [
  { 
    key: 'reservations', 
    path: '/hotel/front-desk', 
    icon: CalendarDays,
    label: 'Reservations'
  },
  { 
    key: 'guests', 
    path: '/hotel/front-desk/guests', 
    icon: Users,
    label: 'Guests'
  },
  { 
    key: 'payments', 
    path: '/hotel/front-desk/payments', 
    icon: CreditCard,
    label: 'Payments'
  },
  { 
    key: 'reports', 
    path: '/hotel/front-desk/reports', 
    icon: FileText,
    label: 'Reports'
  }
]

export default function HotelSidebar() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [isCollapsed, setIsCollapsed] = useState(false)

  if (!user) return null

  return (
    <div className={`bg-white border-r border-gray-200 h-screen flex flex-col relative overflow-hidden transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Background image rotated 90 degrees to the right */}
      <div 
        className="absolute inset-0 opacity-10 transform rotate-90 scale-150"
        style={{
          backgroundImage: 'url(/mozaik_gp1 copy.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-blue-50/20 to-indigo-100/20" />
      
      {/* Content wrapper with relative positioning to appear above background */}
      <div className="relative z-10 flex flex-col h-full">
        <div className="p-6">
          <div className="flex items-center justify-center">
            <div 
              className="w-full h-20 flex items-center justify-center cursor-pointer"
              onClick={() => navigate('/hotel/front-desk')}
            >
              <img 
                src="/LOGO1-hires.png" 
                alt="Hotel Porec Logo" 
                className={`h-full object-contain transition-all duration-300 ${
                  isCollapsed ? 'w-8' : 'w-full'
                }`}
              />
            </div>
          </div>
          
          {/* Module Title - hide when collapsed */}
          {!isCollapsed && (
            <div className="text-center mt-3">
              <h2 className="text-lg font-semibold text-gray-900">Front Desk</h2>
              <p className="text-sm text-gray-600">Hotel Management</p>
            </div>
          )}
        </div>

        {/* Collapse/Expand Button */}
        <div className="px-4 mb-2">
          <Button
            onClick={() => setIsCollapsed(!isCollapsed)}
            variant="ghost"
            size="sm"
            className="w-full justify-center"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {hotelSidebarItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path || 
              (item.path === '/hotel/front-desk' && location.pathname === '/hotel/front-desk')
            
            return (
              <Link
                key={item.key}
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && <span className="font-medium">{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-gray-200">
          {/* Back to Module Selector */}
          <Button
            onClick={() => navigate('/hotel/module-selector')}
            variant="outline"
            className={`w-full justify-start mb-4 ${isCollapsed ? 'px-2' : ''}`}
            title={isCollapsed ? 'Module Selector' : undefined}
          >
            <ArrowLeft className="w-4 h-4 flex-shrink-0" />
            {!isCollapsed && <span className="ml-2">Module Selector</span>}
          </Button>

          {!isCollapsed && (
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {user.email}
                </p>
                <p className="text-sm text-gray-600">
                  Front Desk Staff
                </p>
              </div>
            </div>
          )}

          {!isCollapsed && (
            <div className="mb-3">
              <LanguageSwitcher />
            </div>
          )}
          
          <Button
            onClick={signOut}
            variant="outline"
            className={`w-full justify-start ${isCollapsed ? 'px-2' : ''}`}
            title={isCollapsed ? 'Sign Out' : undefined}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!isCollapsed && <span className="ml-2">{t('navigation.signOut')}</span>}
          </Button>
        </div>
      </div>
    </div>
  )
}