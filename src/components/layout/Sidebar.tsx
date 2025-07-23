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
  ChefHat,
  UserCheck,
  Sparkles,
  Calculator,
  ShieldCheck,
  Globe,
  Settings,
  History
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
    key: 'dashboard', 
    path: '/dashboard', 
    icon: Home, 
    roles: ['admin', 'reception', 'cooking', 'room_cleaner', 'finance'] 
  },
  { 
    key: 'locations', 
    path: '/locations', 
    icon: MapPin, 
    roles: ['admin', 'reception', 'cooking', 'room_cleaner', 'finance'] 
  },
  { 
    key: 'items', 
    path: '/items', 
    icon: Package, 
    roles: ['admin', 'cooking'] 
  },
  { 
    key: 'globalView', 
    path: '/global', 
    icon: Globe, 
    roles: ['admin', 'reception', 'cooking', 'room_cleaner', 'finance'] 
  },
  { 
    key: 'settings', 
    path: '/admin/locations', 
    icon: Settings, 
    roles: ['admin'] 
  },
  { 
    key: 'auditLogs', 
    path: '/admin/audit', 
    icon: History, 
    roles: ['admin'] 
  },
]

export default function Sidebar() {
  const { userProfile, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useTranslation()

  if (!userProfile) return null

  const userRole = userProfile.role.name
  const filteredItems = sidebarItems.filter(item => item.roles.includes(userRole))

  const RoleIcon = roleIcons[userRole as keyof typeof roleIcons] || UserCheck

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col">
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
        {filteredItems.map((item) => {
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
  )
}