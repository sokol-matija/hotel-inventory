import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Button } from '../ui/button'
import { useAuth } from '../auth/AuthProvider'
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
  Settings
} from 'lucide-react'

const roleIcons = {
  'admin': ShieldCheck,
  'reception': UserCheck,
  'cooking': ChefHat,
  'room_cleaner': Sparkles,
  'finance': Calculator
}

const sidebarItems = [
  { 
    name: 'Dashboard', 
    path: '/dashboard', 
    icon: Home, 
    roles: ['admin', 'reception', 'cooking', 'room_cleaner', 'finance'] 
  },
  { 
    name: 'Locations', 
    path: '/locations', 
    icon: MapPin, 
    roles: ['admin', 'reception', 'cooking', 'room_cleaner', 'finance'] 
  },
  { 
    name: 'Items', 
    path: '/items', 
    icon: Package, 
    roles: ['admin', 'cooking'] 
  },
  { 
    name: 'Global View', 
    path: '/global', 
    icon: Globe, 
    roles: ['admin', 'reception', 'cooking', 'room_cleaner', 'finance'] 
  },
  { 
    name: 'Settings', 
    path: '/admin/locations', 
    icon: Settings, 
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
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center justify-center flex-1">
                <div className="w-full h-16 flex items-center justify-center">
                  <img 
                    src="/LOGO1-hires.png" 
                    alt="Hotel Porec Logo" 
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-md text-gray-600 hover:bg-gray-100"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {filteredItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={onClose}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              )
            })}
          </nav>

          {/* User Profile & Sign Out */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-gray-500 to-gray-600 rounded-lg flex items-center justify-center text-white">
                <RoleIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium text-gray-900 capitalize">
                  {userRole.replace('_', ' ')}
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
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}