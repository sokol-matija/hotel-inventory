import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { useTranslation } from 'react-i18next';
import { 
  BarChart3, 
  Hotel, 
  CreditCard, 
  Package,
  ArrowRight
} from 'lucide-react';

interface ModuleCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  available: boolean;
  priority?: string;
}

function ModuleCard({ title, description, icon, onClick, available, priority }: ModuleCardProps) {
  return (
    <Card 
      className={`relative transition-all duration-300 cursor-pointer ${
        available 
          ? 'hover:shadow-lg hover:-translate-y-1 border-blue-200 hover:border-blue-300' 
          : 'opacity-60 cursor-not-allowed border-gray-200'
      }`}
      onClick={available ? onClick : undefined}
    >
      {priority && (
        <div className="absolute top-3 right-3 bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
          {priority}
        </div>
      )}
      <CardHeader className="pb-4">
        <div className="flex items-center space-x-3">
          <div className={`p-3 rounded-lg ${
            available ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-400'
          }`}>
            {icon}
          </div>
          <CardTitle className="text-lg">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 mb-4">{description}</p>
        <div className="flex justify-end">
          {available ? (
            <Button variant="outline" size="sm" className="group">
              Open
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          ) : (
            <span className="text-sm text-gray-400">Coming Soon</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ModuleSelector() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const modules = [
    {
      key: 'channelManager',
      title: 'Channel Manager',
      description: 'Manage bookings from multiple platforms in one place',
      icon: <BarChart3 className="h-6 w-6" />,
      available: false,
      onClick: () => navigate('/hotel/channel-manager')
    },
    {
      key: 'frontDesk',
      title: 'Front Desk',
      description: 'Interactive calendar, reservations, and guest management',
      icon: <Hotel className="h-6 w-6" />,
      available: true,
      priority: 'Priority 1',
      onClick: () => navigate('/hotel/front-desk')
    },
    {
      key: 'finance',
      title: 'Finance',
      description: 'Croatian fiscal e-računi and financial management',
      icon: <CreditCard className="h-6 w-6" />,
      available: true,
      onClick: () => navigate('/hotel/finance')
    },
    {
      key: 'inventory',
      title: 'Inventory',
      description: 'Current inventory management system',
      icon: <Package className="h-6 w-6" />,
      available: true,
      onClick: () => navigate('/dashboard')
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 relative overflow-hidden">
      {/* Background image - same as login screen */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: 'url(/zemlja_gp copy.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6">
        {/* Hotel Logo and Welcome */}
        <div className="text-center mb-12">
          <div className="mb-6">
            <img 
              src="/LOGO1-hires.png" 
              alt="Hotel Porec Logo" 
              className="w-32 h-20 mx-auto object-contain"
            />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Welcome to Hotel Porec!
          </h1>
          <p className="text-xl text-gray-600">
            Select a module to continue
          </p>
        </div>

        {/* Module Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl w-full">
          {modules.map((module) => (
            <ModuleCard
              key={module.key}
              title={module.title}
              description={module.description}
              icon={module.icon}
              onClick={module.onClick}
              available={module.available}
              priority={module.priority}
            />
          ))}
        </div>

        {/* Hotel Info Footer */}
        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>Hotel Porec • 52440 Poreč, Croatia • +385(0)52/451 611</p>
          <p>hotelporec@pu.t-com.hr • www.hotelporec.com</p>
        </div>
      </div>
    </div>
  );
}