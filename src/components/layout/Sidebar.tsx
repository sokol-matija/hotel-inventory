import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '../ui/button'
import { useAuth } from '../auth/AuthProvider'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from '../ui/LanguageSwitcher'
import { 
  Home, 
  Package, 
  MapPin, 
  LogOut,
  UserCheck,
  Globe,
  Settings,
  Building2,
  ShoppingCart
} from 'lucide-react'

const sidebarItems = [
  { 
    key: 'dashboard', 
    path: '/dashboard', 
    icon: Home
  },
  { 
    key: 'locations', 
    path: '/locations', 
    icon: MapPin
  },
  { 
    key: 'items', 
    path: '/items', 
    icon: Package
  },
  { 
    key: 'orders', 
    path: '/orders', 
    icon: ShoppingCart
  },
  { 
    key: 'globalView', 
    path: '/global', 
    icon: Globe
  },
  { 
    key: 'settings', 
    path: '/settings', 
    icon: Settings
  },
  { 
    key: 'moduleSelector', 
    path: '/hotel/module-selector', 
    icon: Building2
  }
]

export default function Sidebar() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useTranslation()

  if (!user) return null

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col relative overflow-hidden">
      {/* Background image rotated 90 degrees to the right */}
      <div 
        className="absolute inset-0 opacity-10 transform rotate-90 scale-150"
        style={{
          backgroundImage: 'url(/mozaik_gp1.png)',
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
            onClick={() => navigate('/dashboard')}
          >
            <img 
              src="/LOGO1-hires.png" 
              alt="Hotel Porec Logo" 
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {sidebarItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          
          return (
            <Link
              key={item.key}
              to={item.path}
              className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
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

      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-gray-500 to-gray-600 rounded-lg flex items-center justify-center text-white">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="font-medium text-gray-900">
              {user.email}
            </p>
            <p className="text-sm text-gray-600">
              User
            </p>
          </div>
        </div>
        
        <div className="mb-3">
          <LanguageSwitcher />
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
  )
}