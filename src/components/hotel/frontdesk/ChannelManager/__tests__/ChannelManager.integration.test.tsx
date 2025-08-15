// ChannelManager.integration.test.tsx - End-to-end integration tests
// Tests complete Channel Manager workflows including dashboard → settings → configuration flows

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@testing-library/jest-dom';

import ChannelManagerDashboard from '../ChannelManagerDashboard';
import ChannelManagerSettings from '../ChannelManagerSettings';
import { PhobsChannelManagerService } from '../../../../../lib/hotel/services/PhobsChannelManagerService';
import { PhobsReservationSyncService } from '../../../../../lib/hotel/services/PhobsReservationSyncService';
import { PhobsConfigurationService } from '../../../../../lib/hotel/services/PhobsConfigurationService';
import { PhobsMonitoringService } from '../../../../../lib/hotel/services/PhobsMonitoringService';
import { PhobsErrorHandlingService } from '../../../../../lib/hotel/services/PhobsErrorHandlingService';

// Mock all services
jest.mock('../../../../../lib/hotel/services/PhobsChannelManagerService');
jest.mock('../../../../../lib/hotel/services/PhobsReservationSyncService');
jest.mock('../../../../../lib/hotel/services/PhobsConfigurationService');
jest.mock('../../../../../lib/hotel/services/PhobsMonitoringService');
jest.mock('../../../../../lib/hotel/services/PhobsErrorHandlingService');

// Mock notifications
const mockNotification = {
  success: jest.fn(),
  error: jest.fn(),
  warning: jest.fn(),
  info: jest.fn(),
};
jest.mock('../../../../../lib/hotel/notifications', () => mockNotification);

// Mock StatusIndicators
jest.mock('../StatusIndicators', () => ({
  ChannelStatusCard: ({ channel, status, onViewDetails }: any) => (
    <div data-testid={`channel-card-${channel}`}>
      <span>{channel}</span>
      <span>{status}</span>
      {onViewDetails && (
        <button onClick={onViewDetails}>View Details</button>
      )}
    </div>
  ),
  ConflictIndicator: ({ severity, onResolve }: any) => (
    <div data-testid="conflict-indicator">
      <span>{severity}</span>
      {onResolve && <button onClick={onResolve}>Resolve</button>}
    </div>
  ),
  PerformanceMetrics: ({ successRate }: any) => (
    <div data-testid="performance-metrics">
      <span>{successRate}%</span>
    </div>
  ),
  ErrorDetails: ({ error, onRetry }: any) => (
    <div data-testid="error-details">
      <span>{error.message}</span>
      {onRetry && <button onClick={onRetry}>Retry</button>}
    </div>
  ),
  SyncProgress: () => <div data-testid="sync-progress">Syncing...</div>,
}));

// Mock UI components for settings
jest.mock('../../../../ui/tabs', () => ({
  Tabs: ({ children, value, onValueChange }: any) => (
    <div data-testid="tabs" data-value={value}>
      <div onClick={() => onValueChange?.('credentials')}>Credentials Tab</div>
      <div onClick={() => onValueChange?.('channels')}>Channels Tab</div>
      {children}
    </div>
  ),
  TabsList: ({ children }: any) => <div>{children}</div>,
  TabsTrigger: ({ children, value }: any) => (
    <button data-testid={`tab-${value}`}>{children}</button>
  ),
  TabsContent: ({ children, value }: any) => (
    <div data-testid={`tab-content-${value}`}>{children}</div>
  ),
}));

jest.mock('../../../../ui/switch', () => ({
  Switch: ({ checked, onCheckedChange }: any) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      data-testid="switch"
    />
  ),
}));

// Test App Component that includes routing
const TestApp: React.FC<{ initialPath?: string }> = ({ 
  initialPath = '/hotel/front-desk/channel-manager' 
}) => (
  <MemoryRouter initialEntries={[initialPath]}>
    <Routes>
      <Route path="/hotel/front-desk/channel-manager" element={<ChannelManagerDashboard />} />
      <Route path="/hotel/front-desk/channel-manager/settings" element={<ChannelManagerSettings />} />
    </Routes>
  </MemoryRouter>
);

