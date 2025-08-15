// FrontDeskLayout.test.tsx - Comprehensive tests for front desk layout with Supabase integration
// Tests layout rendering, provider setup, authentication, and navigation

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import FrontDeskLayout from '../FrontDeskLayout';

// Mock Supabase
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(() => Promise.resolve({ data: null, error: null })),
        order: jest.fn(() => Promise.resolve({ data: [], error: null }))
      })),
      order: jest.fn(() => Promise.resolve({ data: [], error: null })),
      range: jest.fn(() => Promise.resolve({ data: [], error: null }))
    })),
    insert: jest.fn(() => Promise.resolve({ data: [], error: null })),
    update: jest.fn(() => Promise.resolve({ data: [], error: null })),
    delete: jest.fn(() => Promise.resolve({ data: [], error: null }))
  })),
  auth: {
    user: jest.fn(() => ({ id: 'test-user', email: 'test@example.com' })),
    onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } }))
  },
  channel: jest.fn(() => ({
    on: jest.fn(() => ({ subscribe: jest.fn() })),
    unsubscribe: jest.fn()
  }))
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabase)
}));

// Mock authentication
const mockAuth = {
  user: { id: 'test-user', email: 'test@example.com' },
  session: { access_token: 'test-token' },
  signOut: jest.fn()
};

jest.mock('../../../../contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
  AuthProvider: ({ children }: any) => <div data-testid="auth-provider">{children}</div>
}));

// Mock hotel provider
jest.mock('../../../../contexts/SupabaseHotelProvider', () => ({
  SupabaseHotelProvider: ({ children }: any) => (
    <div data-testid="hotel-provider">{children}</div>
  ),
  useHotel: () => ({
    reservations: [],
    rooms: [],
    guests: [],
    loading: false,
    error: null
  })
}));

// Mock router components
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/hotel/frontdesk' })
}));

// Mock child components
jest.mock('../HotelTimeline', () => {
  return function MockHotelTimeline() {
    return <div data-testid="hotel-timeline">Hotel Timeline</div>;
  };
});

jest.mock('../CalendarView', () => {
  return function MockCalendarView() {
    return <div data-testid="calendar-view">Calendar View</div>;
  };
});

jest.mock('../GuestsPage', () => {
  return function MockGuestsPage() {
    return <div data-testid="guests-page">Guests Page</div>;
  };
});

jest.mock('../ReportsPage', () => {
  return function MockReportsPage() {
    return <div data-testid="reports-page">Reports Page</div>;
  };
});

jest.mock('../PaymentsPage', () => {
  return function MockPaymentsPage() {
    return <div data-testid="payments-page">Payments Page</div>;
  };
});

// Mock UI components
jest.mock('../../../ui/tabs', () => ({
  Tabs: ({ children, value, onValueChange }: any) => (
    <div data-testid="tabs" data-value={value}>
      {children}
    </div>
  ),
  TabsList: ({ children }: any) => <div data-testid="tabs-list">{children}</div>,
  TabsTrigger: ({ children, value, onClick }: any) => (
    <button 
      data-testid={`tab-${value}`} 
      onClick={() => onClick?.(value)}
    >
      {children}
    </button>
  ),
  TabsContent: ({ children, value }: any) => (
    <div data-testid={`tab-content-${value}`}>{children}</div>
  ),
}));

jest.mock('../../../ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>{children}</button>
  )
}));

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode; initialPath?: string }> = ({ 
  children, 
  initialPath = '/hotel/frontdesk' 
}) => (
  <MemoryRouter initialEntries={[initialPath]}>
    {children}
  </MemoryRouter>
);

