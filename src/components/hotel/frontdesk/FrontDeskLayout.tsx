import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { ArrowLeft, Calendar, Users, CreditCard } from 'lucide-react';

export default function FrontDeskLayout() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              onClick={() => navigate('/hotel/module-selector')}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Modules</span>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Front Desk</h1>
              <p className="text-gray-600">Hotel Porec Management System</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <img 
              src="/LOGO1-hires.png" 
              alt="Hotel Porec" 
              className="w-16 h-10 object-contain"
            />
          </div>
        </div>

        {/* Placeholder Content */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                <span>Calendar View</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Interactive 14-day calendar with 46 Hotel Porec rooms, drag & drop reservations
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Coming Soon:</p>
                <ul className="text-sm text-gray-600 mt-2 space-y-1">
                  <li>• Floor grouping (1-3 + Rooftop)</li>
                  <li>• 6 reservation status colors</li>
                  <li>• Drag & drop functionality</li>
                  <li>• Room 401 premium styling</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-green-600" />
                <span>Guest Management</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Guest profiles, reservations, and check-in/check-out management
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Coming Soon:</p>
                <ul className="text-sm text-gray-600 mt-2 space-y-1">
                  <li>• Guest autocomplete by lastname</li>
                  <li>• Reservation creation forms</li>
                  <li>• Check-in/check-out process</li>
                  <li>• Special requests & notes</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5 text-purple-600" />
                <span>Pricing & Payments</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Croatian tourism tax, seasonal pricing, and payment processing
              </p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Coming Soon:</p>
                <ul className="text-sm text-gray-600 mt-2 space-y-1">
                  <li>• Seasonal rates (A/B/C/D periods)</li>
                  <li>• Tourism tax €1.10-€1.50</li>
                  <li>• Children discounts</li>
                  <li>• PDF invoice generation</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Hotel Porec Room Info */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Hotel Porec - Room Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">15</div>
                <div className="text-sm text-gray-600">Floor 1 Rooms</div>
                <div className="text-xs text-gray-500">101-115</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">15</div>
                <div className="text-sm text-gray-600">Floor 2 Rooms</div>
                <div className="text-xs text-gray-500">201-215</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">15</div>
                <div className="text-sm text-gray-600">Floor 3 Rooms</div>
                <div className="text-xs text-gray-500">301-315</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">1</div>
                <div className="text-sm text-gray-600">Rooftop Suite</div>
                <div className="text-xs text-gray-500">401 Premium</div>
              </div>
            </div>
            <div className="mt-4 text-center text-gray-500 text-sm">
              Total: 46 Rooms • Ready for calendar implementation
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}