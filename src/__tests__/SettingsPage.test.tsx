/**
 * Integration tests for Settings page
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import SettingsPage from '../components/settings/SettingsPage';
import { AuthProvider } from '../components/auth/AuthProvider';
import i18n from '../i18n';

// Mock Supabase
jest.mock('../lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({
            data: {
              push_notifications_enabled: false,
              push_subscription: null
            },
            error: null
          })
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn().mockResolvedValue({
          error: null
        })
      }))
    }))
  }
}));

// Mock push notifications
jest.mock('../lib/pushNotifications', () => ({
  isPushNotificationSupported: jest.fn(() => true),
  togglePushNotifications: jest.fn(),
  sendLocalNotification: jest.fn(),
  createExpirationNotification: jest.fn(() => ({
    title: 'Test Notification',
    body: 'Test notification body',
    icon: '/test-icon.png',
    data: { type: 'test' }
  }))
}));

// Mock Auth Provider
const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com'
};

const mockUserProfile = {
  role: { name: 'admin' },
  push_notifications_enabled: false
};

const MockAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div data-testid="mock-auth-provider">
      {children}
    </div>
  );
};

// Mock useAuth hook
jest.mock('../components/auth/AuthProvider', () => ({
  useAuth: () => ({
    user: mockUser,
    userProfile: mockUserProfile,
    loading: false,
    refreshUserProfile: jest.fn()
  }),
  AuthProvider: MockAuthProvider
}));

// Mock toast hook
const mockToast = jest.fn();
jest.mock('../hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast
  })
}));

describe('SettingsPage', () => {
  const renderSettingsPage = () => {
    return render(
      <BrowserRouter>
        <I18nextProvider i18n={i18n}>
          <AuthProvider>
            <SettingsPage />
          </AuthProvider>
        </I18nextProvider>
      </BrowserRouter>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render settings page with notification section', async () => {
    renderSettingsPage();

    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('Push Notifications')).toBeInTheDocument();
    expect(screen.getByText('Receive browser notifications for important inventory alerts')).toBeInTheDocument();
  });

  it('should show notification schedule information', async () => {
    renderSettingsPage();

    expect(screen.getByText('Notification Schedule')).toBeInTheDocument();
    expect(screen.getByText('30 days before expiration - Yellow warning')).toBeInTheDocument();
    expect(screen.getByText('7 days before expiration - Orange warning')).toBeInTheDocument();
    expect(screen.getByText('1 day before expiration - Red critical alert')).toBeInTheDocument();
    expect(screen.getByText('Notifications are sent daily at 7:00 AM local time')).toBeInTheDocument();
  });

  it('should toggle push notifications when button is clicked', async () => {
    const { togglePushNotifications } = require('../lib/pushNotifications');
    togglePushNotifications.mockResolvedValue(true);

    renderSettingsPage();

    const toggleButton = screen.getByRole('button', { name: /disabled/i });
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(togglePushNotifications).toHaveBeenCalledWith('test-user-id', true);
    });
  });

  it('should send test notification when test button is clicked', async () => {
    // Mock notifications as enabled
    const mockEnabledProfile = { ...mockUserProfile, push_notifications_enabled: true };
    
    jest.doMock('../components/auth/AuthProvider', () => ({
      useAuth: () => ({
        user: mockUser,
        userProfile: mockEnabledProfile,
        loading: false,
        refreshUserProfile: jest.fn()
      }),
      AuthProvider: MockAuthProvider
    }));

    const { sendLocalNotification, createExpirationNotification } = require('../lib/pushNotifications');

    renderSettingsPage();

    // Find and click test notification button
    const testButton = screen.getByText('Send Test Notification');
    fireEvent.click(testButton);

    await waitFor(() => {
      expect(createExpirationNotification).toHaveBeenCalledWith('Test Item', 'Test Location', 3, 5);
      expect(sendLocalNotification).toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Test notification sent',
        description: 'Check your browser for the test notification',
        variant: 'default'
      });
    });
  });

  it('should show unsupported message when push notifications are not supported', async () => {
    const { isPushNotificationSupported } = require('../lib/pushNotifications');
    isPushNotificationSupported.mockReturnValue(false);

    renderSettingsPage();

    expect(screen.getByText('Push notifications not supported')).toBeInTheDocument();
    expect(screen.getByText('Your browser or device doesn\'t support push notifications. Please use a modern browser.')).toBeInTheDocument();
  });

  it('should show loading state initially', async () => {
    // Mock loading state
    jest.doMock('../components/auth/AuthProvider', () => ({
      useAuth: () => ({
        user: mockUser,
        userProfile: null,
        loading: true,
        refreshUserProfile: jest.fn()
      }),
      AuthProvider: MockAuthProvider
    }));

    renderSettingsPage();

    // Should show loading spinner
    const loadingSpinner = document.querySelector('.animate-spin');
    expect(loadingSpinner).toBeInTheDocument();
  });

  it('should handle error when toggling notifications fails', async () => {
    const { togglePushNotifications } = require('../lib/pushNotifications');
    togglePushNotifications.mockRejectedValue(new Error('Permission denied'));

    renderSettingsPage();

    const toggleButton = screen.getByRole('button', { name: /disabled/i });
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Permission denied',
        variant: 'destructive'
      });
    });
  });

  it('should show general settings section', async () => {
    renderSettingsPage();

    expect(screen.getByText('General Settings')).toBeInTheDocument();
    expect(screen.getByText('Application preferences and configuration')).toBeInTheDocument();
    expect(screen.getByText('Additional settings will be available in future updates')).toBeInTheDocument();
  });
});

describe('Settings Page Accessibility', () => {
  it('should have proper ARIA labels and roles', async () => {
    render(
      <BrowserRouter>
        <I18nextProvider i18n={i18n}>
          <AuthProvider>
            <SettingsPage />
          </AuthProvider>
        </I18nextProvider>
      </BrowserRouter>
    );

    // Check for proper heading structure
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Settings');
    
    // Check for button roles
    const toggleButton = screen.getByRole('button', { name: /disabled/i });
    expect(toggleButton).toBeInTheDocument();
  });

  it('should be keyboard navigable', async () => {
    render(
      <BrowserRouter>
        <I18nextProvider i18n={i18n}>
          <AuthProvider>
            <SettingsPage />
          </AuthProvider>
        </I18nextProvider>
      </BrowserRouter>
    );

    const toggleButton = screen.getByRole('button', { name: /disabled/i });
    
    // Should be focusable
    toggleButton.focus();
    expect(document.activeElement).toBe(toggleButton);
  });
});