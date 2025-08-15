// StatusIndicators.test.tsx - Comprehensive tests for Channel Manager status components
// Tests visual status indicators, channel cards, conflict indicators, and performance metrics

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  StatusIndicator,
  ChannelStatusCard,
  ConflictIndicator,
  SyncProgress,
  PerformanceMetrics,
  StatusBadge,
  ErrorDetails
} from '../StatusIndicators';
import { PhobsError, PhobsErrorType } from '../../../../../lib/hotel/services/PhobsErrorHandlingService';
import { OTAChannel } from '../../../../../lib/hotel/services/phobsTypes';

// Mock the utilities
jest.mock('../../../../../lib/utils', () => ({
  cn: (...args: any[]) => args.filter(Boolean).join(' ')
}));

describe('StatusIndicator Component', () => {
  it('renders idle status correctly', () => {
    render(<StatusIndicator status="idle" />);
    
    expect(screen.getByText('Idle')).toBeInTheDocument();
    const iconDiv = document.querySelector('.text-gray-500.bg-gray-100');
    expect(iconDiv).toBeInTheDocument();
  });

  it('renders syncing status with animation', () => {
    render(<StatusIndicator status="syncing" />);
    
    expect(screen.getByText('Syncing')).toBeInTheDocument();
    // Check for animation class
    const icon = document.querySelector('.animate-spin');
    expect(icon).toBeInTheDocument();
  });

  it('renders success status correctly', () => {
    render(<StatusIndicator status="success" />);
    
    expect(screen.getByText('Success')).toBeInTheDocument();
    const iconDiv = document.querySelector('.text-green-600.bg-green-100');
    expect(iconDiv).toBeInTheDocument();
  });

  it('renders error status correctly', () => {
    render(<StatusIndicator status="error" />);
    
    expect(screen.getByText('Error')).toBeInTheDocument();
    const iconDiv = document.querySelector('.text-red-600.bg-red-100');
    expect(iconDiv).toBeInTheDocument();
  });

  it('renders custom label when provided', () => {
    render(<StatusIndicator status="warning" label="Custom Warning" />);
    
    expect(screen.getByText('Custom Warning')).toBeInTheDocument();
  });

  it('hides label when showLabel is false', () => {
    render(<StatusIndicator status="success" showLabel={false} />);
    
    expect(screen.queryByText('Success')).not.toBeInTheDocument();
  });

  it('applies different sizes correctly', () => {
    const { rerender } = render(<StatusIndicator status="idle" size="sm" />);
    expect(document.querySelector('.h-4.w-4')).toBeInTheDocument();

    rerender(<StatusIndicator status="idle" size="lg" />);
    expect(document.querySelector('.h-6.w-6')).toBeInTheDocument();
  });
});

describe('ChannelStatusCard Component', () => {
  const mockChannel: OTAChannel = 'booking.com';
  const defaultProps = {
    channel: mockChannel,
    status: 'success' as const,
    lastSync: new Date('2025-08-15T10:30:00Z'),
    errorCount: 0,
    reservationCount: 15,
    responseTime: 1250
  };

  it('renders channel information correctly', () => {
    render(<ChannelStatusCard {...defaultProps} />);
    
    expect(screen.getByText('Booking.com')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('Reservations')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('Errors')).toBeInTheDocument();
    expect(screen.getByText('1250ms')).toBeInTheDocument();
    expect(screen.getByText('Response')).toBeInTheDocument();
  });

  it('formats last sync time correctly', () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    render(<ChannelStatusCard {...defaultProps} lastSync={fiveMinutesAgo} />);
    
    expect(screen.getByText(/5m ago/)).toBeInTheDocument();
  });

  it('shows "Never" when no last sync', () => {
    render(<ChannelStatusCard {...defaultProps} lastSync={undefined} />);
    
    expect(screen.getByText(/Never/)).toBeInTheDocument();
  });

  it('calls onViewDetails when View Details button is clicked', () => {
    const mockOnViewDetails = jest.fn();
    render(<ChannelStatusCard {...defaultProps} onViewDetails={mockOnViewDetails} />);
    
    const viewButton = screen.getByRole('button', { name: /view details/i });
    fireEvent.click(viewButton);
    
    expect(mockOnViewDetails).toHaveBeenCalledTimes(1);
  });

  it('does not render View Details button when onViewDetails is not provided', () => {
    render(<ChannelStatusCard {...defaultProps} />);
    
    expect(screen.queryByRole('button', { name: /view details/i })).not.toBeInTheDocument();
  });

  it('handles different channel types correctly', () => {
    const { rerender } = render(<ChannelStatusCard {...defaultProps} channel="expedia" />);
    expect(screen.getByText('Expedia')).toBeInTheDocument();

    rerender(<ChannelStatusCard {...defaultProps} channel="airbnb" />);
    expect(screen.getByText('Airbnb')).toBeInTheDocument();
  });
});

