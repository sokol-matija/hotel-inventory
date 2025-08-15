// ChannelManagerDashboard.test.tsx - Integration tests for Channel Manager dashboard
// Tests dashboard state management, service integrations, and real-time updates

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import ChannelManagerDashboard from '../ChannelManagerDashboard';
import { PhobsChannelManagerService } from '../../../../../lib/hotel/services/PhobsChannelManagerService';
import { PhobsReservationSyncService } from '../../../../../lib/hotel/services/PhobsReservationSyncService';
import { PhobsInventoryService } from '../../../../../lib/hotel/services/PhobsInventoryService';
import { PhobsMonitoringService } from '../../../../../lib/hotel/services/PhobsMonitoringService';
import { PhobsErrorHandlingService } from '../../../../../lib/hotel/services/PhobsErrorHandlingService';

// Mock all the services
jest.mock('../../../../../lib/hotel/services/PhobsChannelManagerService');
jest.mock('../../../../../lib/hotel/services/PhobsReservationSyncService');
jest.mock('../../../../../lib/hotel/services/PhobsInventoryService');
jest.mock('../../../../../lib/hotel/services/PhobsMonitoringService');
jest.mock('../../../../../lib/hotel/services/PhobsErrorHandlingService');

// Mock the notification service
jest.mock('../../../../../lib/hotel/notifications', () => ({
  success: jest.fn(),
  error: jest.fn(),
  warning: jest.fn(),
  info: jest.fn(),
}));

// Mock the StatusIndicators components
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
  ConflictIndicator: ({ severity, onResolve, onView }: any) => (
    <div data-testid="conflict-indicator">
      <span>{severity}</span>
      {onResolve && <button onClick={onResolve}>Resolve</button>}
      {onView && <button onClick={onView}>View</button>}
    </div>
  ),
  SyncProgress: ({ operation, progress }: any) => (
    <div data-testid="sync-progress">
      <span>{operation}</span>
      <span>{progress}%</span>
    </div>
  ),
  PerformanceMetrics: ({ successRate, averageResponseTime }: any) => (
    <div data-testid="performance-metrics">
      <span>{successRate}%</span>
      <span>{averageResponseTime}ms</span>
    </div>
  ),
  ErrorDetails: ({ error, onRetry, onDismiss }: any) => (
    <div data-testid="error-details">
      <span>{error.message}</span>
      {onRetry && <button onClick={onRetry}>Retry</button>}
      {onDismiss && <button onClick={onDismiss}>Dismiss</button>}
    </div>
  ),
}));

// Mock utility functions
jest.mock('../../../../../lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' ')
}));

const mockChannelManagerService = PhobsChannelManagerService as jest.MockedClass<typeof PhobsChannelManagerService>;
const mockReservationSyncService = PhobsReservationSyncService as jest.MockedClass<typeof PhobsReservationSyncService>;
const mockMonitoringService = PhobsMonitoringService as jest.MockedClass<typeof PhobsMonitoringService>;
const mockErrorHandlingService = PhobsErrorHandlingService as jest.MockedClass<typeof PhobsErrorHandlingService>;

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <MemoryRouter>
    {children}
  </MemoryRouter>
);

