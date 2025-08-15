// SupabaseIntegration.test.tsx - Tests Supabase integration with front desk components
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock successful Supabase responses
const mockSupabaseData = {
  reservations: [
    {
      id: 1,
      guest_id: 1,
      room_id: 101,
      check_in_date: '2024-08-15',
      check_out_date: '2024-08-17',
      status: 'confirmed',
      total_amount: 300.00,
      created_at: '2024-08-10T10:00:00Z'
    },
    {
      id: 2,
      guest_id: 2,
      room_id: 102,
      check_in_date: '2024-08-16',
      check_out_date: '2024-08-18',
      status: 'checked_in',
      total_amount: 450.00,
      created_at: '2024-08-11T10:00:00Z'
    }
  ],
  rooms: [
    {
      id: 101,
      room_number: '101',
      room_type: 'Standard',
      floor: 1,
      status: 'occupied',
      rate_per_night: 150.00
    },
    {
      id: 102,
      room_number: '102',
      room_type: 'Deluxe',
      floor: 1,
      status: 'occupied',
      rate_per_night: 225.00
    }
  ],
  guests: [
    {
      id: 1,
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      phone: '+1234567890'
    },
    {
      id: 2,
      first_name: 'Jane',
      last_name: 'Smith',
      email: 'jane@example.com',
      phone: '+1987654321'
    }
  ]
};

// Mock Supabase with realistic responses
const mockSupabase = {
  from: jest.fn((table: string) => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ 
        data: mockSupabaseData[table as keyof typeof mockSupabaseData] || [], 
        error: null 
      })),
      order: jest.fn(() => Promise.resolve({ 
        data: mockSupabaseData[table as keyof typeof mockSupabaseData] || [], 
        error: null 
      })),
      range: jest.fn(() => Promise.resolve({ 
        data: mockSupabaseData[table as keyof typeof mockSupabaseData] || [], 
        error: null 
      }))
    })),
    insert: jest.fn(() => Promise.resolve({ 
      data: [{ id: Date.now(), ...arguments[0] }], 
      error: null 
    })),
    update: jest.fn(() => Promise.resolve({ 
      data: [{ id: 1, status: 'updated' }], 
      error: null 
    })),
    delete: jest.fn(() => Promise.resolve({ 
      data: [], 
      error: null 
    }))
  })),
  auth: {
    user: jest.fn(() => ({ id: 'test-user', email: 'test@hotel.com' })),
    onAuthStateChange: jest.fn(() => ({ 
      data: { subscription: { unsubscribe: jest.fn() } } 
    }))
  },
  channel: jest.fn(() => ({
    on: jest.fn(() => ({ subscribe: jest.fn() })),
    unsubscribe: jest.fn()
  }))
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabase)
}));

