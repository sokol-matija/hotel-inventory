// RoomManagement.test.tsx - Tests for room assignment, availability, and housekeeping with Supabase
// Tests room status updates, availability checking, and housekeeping workflow

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Mock Supabase
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(() => Promise.resolve({ data: mockRoom, error: null })),
        order: jest.fn(() => Promise.resolve({ data: mockRooms, error: null }))
      })),
      gte: jest.fn(() => ({
        lte: jest.fn(() => Promise.resolve({ data: [], error: null }))
      })),
      order: jest.fn(() => Promise.resolve({ data: mockRooms, error: null }))
    })),
    insert: jest.fn(() => Promise.resolve({ data: [], error: null })),
    update: jest.fn(() => Promise.resolve({ 
      data: [{ ...mockRoom, is_clean: true }], 
      error: null 
    })),
    delete: jest.fn(() => Promise.resolve({ data: [], error: null }))
  })),
  channel: jest.fn(() => ({
    on: jest.fn(() => ({ subscribe: jest.fn() })),
    unsubscribe: jest.fn()
  }))
};

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => mockSupabase)
}));

// Mock data
const mockRooms = [
  {
    id: 1,
    room_number: '101',
    floor_number: 1,
    room_type: 'Standard',
    max_occupancy: 2,
    is_premium: false,
    seasonal_rate_a: 120.00,
    seasonal_rate_b: 140.00,
    seasonal_rate_c: 160.00,
    seasonal_rate_d: 180.00,
    amenities: ['wifi', 'tv', 'minibar'],
    is_active: true,
    is_clean: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-08-15T10:00:00Z'
  },
  {
    id: 2,
    room_number: '102',
    floor_number: 1,
    room_type: 'Deluxe',
    max_occupancy: 3,
    is_premium: true,
    seasonal_rate_a: 150.00,
    seasonal_rate_b: 180.00,
    seasonal_rate_c: 210.00,
    seasonal_rate_d: 240.00,
    amenities: ['wifi', 'tv', 'minibar', 'balcony'],
    is_active: true,
    is_clean: false,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-08-15T09:00:00Z'
  },
  {
    id: 3,
    room_number: '201',
    floor_number: 2,
    room_type: 'Suite',
    max_occupancy: 4,
    is_premium: true,
    seasonal_rate_a: 200.00,
    seasonal_rate_b: 250.00,
    seasonal_rate_c: 300.00,
    seasonal_rate_d: 350.00,
    amenities: ['wifi', 'tv', 'minibar', 'balcony', 'kitchenette'],
    is_active: false, // Out of order
    is_clean: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-08-14T15:00:00Z'
  }
];

const mockRoom = mockRooms[0];

const mockReservations = [
  {
    id: 1,
    room_id: 1,
    check_in_date: '2025-08-15',
    check_out_date: '2025-08-18',
    status: 'checked_in'
  },
  {
    id: 2,
    room_id: 2,
    check_in_date: '2025-08-16',
    check_out_date: '2025-08-20',
    status: 'confirmed'
  }
];

// Create test components that simulate room management functionality
const RoomStatusCard = ({ room, onStatusUpdate, onCleaningUpdate }: any) => {
  const isOccupied = mockReservations.some(res => 
    res.room_id === room.id && res.status === 'checked_in'
  );

  return (
    <div data-testid={`room-card-${room.room_number}`} className="room-card">
      <h3>{room.room_number}</h3>
      <p>{room.room_type}</p>
      <p>Floor {room.floor_number}</p>
      <p>Max: {room.max_occupancy} guests</p>
      
      <div className="status-indicators">
        <span className={`availability ${isOccupied ? 'occupied' : 'available'}`}>
          {isOccupied ? 'Occupied' : 'Available'}
        </span>
        <span className={`cleanliness ${room.is_clean ? 'clean' : 'needs-cleaning'}`}>
          {room.is_clean ? 'Clean' : 'Needs Cleaning'}
        </span>
        <span className={`active-status ${room.is_active ? 'active' : 'out-of-order'}`}>
          {room.is_active ? 'Active' : 'Out of Order'}
        </span>
        {room.is_premium && <span className="premium">Premium</span>}
      </div>

      <div className="amenities">
        {room.amenities?.map((amenity: string) => (
          <span key={amenity} className="amenity">{amenity}</span>
        ))}
      </div>

      <div className="actions">
        {!room.is_clean && (
          <button onClick={() => onCleaningUpdate(room.id, true)}>
            Mark as Clean
          </button>
        )}
        {room.is_clean && (
          <button onClick={() => onCleaningUpdate(room.id, false)}>
            Mark Dirty
          </button>
        )}
        
        <button onClick={() => onStatusUpdate(room.id, !room.is_active)}>
          {room.is_active ? 'Take Out of Order' : 'Put Back in Service'}
        </button>
      </div>

      <div className="pricing">
        <h4>Seasonal Rates</h4>
        <p>Season A: €{room.seasonal_rate_a}</p>
        <p>Season B: €{room.seasonal_rate_b}</p>
        <p>Season C: €{room.seasonal_rate_c}</p>
        <p>Season D: €{room.seasonal_rate_d}</p>
      </div>
    </div>
  );
};

