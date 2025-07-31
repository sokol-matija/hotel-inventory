import React from 'react';
import { render, screen } from '@testing-library/react';
import CalendarView from '../CalendarView';

// Mock react-big-calendar since it has complex dependencies
jest.mock('react-big-calendar', () => ({
  Calendar: ({ children, ...props }: any) => <div data-testid="calendar" {...props}>{children}</div>,
  momentLocalizer: jest.fn(() => ({})),
  View: {}
}));

jest.mock('react-big-calendar/lib/addons/dragAndDrop', () => {
  return jest.fn((Calendar) => Calendar);
});

jest.mock('moment', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    format: jest.fn(() => 'January 2025')
  }))
}));

describe('CalendarView', () => {
  it('renders calendar header and components', () => {
    render(<CalendarView />);
    
    // Check main elements are present
    expect(screen.getByText('Front Desk Calendar')).toBeInTheDocument();
    expect(screen.getByText('Hotel Porec - 46 Rooms')).toBeInTheDocument();
    expect(screen.getByText('Hotel Porec Booking Calendar')).toBeInTheDocument();
  });

  it('displays reservation status legend', () => {
    render(<CalendarView />);
    
    // Check status legend colors are displayed
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
    expect(screen.getByText('Checked In')).toBeInTheDocument();
    expect(screen.getByText('Room Closure')).toBeInTheDocument();
    expect(screen.getByText('Payment Pending')).toBeInTheDocument();
  });

  it('shows room status overview sections', () => {
    render(<CalendarView />);
    
    // Check floor sections are present
    expect(screen.getByText('Room Status Overview')).toBeInTheDocument();
    expect(screen.getByText('Floor 1')).toBeInTheDocument();
    expect(screen.getByText('Floor 2')).toBeInTheDocument();
    expect(screen.getByText('Floor 3')).toBeInTheDocument();
    expect(screen.getByText('Rooftop Premium')).toBeInTheDocument();
  });

  it('displays drag and drop instructions', () => {
    render(<CalendarView />);
    
    expect(screen.getByText('Drag reservations to move between rooms/dates')).toBeInTheDocument();
    expect(screen.getByText('Resize to extend/shorten stays')).toBeInTheDocument();
    expect(screen.getByText('Click empty slots to create booking')).toBeInTheDocument();
  });

  it('has fullscreen toggle functionality', () => {
    render(<CalendarView />);
    
    const fullscreenButton = screen.getByText('Fullscreen');
    expect(fullscreenButton).toBeInTheDocument();
  });
});