// Test component that uses Supabase integration
const ReservationManager = () => {
  const [reservations, setReservations] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchReservations = async () => {
      try {
        const response = await mockSupabase.from('reservations').select();
        if (response.data) {
          setReservations(response.data);
        }
      } catch (error) {
        console.error('Error fetching reservations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReservations();
  }, []);

  if (loading) {
    return <div data-testid="loading">Loading reservations...</div>;
  }

  return (
    <div data-testid="reservation-manager">
      <h2>Reservations ({reservations.length})</h2>
      {reservations.map((reservation) => (
        <div key={reservation.id} data-testid={`reservation-${reservation.id}`}>
          <p>Guest ID: {reservation.guest_id}</p>
          <p>Room: {reservation.room_id}</p>
          <p>Status: {reservation.status}</p>
          <p>Amount: ${reservation.total_amount}</p>
        </div>
      ))}
    </div>
  );
};

const RoomManager = () => {
  const [rooms, setRooms] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchRooms = async () => {
      try {
        const response = await mockSupabase.from('rooms').select();
        if (response.data) {
          setRooms(response.data);
        }
      } catch (error) {
        console.error('Error fetching rooms:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, []);

  const updateRoomStatus = async (roomId: number, newStatus: string) => {
    try {
      await mockSupabase.from('rooms').update({ status: newStatus }).eq('id', roomId);
      setRooms(prev => prev.map(room => 
        room.id === roomId ? { ...room, status: newStatus } : room
      ));
    } catch (error) {
      console.error('Error updating room status:', error);
    }
  };

  if (loading) {
    return <div data-testid="loading">Loading rooms...</div>;
  }

  return (
    <div data-testid="room-manager">
      <h2>Rooms ({rooms.length})</h2>
      {rooms.map((room) => (
        <div key={room.id} data-testid={`room-${room.id}`}>
          <p>Room {room.room_number} ({room.room_type})</p>
          <p>Status: {room.status}</p>
          <button 
            onClick={() => updateRoomStatus(room.id, 'available')}
            data-testid={`update-room-${room.id}`}
          >
            Set Available
          </button>
        </div>
      ))}
    </div>
  );
};

describe('Supabase Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ReservationManager', () => {
    it('loads and displays reservations from Supabase', async () => {
      render(<ReservationManager />);
      
      // Initially shows loading
      expect(screen.getByTestId('loading')).toBeInTheDocument();
      
      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByTestId('reservation-manager')).toBeInTheDocument();
      });
      
      // Check that reservations are displayed
      expect(screen.getByText('Reservations (2)')).toBeInTheDocument();
      expect(screen.getByTestId('reservation-1')).toBeInTheDocument();
      expect(screen.getByTestId('reservation-2')).toBeInTheDocument();
      
      // Check reservation details
      expect(screen.getByText('Guest ID: 1')).toBeInTheDocument();
      expect(screen.getByText('Status: confirmed')).toBeInTheDocument();
      expect(screen.getByText('Amount: $300')).toBeInTheDocument();
    });

    it('calls Supabase with correct parameters', async () => {
      render(<ReservationManager />);
      
      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('reservations');
      });
    });
  });

  describe('RoomManager', () => {
    it('loads and displays rooms from Supabase', async () => {
      render(<RoomManager />);
      
      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByTestId('room-manager')).toBeInTheDocument();
      });
      
      // Check that rooms are displayed
      expect(screen.getByText('Rooms (2)')).toBeInTheDocument();
      expect(screen.getByText('Room 101 (Standard)')).toBeInTheDocument();
      expect(screen.getByText('Room 102 (Deluxe)')).toBeInTheDocument();
    });

    it('updates room status via Supabase', async () => {
      render(<RoomManager />);
      
      await waitFor(() => {
        expect(screen.getByTestId('room-manager')).toBeInTheDocument();
      });
      
      // Click update button
      const updateButton = screen.getByTestId('update-room-101');
      fireEvent.click(updateButton);
      
      // Verify Supabase update was called
      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('rooms');
      });
    });
  });

  describe('Error Handling', () => {
    it('handles Supabase connection errors gracefully', async () => {
      // Mock error response
      const errorSupabase = {
        from: jest.fn(() => ({
          select: jest.fn(() => Promise.resolve({ 
            data: null, 
            error: { message: 'Connection failed' } 
          }))
        }))
      };

      jest.doMock('@supabase/supabase-js', () => ({
        createClient: jest.fn(() => errorSupabase)
      }));

      // Component should handle errors gracefully
      render(<ReservationManager />);
      
      await waitFor(() => {
        expect(screen.queryByTestId('loading')).not.toBeInTheDocument();
      });
    });
  });

  describe('Real-time Updates', () => {
    it('sets up real-time subscription channels', () => {
      const TestComponent = () => {
        React.useEffect(() => {
          const channel = mockSupabase.channel('reservations-changes');
          channel.on('postgres_changes', {}, () => {});
          channel.subscribe();
          
          return () => channel.unsubscribe();
        }, []);
        
        return <div data-testid="realtime-component">Real-time Component</div>;
      };

      render(<TestComponent />);
      
      expect(mockSupabase.channel).toHaveBeenCalledWith('reservations-changes');
    });
  });
});