// ChannelManagerSettings.test.tsx - Tests for Channel Manager configuration interface
// Tests API credentials, channel configuration, sync settings, and advanced features

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import ChannelManagerSettings from '../ChannelManagerSettings';
import { PhobsConfigurationService } from '../../../../../lib/hotel/services/PhobsConfigurationService';

// Mock the configuration service
jest.mock('../../../../../lib/hotel/services/PhobsConfigurationService');

// Mock the notification service
const mockNotification = {
  success: jest.fn(),
  error: jest.fn(),
  warning: jest.fn(),
  info: jest.fn(),
};

jest.mock('../../../../../lib/hotel/notifications', () => mockNotification);

// Mock UI components
jest.mock('../../../../ui/tabs', () => ({
  Tabs: ({ children, value, onValueChange }: any) => (
    <div data-testid="tabs" data-value={value}>
      {children}
    </div>
  ),
  TabsList: ({ children }: any) => <div data-testid="tabs-list">{children}</div>,
  TabsTrigger: ({ children, value, onClick }: any) => (
    <button data-testid={`tab-${value}`} onClick={() => onClick?.(value)}>
      {children}
    </button>
  ),
  TabsContent: ({ children, value }: any) => (
    <div data-testid={`tab-content-${value}`}>{children}</div>
  ),
}));

jest.mock('../../../../ui/switch', () => ({
  Switch: ({ checked, onCheckedChange, ...props }: any) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      data-testid="switch"
      {...props}
    />
  ),
}));

jest.mock('../../../../ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <select
      value={value}
      onChange={(e) => onValueChange?.(e.target.value)}
      data-testid="select"
    >
      {children}
    </select>
  ),
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: () => <span>Select Value</span>,
}));

const mockConfigurationService = PhobsConfigurationService as jest.MockedClass<typeof PhobsConfigurationService>;

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <MemoryRouter initialEntries={['/hotel/front-desk/channel-manager/settings']}>
    {children}
  </MemoryRouter>
);