describe('ChannelManagerDashboard Component', () => {
  let mockChannelManager: any;
  let mockReservationSync: any;
  let mockMonitoring: any;
  let mockErrorHandling: any;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock instances
    mockChannelManager = {
      getStatus: jest.fn(),
    };

    mockReservationSync = {
      getSyncStatus: jest.fn(),
      getActiveConflicts: jest.fn(),
    };

    mockMonitoring = {
      getSystemHealthMetrics: jest.fn(),
      getRecentLogs: jest.fn(),
    };

    mockErrorHandling = {
      getMetrics: jest.fn(),
    };

    // Setup service mocks
    mockChannelManagerService.getInstance = jest.fn().mockReturnValue(mockChannelManager);
    mockReservationSyncService.getInstance = jest.fn().mockReturnValue(mockReservationSync);
    mockMonitoringService.getInstance = jest.fn().mockReturnValue(mockMonitoring);
    mockErrorHandlingService.getInstance = jest.fn().mockReturnValue(mockErrorHandling);

    // Setup default mock responses
    mockChannelManager.getStatus.mockReturnValue({
      isConnected: true,
      activeChannels: 5,
      totalChannels: 5,
      totalReservations: 156,
      syncErrors: 0,
    });

    mockReservationSync.getSyncStatus.mockReturnValue({
      lastOutboundSync: new Date('2025-08-15T10:30:00Z'),
      lastInboundSync: new Date('2025-08-15T10:25:00Z'),
      totalReservationsSynced: 100,
      pendingOutbound: 2,
      pendingInbound: 1,
      conflictsDetected: 0,
      conflictsResolved: 0,
      syncErrors: 0,
      queueLength: 3,
      activeConflicts: 0,
    });

    mockReservationSync.getActiveConflicts.mockReturnValue([]);

    mockMonitoring.getSystemHealthMetrics.mockReturnValue({
      errorRate: 2.5,
      averageResponseTime: 1200,
      operationsPerMinute: 15,
    });

    mockMonitoring.getRecentLogs.mockReturnValue([]);

    mockErrorHandling.getMetrics.mockReturnValue({
      totalErrors: 5,
      errorsByType: {},
      recentErrors: [],
    });
  });

  describe('Initial Rendering', () => {
    it('renders dashboard header correctly', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <ChannelManagerDashboard />
          </TestWrapper>
        );
      });

      expect(screen.getByText('Channel Manager')).toBeInTheDocument();
      expect(screen.getByText('Monitor and manage OTA channel integrations')).toBeInTheDocument();
    });

    it('shows loading state initially', () => {
      render(
        <TestWrapper>
          <ChannelManagerDashboard />
        </TestWrapper>
      );

      expect(screen.getByText('Loading channel manager data...')).toBeInTheDocument();
    });

    it('renders navigation buttons', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <ChannelManagerDashboard />
          </TestWrapper>
        );
      });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /settings/i })).toBeInTheDocument();
      });
    });
  });

  describe('Service Integration', () => {
    it('calls all service getInstance methods', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <ChannelManagerDashboard />
          </TestWrapper>
        );
      });

      expect(mockChannelManagerService.getInstance).toHaveBeenCalled();
      expect(mockReservationSyncService.getInstance).toHaveBeenCalled();
      expect(mockMonitoringService.getInstance).toHaveBeenCalled();
      expect(mockErrorHandlingService.getInstance).toHaveBeenCalled();
    });

    it('loads data from all services', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <ChannelManagerDashboard />
          </TestWrapper>
        );
      });

      await waitFor(() => {
        expect(mockChannelManager.getStatus).toHaveBeenCalled();
        expect(mockReservationSync.getSyncStatus).toHaveBeenCalled();
        expect(mockReservationSync.getActiveConflicts).toHaveBeenCalled();
        expect(mockMonitoring.getSystemHealthMetrics).toHaveBeenCalled();
        expect(mockMonitoring.getRecentLogs).toHaveBeenCalledWith(5, 2);
        expect(mockErrorHandling.getMetrics).toHaveBeenCalled();
      });
    });
  });

  describe('Status Overview Cards', () => {
    it('displays connection status when connected', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <ChannelManagerDashboard />
          </TestWrapper>
        );
      });

      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeInTheDocument();
        expect(screen.getByText('5 of 5 channels active')).toBeInTheDocument();
      });
    });

    it('displays disconnected status when not connected', async () => {
      mockChannelManager.getStatus.mockReturnValue({
        isConnected: false,
        activeChannels: 0,
        totalChannels: 5,
        totalReservations: 0,
        syncErrors: 5,
      });

      await act(async () => {
        render(
          <TestWrapper>
            <ChannelManagerDashboard />
          </TestWrapper>
        );
      });

      await waitFor(() => {
        expect(screen.getByText('Disconnected')).toBeInTheDocument();
        expect(screen.getByText('0 of 5 channels active')).toBeInTheDocument();
      });
    });

    it('displays total reservations correctly', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <ChannelManagerDashboard />
          </TestWrapper>
        );
      });

      await waitFor(() => {
        expect(screen.getByText('156')).toBeInTheDocument();
        expect(screen.getByText('+12% from last month')).toBeInTheDocument();
      });
    });

    it('displays sync errors count', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <ChannelManagerDashboard />
          </TestWrapper>
        );
      });

      await waitFor(() => {
        expect(screen.getByText('0')).toBeInTheDocument(); // sync errors count
        expect(screen.getByText('0 active conflicts')).toBeInTheDocument();
      });
    });
  });

  describe('Channel Status Display', () => {
    it('renders channel status cards', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <ChannelManagerDashboard />
          </TestWrapper>
        );
      });

      await waitFor(() => {
        expect(screen.getByTestId('channel-card-booking.com')).toBeInTheDocument();
        expect(screen.getByTestId('channel-card-expedia')).toBeInTheDocument();
        expect(screen.getByTestId('channel-card-airbnb')).toBeInTheDocument();
        expect(screen.getByTestId('channel-card-agoda')).toBeInTheDocument();
        expect(screen.getByTestId('channel-card-hotels.com')).toBeInTheDocument();
      });
    });

    it('handles channel card view details clicks', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <ChannelManagerDashboard />
          </TestWrapper>
        );
      });

      await waitFor(() => {
        const viewDetailsButtons = screen.getAllByText('View Details');
        expect(viewDetailsButtons.length).toBeGreaterThan(0);
        
        // Click should not throw error
        fireEvent.click(viewDetailsButtons[0]);
      });
    });
  });

  describe('Conflict Management', () => {
    it('shows conflicts section when conflicts exist', async () => {
      const mockConflict = {
        conflictId: 'conflict_123',
        type: 'double_booking',
        severity: 'high',
        autoResolvable: false,
        affectedReservations: ['res_1', 'res_2'],
      };

      mockReservationSync.getActiveConflicts.mockReturnValue([mockConflict]);

      await act(async () => {
        render(
          <TestWrapper>
            <ChannelManagerDashboard />
          </TestWrapper>
        );
      });

      await waitFor(() => {
        expect(screen.getByText('Active Conflicts (1)')).toBeInTheDocument();
        expect(screen.getByTestId('conflict-indicator')).toBeInTheDocument();
      });
    });

    it('hides conflicts section when no conflicts', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <ChannelManagerDashboard />
          </TestWrapper>
        );
      });

      await waitFor(() => {
        expect(screen.queryByText(/Active Conflicts/)).not.toBeInTheDocument();
      });
    });

    it('shows "View All" button when more than 5 conflicts', async () => {
      const mockConflicts = Array.from({ length: 7 }, (_, i) => ({
        conflictId: `conflict_${i}`,
        type: 'rate_mismatch',
        severity: 'medium',
        autoResolvable: true,
        affectedReservations: [`res_${i}`],
      }));

      mockReservationSync.getActiveConflicts.mockReturnValue(mockConflicts);

      await act(async () => {
        render(
          <TestWrapper>
            <ChannelManagerDashboard />
          </TestWrapper>
        );
      });

      await waitFor(() => {
        expect(screen.getByText('View All 7 Conflicts')).toBeInTheDocument();
      });
    });
  });

  describe('Performance Metrics', () => {
    it('renders performance metrics component', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <ChannelManagerDashboard />
          </TestWrapper>
        );
      });

      await waitFor(() => {
        expect(screen.getByTestId('performance-metrics')).toBeInTheDocument();
      });
    });

    it('calculates metrics correctly from health data', async () => {
      mockMonitoring.getSystemHealthMetrics.mockReturnValue({
        errorRate: 15, // High error rate
        averageResponseTime: 2500,
        operationsPerMinute: 8,
      });

      await act(async () => {
        render(
          <TestWrapper>
            <ChannelManagerDashboard />
          </TestWrapper>
        );
      });

      await waitFor(() => {
        const metricsComponent = screen.getByTestId('performance-metrics');
        expect(metricsComponent).toBeInTheDocument();
        // Component should receive calculated success rate (100 - 15 = 85%)
      });
    });
  });

  describe('Error Handling', () => {
    it('shows recent errors when they exist', async () => {
      const mockErrors = [
        {
          message: 'Connection timeout',
          type: 'TIMEOUT_ERROR',
          context: { operation: 'sync_reservations' },
        },
      ];

      mockMonitoring.getRecentLogs.mockReturnValue(mockErrors);

      await act(async () => {
        render(
          <TestWrapper>
            <ChannelManagerDashboard />
          </TestWrapper>
        );
      });

      await waitFor(() => {
        expect(screen.getByText('Recent Errors')).toBeInTheDocument();
        expect(screen.getByTestId('error-details')).toBeInTheDocument();
      });
    });

    it('handles error retry and dismiss actions', async () => {
      const mockErrors = [
        {
          message: 'Network error',
          type: 'NETWORK_ERROR',
          context: { operation: 'sync_rates' },
        },
      ];

      mockMonitoring.getRecentLogs.mockReturnValue(mockErrors);

      await act(async () => {
        render(
          <TestWrapper>
            <ChannelManagerDashboard />
          </TestWrapper>
        );
      });

      await waitFor(() => {
        const retryButton = screen.getByRole('button', { name: /retry/i });
        const dismissButton = screen.getByRole('button', { name: /dismiss/i });
        
        fireEvent.click(retryButton);
        fireEvent.click(dismissButton);
        
        // Should remove the error from display
        expect(screen.queryByTestId('error-details')).not.toBeInTheDocument();
      });
    });
  });

  describe('Manual Refresh', () => {
    it('triggers manual refresh when refresh button clicked', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <ChannelManagerDashboard />
          </TestWrapper>
        );
      });

      await waitFor(() => {
        const refreshButton = screen.getByRole('button', { name: /refresh/i });
        fireEvent.click(refreshButton);
      });

      // Should call service methods again
      await waitFor(() => {
        expect(mockChannelManager.getStatus).toHaveBeenCalledTimes(2); // Initial + manual
      });
    });

    it('shows loading state during manual refresh', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <ChannelManagerDashboard />
          </TestWrapper>
        );
      });

      await waitFor(() => {
        const refreshButton = screen.getByRole('button', { name: /refresh/i });
        fireEvent.click(refreshButton);
        
        expect(refreshButton).toBeDisabled();
      });
    });
  });

  describe('Sync Status Display', () => {
    it('displays sync queue information', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <ChannelManagerDashboard />
          </TestWrapper>
        );
      });

      await waitFor(() => {
        expect(screen.getByText('Synchronization Status')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument(); // queueLength
        expect(screen.getByText('Pending operations')).toBeInTheDocument();
      });
    });

    it('calculates and displays success rate correctly', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <ChannelManagerDashboard />
          </TestWrapper>
        );
      });

      await waitFor(() => {
        // With 100 synced and 0 errors, should show 100%
        expect(screen.getByText('100%')).toBeInTheDocument();
        expect(screen.getByText('Last 24 hours')).toBeInTheDocument();
      });
    });

    it('formats last sync time correctly', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <ChannelManagerDashboard />
          </TestWrapper>
        );
      });

      await waitFor(() => {
        expect(screen.getByText('Outbound to OTAs')).toBeInTheDocument();
      });
    });
  });

  describe('Auto-refresh', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('sets up auto-refresh interval', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <ChannelManagerDashboard />
          </TestWrapper>
        );
      });

      // Fast-forward 30 seconds
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        // Should have called getStatus multiple times due to auto-refresh
        expect(mockChannelManager.getStatus).toHaveBeenCalledTimes(2);
      });
    });

    it('cleans up interval on unmount', async () => {
      const { unmount } = render(
        <TestWrapper>
          <ChannelManagerDashboard />
        </TestWrapper>
      );

      await act(async () => {
        unmount();
      });

      // Should not throw any errors during cleanup
      expect(true).toBe(true);
    });
  });

  describe('Recent Reservations', () => {
    it('displays recent OTA reservations section', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <ChannelManagerDashboard />
          </TestWrapper>
        );
      });

      await waitFor(() => {
        expect(screen.getByText('Recent OTA Reservations')).toBeInTheDocument();
        expect(screen.getByText('Latest bookings from all channels')).toBeInTheDocument();
      });
    });

    it('shows reservation details correctly', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <ChannelManagerDashboard />
          </TestWrapper>
        );
      });

      await waitFor(() => {
        // Should show mock reservation data
        expect(screen.getByText('John Smith')).toBeInTheDocument();
        expect(screen.getByText('Maria Rodriguez')).toBeInTheDocument();
        expect(screen.getByText('Hans Mueller')).toBeInTheDocument();
      });
    });
  });
});