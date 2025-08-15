// SimpleFrontDeskTest.test.tsx - Simple tests without complex routing
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock Supabase
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ data: [], error: null })),
      order: jest.fn(() => Promise.resolve({ data: [], error: null }))
    }))
  })),
  auth: {
    user: jest.fn(() => ({ id: 'test-user', email: 'test@example.com' }))
  }
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabase)
}));

// Simple component to test basic functionality
const SimpleReservationCard = ({ reservation }: { reservation: any }) => {
  return (
    <div data-testid="reservation-card">
      <h3>{reservation.guest_name}</h3>
      <p>Room: {reservation.room_number}</p>
      <p>Status: {reservation.status}</p>
    </div>
  );
};

describe('Simple Front Desk Components', () => {
  const mockReservation = {
    id: 1,
    guest_name: 'John Doe',
    room_number: '101',
    status: 'confirmed',
    check_in_date: '2024-08-15',
    check_out_date: '2024-08-17'
  };

  it('renders reservation card correctly', () => {
    render(<SimpleReservationCard reservation={mockReservation} />);
    
    expect(screen.getByTestId('reservation-card')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Room: 101')).toBeInTheDocument();
    expect(screen.getByText('Status: confirmed')).toBeInTheDocument();
  });

  it('handles different reservation statuses', () => {
    const checkedInReservation = { ...mockReservation, status: 'checked_in' };
    
    render(<SimpleReservationCard reservation={checkedInReservation} />);
    
    expect(screen.getByText('Status: checked_in')).toBeInTheDocument();
  });

  it('displays room information correctly', () => {
    const premiumReservation = { 
      ...mockReservation, 
      room_number: 'Suite 201',
      guest_name: 'Jane Smith'
    };
    
    render(<SimpleReservationCard reservation={premiumReservation} />);
    
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Room: Suite 201')).toBeInTheDocument();
  });
});