import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Button } from '../ui/button'
import { useAuth } from '../auth/AuthProvider'
import { useTranslation } from 'react-i18next'
import { 
  Home, 
  Package, 
  MapPin, 
  LogOut,
  ChefHat,
  UserCheck,
  Sparkles,
  Calculator,
  ShieldCheck,
  X,
  Globe,
  Settings,
  History
} from 'lucide-react'

const roleIcons = {
  'admin': ShieldCheck,
  'reception': UserCheck,
  'kitchen': ChefHat,
  'housekeeping': Sparkles,
  'bookkeeping': Calculator
}

const sidebarItems = [
  { 
    key: 'dashboard', 
    path: '/dashboard', 
    icon: Home, 
    roles: ['admin', 'reception', 'kitchen', 'housekeeping', 'bookkeeping'] 
  },
  { 
    key: 'locations', 
    path: '/locations', 
    icon: MapPin, 
    roles: ['admin', 'reception', 'kitchen', 'housekeeping', 'bookkeeping'] 
  },
  { 
    key: 'items', 
    path: '/items', 
    icon: Package, 
    roles: ['admin', 'kitchen'] 
  },
  { 
    key: 'globalView', 
    path: '/global', 
    icon: Globe, 
    roles: ['admin', 'reception', 'kitchen', 'housekeeping', 'bookkeeping'] 
  },
  { 
    key: 'settings', 
    path: '/settings', 
    icon: Settings, 
    roles: ['admin', 'reception', 'kitchen', 'housekeeping', 'bookkeeping'] 
  },
  { 
    key: 'locationManagement', 
    path: '/admin/locations', 
    icon: MapPin, 
    roles: ['admin'] 
  },
  { 
    key: 'auditLogs', 
    path: '/admin/audit', 
    icon: History, 
    roles: ['admin'] 
  },
]

interface MobileNavProps {
  isOpen: boolean
  onClose: () => void
}

export default function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const { userProfile, signOut } = useAuth()
  const location = useLocation()
  const { t } = useTranslation()

  if (!userProfile) return null

  const userRole = userProfile.role.name
  const filteredItems = sidebarItems.filter(item => item.roles.includes(userRole))

  const RoleIcon = roleIcons[userRole as keyof typeof roleIcons] || UserCheck

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Mobile Navigation Panel */}
      <div className={`fixed top-0 left-0 h-full w-80 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out lg:hidden ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center justify-center flex-1">
                <div className="w-full h-12 flex items-center justify-center">
                  <img 
                    src="/LOGO1-hires.png" 
                    alt="Hotel Porec Logo" 
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-md text-gray-600 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation and image container */}
          <div className="flex-1 flex flex-col">
            {/* Navigation */}
            <nav className="px-3 py-3 space-y-1">
              {filteredItems.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path
                
                return (
                  <Link
                    key={item.key}
                    to={item.path}
                    onClick={onClose}
                    className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{t(`navigation.${item.key}`)}</span>
                  </Link>
                )
              })}
            </nav>

            {/* Decorative image - flex-1 to push user profile to bottom */}
            <div className="px-2 flex justify-center flex-1">
              <img 
                src="/zemlja_gp_crop.png" 
                alt="Decorative landscape" 
                className="w-full h-full object-contain opacity-30"
              />
            </div>
          </div>

          {/* User Profile & Sign Out - at bottom */}
          <div className="p-3 border-t border-gray-200">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-10 h-10 bg-gradient-to-br from-gray-500 to-gray-600 rounded-lg flex items-center justify-center text-white">
                <RoleIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium text-gray-900 capitalize">
                  {t(`roles.${userRole}`)}
                </p>
                <p className="text-sm text-gray-600">
                  {userProfile.role.description}
                </p>
              </div>
            </div>
            
            <Button
              onClick={signOut}
              variant="outline"
              className="w-full justify-start"
            >
              <LogOut className="w-4 h-4 mr-2" />
              {t('navigation.signOut')}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}