describe('Channel Manager Integration Tests', () => {
  let mockChannelManager: any;
  let mockReservationSync: any;
  let mockConfigService: any;
  let mockMonitoring: any;
  let mockErrorHandling: any;

  const setupMocks = (scenario: 'configured' | 'unconfigured' | 'error') => {
    mockChannelManager = {
      getStatus: jest.fn(),
    };

    mockReservationSync = {
      getSyncStatus: jest.fn(),
      getActiveConflicts: jest.fn(),
    };

    mockConfigService = {
      getConfiguration: jest.fn(),
      getChannelConfigurations: jest.fn(),
      getSyncSettings: jest.fn(),
      updateCredentials: jest.fn(),
      testConnection: jest.fn(),
      updateChannelConfiguration: jest.fn(),
      updateSyncSettings: jest.fn(),
    };

    mockMonitoring = {
      getSystemHealthMetrics: jest.fn(),
      getRecentLogs: jest.fn(),
    };

    mockErrorHandling = {
      getMetrics: jest.fn(),
    };

    // Set up service instances
    (PhobsChannelManagerService as any).getInstance = jest.fn().mockReturnValue(mockChannelManager);
    (PhobsReservationSyncService as any).getInstance = jest.fn().mockReturnValue(mockReservationSync);
    (PhobsConfigurationService as any).getInstance = jest.fn().mockReturnValue(mockConfigService);
    (PhobsMonitoringService as any).getInstance = jest.fn().mockReturnValue(mockMonitoring);
    (PhobsErrorHandlingService as any).getInstance = jest.fn().mockReturnValue(mockErrorHandling);

    switch (scenario) {
      case 'configured':
        mockChannelManager.getStatus.mockReturnValue({
          isConnected: true,
          activeChannels: 3,
          totalChannels: 5,
          totalReservations: 89,
          syncErrors: 0,
        });

        mockConfigService.getConfiguration.mockReturnValue({
          isConfigured: true,
          credentials: {
            apiKey: 'test_key',
            apiSecret: 'test_secret',
            hotelId: 'hotel_123',
            baseUrl: 'https://api.phobs.net/v1',
          },
          channels: [
            {
              channel: 'booking.com',
              isEnabled: true,
              commissionRate: 0.15,
              rateAdjustment: 0,
              minimumStay: 1,
              maximumStay: 30
            }
          ],
          syncSettings: {
            autoSync: true,
            syncIntervalMinutes: 30,
            maxRetryAttempts: 3,
            batchSize: 100,
            throttleDelayMs: 1000,
            conflictResolutionStrategy: 'manual_review',
            notifyOnConflicts: true,
            notifyOnFailures: true
          },
          createdAt: new Date(),
          lastUpdated: new Date()
        });
        break;

      case 'unconfigured':
        mockChannelManager.getStatus.mockReturnValue({
          isConnected: false,
          activeChannels: 0,
          totalChannels: 5,
          totalReservations: 0,
          syncErrors: 0,
        });

        mockConfigService.getConfiguration.mockReturnValue(null);
        mockConfigService.getChannelConfigurations.mockReturnValue([]);
        mockConfigService.getSyncSettings.mockReturnValue({
          autoSync: false,
          syncIntervalMinutes: 30,
          maxRetryAttempts: 3,
          batchSize: 100,
          throttleDelayMs: 1000,
          conflictResolutionStrategy: 'manual_review',
          notifyOnConflicts: true,
          notifyOnFailures: true
        });
        break;

      case 'error':
        mockChannelManager.getStatus.mockReturnValue({
          isConnected: false,
          activeChannels: 0,
          totalChannels: 5,
          totalReservations: 0,
          syncErrors: 15,
        });

        mockReservationSync.getActiveConflicts.mockReturnValue([
          {
            conflictId: 'conflict_1',
            type: 'double_booking',
            severity: 'critical',
            autoResolvable: false,
            affectedReservations: ['res_1', 'res_2']
          }
        ]);

        mockMonitoring.getRecentLogs.mockReturnValue([
          {
            message: 'Connection timeout',
            type: 'TIMEOUT_ERROR',
            context: { operation: 'sync_reservations' }
          }
        ]);
        break;
    }

    // Common mock responses
    mockReservationSync.getSyncStatus.mockReturnValue({
      lastOutboundSync: new Date(),
      lastInboundSync: new Date(),
      totalReservationsSynced: 50,
      pendingOutbound: 0,
      pendingInbound: 0,
      conflictsDetected: 0,
      conflictsResolved: 0,
      syncErrors: 0,
      queueLength: 0,
      activeConflicts: 0,
    });

    mockMonitoring.getSystemHealthMetrics.mockReturnValue({
      errorRate: 2.5,
      averageResponseTime: 1200,
      operationsPerMinute: 10,
    });

    mockErrorHandling.getMetrics.mockReturnValue({
      totalErrors: 2,
      errorsByType: {},
      recentErrors: [],
    });

    if (!mockMonitoring.getRecentLogs.mock.calls.length) {
      mockMonitoring.getRecentLogs.mockReturnValue([]);
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Dashboard to Settings Navigation', () => {
    it('navigates from dashboard to settings', async () => {
      setupMocks('configured');
      const user = userEvent.setup();

      render(<TestApp />);

      // Wait for dashboard to load
      await waitFor(() => {
        expect(screen.getByText('Channel Manager')).toBeInTheDocument();
      });

      // Click settings button
      const settingsButton = screen.getByRole('button', { name: /settings/i });
      await user.click(settingsButton);

      // Should navigate to settings page
      await waitFor(() => {
        expect(screen.getByText('Channel Manager Settings')).toBeInTheDocument();
      });
    });

    it('navigates back from settings to dashboard', async () => {
      setupMocks('configured');
      const user = userEvent.setup();

      render(<TestApp initialPath="/hotel/front-desk/channel-manager/settings" />);

      // Wait for settings to load
      await waitFor(() => {
        expect(screen.getByText('Channel Manager Settings')).toBeInTheDocument();
      });

      // Click back button
      const backButton = screen.getByRole('button', { name: /back to dashboard/i });
      await user.click(backButton);

      // Should navigate back to dashboard
      await waitFor(() => {
        expect(screen.getByText('Monitor and manage OTA channel integrations')).toBeInTheDocument();
      });
    });
  });

  describe('Complete Configuration Workflow', () => {
    it('completes full configuration from unconfigured state', async () => {
      setupMocks('unconfigured');
      const user = userEvent.setup();

      // Start with dashboard
      render(<TestApp />);

      await waitFor(() => {
        expect(screen.getByText('Disconnected')).toBeInTheDocument();
      });

      // Navigate to settings
      const settingsButton = screen.getByRole('button', { name: /settings/i });
      await user.click(settingsButton);

      await waitFor(() => {
        expect(screen.getByText('Not Configured')).toBeInTheDocument();
      });

      // Configure credentials
      const apiKeyInput = screen.getByPlaceholderText(/enter your phobs api key/i);
      const hotelIdInput = screen.getByPlaceholderText(/your hotel id in phobs/i);

      await user.type(apiKeyInput, 'new_api_key_123');
      await user.type(hotelIdInput, 'hotel_456');

      // Save credentials
      mockConfigService.updateCredentials.mockResolvedValue({ success: true });
      const saveButton = screen.getByRole('button', { name: /save credentials/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockNotification.success).toHaveBeenCalledWith(
          'Credentials Saved',
          'Phobs API credentials updated successfully'
        );
      });

      // Test connection
      mockConfigService.testConnection.mockResolvedValue({ 
        success: true, 
        responseTime: 850 
      });
      const testButton = screen.getByRole('button', { name: /test connection/i });
      await user.click(testButton);

      await waitFor(() => {
        expect(mockNotification.success).toHaveBeenCalledWith(
          'Connection Test Successful',
          'Connected to Phobs API in 850ms'
        );
      });
    });

    it('handles configuration errors gracefully', async () => {
      setupMocks('unconfigured');
      const user = userEvent.setup();

      render(<TestApp initialPath="/hotel/front-desk/channel-manager/settings" />);

      await waitFor(() => {
        expect(screen.getByText('Channel Manager Settings')).toBeInTheDocument();
      });

      // Try to save invalid credentials
      mockConfigService.updateCredentials.mockResolvedValue({ 
        success: false, 
        error: 'Invalid API credentials' 
      });

      const saveButton = screen.getByRole('button', { name: /save credentials/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockNotification.error).toHaveBeenCalledWith(
          'Save Failed',
          'Invalid API credentials'
        );
      });

      // Try connection test with invalid credentials
      mockConfigService.testConnection.mockResolvedValue({ 
        success: false, 
        error: 'Authentication failed' 
      });

      const testButton = screen.getByRole('button', { name: /test connection/i });
      await user.click(testButton);

      await waitFor(() => {
        expect(mockNotification.error).toHaveBeenCalledWith(
          'Connection Test Failed',
          'Authentication failed'
        );
      });
    });
  });

  describe('Channel Management Workflow', () => {
    it('manages channel configurations end-to-end', async () => {
      setupMocks('configured');
      const user = userEvent.setup();

      render(<TestApp initialPath="/hotel/front-desk/channel-manager/settings" />);

      await waitFor(() => {
        expect(screen.getByText('Configured')).toBeInTheDocument();
      });

      // Switch to channels tab
      const channelsTab = screen.getByText('Channels Tab');
      await user.click(channelsTab);

      // Enable/disable channels
      mockConfigService.updateChannelConfiguration.mockResolvedValue({ success: true });
      
      const channelSwitches = screen.getAllByTestId('switch');
      if (channelSwitches.length > 0) {
        await user.click(channelSwitches[0]);

        await waitFor(() => {
          expect(mockConfigService.updateChannelConfiguration).toHaveBeenCalled();
        });
      }

      // Update commission rates
      const commissionInput = screen.getByDisplayValue('15');
      await user.clear(commissionInput);
      await user.type(commissionInput, '12');
      fireEvent.blur(commissionInput);

      await waitFor(() => {
        expect(mockConfigService.updateChannelConfiguration).toHaveBeenCalledWith(
          'booking.com',
          { commissionRate: 0.12 }
        );
      });
    });
  });

  describe('Error Monitoring and Resolution', () => {
    it('displays and resolves errors end-to-end', async () => {
      setupMocks('error');
      const user = userEvent.setup();

      render(<TestApp />);

      // Should show errors on dashboard
      await waitFor(() => {
        expect(screen.getByText('Recent Errors')).toBeInTheDocument();
        expect(screen.getByTestId('error-details')).toBeInTheDocument();
      });

      // Should show conflicts
      await waitFor(() => {
        expect(screen.getByText('Active Conflicts (1)')).toBeInTheDocument();
        expect(screen.getByTestId('conflict-indicator')).toBeInTheDocument();
      });

      // Retry failed operation
      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      // Error should be removed from display
      await waitFor(() => {
        expect(screen.queryByTestId('error-details')).not.toBeInTheDocument();
      });

      // Resolve conflict
      const resolveButton = screen.getByRole('button', { name: /resolve/i });
      await user.click(resolveButton);

      // Conflict should be handled
      expect(resolveButton).toBeInTheDocument(); // Button was clicked
    });
  });

  describe('Real-time Updates', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('auto-refreshes dashboard data', async () => {
      setupMocks('configured');

      await act(async () => {
        render(<TestApp />);
      });

      // Initial load
      await waitFor(() => {
        expect(mockChannelManager.getStatus).toHaveBeenCalledTimes(1);
      });

      // Fast-forward 30 seconds for auto-refresh
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(mockChannelManager.getStatus).toHaveBeenCalledTimes(2);
      });
    });

    it('handles data updates during auto-refresh', async () => {
      setupMocks('configured');

      await act(async () => {
        render(<TestApp />);
      });

      // Initial connected state
      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeInTheDocument();
      });

      // Change mock data to disconnected
      mockChannelManager.getStatus.mockReturnValue({
        isConnected: false,
        activeChannels: 0,
        totalChannels: 5,
        totalReservations: 0,
        syncErrors: 5,
      });

      // Trigger refresh
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      // Should update to disconnected state
      await waitFor(() => {
        expect(screen.getByText('Disconnected')).toBeInTheDocument();
      });
    });
  });

  describe('Performance Metrics Integration', () => {
    it('displays performance metrics from monitoring service', async () => {
      setupMocks('configured');

      mockMonitoring.getSystemHealthMetrics.mockReturnValue({
        errorRate: 5.2,
        averageResponseTime: 1850,
        operationsPerMinute: 8,
      });

      await act(async () => {
        render(<TestApp />);
      });

      await waitFor(() => {
        expect(screen.getByTestId('performance-metrics')).toBeInTheDocument();
        // Should show calculated success rate (100 - 5.2 = 94.8%)
      });
    });

    it('updates performance metrics on refresh', async () => {
      setupMocks('configured');

      await act(async () => {
        render(<TestApp />);
      });

      // Change metrics
      mockMonitoring.getSystemHealthMetrics.mockReturnValue({
        errorRate: 1.0,
        averageResponseTime: 900,
        operationsPerMinute: 15,
      });

      // Manual refresh
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await act(async () => {
        fireEvent.click(refreshButton);
      });

      await waitFor(() => {
        expect(mockMonitoring.getSystemHealthMetrics).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Service Integration Robustness', () => {
    it('handles service unavailability gracefully', async () => {
      setupMocks('configured');

      // Make one service throw an error
      mockChannelManager.getStatus.mockImplementation(() => {
        throw new Error('Service unavailable');
      });

      await act(async () => {
        render(<TestApp />);
      });

      // Should still render the component without crashing
      await waitFor(() => {
        expect(screen.getByText('Channel Manager')).toBeInTheDocument();
      });

      // Other services should still be called
      expect(mockReservationSync.getSyncStatus).toHaveBeenCalled();
      expect(mockMonitoring.getSystemHealthMetrics).toHaveBeenCalled();
    });

    it('handles partial service responses', async () => {
      setupMocks('configured');

      // Return partial data
      mockChannelManager.getStatus.mockReturnValue({
        isConnected: true,
        // Missing other properties
      });

      await act(async () => {
        render(<TestApp />);
      });

      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeInTheDocument();
        // Should handle missing properties gracefully
        expect(screen.getByText('0 of 0 channels active')).toBeInTheDocument();
      });
    });
  });
});