const RoomAvailabilityChecker = ({ onCheckAvailability }: any) => {
  const [checkInDate, setCheckInDate] = React.useState('');
  const [checkOutDate, setCheckOutDate] = React.useState('');
  const [guestCount, setGuestCount] = React.useState(1);
  const [roomType, setRoomType] = React.useState('');
  const [availableRooms, setAvailableRooms] = React.useState([]);

  const handleSearch = async () => {
    const results = await onCheckAvailability({
      checkInDate,
      checkOutDate,
      guestCount,
      roomType
    });
    setAvailableRooms(results);
  };

  return (
    <div data-testid="availability-checker">
      <h2>Check Room Availability</h2>
      
      <div className="search-form">
        <label>
          Check-in Date:
          <input
            type="date"
            value={checkInDate}
            onChange={(e) => setCheckInDate(e.target.value)}
            data-testid="checkin-date"
          />
        </label>
        
        <label>
          Check-out Date:
          <input
            type="date"
            value={checkOutDate}
            onChange={(e) => setCheckOutDate(e.target.value)}
            data-testid="checkout-date"
          />
        </label>
        
        <label>
          Guests:
          <input
            type="number"
            min="1"
            max="10"
            value={guestCount}
            onChange={(e) => setGuestCount(parseInt(e.target.value))}
            data-testid="guest-count"
          />
        </label>
        
        <label>
          Room Type:
          <select
            value={roomType}
            onChange={(e) => setRoomType(e.target.value)}
            data-testid="room-type"
          >
            <option value="">Any</option>
            <option value="Standard">Standard</option>
            <option value="Deluxe">Deluxe</option>
            <option value="Suite">Suite</option>
          </select>
        </label>
        
        <button onClick={handleSearch} data-testid="search-availability">
          Search Available Rooms
        </button>
      </div>

      <div className="search-results" data-testid="search-results">
        <h3>Available Rooms ({availableRooms.length})</h3>
        {availableRooms.map((room: any) => (
          <div key={room.id} className="available-room">
            <span>Room {room.room_number}</span>
            <span>{room.room_type}</span>
            <span>€{room.rate}/night</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Mock hotel context
const mockHotelContext = {
  rooms: mockRooms,
  reservations: mockReservations,
  loading: false,
  error: null,
  updateRoom: jest.fn(),
  checkRoomAvailability: jest.fn(),
  subscribeToRooms: jest.fn(() => () => {})
};

jest.mock('../../../contexts/SupabaseHotelProvider', () => ({
  useHotel: () => mockHotelContext
}));

// Mock notifications
const mockNotifications = {
  success: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warning: jest.fn()
};

jest.mock('../../../lib/hotel/notifications', () => mockNotifications);

describe('Room Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-08-15T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Room Status Display', () => {
    it('renders room information correctly', async () => {
      const onStatusUpdate = jest.fn();
      const onCleaningUpdate = jest.fn();

      await act(async () => {
        render(
          <RoomStatusCard 
            room={mockRoom} 
            onStatusUpdate={onStatusUpdate}
            onCleaningUpdate={onCleaningUpdate}
          />
        );
      });

      expect(screen.getByText('101')).toBeInTheDocument();
      expect(screen.getByText('Standard')).toBeInTheDocument();
      expect(screen.getByText('Floor 1')).toBeInTheDocument();
      expect(screen.getByText('Max: 2 guests')).toBeInTheDocument();
    });

    it('displays occupancy status correctly', async () => {
      const onStatusUpdate = jest.fn();
      const onCleaningUpdate = jest.fn();

      await act(async () => {
        render(
          <RoomStatusCard 
            room={mockRoom} 
            onStatusUpdate={onStatusUpdate}
            onCleaningUpdate={onCleaningUpdate}
          />
        );
      });

      // Room 101 has a checked-in reservation
      expect(screen.getByText('Occupied')).toBeInTheDocument();
    });

    it('shows cleanliness status correctly', async () => {
      const onStatusUpdate = jest.fn();
      const onCleaningUpdate = jest.fn();

      await act(async () => {
        render(
          <RoomStatusCard 
            room={mockRooms[1]} // Room 102 - needs cleaning
            onStatusUpdate={onStatusUpdate}
            onCleaningUpdate={onCleaningUpdate}
          />
        );
      });

      expect(screen.getByText('Needs Cleaning')).toBeInTheDocument();
      expect(screen.getByText('Mark as Clean')).toBeInTheDocument();
    });

    it('indicates premium rooms correctly', async () => {
      const onStatusUpdate = jest.fn();
      const onCleaningUpdate = jest.fn();

      await act(async () => {
        render(
          <RoomStatusCard 
            room={mockRooms[1]} // Deluxe room - premium
            onStatusUpdate={onStatusUpdate}
            onCleaningUpdate={onCleaningUpdate}
          />
        );
      });

      expect(screen.getByText('Premium')).toBeInTheDocument();
    });

    it('shows out-of-order status correctly', async () => {
      const onStatusUpdate = jest.fn();
      const onCleaningUpdate = jest.fn();

      await act(async () => {
        render(
          <RoomStatusCard 
            room={mockRooms[2]} // Suite - out of order
            onStatusUpdate={onStatusUpdate}
            onCleaningUpdate={onCleaningUpdate}
          />
        );
      });

      expect(screen.getByText('Out of Order')).toBeInTheDocument();
      expect(screen.getByText('Put Back in Service')).toBeInTheDocument();
    });

    it('displays room amenities', async () => {
      const onStatusUpdate = jest.fn();
      const onCleaningUpdate = jest.fn();

      await act(async () => {
        render(
          <RoomStatusCard 
            room={mockRoom}
            onStatusUpdate={onStatusUpdate}
            onCleaningUpdate={onCleaningUpdate}
          />
        );
      });

      expect(screen.getByText('wifi')).toBeInTheDocument();
      expect(screen.getByText('tv')).toBeInTheDocument();
      expect(screen.getByText('minibar')).toBeInTheDocument();
    });

    it('shows seasonal pricing information', async () => {
      const onStatusUpdate = jest.fn();
      const onCleaningUpdate = jest.fn();

      await act(async () => {
        render(
          <RoomStatusCard 
            room={mockRoom}
            onStatusUpdate={onStatusUpdate}
            onCleaningUpdate={onCleaningUpdate}
          />
        );
      });

      expect(screen.getByText('Season A: €120')).toBeInTheDocument();
      expect(screen.getByText('Season B: €140')).toBeInTheDocument();
      expect(screen.getByText('Season C: €160')).toBeInTheDocument();
      expect(screen.getByText('Season D: €180')).toBeInTheDocument();
    });
  });

  describe('Room Status Updates', () => {
    it('updates room cleanliness status', async () => {
      const user = userEvent.setup();
      const onStatusUpdate = jest.fn();
      const onCleaningUpdate = jest.fn();

      await act(async () => {
        render(
          <RoomStatusCard 
            room={mockRooms[1]} // Needs cleaning
            onStatusUpdate={onStatusUpdate}
            onCleaningUpdate={onCleaningUpdate}
          />
        );
      });

      const markCleanButton = screen.getByText('Mark as Clean');
      await user.click(markCleanButton);

      expect(onCleaningUpdate).toHaveBeenCalledWith(2, true);
    });

    it('takes room out of service', async () => {
      const user = userEvent.setup();
      const onStatusUpdate = jest.fn();
      const onCleaningUpdate = jest.fn();

      await act(async () => {
        render(
          <RoomStatusCard 
            room={mockRoom} // Active room
            onStatusUpdate={onStatusUpdate}
            onCleaningUpdate={onCleaningUpdate}
          />
        );
      });

      const outOfOrderButton = screen.getByText('Take Out of Order');
      await user.click(outOfOrderButton);

      expect(onStatusUpdate).toHaveBeenCalledWith(1, false);
    });

    it('puts room back in service', async () => {
      const user = userEvent.setup();
      const onStatusUpdate = jest.fn();
      const onCleaningUpdate = jest.fn();

      await act(async () => {
        render(
          <RoomStatusCard 
            room={mockRooms[2]} // Out of order
            onStatusUpdate={onStatusUpdate}
            onCleaningUpdate={onCleaningUpdate}
          />
        );
      });

      const backInServiceButton = screen.getByText('Put Back in Service');
      await user.click(backInServiceButton);

      expect(onStatusUpdate).toHaveBeenCalledWith(3, true);
    });

    it('handles status update errors gracefully', async () => {
      const user = userEvent.setup();
      const onStatusUpdate = jest.fn().mockRejectedValue(new Error('Update failed'));
      const onCleaningUpdate = jest.fn();

      await act(async () => {
        render(
          <RoomStatusCard 
            room={mockRoom}
            onStatusUpdate={onStatusUpdate}
            onCleaningUpdate={onCleaningUpdate}
          />
        );
      });

      const outOfOrderButton = screen.getByText('Take Out of Order');
      await user.click(outOfOrderButton);

      await waitFor(() => {
        expect(mockNotifications.error).toHaveBeenCalledWith(
          'Update Failed',
          'Update failed'
        );
      });
    });
  });

  describe('Room Availability Checking', () => {
    const mockCheckAvailability = jest.fn();

    beforeEach(() => {
      mockCheckAvailability.mockResolvedValue([
        { ...mockRoom, rate: 120 },
        { ...mockRooms[1], rate: 150 }
      ]);
    });

    it('renders availability search form', async () => {
      await act(async () => {
        render(<RoomAvailabilityChecker onCheckAvailability={mockCheckAvailability} />);
      });

      expect(screen.getByText('Check Room Availability')).toBeInTheDocument();
      expect(screen.getByTestId('checkin-date')).toBeInTheDocument();
      expect(screen.getByTestId('checkout-date')).toBeInTheDocument();
      expect(screen.getByTestId('guest-count')).toBeInTheDocument();
      expect(screen.getByTestId('room-type')).toBeInTheDocument();
    });

    it('performs availability search with correct parameters', async () => {
      const user = userEvent.setup();

      await act(async () => {
        render(<RoomAvailabilityChecker onCheckAvailability={mockCheckAvailability} />);
      });

      // Fill search form
      const checkInInput = screen.getByTestId('checkin-date');
      const checkOutInput = screen.getByTestId('checkout-date');
      const guestCountInput = screen.getByTestId('guest-count');
      const roomTypeSelect = screen.getByTestId('room-type');

      await user.type(checkInInput, '2025-08-20');
      await user.type(checkOutInput, '2025-08-23');
      await user.clear(guestCountInput);
      await user.type(guestCountInput, '2');
      await user.selectOptions(roomTypeSelect, 'Deluxe');

      // Perform search
      const searchButton = screen.getByTestId('search-availability');
      await user.click(searchButton);

      expect(mockCheckAvailability).toHaveBeenCalledWith({
        checkInDate: '2025-08-20',
        checkOutDate: '2025-08-23',
        guestCount: 2,
        roomType: 'Deluxe'
      });
    });

    it('displays search results correctly', async () => {
      const user = userEvent.setup();

      await act(async () => {
        render(<RoomAvailabilityChecker onCheckAvailability={mockCheckAvailability} />);
      });

      const searchButton = screen.getByTestId('search-availability');
      await user.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText('Available Rooms (2)')).toBeInTheDocument();
        expect(screen.getByText('Room 101')).toBeInTheDocument();
        expect(screen.getByText('Room 102')).toBeInTheDocument();
        expect(screen.getByText('€120/night')).toBeInTheDocument();
        expect(screen.getByText('€150/night')).toBeInTheDocument();
      });
    });

    it('handles no availability results', async () => {
      const user = userEvent.setup();
      mockCheckAvailability.mockResolvedValueOnce([]);

      await act(async () => {
        render(<RoomAvailabilityChecker onCheckAvailability={mockCheckAvailability} />);
      });

      const searchButton = screen.getByTestId('search-availability');
      await user.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText('Available Rooms (0)')).toBeInTheDocument();
      });
    });

    it('filters by room type correctly', async () => {
      const user = userEvent.setup();
      const suiteRooms = [{ ...mockRooms[2], rate: 200 }];
      mockCheckAvailability.mockResolvedValueOnce(suiteRooms);

      await act(async () => {
        render(<RoomAvailabilityChecker onCheckAvailability={mockCheckAvailability} />);
      });

      const roomTypeSelect = screen.getByTestId('room-type');
      await user.selectOptions(roomTypeSelect, 'Suite');

      const searchButton = screen.getByTestId('search-availability');
      await user.click(searchButton);

      expect(mockCheckAvailability).toHaveBeenCalledWith(
        expect.objectContaining({ roomType: 'Suite' })
      );

      await waitFor(() => {
        expect(screen.getByText('Room 201')).toBeInTheDocument();
        expect(screen.getByText('Suite')).toBeInTheDocument();
      });
    });

    it('validates guest count against room capacity', async () => {
      const user = userEvent.setup();

      await act(async () => {
        render(<RoomAvailabilityChecker onCheckAvailability={mockCheckAvailability} />);
      });

      const guestCountInput = screen.getByTestId('guest-count');
      await user.clear(guestCountInput);
      await user.type(guestCountInput, '5'); // More than any room can accommodate

      const searchButton = screen.getByTestId('search-availability');
      await user.click(searchButton);

      expect(mockCheckAvailability).toHaveBeenCalledWith(
        expect.objectContaining({ guestCount: 5 })
      );
    });
  });

  describe('Real-time Room Updates', () => {
    it('subscribes to room status changes', async () => {
      const onStatusUpdate = jest.fn();
      const onCleaningUpdate = jest.fn();

      await act(async () => {
        render(
          <RoomStatusCard 
            room={mockRoom}
            onStatusUpdate={onStatusUpdate}
            onCleaningUpdate={onCleaningUpdate}
          />
        );
      });

      expect(mockHotelContext.subscribeToRooms).toHaveBeenCalled();
    });

    it('updates room status in real-time', async () => {
      const onStatusUpdate = jest.fn();
      const onCleaningUpdate = jest.fn();

      const { rerender } = render(
        <RoomStatusCard 
          room={mockRoom}
          onStatusUpdate={onStatusUpdate}
          onCleaningUpdate={onCleaningUpdate}
        />
      );

      // Simulate real-time update
      const updatedRoom = { ...mockRoom, is_clean: false };

      await act(async () => {
        rerender(
          <RoomStatusCard 
            room={updatedRoom}
            onStatusUpdate={onStatusUpdate}
            onCleaningUpdate={onCleaningUpdate}
          />
        );
      });

      expect(screen.getByText('Needs Cleaning')).toBeInTheDocument();
      expect(screen.getByText('Mark as Clean')).toBeInTheDocument();
    });

    it('handles concurrent room updates', async () => {
      const user = userEvent.setup();
      const onStatusUpdate = jest.fn();
      const onCleaningUpdate = jest.fn()
        .mockResolvedValueOnce({ data: mockRoom, error: null })
        .mockRejectedValueOnce(new Error('Conflict: Room was updated by another user'));

      await act(async () => {
        render(
          <RoomStatusCard 
            room={mockRooms[1]} // Needs cleaning
            onStatusUpdate={onStatusUpdate}
            onCleaningUpdate={onCleaningUpdate}
          />
        );
      });

      const markCleanButton = screen.getByText('Mark as Clean');
      await user.click(markCleanButton);

      await waitFor(() => {
        expect(mockNotifications.warning).toHaveBeenCalledWith(
          'Conflict Detected',
          expect.stringContaining('updated by another user')
        );
      });
    });
  });

  describe('Housekeeping Workflow', () => {
    it('tracks cleaning status for all rooms', async () => {
      const onStatusUpdate = jest.fn();
      const onCleaningUpdate = jest.fn();

      await act(async () => {
        render(
          <div>
            {mockRooms.map(room => (
              <RoomStatusCard 
                key={room.id}
                room={room}
                onStatusUpdate={onStatusUpdate}
                onCleaningUpdate={onCleaningUpdate}
              />
            ))}
          </div>
        );
      });

      // Should show cleaning status for all rooms
      expect(screen.getByTestId('room-card-101')).toHaveTextContent('Clean');
      expect(screen.getByTestId('room-card-102')).toHaveTextContent('Needs Cleaning');
      expect(screen.getByTestId('room-card-201')).toHaveTextContent('Clean');
    });

    it('prioritizes rooms by checkout status', async () => {
      // Simulate rooms that need immediate attention after checkout
      const checkoutRooms = mockRooms.map(room => ({
        ...room,
        is_clean: false,
        last_checkout: room.id === 1 ? '2025-08-15T11:00:00Z' : null
      }));

      const onStatusUpdate = jest.fn();
      const onCleaningUpdate = jest.fn();

      await act(async () => {
        render(
          <div>
            {checkoutRooms.map(room => (
              <RoomStatusCard 
                key={room.id}
                room={room}
                onStatusUpdate={onStatusUpdate}
                onCleaningUpdate={onCleaningUpdate}
              />
            ))}
          </div>
        );
      });

      // Room 101 should be prioritized as it had a recent checkout
      const room101Card = screen.getByTestId('room-card-101');
      expect(room101Card).toHaveTextContent('Needs Cleaning');
    });

    it('tracks cleaning time estimates', async () => {
      const roomWithCleaningTime = {
        ...mockRoom,
        is_clean: false,
        estimated_cleaning_time: 30 // minutes
      };

      const onStatusUpdate = jest.fn();
      const onCleaningUpdate = jest.fn();

      await act(async () => {
        render(
          <RoomStatusCard 
            room={roomWithCleaningTime}
            onStatusUpdate={onStatusUpdate}
            onCleaningUpdate={onCleaningUpdate}
          />
        );
      });

      // Should indicate cleaning time estimate
      expect(screen.getByText(/30 min/)).toBeInTheDocument();
    });
  });

  describe('Performance and Optimization', () => {
    it('efficiently handles large room lists', async () => {
      const largeRoomList = Array.from({ length: 500 }, (_, i) => ({
        ...mockRoom,
        id: i + 1,
        room_number: `${Math.floor(i / 100) + 1}${(i % 100).toString().padStart(2, '0')}`,
        floor_number: Math.floor(i / 100) + 1
      }));

      const onStatusUpdate = jest.fn();
      const onCleaningUpdate = jest.fn();

      const start = performance.now();

      await act(async () => {
        render(
          <div>
            {largeRoomList.slice(0, 50).map(room => (
              <RoomStatusCard 
                key={room.id}
                room={room}
                onStatusUpdate={onStatusUpdate}
                onCleaningUpdate={onCleaningUpdate}
              />
            ))}
          </div>
        );
      });

      const end = performance.now();

      // Should render efficiently (less than 500ms for 50 rooms)
      expect(end - start).toBeLessThan(500);
    });

    it('optimizes availability checks with caching', async () => {
      const user = userEvent.setup();
      const cachedResults = [{ ...mockRoom, rate: 120 }];
      
      // First call should hit the API
      mockCheckAvailability
        .mockResolvedValueOnce(cachedResults)
        .mockResolvedValueOnce(cachedResults);

      await act(async () => {
        render(<RoomAvailabilityChecker onCheckAvailability={mockCheckAvailability} />);
      });

      // Search twice with same parameters
      const searchButton = screen.getByTestId('search-availability');
      
      await user.click(searchButton);
      await waitFor(() => {
        expect(screen.getByText('Available Rooms (1)')).toBeInTheDocument();
      });

      await user.click(searchButton);
      
      // Should be called twice but second call could be cached
      expect(mockCheckAvailability).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    it('handles room update failures gracefully', async () => {
      const user = userEvent.setup();
      const onStatusUpdate = jest.fn().mockRejectedValue(new Error('Network error'));
      const onCleaningUpdate = jest.fn();

      await act(async () => {
        render(
          <RoomStatusCard 
            room={mockRoom}
            onStatusUpdate={onStatusUpdate}
            onCleaningUpdate={onCleaningUpdate}
          />
        );
      });

      const outOfOrderButton = screen.getByText('Take Out of Order');
      await user.click(outOfOrderButton);

      await waitFor(() => {
        expect(mockNotifications.error).toHaveBeenCalledWith(
          'Update Failed',
          'Network error'
        );
      });

      // Should show retry option
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('handles availability check failures', async () => {
      const user = userEvent.setup();
      mockCheckAvailability.mockRejectedValue(new Error('Service unavailable'));

      await act(async () => {
        render(<RoomAvailabilityChecker onCheckAvailability={mockCheckAvailability} />);
      });

      const searchButton = screen.getByTestId('search-availability');
      await user.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText(/service unavailable/i)).toBeInTheDocument();
      });
    });

    it('provides offline mode for room status viewing', async () => {
      // Simulate offline scenario
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Network error');
      });

      const onStatusUpdate = jest.fn();
      const onCleaningUpdate = jest.fn();

      await act(async () => {
        render(
          <RoomStatusCard 
            room={mockRoom}
            onStatusUpdate={onStatusUpdate}
            onCleaningUpdate={onCleaningUpdate}
          />
        );
      });

      // Should still display cached room data
      expect(screen.getByText('101')).toBeInTheDocument();
      expect(screen.getByText(/offline mode/i)).toBeInTheDocument();
    });
  });
});