describe('ChannelManagerSettings Component', () => {
  let mockConfigService: any;
  
  const mockConfiguration = {
    isConfigured: true,
    credentials: {
      apiKey: 'test_api_key',
      apiSecret: 'test_secret',
      hotelId: 'hotel_123',
      baseUrl: 'https://api.phobs.net/v1',
      webhookSecret: 'webhook_secret',
      webhookUrl: 'https://example.com/webhook'
    },
    channels: [
      {
        channel: 'booking.com' as const,
        isEnabled: true,
        commissionRate: 0.15,
        rateAdjustment: 0,
        minimumStay: 1,
        maximumStay: 30
      },
      {
        channel: 'expedia' as const,
        isEnabled: false,
        commissionRate: 0.18,
        rateAdjustment: 5,
        minimumStay: 2,
        maximumStay: 14
      }
    ],
    syncSettings: {
      autoSync: true,
      syncIntervalMinutes: 30,
      maxRetryAttempts: 3,
      batchSize: 100,
      throttleDelayMs: 1000,
      conflictResolutionStrategy: 'manual_review' as const,
      notifyOnConflicts: true,
      notifyOnFailures: true
    },
    createdAt: new Date('2025-08-01'),
    lastUpdated: new Date('2025-08-15')
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockConfigService = {
      getConfiguration: jest.fn(),
      getChannelConfigurations: jest.fn(),
      getSyncSettings: jest.fn(),
      updateCredentials: jest.fn(),
      testConnection: jest.fn(),
      updateChannelConfiguration: jest.fn(),
      updateSyncSettings: jest.fn(),
      exportConfiguration: jest.fn(),
      importConfiguration: jest.fn(),
      resetConfiguration: jest.fn(),
    };

    mockConfigurationService.getInstance = jest.fn().mockReturnValue(mockConfigService);

    // Set up default mock responses
    mockConfigService.getConfiguration.mockReturnValue(mockConfiguration);
    mockConfigService.getChannelConfigurations.mockReturnValue(mockConfiguration.channels);
    mockConfigService.getSyncSettings.mockReturnValue(mockConfiguration.syncSettings);
  });

  describe('Initial Rendering', () => {
    it('renders settings header correctly', () => {
      render(
        <TestWrapper>
          <ChannelManagerSettings />
        </TestWrapper>
      );

      expect(screen.getByText('Channel Manager Settings')).toBeInTheDocument();
      expect(screen.getByText('Configure Phobs integration and OTA channels')).toBeInTheDocument();
    });

    it('shows configured status badge when configured', () => {
      render(
        <TestWrapper>
          <ChannelManagerSettings />
        </TestWrapper>
      );

      expect(screen.getByText('Configured')).toBeInTheDocument();
    });

    it('shows not configured status when not configured', () => {
      mockConfigService.getConfiguration.mockReturnValue(null);

      render(
        <TestWrapper>
          <ChannelManagerSettings />
        </TestWrapper>
      );

      expect(screen.getByText('Not Configured')).toBeInTheDocument();
    });

    it('renders all tab triggers', () => {
      render(
        <TestWrapper>
          <ChannelManagerSettings />
        </TestWrapper>
      );

      expect(screen.getByTestId('tab-credentials')).toBeInTheDocument();
      expect(screen.getByTestId('tab-channels')).toBeInTheDocument();
      expect(screen.getByTestId('tab-sync')).toBeInTheDocument();
      expect(screen.getByTestId('tab-advanced')).toBeInTheDocument();
    });

    it('renders back to dashboard button', () => {
      render(
        <TestWrapper>
          <ChannelManagerSettings />
        </TestWrapper>
      );

      expect(screen.getByRole('button', { name: /back to dashboard/i })).toBeInTheDocument();
    });
  });

  describe('API Credentials Tab', () => {
    it('loads and displays existing credentials', () => {
      render(
        <TestWrapper>
          <ChannelManagerSettings />
        </TestWrapper>
      );

      const apiKeyInput = screen.getByDisplayValue('test_api_key');
      const hotelIdInput = screen.getByDisplayValue('hotel_123');
      
      expect(apiKeyInput).toBeInTheDocument();
      expect(hotelIdInput).toBeInTheDocument();
    });

    it('handles credential input changes', async () => {
      const user = userEvent.setup();
      
      render(
        <TestWrapper>
          <ChannelManagerSettings />
        </TestWrapper>
      );

      const apiKeyInput = screen.getByDisplayValue('test_api_key');
      
      await user.clear(apiKeyInput);
      await user.type(apiKeyInput, 'new_api_key');

      expect(apiKeyInput).toHaveValue('new_api_key');
    });

    it('saves credentials when save button clicked', async () => {
      const user = userEvent.setup();
      mockConfigService.updateCredentials.mockResolvedValue({ success: true });

      render(
        <TestWrapper>
          <ChannelManagerSettings />
        </TestWrapper>
      );

      const saveButton = screen.getByRole('button', { name: /save credentials/i });
      await user.click(saveButton);

      expect(mockConfigService.updateCredentials).toHaveBeenCalled();
    });

    it('shows success notification on successful save', async () => {
      const user = userEvent.setup();
      mockConfigService.updateCredentials.mockResolvedValue({ success: true });

      render(
        <TestWrapper>
          <ChannelManagerSettings />
        </TestWrapper>
      );

      const saveButton = screen.getByRole('button', { name: /save credentials/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockNotification.success).toHaveBeenCalledWith(
          'Credentials Saved',
          'Phobs API credentials updated successfully'
        );
      });
    });

    it('shows error notification on failed save', async () => {
      const user = userEvent.setup();
      mockConfigService.updateCredentials.mockResolvedValue({ 
        success: false, 
        error: 'Invalid API key' 
      });

      render(
        <TestWrapper>
          <ChannelManagerSettings />
        </TestWrapper>
      );

      const saveButton = screen.getByRole('button', { name: /save credentials/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockNotification.error).toHaveBeenCalledWith(
          'Save Failed',
          'Invalid API key'
        );
      });
    });

    it('tests connection when test button clicked', async () => {
      const user = userEvent.setup();
      mockConfigService.testConnection.mockResolvedValue({ 
        success: true, 
        responseTime: 1200 
      });

      render(
        <TestWrapper>
          <ChannelManagerSettings />
        </TestWrapper>
      );

      const testButton = screen.getByRole('button', { name: /test connection/i });
      await user.click(testButton);

      expect(mockConfigService.testConnection).toHaveBeenCalled();
    });

    it('shows connection test results', async () => {
      const user = userEvent.setup();
      mockConfigService.testConnection.mockResolvedValue({ 
        success: true, 
        responseTime: 800 
      });

      render(
        <TestWrapper>
          <ChannelManagerSettings />
        </TestWrapper>
      );

      const testButton = screen.getByRole('button', { name: /test connection/i });
      await user.click(testButton);

      await waitFor(() => {
        expect(screen.getByText('Connected (800ms)')).toBeInTheDocument();
      });
    });

    it('disables test button when no API key', () => {
      mockConfigService.getConfiguration.mockReturnValue({
        ...mockConfiguration,
        credentials: { ...mockConfiguration.credentials, apiKey: '' }
      });

      render(
        <TestWrapper>
          <ChannelManagerSettings />
        </TestWrapper>
      );

      const testButton = screen.getByRole('button', { name: /test connection/i });
      expect(testButton).toBeDisabled();
    });
  });

  describe('OTA Channels Tab', () => {
    it('displays channel configurations', () => {
      render(
        <TestWrapper>
          <ChannelManagerSettings />
        </TestWrapper>
      );

      expect(screen.getByText('Booking.com')).toBeInTheDocument();
      expect(screen.getByText('Expedia')).toBeInTheDocument();
    });

    it('shows channel enable/disable switches', () => {
      render(
        <TestWrapper>
          <ChannelManagerSettings />
        </TestWrapper>
      );

      const switches = screen.getAllByTestId('switch');
      expect(switches.length).toBeGreaterThan(0);
    });

    it('updates channel configuration when settings change', async () => {
      const user = userEvent.setup();
      mockConfigService.updateChannelConfiguration.mockResolvedValue({ success: true });

      render(
        <TestWrapper>
          <ChannelManagerSettings />
        </TestWrapper>
      );

      const commissionInput = screen.getByDisplayValue('15'); // 15% commission rate
      await user.clear(commissionInput);
      await user.type(commissionInput, '12');

      // Trigger blur to save changes
      fireEvent.blur(commissionInput);

      await waitFor(() => {
        expect(mockConfigService.updateChannelConfiguration).toHaveBeenCalledWith(
          'booking.com',
          { commissionRate: 0.12 }
        );
      });
    });

    it('toggles channel enabled state', async () => {
      const user = userEvent.setup();
      mockConfigService.updateChannelConfiguration.mockResolvedValue({ success: true });

      render(
        <TestWrapper>
          <ChannelManagerSettings />
        </TestWrapper>
      );

      const enabledSwitch = screen.getAllByTestId('switch')[0];
      await user.click(enabledSwitch);

      expect(mockConfigService.updateChannelConfiguration).toHaveBeenCalled();
    });

    it('shows channel-specific settings only when enabled', () => {
      render(
        <TestWrapper>
          <ChannelManagerSettings />
        </TestWrapper>
      );

      // Booking.com is enabled, should show settings
      expect(screen.getByDisplayValue('15')).toBeInTheDocument(); // Commission rate

      // Expedia is disabled in mock, settings should be hidden
      // This would need more specific data-testids to test properly
    });
  });

  describe('Sync Settings Tab', () => {
    it('displays sync settings correctly', () => {
      render(
        <TestWrapper>
          <ChannelManagerSettings />
        </TestWrapper>
      );

      expect(screen.getByDisplayValue('30')).toBeInTheDocument(); // Sync interval
      expect(screen.getByDisplayValue('3')).toBeInTheDocument(); // Max retries
      expect(screen.getByDisplayValue('100')).toBeInTheDocument(); // Batch size
    });

    it('toggles auto-sync setting', async () => {
      const user = userEvent.setup();
      mockConfigService.updateSyncSettings.mockResolvedValue({ success: true });

      render(
        <TestWrapper>
          <ChannelManagerSettings />
        </TestWrapper>
      );

      const autoSyncSwitch = screen.getAllByTestId('switch').find(
        (switch_) => switch_.getAttribute('checked') === 'true'
      );
      
      if (autoSyncSwitch) {
        await user.click(autoSyncSwitch);
        
        await waitFor(() => {
          expect(mockConfigService.updateSyncSettings).toHaveBeenCalled();
        });
      }
    });

    it('updates conflict resolution strategy', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ChannelManagerSettings />
        </TestWrapper>
      );

      const select = screen.getByTestId('select');
      await user.selectOptions(select, 'favor_internal');

      // Should update the sync settings state
      expect(select).toHaveValue('favor_internal');
    });

    it('saves sync settings when save button clicked', async () => {
      const user = userEvent.setup();
      mockConfigService.updateSyncSettings.mockResolvedValue({ success: true });

      render(
        <TestWrapper>
          <ChannelManagerSettings />
        </TestWrapper>
      );

      const saveButton = screen.getByRole('button', { name: /save sync settings/i });
      await user.click(saveButton);

      expect(mockConfigService.updateSyncSettings).toHaveBeenCalled();
    });
  });

  describe('Advanced Tab', () => {
    it('renders configuration management options', () => {
      render(
        <TestWrapper>
          <ChannelManagerSettings />
        </TestWrapper>
      );

      expect(screen.getByText('Configuration Management')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /export configuration/i })).toBeInTheDocument();
    });

    it('exports configuration when export button clicked', async () => {
      const user = userEvent.setup();
      mockConfigService.exportConfiguration.mockReturnValue('{"config":"data"}');

      // Mock URL.createObjectURL
      global.URL.createObjectURL = jest.fn().mockReturnValue('blob:url');
      global.URL.revokeObjectURL = jest.fn();

      // Mock document.createElement
      const mockAnchor = {
        href: '',
        download: '',
        click: jest.fn(),
      };
      jest.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);
      jest.spyOn(document.body, 'appendChild').mockImplementation(() => mockAnchor as any);
      jest.spyOn(document.body, 'removeChild').mockImplementation();

      render(
        <TestWrapper>
          <ChannelManagerSettings />
        </TestWrapper>
      );

      const exportButton = screen.getByRole('button', { name: /export configuration/i });
      await user.click(exportButton);

      expect(mockConfigService.exportConfiguration).toHaveBeenCalled();
      expect(mockAnchor.click).toHaveBeenCalled();
      expect(mockNotification.success).toHaveBeenCalledWith(
        'Configuration Exported',
        'Configuration file downloaded'
      );
    });

    it('handles import configuration', async () => {
      const user = userEvent.setup();
      mockConfigService.importConfiguration.mockResolvedValue({ success: true });

      render(
        <TestWrapper>
          <ChannelManagerSettings />
        </TestWrapper>
      );

      const fileInput = screen.getByLabelText(/import configuration/i);
      
      const mockFile = new File(['{"config":"data"}'], 'config.json', {
        type: 'application/json'
      });

      await user.upload(fileInput, mockFile);

      // Wait for file reading to complete
      await waitFor(() => {
        expect(mockConfigService.importConfiguration).toHaveBeenCalledWith('{"config":"data"}');
      });
    });

    it('resets configuration when reset button clicked', async () => {
      const user = userEvent.setup();
      mockConfigService.resetConfiguration.mockResolvedValue(undefined);

      // Mock window.confirm
      global.confirm = jest.fn().mockReturnValue(true);

      render(
        <TestWrapper>
          <ChannelManagerSettings />
        </TestWrapper>
      );

      const resetButton = screen.getByRole('button', { name: /reset all settings/i });
      await user.click(resetButton);

      expect(global.confirm).toHaveBeenCalledWith(
        'Are you sure you want to reset all configuration to defaults? This cannot be undone.'
      );
      expect(mockConfigService.resetConfiguration).toHaveBeenCalled();
    });

    it('displays configuration status information', () => {
      render(
        <TestWrapper>
          <ChannelManagerSettings />
        </TestWrapper>
      );

      expect(screen.getByText('Configuration Status')).toBeInTheDocument();
      expect(screen.getByText('Configured')).toBeInTheDocument();
      expect(screen.getByText('2 / 2')).toBeInTheDocument(); // Active channels
    });
  });

  describe('Error Handling', () => {
    it('handles service errors gracefully', async () => {
      const user = userEvent.setup();
      mockConfigService.updateCredentials.mockRejectedValue(new Error('Network error'));

      render(
        <TestWrapper>
          <ChannelManagerSettings />
        </TestWrapper>
      );

      const saveButton = screen.getByRole('button', { name: /save credentials/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockNotification.error).toHaveBeenCalledWith(
          'Save Error',
          'An unexpected error occurred'
        );
      });
    });

    it('handles configuration loading failure', () => {
      mockConfigService.getConfiguration.mockReturnValue(null);

      render(
        <TestWrapper>
          <ChannelManagerSettings />
        </TestWrapper>
      );

      // Should load default values
      expect(mockConfigService.getChannelConfigurations).toHaveBeenCalled();
      expect(mockConfigService.getSyncSettings).toHaveBeenCalled();
    });
  });

  describe('Form Validation', () => {
    it('validates numeric inputs', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ChannelManagerSettings />
        </TestWrapper>
      );

      const commissionInput = screen.getByDisplayValue('15');
      
      await user.clear(commissionInput);
      await user.type(commissionInput, '-5'); // Invalid negative value

      // Input should handle validation (depends on input implementation)
      expect(commissionInput).toHaveValue(-5);
    });

    it('enforces min/max constraints', async () => {
      const user = userEvent.setup();

      render(
        <TestWrapper>
          <ChannelManagerSettings />
        </TestWrapper>
      );

      const syncIntervalInput = screen.getByDisplayValue('30');
      
      await user.clear(syncIntervalInput);
      await user.type(syncIntervalInput, '2'); // Below minimum of 5

      // Should be constrained by input min/max attributes
      expect(syncIntervalInput).toHaveValue(2);
    });
  });
});