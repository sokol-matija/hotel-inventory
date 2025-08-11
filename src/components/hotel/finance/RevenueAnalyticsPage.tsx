import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  BarChart3,
  PieChart,
  Download
} from 'lucide-react';
import { useHotel } from '../../../lib/hotel/state/SupabaseHotelContext';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';

export default function RevenueAnalyticsPage() {
  const { calculateRevenueAnalytics, getTotalRevenue } = useHotel();
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');

  const today = new Date();
  const thisMonth = calculateRevenueAnalytics('monthly', startOfMonth(today), endOfMonth(today));
  const lastMonth = calculateRevenueAnalytics('monthly', startOfMonth(subDays(today, 30)), endOfMonth(subDays(today, 30)));
  
  const totalRevenueThisMonth = getTotalRevenue(startOfMonth(today), today);
  const totalRevenueLast30Days = getTotalRevenue(subDays(today, 30), today);

  const growthRate = lastMonth.totalRevenue > 0 
    ? ((thisMonth.totalRevenue - lastMonth.totalRevenue) / lastMonth.totalRevenue) * 100 
    : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Revenue Analytics</h1>
          <p className="text-gray-600 mt-1">
            Comprehensive financial reporting and business intelligence
          </p>
        </div>
        <div className="flex space-x-3 mt-4 sm:mt-0">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as any)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">This Month Revenue</p>
                <p className="text-2xl font-bold text-green-600">€{thisMonth.totalRevenue.toFixed(2)}</p>
                <p className="text-xs text-green-600 mt-1 flex items-center">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {growthRate >= 0 ? '+' : ''}{growthRate.toFixed(1)}% vs last month
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Average Booking Value</p>
                <p className="text-2xl font-bold text-blue-600">€{thisMonth.averageBookingValue.toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {thisMonth.totalInvoices} bookings this month
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">VAT Collected</p>
                <p className="text-2xl font-bold text-purple-600">€{thisMonth.vatCollected.toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  25% Croatian VAT
                </p>
              </div>
              <PieChart className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tourism Tax</p>
                <p className="text-2xl font-bold text-orange-600">€{thisMonth.tourismTaxCollected.toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-1">
                  €1.10-1.50 per person/night
                </p>
              </div>
              <Calendar className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Room Revenue</span>
                <span className="font-semibold">€{thisMonth.roomRevenue.toFixed(2)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${(thisMonth.roomRevenue / thisMonth.totalRevenue) * 100}%` }}
                />
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Tax Revenue</span>
                <span className="font-semibold">€{thisMonth.taxRevenue.toFixed(2)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full" 
                  style={{ width: `${(thisMonth.taxRevenue / thisMonth.totalRevenue) * 100}%` }}
                />
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Additional Services</span>
                <span className="font-semibold">€{thisMonth.additionalRevenue.toFixed(2)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full" 
                  style={{ width: `${(thisMonth.additionalRevenue / thisMonth.totalRevenue) * 100}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Cash Payments</span>
                <span className="font-semibold">€{thisMonth.cashPayments.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Card Payments</span>
                <span className="font-semibold">€{thisMonth.cardPayments.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Bank Transfers</span>
                <span className="font-semibold">€{thisMonth.bankTransfers.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Online Payments</span>
                <span className="font-semibold">€{thisMonth.onlinePayments.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Interactive revenue chart will be displayed here</p>
              <p className="text-sm text-gray-400 mt-2">Integration with charting library pending</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}