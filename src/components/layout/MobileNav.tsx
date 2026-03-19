import React from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import { Button } from '../ui/button';
import { useAuth } from '../auth/AuthProvider';
import { useTranslation } from 'react-i18next';
import {
  Home,
  Package,
  MapPin,
  LogOut,
  UserCheck,
  Globe,
  Settings,
  X,
  Building2,
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
    key: 'moduleSelector',
    path: '/hotel/module-selector',
    icon: Building2,
  },
];

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const { t } = useTranslation();

  if (!user) return null;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="bg-opacity-50 fixed inset-0 z-40 bg-black lg:hidden"
          role="button"
          tabIndex={0}
          aria-label="Close navigation"
          onClick={onClose}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onClose();
          }}
        />
      )}

      {/* Mobile Navigation Panel */}
      <div
        className={`fixed top-0 left-0 z-50 h-full w-80 transform bg-white shadow-xl transition-transform duration-300 ease-in-out lg:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="border-b border-gray-200 p-3">
            <div className="flex items-center justify-between">
              <div className="flex flex-1 items-center justify-center">
                <div className="flex h-12 w-full items-center justify-center">
                  <img
                    src="/LOGO1-hires.png"
                    alt="Hotel Porec Logo"
                    className="h-full w-full object-contain"
                  />
                </div>
              </div>
              <button onClick={onClose} className="rounded-md p-1 text-gray-600 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Navigation and image container */}
          <div className="flex flex-1 flex-col">
            {/* Navigation */}
            <nav className="space-y-1 px-3 py-3">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;

                return (
                  <Link
                    key={item.key}
                    to={item.path}
                    onClick={onClose}
                    className={`flex items-center space-x-3 rounded-lg px-3 py-2 transition-colors ${
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

            {/* Decorative image - flex-1 to push user profile to bottom */}
            <div className="flex flex-1 justify-center px-2">
              <img
                src="/zemlja_gp_crop.webp"
                alt="Decorative landscape"
                className="h-full w-full object-contain opacity-30"
              />
            </div>
          </div>

          {/* User Profile & Sign Out - at bottom */}
          <div className="border-t border-gray-200 p-3">
            <div className="mb-3 flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-gray-500 to-gray-600 text-white">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{user.email}</p>
                <p className="text-sm text-gray-600">User</p>
              </div>
            </div>

            <Button onClick={signOut} variant="outline" className="w-full justify-start">
              <LogOut className="mr-2 h-4 w-4" />
              {t('navigation.signOut')}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
