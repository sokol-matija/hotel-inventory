// FrontDeskV2Layout - Clean front desk module layout
import React, { useState } from 'react';
import { Card, CardContent } from '../../ui/card';
import { Button } from '../../ui/button';
import { 
  Users, 
  Calendar,
  FileText,
  Settings,
  ArrowLeft,
  Sparkles
} from 'lucide-react';
import { GuestProvider } from '../../../lib/hotel/contexts/GuestContext';
import GuestsPageV2 from './pages/GuestsPageV2';

type TabType = 'guests' | 'bookings' | 'timeline' | 'reports';

interface FrontDeskV2LayoutProps {
  onBackToLegacy?: () => void;
}

export default function FrontDeskV2Layout({ onBackToLegacy }: FrontDeskV2LayoutProps) {
  const [activeTab, setActiveTab] = useState<TabType>('guests');

  const tabs = [
    {
      id: 'guests' as TabType,
      label: 'Guests',
      icon: Users,
      component: <GuestsPageV2 />,
      description: 'Manage guest profiles and information',
    },
    {
      id: 'bookings' as TabType,
      label: 'Bookings',
      icon: Calendar,
      component: <div className="p-6"><p className="text-gray-500">Clean booking management coming soon...</p></div>,
      description: 'Create and manage reservations',
    },
    {
      id: 'timeline' as TabType,
      label: 'Timeline',
      icon: Calendar,
      component: <div className="p-6"><p className="text-gray-500">Clean timeline view coming soon...</p></div>,
      description: 'Visual timeline of reservations',
    },
    {
      id: 'reports' as TabType,
      label: 'Reports',
      icon: FileText,
      component: <div className="p-6"><p className="text-gray-500">Clean reports coming soon...</p></div>,
      description: 'Analytics and reporting',
    },
  ];

  const activeTabData = tabs.find(tab => tab.id === activeTab);

  return (
    <GuestProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b shadow-sm">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {onBackToLegacy && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onBackToLegacy}
                    className="flex items-center gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Legacy
                  </Button>
                )}
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Sparkles className="h-6 w-6 text-blue-500" />
                    Front Desk V2
                  </h1>
                  <p className="text-gray-600 text-sm">
                    Modern, clean hotel management with proper Supabase integration
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                  CLEAN ARCHITECTURE
                </div>
                <div className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                  NO LEGACY DEPENDENCIES
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="px-6">
            <div className="flex space-x-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium rounded-t-lg transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTabData?.component}
        </div>

        {/* Footer */}
        <div className="bg-white border-t px-6 py-3">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div>
              {activeTabData && (
                <span>{activeTabData.description}</span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <span>✨ Clean Architecture</span>
              <span>•</span>
              <span>🚀 Modern React</span>
              <span>•</span>
              <span>🗄️ Supabase</span>
            </div>
          </div>
        </div>
      </div>
    </GuestProvider>
  );
}