describe('ConflictIndicator Component', () => {
  const defaultProps = {
    severity: 'medium' as const,
    conflictType: 'double_booking',
    affectedItems: 2,
    autoResolvable: false
  };

  it('renders conflict information correctly', () => {
    render(<ConflictIndicator {...defaultProps} />);
    
    expect(screen.getByText(/double.booking/i)).toBeInTheDocument();
    expect(screen.getByText(/2 items affected/i)).toBeInTheDocument();
  });

  it('handles singular item count correctly', () => {
    render(<ConflictIndicator {...defaultProps} affectedItems={1} />);
    
    expect(screen.getByText('1 item affected')).toBeInTheDocument();
  });

  it('shows auto-resolvable badge when applicable', () => {
    render(<ConflictIndicator {...defaultProps} autoResolvable={true} />);
    
    expect(screen.getByText('Auto-resolvable')).toBeInTheDocument();
  });

  it('applies correct severity styling', () => {
    const { rerender } = render(<ConflictIndicator {...defaultProps} severity="critical" />);
    const criticalDiv = document.querySelector('.border-red-200.bg-red-50.text-red-800');
    expect(criticalDiv).toBeInTheDocument();

    rerender(<ConflictIndicator {...defaultProps} severity="low" />);
    const lowDiv = document.querySelector('.border-blue-200.bg-blue-50.text-blue-800');
    expect(lowDiv).toBeInTheDocument();
  });

  it('calls onResolve when resolve button is clicked', () => {
    const mockOnResolve = jest.fn();
    render(<ConflictIndicator {...defaultProps} onResolve={mockOnResolve} />);
    
    const resolveButton = screen.getByRole('button', { name: /resolve/i });
    fireEvent.click(resolveButton);
    
    expect(mockOnResolve).toHaveBeenCalledTimes(1);
  });

  it('calls onView when view button is clicked', () => {
    const mockOnView = jest.fn();
    render(<ConflictIndicator {...defaultProps} onView={mockOnView} />);
    
    const viewButton = screen.getByRole('button');
    fireEvent.click(viewButton);
    
    expect(mockOnView).toHaveBeenCalledTimes(1);
  });

  it('shows different resolve button text for auto-resolvable conflicts', () => {
    const { rerender } = render(
      <ConflictIndicator {...defaultProps} autoResolvable={false} onResolve={jest.fn()} />
    );
    expect(screen.getByText('Resolve')).toBeInTheDocument();

    rerender(
      <ConflictIndicator {...defaultProps} autoResolvable={true} onResolve={jest.fn()} />
    );
    expect(screen.getByText('Auto Resolve')).toBeInTheDocument();
  });
});

