import React from 'react';
import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import { Button } from '../../ui/button';
import { useAuth } from '../../auth/AuthProvider';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../../ui/LanguageSwitcher';
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
  Printer,
  List,
} from 'lucide-react';

// Hotel Front Desk specific navigation items
const frontDeskSidebarItems = [
  {
    key: 'reservations',
    path: '/hotel/front-desk',
    icon: CalendarDays,
    label: 'Reservations',
  },
  {
    key: 'reservationsList',
    path: '/hotel/front-desk/reservations-list',
    icon: List,
    label: 'Reservations List',
  },
  {
    key: 'guests',
    path: '/hotel/front-desk/guests',
    icon: Users,
    label: 'Guests (Legacy)',
  },
  {
    key: 'payments',
    path: '/hotel/front-desk/payments',
    icon: CreditCard,
    label: 'Payments',
  },
  {
    key: 'roomservice',
    path: '/hotel/front-desk/room-service',
    icon: Coffee,
    label: 'Room Service',
  },
  {
    key: 'companies',
    path: '/hotel/front-desk/companies',
    icon: Building2,
    label: 'Company Management',
  },
  {
    key: 'pricing',
    path: '/hotel/front-desk/pricing',
    icon: DollarSign,
    label: 'Pricing Management',
  },
  {
    key: 'printertest',
    path: '/hotel/front-desk/printer-test',
    icon: Printer,
    label: 'Printer Test',
  },
  {
    key: 'reports',
    path: '/hotel/front-desk/reports',
    icon: FileText,
    label: 'Reports',
  },
  {
    key: 'emailTest',
    path: '/hotel/front-desk/email-test',
    icon: Mail,
    label: 'Email Test',
  },
];

// Hotel Finance specific navigation items
const financeSidebarItems = [
  {
    key: 'invoicePayment',
    path: '/hotel/finance',
    icon: Receipt,
    label: 'Invoice & Payment Management',
  },
  {
    key: 'revenueAnalytics',
    path: '/hotel/finance/revenue-analytics',
    icon: TrendingUp,
    label: 'Revenue Analytics',
  },
  {
    key: 'fiscalCompliance',
    path: '/hotel/finance/fiscal-compliance',
    icon: Shield,
    label: 'Fiscal Compliance',
  },
  {
    key: 'eracuniTest',
    path: '/hotel/finance/eracuni-test',
    icon: Wifi,
    label: 'Croatian Fiscalization',
  },
  {
    key: 'fiscalizationTest',
    path: '/hotel/finance/fiscalization-test',
    icon: Shield,
    label: 'Fiscalization Test',
  },
];

export default function HotelSidebar() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (!user) return null;

  // Determine current module based on path
  const isFinanceModule = location.pathname.startsWith('/hotel/finance');

  // Get appropriate sidebar items and module info
  const sidebarItems = isFinanceModule ? financeSidebarItems : frontDeskSidebarItems;
  const moduleTitle = isFinanceModule ? 'Finance' : 'Front Desk';
  const moduleSubtitle = isFinanceModule ? 'Croatian e-računi & Finance' : 'Hotel Management';
  const userRole = isFinanceModule ? 'Finance Manager' : 'Front Desk Staff';
  const logoClickPath = isFinanceModule ? '/hotel/finance' : '/hotel/front-desk';

  return (
    <div className="relative flex h-screen w-64 flex-col overflow-hidden border-r border-gray-200 bg-white">
      {/* Background image rotated 90 degrees to the right */}
      <div
        className="absolute inset-0 scale-150 rotate-90 transform opacity-10"
        style={{
          backgroundImage: 'url(/mozaik_gp1.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-blue-50/20 to-indigo-100/20" />

      {/* Content wrapper with relative positioning to appear above background */}
      <div className="relative z-10 flex h-full flex-col">
        <div className="p-6">
          <div className="flex items-center justify-center">
            <button
              className="flex h-20 w-full cursor-pointer items-center justify-center"
              onClick={() => navigate({ to: logoClickPath as '/' })}
            >
              <img
                src="/LOGO1-hires.png"
                alt="Hotel Porec Logo"
                className="h-full w-full object-contain"
              />
            </button>
          </div>

          {/* Module Title */}
          <div className="mt-3 text-center">
            <h2 className="text-lg font-semibold text-gray-900">{moduleTitle}</h2>
            <p className="text-sm text-gray-600">{moduleSubtitle}</p>
          </div>
        </div>

        <nav className="flex-1 space-y-2 px-4">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              (item.path === '/hotel/front-desk' && location.pathname === '/hotel/front-desk') ||
              (item.path === '/hotel/finance' && location.pathname === '/hotel/finance');

            return (
              <Link
                key={item.key}
                to={item.path}
                className={`flex items-center space-x-3 rounded-lg px-4 py-3 transition-colors ${
                  isActive
                    ? 'border-r-2 border-blue-700 bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-200 p-4">
          {/* Back to Module Selector */}
          <Button
            onClick={() => navigate({ to: '/hotel/module-selector' })}
            variant="outline"
            className="mb-4 w-full justify-start"
          >
            <ArrowLeft className="h-4 w-4 flex-shrink-0" />
            <span className="ml-2">Module Selector</span>
          </Button>

          <div className="mb-4 flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium text-gray-900">{user.email}</p>
              <p className="text-sm text-gray-600">{userRole}</p>
            </div>
          </div>

          <div className="mb-3">
            <LanguageSwitcher />
          </div>

          <Button onClick={signOut} variant="outline" className="w-full justify-start">
            <LogOut className="h-4 w-4 flex-shrink-0" />
            <span className="ml-2">{t('navigation.signOut')}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
