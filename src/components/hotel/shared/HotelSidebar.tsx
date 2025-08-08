import React from 'react'
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
  Mail,
  LogOut,
  UserCheck,
  ArrowLeft,
  Receipt,
  TrendingUp,
  DollarSign,
  Shield,
  Wifi,
  Building2,
  Coffee,
  Printer
} from 'lucide-react'

// Hotel Front Desk specific navigation items
const frontDeskSidebarItems = [
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
    key: 'roomservice', 
    path: '/hotel/front-desk/room-service', 
    icon: Coffee,
    label: 'Room Service'
  },
  { 
    key: 'companies', 
    path: '/hotel/front-desk/companies', 
    icon: Building2,
    label: 'Company Management'
  },
  { 
    key: 'pricing', 
    path: '/hotel/front-desk/pricing', 
    icon: DollarSign,
    label: 'Pricing Management'
  },
  { 
    key: 'printertest', 
    path: '/hotel/front-desk/printer-test', 
    icon: Printer,
    label: 'Printer Test'
  },
  { 
    key: 'reports', 
    path: '/hotel/front-desk/reports', 
    icon: FileText,
    label: 'Reports'
  },
  { 
    key: 'emailTest', 
    path: '/hotel/front-desk/email-test', 
    icon: Mail,
    label: 'Email Test'
  }
]

// Hotel Finance specific navigation items
const financeSidebarItems = [
  { 
    key: 'invoicePayment', 
    path: '/hotel/finance', 
    icon: Receipt,
    label: 'Invoice & Payment Management'
  },
  { 
    key: 'revenueAnalytics', 
    path: '/hotel/finance/revenue-analytics', 
    icon: TrendingUp,
    label: 'Revenue Analytics'
  },
  { 
    key: 'fiscalCompliance', 
    path: '/hotel/finance/fiscal-compliance', 
    icon: Shield,
    label: 'Fiscal Compliance'
  },
  { 
    key: 'eracuniTest', 
    path: '/hotel/finance/eracuni-test', 
    icon: Wifi,
    label: 'Croatian Fiscalization'
  },
  { 
    key: 'fiscalizationTest', 
    path: '/hotel/finance/fiscalization-test', 
    icon: Shield,
    label: 'Fiscalization Test'
  }
]

export default function HotelSidebar() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useTranslation()

  if (!user) return null

  // Determine current module based on path
  const isFinanceModule = location.pathname.startsWith('/hotel/finance')
  const isFrontDeskModule = location.pathname.startsWith('/hotel/front-desk')
  
  // Get appropriate sidebar items and module info
  const sidebarItems = isFinanceModule ? financeSidebarItems : frontDeskSidebarItems
  const moduleTitle = isFinanceModule ? 'Finance' : 'Front Desk'
  const moduleSubtitle = isFinanceModule ? 'Croatian e-računi & Finance' : 'Hotel Management'
  const userRole = isFinanceModule ? 'Finance Manager' : 'Front Desk Staff'
  const logoClickPath = isFinanceModule ? '/hotel/finance' : '/hotel/front-desk'

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col relative overflow-hidden">
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
              onClick={() => navigate(logoClickPath)}
            >
              <img 
                src="/LOGO1-hires.png" 
                alt="Hotel Porec Logo" 
                className="w-full h-full object-contain"
              />
            </div>
          </div>
          
          {/* Module Title */}
          <div className="text-center mt-3">
            <h2 className="text-lg font-semibold text-gray-900">{moduleTitle}</h2>
            <p className="text-sm text-gray-600">{moduleSubtitle}</p>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2">
          {sidebarItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path || 
              (item.path === '/hotel/front-desk' && location.pathname === '/hotel/front-desk') ||
              (item.path === '/hotel/finance' && location.pathname === '/hotel/finance')
            
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
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-gray-200">
          {/* Back to Module Selector */}
          <Button
            onClick={() => navigate('/hotel/module-selector')}
            variant="outline"
            className="w-full justify-start mb-4"
          >
            <ArrowLeft className="w-4 h-4 flex-shrink-0" />
            <span className="ml-2">Module Selector</span>
          </Button>

          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium text-gray-900">
                {user.email}
              </p>
              <p className="text-sm text-gray-600">
                {userRole}
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
            <LogOut className="w-4 h-4 flex-shrink-0" />
            <span className="ml-2">{t('navigation.signOut')}</span>
          </Button>
        </div>
      </div>
    </div>
  )
}