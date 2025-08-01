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
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

interface SidebarProps {
  isCollapsed: boolean
  onToggle: () => void
}

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

export default function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useTranslation()

  if (!user) return null

  return (
    <div className={`${isCollapsed ? 'w-16' : 'w-64'} bg-white border-r border-gray-200 h-screen flex flex-col relative overflow-hidden transition-all duration-300 ease-in-out`}>
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
        {/* Header with logo and toggle */}
        <div className={`${isCollapsed ? 'px-2 py-4' : 'p-6'} transition-all duration-300`}>
          <div className="flex items-center justify-between">
            <div 
              className={`${isCollapsed ? 'w-12 h-12 mx-auto' : 'w-full h-20'} flex items-center justify-center cursor-pointer transition-all duration-300`}
              onClick={() => navigate('/dashboard')}
            >
              {isCollapsed ? (
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg hover:shadow-xl transition-all duration-200">
                  HP
                </div>
              ) : (
                <img 
                  src="/LOGO1-hires.png"
                  alt="Hotel Porec Logo" 
                  className="w-full h-full object-contain transition-all duration-300"
                />
              )}
            </div>
            
            {/* Toggle button */}
            <button
              onClick={onToggle}
              className={`${
                isCollapsed ? 'absolute -right-3 top-10' : 'ml-2'
              } w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 shadow-sm hover:shadow-md z-20 group`}
            >
              {isCollapsed ? (
                <ChevronRight className="w-3 h-3 text-gray-500 group-hover:text-blue-600 transition-colors" />
              ) : (
                <ChevronLeft className="w-3 h-3 text-gray-500 group-hover:text-blue-600 transition-colors" />
              )}
            </button>
          </div>
        </div>

      <nav className={`flex-1 ${isCollapsed ? 'px-2 pt-2' : 'px-4'} space-y-2 transition-all duration-300`}>
        {sidebarItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          
          return (
            <div key={item.key} className="relative group">
              <Link
                to={item.path}
                className={`flex items-center ${
                  isCollapsed 
                    ? 'justify-center w-12 h-12 mx-auto rounded-xl' 
                    : 'space-x-3 px-4 py-3 rounded-lg'
                } transition-all duration-200 ${
                  isActive
                    ? isCollapsed 
                      ? 'bg-blue-600 text-white shadow-lg' 
                      : 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                    : isCollapsed
                      ? 'text-gray-600 hover:bg-gray-100 hover:text-blue-600'
                      : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                {!isCollapsed && (
                  <span className="font-medium">{t(`navigation.${item.key}`)}</span>
                )}
              </Link>
              
              {/* Tooltip for collapsed state */}
              {isCollapsed && (
                <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                  {t(`navigation.${item.key}`)}
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900"></div>
                </div>
              )}
            </div>
          )
        })}
      </nav>

      <div className={`${isCollapsed ? 'p-2 space-y-2' : 'p-4 space-y-3'} border-t border-gray-200 transition-all duration-300`}>
        {isCollapsed ? (
          /* Collapsed bottom section - clean and minimal */
          <div className="space-y-2">
            {/* User avatar */}
            <div className="relative group flex justify-center">
              <div className="w-12 h-12 bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl flex items-center justify-center text-white">
                <UserCheck className="w-5 h-5" />
              </div>
              <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                {user.email}
                <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900"></div>
              </div>
            </div>
            
            {/* Language switcher */}
            <div className="relative group flex justify-center">
              <div className="w-12 h-12 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center transition-colors cursor-pointer">
                <Globe className="w-4 h-4 text-gray-600" />
              </div>
              <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                Language
                <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900"></div>
              </div>
            </div>
            
            {/* Sign out button */}
            <div className="relative group flex justify-center">
              <Button
                onClick={signOut}
                variant="outline"
                className="w-12 h-12 p-0 rounded-xl border-gray-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600"
              >
                <LogOut className="w-4 h-4" />
              </Button>
              <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-900 text-white text-sm rounded opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                {t('navigation.signOut')}
                <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900"></div>
              </div>
            </div>
          </div>
        ) : (
          /* Expanded bottom section */
          <>
            {/* User info */}
            <div className="flex items-center space-x-3">
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
            
            {/* Language switcher */}
            <LanguageSwitcher />
            
            {/* Sign out button */}
            <Button
              onClick={signOut}
              variant="outline"
              className="w-full justify-start"
            >
              <LogOut className="w-4 h-4 mr-2" />
              {t('navigation.signOut')}
            </Button>
          </>
        )}
      </div>
      </div>
    </div>
  )
}