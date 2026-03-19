import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { TrendingUp, Calendar, DollarSign, BarChart3, PieChart, Download } from 'lucide-react';
import { RevenueAnalytics } from '../../../lib/hotel/types';
import { subDays, startOfMonth, endOfMonth } from 'date-fns';

export default function RevenueAnalyticsPage() {
  // calculateRevenueAnalytics is a stub — returns zeros (not yet implemented)
  const calculateRevenueAnalytics = (
    period: 'daily' | 'weekly' | 'monthly' | 'yearly',
    startDate: Date,
    endDate: Date
  ): RevenueAnalytics => ({
    period,
    startDate,
    endDate,
    totalRevenue: 0,
    totalBookings: 0,
    roomRevenue: 0,
    taxRevenue: 0,
    additionalRevenue: 0,
    vatCollected: 0,
    tourismTaxCollected: 0,
    directBookings: 0,
    bookingComRevenue: 0,
    otherSourcesRevenue: 0,
    cashPayments: 0,
    cardPayments: 0,
    bankTransfers: 0,
    onlinePayments: 0,
    totalInvoices: 0,
    averageBookingValue: 0,
    occupancyRate: 0,
    fiscalReportsGenerated: 0,
    fiscalSubmissions: 0,
    periods: [],
  });
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>(
    'monthly'
  );

  const today = new Date();
  const thisMonth = calculateRevenueAnalytics('monthly', startOfMonth(today), endOfMonth(today));
  const lastMonth = calculateRevenueAnalytics(
    'monthly',
    startOfMonth(subDays(today, 30)),
    endOfMonth(subDays(today, 30))
  );

  const growthRate =
    lastMonth.totalRevenue > 0
      ? ((thisMonth.totalRevenue - lastMonth.totalRevenue) / lastMonth.totalRevenue) * 100
      : 0;

  return (
    <div className="mx-auto max-w-7xl p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Revenue Analytics</h1>
          <p className="mt-1 text-gray-600">
            Comprehensive financial reporting and business intelligence
          </p>
        </div>
        <div className="mt-4 flex space-x-3 sm:mt-0">
          <select
            value={selectedPeriod}
            onChange={(e) =>
              setSelectedPeriod(e.target.value as 'daily' | 'weekly' | 'monthly' | 'yearly')
            }
            className="rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">This Month Revenue</p>
                <p className="text-2xl font-bold text-green-600">
                  €{thisMonth.totalRevenue.toFixed(2)}
                </p>
                <p className="mt-1 flex items-center text-xs text-green-600">
                  <TrendingUp className="mr-1 h-3 w-3" />
                  {growthRate >= 0 ? '+' : ''}
                  {growthRate.toFixed(1)}% vs last month
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Average Booking Value</p>
                <p className="text-2xl font-bold text-blue-600">
                  €{thisMonth.averageBookingValue.toFixed(2)}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {thisMonth.totalInvoices} bookings this month
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">VAT Collected</p>
                <p className="text-2xl font-bold text-purple-600">
                  €{thisMonth.vatCollected.toFixed(2)}
                </p>
                <p className="mt-1 text-xs text-gray-500">25% Croatian VAT</p>
              </div>
              <PieChart className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tourism Tax</p>
                <p className="text-2xl font-bold text-orange-600">
                  €{thisMonth.tourismTaxCollected.toFixed(2)}
                </p>
                <p className="mt-1 text-xs text-gray-500">€1.10-1.50 per person/night</p>
              </div>
              <Calendar className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Breakdown */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Room Revenue</span>
                <span className="font-semibold">€{thisMonth.roomRevenue.toFixed(2)}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-blue-600"
                  style={{ width: `${(thisMonth.roomRevenue / thisMonth.totalRevenue) * 100}%` }}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Tax Revenue</span>
                <span className="font-semibold">€{thisMonth.taxRevenue.toFixed(2)}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-purple-600"
                  style={{ width: `${(thisMonth.taxRevenue / thisMonth.totalRevenue) * 100}%` }}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Additional Services</span>
                <span className="font-semibold">€{thisMonth.additionalRevenue.toFixed(2)}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-200">
                <div
                  className="h-2 rounded-full bg-green-600"
                  style={{
                    width: `${(thisMonth.additionalRevenue / thisMonth.totalRevenue) * 100}%`,
                  }}
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
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Cash Payments</span>
                <span className="font-semibold">€{thisMonth.cashPayments.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Card Payments</span>
                <span className="font-semibold">€{thisMonth.cardPayments.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">Bank Transfers</span>
                <span className="font-semibold">€{thisMonth.bankTransfers.toFixed(2)}</span>
              </div>

              <div className="flex items-center justify-between">
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
          <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50">
            <div className="text-center">
              <BarChart3 className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <p className="text-gray-500">Interactive revenue chart will be displayed here</p>
              <p className="mt-2 text-sm text-gray-400">
                Integration with charting library pending
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
