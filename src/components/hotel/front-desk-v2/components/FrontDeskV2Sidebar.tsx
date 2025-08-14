// FrontDeskV2Sidebar - Clean, dedicated sidebar for Front Desk V2 module
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../../../ui/button';
import { useAuth } from '../../../auth/AuthProvider';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../../../ui/LanguageSwitcher';
import { 
  Calendar,
  Users, 
  CreditCard, 
  FileText,
  LogOut,
  ArrowLeft,
  Sparkles,
  Home,
  Settings,
  BarChart3,
  Clock
} from 'lucide-react';

const frontDeskV2Items = [
  { 
    key: 'dashboard', 
    path: '/hotel/front-desk-v2', 
    icon: Home,
    label: 'Dashboard'
  },
  { 
    key: 'timeline', 
    path: '/hotel/front-desk-v2/timeline', 
    icon: Calendar,
    label: 'Timeline'
  },
  { 
    key: 'guests', 
    path: '/hotel/front-desk-v2/guests', 
    icon: Users,
    label: 'Guests'
  },
  { 
    key: 'reservations', 
    path: '/hotel/front-desk-v2/reservations', 
    icon: Clock,
    label: 'Reservations'
  },
  { 
    key: 'payments', 
    path: '/hotel/front-desk-v2/payments', 
    icon: CreditCard,
    label: 'Payments'
  },
  { 
    key: 'reports', 
    path: '/hotel/front-desk-v2/reports', 
    icon: BarChart3,
    label: 'Reports'
  },
  { 
    key: 'settings', 
    path: '/hotel/front-desk-v2/settings', 
    icon: Settings,
    label: 'Settings'
  }
];

export default function FrontDeskV2Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const { t } = useTranslation();

  const handleBackToModules = () => {
    navigate('/hotel/module-selector');
  };

  const handleLogout = () => {
    signOut();
  };

  return (
    <div className="flex flex-col h-full w-64 bg-white shadow-lg border-r">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center space-x-3 mb-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Sparkles className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Front Desk V2</h1>
            <p className="text-xs text-gray-500">Clean Architecture</p>
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBackToModules}
          className="w-full justify-start text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Modules
        </Button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-4 space-y-1">
        {frontDeskV2Items.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <button
              key={item.key}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t bg-gray-50">
        <div className="space-y-3">
          {/* Language Switcher */}
          <div className="flex justify-center">
            <LanguageSwitcher />
          </div>

          {/* Status Badge */}
          <div className="flex justify-center">
            <div className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
              Clean & Modern
            </div>
          </div>

          {/* Logout Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4 mr-2" />
            {t('auth.logout', 'Logout')}
          </Button>
        </div>
      </div>
    </div>
  );
}