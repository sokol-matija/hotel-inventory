// Channel Manager Dashboard - OTA channel monitoring and management
// Comprehensive dashboard for Phobs integration with real-time status updates

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../ui/card';
import { Button } from '../../../ui/button';
import { Badge } from '../../../ui/badge';
import { 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  Settings, 
  Users, 
  Wifi,
  WifiOff,
  Euro,
  AlertCircle,
  ArrowUp
} from 'lucide-react';
import { PhobsChannelManagerService } from '../../../../lib/hotel/services/PhobsChannelManagerService';
import { PhobsReservationSyncService } from '../../../../lib/hotel/services/PhobsReservationSyncService';
import { PhobsInventoryService } from '../../../../lib/hotel/services/PhobsInventoryService';
import { PhobsMonitoringService } from '../../../../lib/hotel/services/PhobsMonitoringService';
import { PhobsErrorHandlingService } from '../../../../lib/hotel/services/PhobsErrorHandlingService';
import { 
  ChannelManagerStatus, 
  OTAChannel, 
  ConflictResolution 
} from '../../../../lib/hotel/services/phobsTypes';
import {
  ChannelStatusCard,
  ConflictIndicator,
  SyncProgress,
  PerformanceMetrics,
  ErrorDetails,
  SyncStatus
} from './StatusIndicators';

interface ChannelStatusData {
  channel: OTAChannel;
  displayName: string;
  status: 'active' | 'inactive' | 'error' | 'syncing';
  lastSync: Date | null;
  totalBookings: number;
  revenue: number;
  errorCount: number;
  commission: number;
}

interface RecentReservation {
  id: string;
  guestName: string;
  channel: OTAChannel;
  checkIn: Date;
  checkOut: Date;
  roomNumber: string;
  totalAmount: number;
  status: string;
  bookingReference: string;
  createdAt: Date;
}

