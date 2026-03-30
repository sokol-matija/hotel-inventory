import React from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import {
  Hotel,
  CreditCard,
  Package,
  Settings,
  ArrowRight,
  QrCode,
  ExternalLink,
  Globe,
} from 'lucide-react';

interface ModuleCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  available: boolean;
  priority?: string;
  external?: boolean;
}

function ModuleCard({
  title,
  description,
  icon,
  onClick,
  available,
  priority,
  external,
}: ModuleCardProps) {
  return (
    <Card
      className={`relative cursor-pointer transition-all duration-300 ${
        available
          ? 'border-blue-200 hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg'
          : 'cursor-not-allowed border-gray-200 opacity-60'
      }`}
      onClick={available ? onClick : undefined}
    >
      {priority && (
        <div className="absolute top-3 right-3 rounded-full bg-blue-600 px-2 py-1 text-xs text-white">
          {priority}
        </div>
      )}
      <CardHeader className="pb-4">
        <div className="flex items-center space-x-3">
          <div
            className={`rounded-lg p-3 ${
              available ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-400'
            }`}
          >
            {icon}
          </div>
          <CardTitle className="text-lg">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-gray-600">{description}</p>
        <div className="flex justify-end">
          {available ? (
            <Button variant="outline" size="sm" className="group">
              Open
              {external ? (
                <ExternalLink className="ml-2 h-4 w-4" />
              ) : (
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              )}
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

  const modules = [
    {
      key: 'frontDesk',
      title: 'Front Desk',
      description: 'Interactive calendar, reservations, and guest management',
      icon: <Hotel className="h-6 w-6" />,
      available: true,
      onClick: () => navigate({ to: '/hotel/front-desk' }),
    },
    {
      key: 'finance',
      title: 'Finance',
      description: 'Croatian fiscal e-računi and financial management',
      icon: <CreditCard className="h-6 w-6" />,
      available: true,
      onClick: () => navigate({ to: '/hotel/finance' }),
    },
    {
      key: 'inventory',
      title: 'Inventory',
      description: 'Current inventory management system',
      icon: <Package className="h-6 w-6" />,
      available: true,
      onClick: () => navigate({ to: '/dashboard' }),
    },
    {
      key: 'admin',
      title: 'Admin',
      description: 'System testing, printer, email and fiscalization tools',
      icon: <Settings className="h-6 w-6" />,
      available: true,
      onClick: () => navigate({ to: '/hotel/admin' }),
    },
    {
      key: 'guestInfo',
      title: 'Guest Info',
      description: 'QR code landing page with hotel info for guests',
      icon: <QrCode className="h-6 w-6" />,
      available: true,
      external: true,
      onClick: () => window.open('https://hotel-porec-qr.vercel.app/en', '_blank'),
    },
    {
      key: 'hotelWebsite',
      title: 'Hotel Website',
      description: 'Public hotel frontend website',
      icon: <Globe className="h-6 w-6" />,
      available: true,
      external: true,
      onClick: () => window.open('https://hotel-frontend-gamma.vercel.app', '_blank'),
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Background image - same as login screen */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: 'url(/zemlja_gp_copy.webp)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />

      {/* Content */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center p-6">
        {/* Hotel Logo and Welcome */}
        <div className="mb-12 text-center">
          <div className="mb-6">
            <img
              src="/LOGO1-hires.png"
              alt="Hotel Porec Logo"
              className="mx-auto h-20 w-32 object-contain"
            />
          </div>
          <h1 className="mb-2 text-4xl font-bold text-gray-900">Welcome to Hotel Porec!</h1>
          <p className="text-xl text-gray-600">Select a module to continue</p>
        </div>

        {/* Module Cards Grid */}
        <div className="grid w-full max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
          {modules.map((module) => (
            <ModuleCard
              key={module.key}
              title={module.title}
              description={module.description}
              icon={module.icon}
              onClick={module.onClick}
              available={module.available}
              priority={module.priority}
              external={module.external}
            />
          ))}
        </div>

        {/* Hotel Info Footer */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>Hotel Porec • 52440 Poreč, Croatia • +385(0)52/451 611</p>
          <p>hotelporec@pu.t-com.hr • www.hotelporec.com</p>
        </div>
      </div>
    </div>
  );
}