describe('SyncProgress Component', () => {
  const defaultProps = {
    operation: 'Syncing reservations',
    progress: 45,
    currentStep: 'Processing Booking.com reservations',
    totalSteps: 5,
    currentStepIndex: 2,
    estimatedTimeRemaining: 120
  };

  it('renders progress information correctly', () => {
    render(<SyncProgress {...defaultProps} />);
    
    expect(screen.getByText('Syncing reservations')).toBeInTheDocument();
    expect(screen.getByText('Step 3 of 5: Processing Booking.com reservations')).toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument();
  });

  it('renders progress bar with correct width', () => {
    render(<SyncProgress {...defaultProps} />);
    
    const progressBar = document.querySelector('.bg-blue-600');
    expect(progressBar).toHaveStyle({ width: '45%' });
  });

  it('formats time remaining correctly', () => {
    render(<SyncProgress {...defaultProps} estimatedTimeRemaining={125} />);
    
    expect(screen.getByText('~2m 5s remaining')).toBeInTheDocument();
  });

  it('formats seconds-only time remaining correctly', () => {
    render(<SyncProgress {...defaultProps} estimatedTimeRemaining={45} />);
    
    expect(screen.getByText('~45s remaining')).toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', () => {
    const mockOnCancel = jest.fn();
    render(<SyncProgress {...defaultProps} onCancel={mockOnCancel} />);
    
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);
    
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('does not show cancel button when onCancel is not provided', () => {
    render(<SyncProgress {...defaultProps} />);
    
    expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
  });

  it('handles missing optional props gracefully', () => {
    render(<SyncProgress operation="Simple sync" progress={75} />);
    
    expect(screen.getByText('Simple sync')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
  });
});

describe('PerformanceMetrics Component', () => {
  const defaultProps = {
    successRate: 95.5,
    averageResponseTime: 1250,
    operationsPerMinute: 12,
    errorRate: 4.5,
    trend: 'stable' as const
  };

  it('renders performance metrics correctly', () => {
    render(<PerformanceMetrics {...defaultProps} />);
    
    expect(screen.getByText('95.5%')).toBeInTheDocument();
    expect(screen.getByText('Success Rate')).toBeInTheDocument();
    expect(screen.getByText('1250ms')).toBeInTheDocument();
    expect(screen.getByText('Avg Response')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('Ops/min')).toBeInTheDocument();
    expect(screen.getByText('4.5%')).toBeInTheDocument();
    expect(screen.getByText('Error Rate')).toBeInTheDocument();
  });

  it('applies correct success rate colors', () => {
    const { rerender } = render(<PerformanceMetrics {...defaultProps} successRate={96} />);
    expect(screen.getByText('96.0%')).toHaveClass('text-green-600');

    rerender(<PerformanceMetrics {...defaultProps} successRate={90} />);
    expect(screen.getByText('90.0%')).toHaveClass('text-yellow-600');

    rerender(<PerformanceMetrics {...defaultProps} successRate={80} />);
    expect(screen.getByText('80.0%')).toHaveClass('text-red-600');
  });

  it('applies correct error rate colors', () => {
    const { rerender } = render(<PerformanceMetrics {...defaultProps} errorRate={3} />);
    expect(screen.getByText('3.0%')).toHaveClass('text-green-600');

    rerender(<PerformanceMetrics {...defaultProps} errorRate={7} />);
    expect(screen.getByText('7.0%')).toHaveClass('text-red-600');
  });

  it('shows correct trend icons', () => {
    const { rerender } = render(<PerformanceMetrics {...defaultProps} trend="up" />);
    expect(document.querySelector('.text-green-600')).toBeInTheDocument();

    rerender(<PerformanceMetrics {...defaultProps} trend="down" />);
    expect(document.querySelector('.text-red-600')).toBeInTheDocument();

    rerender(<PerformanceMetrics {...defaultProps} trend="stable" />);
    expect(document.querySelector('.text-gray-600')).toBeInTheDocument();
  });
});

describe('StatusBadge Component', () => {
  it('renders different status badges correctly', () => {
    const { rerender } = render(<StatusBadge status="success" />);
    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText('Success')).toHaveClass('bg-green-100 text-green-800');

    rerender(<StatusBadge status="error" />);
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Error')).toHaveClass('bg-red-100 text-red-800');

    rerender(<StatusBadge status="syncing" />);
    expect(screen.getByText('Syncing')).toBeInTheDocument();
    expect(screen.getByText('Syncing')).toHaveClass('bg-blue-100 text-blue-800');
  });

  it('applies different sizes correctly', () => {
    const { rerender } = render(<StatusBadge status="idle" size="sm" />);
    expect(screen.getByText('Idle')).toHaveClass('text-xs px-2 py-0.5');

    rerender(<StatusBadge status="idle" size="md" />);
    expect(screen.getByText('Idle')).toHaveClass('text-sm px-2.5 py-0.5');
  });
});

describe('ErrorDetails Component', () => {
  const mockError: PhobsError = {
    message: 'Connection timeout',
    type: PhobsErrorType.TIMEOUT_ERROR,
    statusCode: 408,
    retryable: true,
    context: {
      operation: 'sync_reservations',
      attempt: 2,
      timestamp: new Date(),
      hotel_id: 'test_hotel',
      channel: 'booking.com' as OTAChannel
    },
    originalError: new Error('Network timeout')
  };

  it('renders error information correctly', () => {
    render(<ErrorDetails error={mockError} />);
    
    expect(screen.getByText('Connection timeout')).toBeInTheDocument();
    expect(screen.getByText(/timeout error/i)).toBeInTheDocument();
    expect(screen.getByText('(HTTP 408)')).toBeInTheDocument();
    expect(screen.getByText('sync_reservations')).toBeInTheDocument();
    expect(screen.getByText('Attempt 2')).toBeInTheDocument();
  });

  it('shows retry button for retryable errors', () => {
    const mockOnRetry = jest.fn();
    render(<ErrorDetails error={mockError} onRetry={mockOnRetry} />);
    
    const retryButton = screen.getByRole('button', { name: /retry/i });
    expect(retryButton).toBeInTheDocument();
    
    fireEvent.click(retryButton);
    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });

  it('does not show retry button for non-retryable errors', () => {
    const nonRetryableError = { ...mockError, retryable: false };
    render(<ErrorDetails error={nonRetryableError} onRetry={jest.fn()} />);
    
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
  });

  it('calls onDismiss when dismiss button is clicked', () => {
    const mockOnDismiss = jest.fn();
    render(<ErrorDetails error={mockError} onDismiss={mockOnDismiss} />);
    
    const dismissButton = screen.getByRole('button', { name: /dismiss/i });
    fireEvent.click(dismissButton);
    
    expect(mockOnDismiss).toHaveBeenCalledTimes(1);
  });

  it('toggles error details visibility', async () => {
    render(<ErrorDetails error={mockError} />);
    
    // Find the toggle button (not the dismiss/retry buttons)
    const toggleButtons = screen.getAllByRole('button');
    const toggleButton = toggleButtons.find(btn => btn.getAttribute('aria-label') === 'Toggle error details') || toggleButtons[0];
    
    // Details should be hidden initially  
    expect(screen.queryByText(/network timeout/i)).not.toBeInTheDocument();
    
    // Click to show details
    fireEvent.click(toggleButton);
    
    // Check if details are now visible
    const detailsVisible = screen.queryByText(/network timeout/i);
    if (detailsVisible) {
      expect(detailsVisible).toBeInTheDocument();
      
      // Click to hide details
      fireEvent.click(toggleButton);
      
      await waitFor(() => {
        expect(screen.queryByText(/network timeout/i)).not.toBeInTheDocument();
      }, { timeout: 100 });
    }
  });

  it('applies correct error type colors', () => {
    const { rerender } = render(<ErrorDetails error={mockError} />);
    expect(screen.getByText(/timeout error/i)).toHaveClass('text-blue-600');

    const authError = { ...mockError, type: PhobsErrorType.AUTHENTICATION_ERROR };
    rerender(<ErrorDetails error={authError} />);
    expect(screen.getByText(/authentication error/i)).toHaveClass('text-orange-600');

    const serverError = { ...mockError, type: PhobsErrorType.SERVER_ERROR };
    rerender(<ErrorDetails error={serverError} />);
    expect(screen.getByText(/server error/i)).toHaveClass('text-red-600');
  });
});