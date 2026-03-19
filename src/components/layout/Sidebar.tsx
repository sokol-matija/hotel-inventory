import React from 'react';
import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import { Button } from '../ui/button';
import { useAuth } from '../auth/AuthProvider';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../ui/LanguageSwitcher';
import {
  Home,
  Package,
  MapPin,
  LogOut,
  UserCheck,
  Globe,
  Settings,
  Building2,
  ShoppingCart,
  TestTube,
} from 'lucide-react';

const sidebarItems = [
  {
    key: 'dashboard',
    path: '/dashboard',
    icon: Home,
  },
  {
    key: 'locations',
    path: '/locations',
    icon: MapPin,
  },
  {
    key: 'items',
    path: '/items',
    icon: Package,
  },
  {
    key: 'orders',
    path: '/orders',
    icon: ShoppingCart,
  },
  {
    key: 'globalView',
    path: '/global',
    icon: Globe,
  },
  {
    key: 'settings',
    path: '/settings',
    icon: Settings,
  },
  {
    key: 'adminTesting',
    path: '/admin/testing',
    icon: TestTube,
  },
  {
    key: 'moduleSelector',
    path: '/hotel/module-selector',
    icon: Building2,
  },
];

export default function Sidebar() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (!user) return null;

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
            <div
              className="flex h-20 w-full cursor-pointer items-center justify-center"
              onClick={() => navigate({ to: '/dashboard' })}
            >
              <img
                src="/LOGO1-hires.png"
                alt="Hotel Porec Logo"
                className="h-full w-full object-contain"
              />
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-2 px-4">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

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
                <Icon className="h-5 w-5" />
                <span className="font-medium">{t(`navigation.${item.key}`)}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-200 p-4">
          <div className="mb-4 flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-gray-500 to-gray-600 text-white">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium text-gray-900">{user.email}</p>
              <p className="text-sm text-gray-600">User</p>
            </div>
          </div>

          <div className="mb-3">
            <LanguageSwitcher />
          </div>

          <Button onClick={signOut} variant="outline" className="w-full justify-start">
            <LogOut className="mr-2 h-4 w-4" />
            {t('navigation.signOut')}
          </Button>
        </div>
      </div>
    </div>
  );
}