export default function ChannelManagerDashboard() {
  const navigate = useNavigate();
  const [channelManagerStatus, setChannelManagerStatus] = useState<ChannelManagerStatus | null>(null);
  const [channelData, setChannelData] = useState<ChannelStatusData[]>([]);
  const [recentReservations, setRecentReservations] = useState<RecentReservation[]>([]);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [activeConflicts, setActiveConflicts] = useState<ConflictResolution[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [performanceMetrics, setPerformanceMetrics] = useState({
    successRate: 95.2,
    averageResponseTime: 1250,
    operationsPerMinute: 12,
    errorRate: 4.8,
    trend: 'stable' as 'stable' | 'up' | 'down'
  });
  const [activeSyncOperations, setActiveSyncOperations] = useState<Array<{
    id: string;
    operation: string;
    progress: number;
    currentStep?: string;
  }>>([]);
  const [recentErrors, setRecentErrors] = useState<any[]>([]);

  // Services
  const channelManagerService = PhobsChannelManagerService.getInstance();
  const reservationSyncService = PhobsReservationSyncService.getInstance();
  const inventoryService = PhobsInventoryService.getInstance();
  const monitoringService = PhobsMonitoringService.getInstance();
  const errorHandlingService = PhobsErrorHandlingService.getInstance();

  useEffect(() => {
    loadDashboardData();
    
    // Set up auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadDashboardData();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load channel manager status
      const status = channelManagerService.getStatus();
      setChannelManagerStatus(status);

      // Load channel data (mock data for now)
      const channels = await loadChannelStatusData();
      setChannelData(channels);

      // Load recent reservations (mock data for now)
      const reservations = await loadRecentReservations();
      setRecentReservations(reservations);

      // Load sync status
      const syncStat = reservationSyncService.getSyncStatus();
      setSyncStatus(syncStat);

      // Load active conflicts
      const conflicts = reservationSyncService.getActiveConflicts();
      setActiveConflicts(conflicts);

      // Load performance metrics
      const healthMetrics = monitoringService.getSystemHealthMetrics();
      const errorMetrics = errorHandlingService.getMetrics();
      
      setPerformanceMetrics({
        successRate: healthMetrics.errorRate > 0 ? 100 - healthMetrics.errorRate : 100,
        averageResponseTime: healthMetrics.averageResponseTime || 1200,
        operationsPerMinute: healthMetrics.operationsPerMinute || 0,
        errorRate: healthMetrics.errorRate || 0,
        trend: healthMetrics.errorRate > 10 ? 'down' : healthMetrics.errorRate < 2 ? 'up' : 'stable'
      });

      // Load recent errors
      const recentLogs = monitoringService.getRecentLogs(5, 2); // ERROR level and above
      setRecentErrors(recentLogs);

      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadChannelStatusData = async (): Promise<ChannelStatusData[]> => {
    // Mock data - in production this would come from the database
    return [
      {
        channel: 'booking.com',
        displayName: 'Booking.com',
        status: 'active',
        lastSync: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
        totalBookings: 156,
        revenue: 28450.75,
        errorCount: 0,
        commission: 0.15
      },
      {
        channel: 'expedia',
        displayName: 'Expedia',
        status: 'active',
        lastSync: new Date(Date.now() - 8 * 60 * 1000), // 8 minutes ago
        totalBookings: 89,
        revenue: 16780.50,
        errorCount: 1,
        commission: 0.18
      },
      {
        channel: 'airbnb',
        displayName: 'Airbnb',
        status: 'syncing',
        lastSync: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
        totalBookings: 203,
        revenue: 35690.25,
        errorCount: 0,
        commission: 0.14
      },
      {
        channel: 'agoda',
        displayName: 'Agoda',
        status: 'active',
        lastSync: new Date(Date.now() - 12 * 60 * 1000), // 12 minutes ago
        totalBookings: 67,
        revenue: 12350.00,
        errorCount: 0,
        commission: 0.16
      },
      {
        channel: 'hotels.com',
        displayName: 'Hotels.com',
        status: 'error',
        lastSync: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
        totalBookings: 34,
        revenue: 6890.75,
        errorCount: 3,
        commission: 0.17
      }
    ];
  };

  const loadRecentReservations = async (): Promise<RecentReservation[]> => {
    // Mock data - in production this would come from the database
    return [
      {
        id: '1',
        guestName: 'John Smith',
        channel: 'booking.com',
        checkIn: new Date('2025-08-20'),
        checkOut: new Date('2025-08-23'),
        roomNumber: '301',
        totalAmount: 456.75,
        status: 'confirmed',
        bookingReference: 'BDC-789456123',
        createdAt: new Date(Date.now() - 15 * 60 * 1000)
      },
      {
        id: '2',
        guestName: 'Maria Rodriguez',
        channel: 'airbnb',
        checkIn: new Date('2025-08-18'),
        checkOut: new Date('2025-08-21'),
        roomNumber: '205',
        totalAmount: 567.50,
        status: 'confirmed',
        bookingReference: 'ABB-HM567891',
        createdAt: new Date(Date.now() - 32 * 60 * 1000)
      },
      {
        id: '3',
        guestName: 'Hans Mueller',
        channel: 'expedia',
        checkIn: new Date('2025-08-25'),
        checkOut: new Date('2025-08-28'),
        roomNumber: '401',
        totalAmount: 789.25,
        status: 'confirmed',
        bookingReference: 'EXP-234567890',
        createdAt: new Date(Date.now() - 48 * 60 * 1000)
      }
    ];
  };

  const handleManualSync = async () => {
    try {
      setLoading(true);
      // Trigger manual sync of all channels
      await loadDashboardData();
      alert('Manual sync completed successfully!');
    } catch (error) {
      console.error('Manual sync error:', error);
      alert('Manual sync failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'syncing': return 'text-blue-600 bg-blue-100';
      case 'error': return 'text-red-600 bg-red-100';
      case 'inactive': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4" />;
      case 'syncing': return <RefreshCw className="h-4 w-4 animate-spin" />;
      case 'error': return <AlertTriangle className="h-4 w-4" />;
      case 'inactive': return <WifiOff className="h-4 w-4" />;
      default: return <WifiOff className="h-4 w-4" />;
    }
  };

  const convertToSyncStatus = (status: string): SyncStatus => {
    switch (status) {
      case 'active': return 'success';
      case 'syncing': return 'syncing';
      case 'error': return 'error';
      case 'inactive': return 'disconnected';
      default: return 'idle';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('hr-HR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatTime = (date: Date | null) => {
    if (!date) return 'Never';
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
      Math.floor((date.getTime() - Date.now()) / (1000 * 60)),
      'minute'
    );
  };

  if (loading && !channelManagerStatus) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin" />
          <span>Loading channel manager data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Channel Manager</h1>
          <p className="text-gray-600">Monitor and manage OTA channel integrations</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-500">
            Last updated: {formatTime(lastRefresh)}
          </div>
          <Button onClick={handleManualSync} disabled={loading} className="flex items-center space-x-2">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
          <Button 
            variant="outline" 
            onClick={() => navigate('/hotel/front-desk/channel-manager/settings')}
            className="flex items-center space-x-2"
          >
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </Button>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Connection Status</CardTitle>
            {channelManagerStatus?.isConnected ? 
              <Wifi className="h-4 w-4 text-green-600" /> : 
              <WifiOff className="h-4 w-4 text-red-600" />
            }
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {channelManagerStatus?.isConnected ? 'Connected' : 'Disconnected'}
            </div>
            <p className="text-xs text-gray-600">
              {channelManagerStatus?.activeChannels || 0} of {channelManagerStatus?.totalChannels || 0} channels active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Reservations</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{channelManagerStatus?.totalReservations || 0}</div>
            <p className="text-xs text-gray-600">
              <span className="text-green-600 flex items-center">
                <ArrowUp className="h-3 w-3 mr-1" />
                +12% from last month
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue (30 days)</CardTitle>
            <Euro className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(channelData.reduce((sum, channel) => sum + channel.revenue, 0))}
            </div>
            <p className="text-xs text-gray-600">
              <span className="text-green-600 flex items-center">
                <ArrowUp className="h-3 w-3 mr-1" />
                +8.2% from last month
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sync Errors</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{channelManagerStatus?.syncErrors || 0}</div>
            <p className="text-xs text-gray-600">
              {activeConflicts.length} active conflicts
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Conflicts Section */}
      {activeConflicts.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <span>Active Conflicts ({activeConflicts.length})</span>
          </h2>
          <div className="space-y-3">
            {activeConflicts.slice(0, 5).map((conflict) => (
              <ConflictIndicator
                key={conflict.conflictId}
                severity={conflict.severity as any}
                conflictType={conflict.type}
                affectedItems={conflict.affectedReservations?.length || 1}
                autoResolvable={conflict.autoResolvable}
                onResolve={() => {
                  // Handle conflict resolution
                  console.log(`Resolving conflict: ${conflict.conflictId}`);
                }}
                onView={() => {
                  // View conflict details
                  console.log(`Viewing conflict: ${conflict.conflictId}`);
                }}
              />
            ))}
            {activeConflicts.length > 5 && (
              <div className="text-center py-2">
                <Button variant="outline">
                  View All {activeConflicts.length} Conflicts
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Performance Metrics */}
      <PerformanceMetrics
        successRate={performanceMetrics.successRate}
        averageResponseTime={performanceMetrics.averageResponseTime}
        operationsPerMinute={performanceMetrics.operationsPerMinute}
        errorRate={performanceMetrics.errorRate}
        trend={performanceMetrics.trend}
      />

      {/* Active Sync Operations */}
      {activeSyncOperations.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Active Sync Operations</h2>
          {activeSyncOperations.map((operation) => (
            <SyncProgress
              key={operation.id}
              operation={operation.operation}
              progress={operation.progress}
              currentStep={operation.currentStep}
            />
          ))}
        </div>
      )}

      {/* Recent Errors */}
      {recentErrors.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Recent Errors</h2>
          {recentErrors.slice(0, 3).map((error, index) => (
            <ErrorDetails
              key={index}
              error={error}
              onRetry={() => {
                // Handle retry logic
                setRecentErrors(prev => prev.filter((_, i) => i !== index));
              }}
              onDismiss={() => {
                setRecentErrors(prev => prev.filter((_, i) => i !== index));
              }}
            />
          ))}
        </div>
      )}

      {/* Enhanced Channel Status Grid */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">OTA Channel Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {channelData.map((channel) => (
            <ChannelStatusCard
              key={channel.channel}
              channel={channel.channel}
              status={convertToSyncStatus(channel.status)}
              lastSync={channel.lastSync || undefined}
              errorCount={channel.errorCount}
              reservationCount={channel.totalBookings}
              responseTime={Math.floor(Math.random() * 2000) + 800} // Mock response time
              onViewDetails={() => {
                // Navigate to channel details
                console.log(`View details for ${channel.channel}`);
              }}
            />
          ))}
        </div>
      </div>

      {/* Recent Reservations */}
      <Card>
        <CardHeader>
          <CardTitle>Recent OTA Reservations</CardTitle>
          <CardDescription>Latest bookings from all channels</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentReservations.map((reservation) => (
              <div key={reservation.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">{reservation.channel}</Badge>
                    <span className="font-medium">{reservation.guestName}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    Room {reservation.roomNumber} • {reservation.checkIn.toLocaleDateString()} - {reservation.checkOut.toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(reservation.totalAmount)}</div>
                    <div className="text-sm text-gray-600">{reservation.bookingReference}</div>
                  </div>
                  <Badge className={getStatusColor(reservation.status)}>
                    {reservation.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sync Status */}
      <Card>
        <CardHeader>
          <CardTitle>Synchronization Status</CardTitle>
          <CardDescription>Current sync operations and queue status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="text-sm font-medium">Queue Status</div>
              <div className="text-2xl font-bold">{syncStatus?.queueLength || 0}</div>
              <div className="text-sm text-gray-600">Pending operations</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Last Sync</div>
              <div className="text-lg font-medium">
                {syncStatus?.lastOutboundSync ? formatTime(syncStatus.lastOutboundSync) : 'Never'}
              </div>
              <div className="text-sm text-gray-600">Outbound to OTAs</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Success Rate</div>
              <div className="text-2xl font-bold text-green-600">
                {syncStatus?.totalReservationsSynced > 0 
                  ? Math.round((syncStatus.totalReservationsSynced / (syncStatus.totalReservationsSynced + syncStatus.syncErrors)) * 100)
                  : 100}%
              </div>
              <div className="text-sm text-gray-600">Last 24 hours</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}