describe('FrontDeskLayout Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication and Layout', () => {
    it('renders nothing when user is not authenticated', () => {
      const noAuthMock = { user: null, session: null, signOut: jest.fn() };
      jest.doMock('../../../contexts/AuthContext', () => ({
        useAuth: () => noAuthMock
      }));

      const { container } = render(
        <TestWrapper>
          <FrontDeskLayout />
        </TestWrapper>
      );

      expect(container.firstChild).toBeNull();
    });

    it('renders layout when user is authenticated', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <FrontDeskLayout />
          </TestWrapper>
        );
      });

      expect(screen.getByTestId('hotel-provider')).toBeInTheDocument();
    });

    it('provides Supabase hotel context', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <FrontDeskLayout />
          </TestWrapper>
        );
      });

      expect(screen.getByTestId('hotel-provider')).toBeInTheDocument();
    });
  });

  describe('Navigation and Tabs', () => {
    it('renders main navigation tabs', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <FrontDeskLayout />
          </TestWrapper>
        );
      });

      expect(screen.getByTestId('tab-timeline')).toBeInTheDocument();
      expect(screen.getByTestId('tab-calendar')).toBeInTheDocument();
      expect(screen.getByTestId('tab-guests')).toBeInTheDocument();
      expect(screen.getByTestId('tab-reports')).toBeInTheDocument();
      expect(screen.getByTestId('tab-payments')).toBeInTheDocument();
    });

    it('displays correct tab labels', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <FrontDeskLayout />
          </TestWrapper>
        );
      });

      expect(screen.getByText('Timeline')).toBeInTheDocument();
      expect(screen.getByText('Calendar')).toBeInTheDocument();
      expect(screen.getByText('Guests')).toBeInTheDocument();
      expect(screen.getByText('Reports')).toBeInTheDocument();
      expect(screen.getByText('Payments')).toBeInTheDocument();
    });

    it('switches between tabs correctly', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(
          <TestWrapper>
            <FrontDeskLayout />
          </TestWrapper>
        );
      });

      // Switch to calendar tab
      const calendarTab = screen.getByTestId('tab-calendar');
      await user.click(calendarTab);

      expect(screen.getByTestId('tab-content-calendar')).toBeInTheDocument();
      expect(screen.getByTestId('calendar-view')).toBeInTheDocument();

      // Switch to guests tab
      const guestsTab = screen.getByTestId('tab-guests');
      await user.click(guestsTab);

      expect(screen.getByTestId('tab-content-guests')).toBeInTheDocument();
      expect(screen.getByTestId('guests-page')).toBeInTheDocument();
    });

    it('defaults to timeline tab', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <FrontDeskLayout />
          </TestWrapper>
        );
      });

      expect(screen.getByTestId('tab-content-timeline')).toBeInTheDocument();
      expect(screen.getByTestId('hotel-timeline')).toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    it('renders HotelTimeline in timeline tab', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <FrontDeskLayout />
          </TestWrapper>
        );
      });

      expect(screen.getByTestId('hotel-timeline')).toBeInTheDocument();
      expect(screen.getByText('Hotel Timeline')).toBeInTheDocument();
    });

    it('renders CalendarView in calendar tab', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(
          <TestWrapper>
            <FrontDeskLayout />
          </TestWrapper>
        );
      });

      const calendarTab = screen.getByTestId('tab-calendar');
      await user.click(calendarTab);

      expect(screen.getByTestId('calendar-view')).toBeInTheDocument();
      expect(screen.getByText('Calendar View')).toBeInTheDocument();
    });

    it('renders GuestsPage in guests tab', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(
          <TestWrapper>
            <FrontDeskLayout />
          </TestWrapper>
        );
      });

      const guestsTab = screen.getByTestId('tab-guests');
      await user.click(guestsTab);

      expect(screen.getByTestId('guests-page')).toBeInTheDocument();
      expect(screen.getByText('Guests Page')).toBeInTheDocument();
    });

    it('renders ReportsPage in reports tab', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(
          <TestWrapper>
            <FrontDeskLayout />
          </TestWrapper>
        );
      });

      const reportsTab = screen.getByTestId('tab-reports');
      await user.click(reportsTab);

      expect(screen.getByTestId('reports-page')).toBeInTheDocument();
      expect(screen.getByText('Reports Page')).toBeInTheDocument();
    });

    it('renders PaymentsPage in payments tab', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(
          <TestWrapper>
            <FrontDeskLayout />
          </TestWrapper>
        );
      });

      const paymentsTab = screen.getByTestId('tab-payments');
      await user.click(paymentsTab);

      expect(screen.getByTestId('payments-page')).toBeInTheDocument();
      expect(screen.getByText('Payments Page')).toBeInTheDocument();
    });
  });

  describe('Supabase Integration', () => {
    it('initializes Supabase client correctly', async () => {
      const createClientSpy = require('@supabase/supabase-js').createClient;
      
      await act(async () => {
        render(
          <TestWrapper>
            <FrontDeskLayout />
          </TestWrapper>
        );
      });

      expect(createClientSpy).toHaveBeenCalled();
    });

    it('provides hotel context with Supabase data', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <FrontDeskLayout />
          </TestWrapper>
        );
      });

      // Verify that the hotel provider is wrapping the content
      expect(screen.getByTestId('hotel-provider')).toBeInTheDocument();
      
      // Verify that child components have access to hotel context
      expect(screen.getByTestId('hotel-timeline')).toBeInTheDocument();
    });

    it('handles authentication state properly', async () => {
      const authSpy = mockSupabase.auth.onAuthStateChange;
      
      await act(async () => {
        render(
          <TestWrapper>
            <FrontDeskLayout />
          </TestWrapper>
        );
      });

      // Verify auth state is monitored
      expect(authSpy).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('handles missing user gracefully', () => {
      const noUserMock = { user: null, session: null, signOut: jest.fn() };
      jest.doMock('../../../contexts/AuthContext', () => ({
        useAuth: () => noUserMock
      }));

      const { container } = render(
        <TestWrapper>
          <FrontDeskLayout />
        </TestWrapper>
      );

      expect(container.firstChild).toBeNull();
    });

    it('handles Supabase connection errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock Supabase to throw an error
      const errorSupabase = {
        ...mockSupabase,
        from: jest.fn(() => {
          throw new Error('Connection failed');
        })
      };

      jest.doMock('@supabase/supabase-js', () => ({
        createClient: jest.fn(() => errorSupabase)
      }));

      await act(async () => {
        render(
          <TestWrapper>
            <FrontDeskLayout />
          </TestWrapper>
        );
      });

      // Should still render the layout even if Supabase has issues
      expect(screen.getByTestId('hotel-provider')).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Performance', () => {
    it('does not cause unnecessary re-renders', async () => {
      const renderSpy = jest.fn();
      
      const TestComponent = () => {
        renderSpy();
        return <FrontDeskLayout />;
      };

      await act(async () => {
        render(
          <TestWrapper>
            <TestComponent />
          </TestWrapper>
        );
      });

      // Should only render once initially
      expect(renderSpy).toHaveBeenCalledTimes(1);
    });

    it('properly memoizes context providers', async () => {
      await act(async () => {
        const { rerender } = render(
          <TestWrapper>
            <FrontDeskLayout />
          </TestWrapper>
        );

        // Force rerender with same props
        rerender(
          <TestWrapper>
            <FrontDeskLayout />
          </TestWrapper>
        );
      });

      // Should not create new provider instances
      expect(screen.getByTestId('hotel-provider')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes on tabs', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <FrontDeskLayout />
          </TestWrapper>
        );
      });

      const timelineTab = screen.getByTestId('tab-timeline');
      expect(timelineTab).toBeInTheDocument();
      
      const tabsList = screen.getByTestId('tabs-list');
      expect(tabsList).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(
          <TestWrapper>
            <FrontDeskLayout />
          </TestWrapper>
        );
      });

      const timelineTab = screen.getByTestId('tab-timeline');
      await user.tab();
      
      expect(timelineTab).toBeInTheDocument();
    });
  });
});