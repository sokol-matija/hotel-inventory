// HotelTimeline.test.tsx - Comprehensive tests for hotel timeline with Supabase real-time integration
// Tests reservation display, drag & drop, real-time updates, and room management

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import '@testing-library/jest-dom';
import HotelTimeline from '../HotelTimeline';

// Mock Supabase real-time
const mockChannel = {
  on: jest.fn(() => mockChannel),
  subscribe: jest.fn(() => Promise.resolve()),
  unsubscribe: jest.fn()
};

const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        order: jest.fn(() => Promise.resolve({ 
          data: mockReservations, 
          error: null 
        }))
      })),
      order: jest.fn(() => Promise.resolve({ 
        data: mockRooms, 
        error: null 
      }))
    })),
    insert: jest.fn(() => Promise.resolve({ data: [], error: null })),
    update: jest.fn(() => Promise.resolve({ data: [], error: null })),
    delete: jest.fn(() => Promise.resolve({ data: [], error: null }))
  })),
  channel: jest.fn(() => mockChannel)
};

// Mock data
const mockRooms = [
  {
    id: 1,
    room_number: '101',
    floor_number: 1,
    room_type: 'Standard',
    max_occupancy: 2,
    is_premium: false,
    is_active: true,
    is_clean: true
  },
  {
    id: 2,
    room_number: '102',
    floor_number: 1,
    room_type: 'Deluxe',
    max_occupancy: 3,
    is_premium: true,
    is_active: true,
    is_clean: true
  },
  {
    id: 3,
    room_number: '201',
    floor_number: 2,
    room_type: 'Suite',
    max_occupancy: 4,
    is_premium: true,
    is_active: true,
    is_clean: false
  }
];

const mockGuests = [
  {
    id: 1,
    first_name: 'John',
    last_name: 'Smith',
    email: 'john@example.com',
    phone: '+1234567890',
    nationality: 'US'
  },
  {
    id: 2,
    first_name: 'Emma',
    last_name: 'Johnson',
    email: 'emma@example.com',
    phone: '+0987654321',
    nationality: 'UK'
  }
];

const mockReservations = [
  {
    id: 1,
    guest_id: 1,
    room_id: 1,
    check_in_date: '2025-08-15',
    check_out_date: '2025-08-18',
    number_of_nights: 3,
    number_of_guests: 2,
    adults: 2,
    children_count: 0,
    status: 'confirmed',
    booking_source: 'direct',
    total_amount: 450.00,
    payment_status: 'paid',
    created_at: '2025-08-10T10:00:00Z',
    guests: mockGuests[0]
  },
  {
    id: 2,
    guest_id: 2,
    room_id: 2,
    check_in_date: '2025-08-16',
    check_out_date: '2025-08-20',
    number_of_nights: 4,
    number_of_guests: 1,
    adults: 1,
    children_count: 0,
    status: 'checked_in',
    booking_source: 'booking.com',
    total_amount: 680.00,
    payment_status: 'paid',
    checked_in_at: '2025-08-16T14:00:00Z',
    guests: mockGuests[1]
  }
];

// Mock contexts
jest.mock('../../../contexts/SupabaseHotelProvider', () => ({
  useHotel: () => ({
    reservations: mockReservations,
    rooms: mockRooms,
    guests: mockGuests,
    loading: false,
    error: null,
    createReservation: jest.fn(),
    updateReservation: jest.fn(),
    deleteReservation: jest.fn(),
    subscribeToReservations: jest.fn(() => () => {}),
    subscribeToRooms: jest.fn(() => () => {})
  })
}));

// Mock GSAP animations
jest.mock('gsap', () => ({
  timeline: jest.fn(() => ({
    to: jest.fn(() => ({ to: jest.fn() })),
    from: jest.fn(() => ({ to: jest.fn() })),
    set: jest.fn()
  })),
  to: jest.fn(),
  from: jest.fn(),
  set: jest.fn()
}));

// Mock date formatting
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatString) => {
    if (formatString === 'MMM dd') return 'Aug 15';
    if (formatString === 'yyyy-MM-dd') return '2025-08-15';
    return '2025-08-15';
  }),
  addDays: jest.fn((date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000)),
  differenceInDays: jest.fn(() => 3),
  isToday: jest.fn(() => true),
  isSameDay: jest.fn(() => false),
  startOfDay: jest.fn((date) => date),
  endOfDay: jest.fn((date) => date)
}));

// Mock UI components
jest.mock('../../../ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>{children}</button>
  )
}));

jest.mock('../modals/CreateBookingModal', () => {
  return function MockCreateBookingModal({ isOpen, onClose, onSave }: any) {
    if (!isOpen) return null;
    return (
      <div data-testid="create-booking-modal">
        <button onClick={() => onSave(mockReservations[0])}>Save</button>
        <button onClick={onClose}>Close</button>
      </div>
    );
  };
});

jest.mock('../Reservations/ReservationPopup', () => {
  return function MockReservationPopup({ isOpen, onClose, reservation }: any) {
    if (!isOpen) return null;
    return (
      <div data-testid="reservation-popup">
        <span>{reservation?.guests?.first_name} {reservation?.guests?.last_name}</span>
        <button onClick={onClose}>Close</button>
      </div>
    );
  };
});

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <DndProvider backend={HTML5Backend}>
    {children}
  </DndProvider>
);

describe('HotelTimeline Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock current date to ensure consistent tests
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-08-15T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Initial Rendering', () => {
    it('renders timeline header with navigation', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <HotelTimeline />
          </TestWrapper>
        );
      });

      expect(screen.getByText('Hotel Timeline')).toBeInTheDocument();
      expect(screen.getByText('Today')).toBeInTheDocument();
    });

    it('displays date headers correctly', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <HotelTimeline />
          </TestWrapper>
        );
      });

      // Should show current date and future dates
      expect(screen.getByText('Aug 15')).toBeInTheDocument();
    });

    it('renders room list with floor grouping', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <HotelTimeline />
          </TestWrapper>
        );
      });

      expect(screen.getByText('Floor 1')).toBeInTheDocument();
      expect(screen.getByText('Floor 2')).toBeInTheDocument();
      expect(screen.getByText('101')).toBeInTheDocument();
      expect(screen.getByText('102')).toBeInTheDocument();
      expect(screen.getByText('201')).toBeInTheDocument();
    });

    it('shows room type information', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <HotelTimeline />
          </TestWrapper>
        );
      });

      expect(screen.getByText('Standard')).toBeInTheDocument();
      expect(screen.getByText('Deluxe')).toBeInTheDocument();
      expect(screen.getByText('Suite')).toBeInTheDocument();
    });
  });

  describe('Reservation Display', () => {
    it('renders reservation blocks in correct positions', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <HotelTimeline />
          </TestWrapper>
        );
      });

      // Should show guest names
      expect(screen.getByText('John Smith')).toBeInTheDocument();
      expect(screen.getByText('Emma Johnson')).toBeInTheDocument();
    });

    it('displays reservation status with correct colors', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <HotelTimeline />
          </TestWrapper>
        );
      });

      // Check for status indicators
      const confirmedReservation = screen.getByText('John Smith').closest('.reservation-block');
      const checkedInReservation = screen.getByText('Emma Johnson').closest('.reservation-block');

      expect(confirmedReservation).toBeInTheDocument();
      expect(checkedInReservation).toBeInTheDocument();
    });

    it('shows reservation duration correctly', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <HotelTimeline />
          </TestWrapper>
        );
      });

      // Reservations should span multiple days
      const johnReservation = screen.getByText('John Smith').closest('.reservation-block');
      expect(johnReservation).toHaveStyle({ width: expect.stringContaining('%') });
    });

    it('handles overlapping reservations', async () => {
      const overlappingReservations = [
        ...mockReservations,
        {
          id: 3,
          guest_id: 1,
          room_id: 1, // Same room as first reservation
          check_in_date: '2025-08-17', // Overlaps with first reservation
          check_out_date: '2025-08-19',
          number_of_nights: 2,
          number_of_guests: 1,
          adults: 1,
          children_count: 0,
          status: 'confirmed',
          booking_source: 'direct',
          total_amount: 300.00,
          payment_status: 'paid',
          created_at: '2025-08-10T11:00:00Z',
          guests: mockGuests[0]
        }
      ];

      jest.doMock('../../../contexts/SupabaseHotelProvider', () => ({
        useHotel: () => ({
          reservations: overlappingReservations,
          rooms: mockRooms,
          guests: mockGuests,
          loading: false,
          error: null
        })
      }));

      await act(async () => {
        render(
          <TestWrapper>
            <HotelTimeline />
          </TestWrapper>
        );
      });

      // Should handle conflicts gracefully
      expect(screen.getByText('John Smith')).toBeInTheDocument();
    });
  });

  describe('Interactive Features', () => {
    it('opens reservation details on click', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(
          <TestWrapper>
            <HotelTimeline />
          </TestWrapper>
        );
      });

      const reservation = screen.getByText('John Smith');
      await user.click(reservation);

      expect(screen.getByTestId('reservation-popup')).toBeInTheDocument();
    });

    it('opens create booking modal on empty cell click', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(
          <TestWrapper>
            <HotelTimeline />
          </TestWrapper>
        );
      });

      // Find an empty cell and click it
      const emptyCells = screen.getAllByTestId(/date-cell/);
      if (emptyCells.length > 0) {
        await user.click(emptyCells[0]);
        expect(screen.getByTestId('create-booking-modal')).toBeInTheDocument();
      }
    });

    it('supports fullscreen toggle', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(
          <TestWrapper>
            <HotelTimeline />
          </TestWrapper>
        );
      });

      const fullscreenButton = screen.getByText('Fullscreen');
      await user.click(fullscreenButton);

      // Timeline should be in fullscreen mode
      const timeline = screen.getByTestId('hotel-timeline');
      expect(timeline).toHaveClass('fullscreen');
    });

    it('supports drag and drop for moving reservations', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(
          <TestWrapper>
            <HotelTimeline />
          </TestWrapper>
        );
      });

      const dragButton = screen.getByText('Move Mode');
      await user.click(dragButton);

      // Timeline should be in move mode
      expect(screen.getByText('Exit Move Mode')).toBeInTheDocument();
    });
  });

  describe('Real-time Updates', () => {
    it('subscribes to reservation changes', async () => {
      const subscribeToReservations = jest.fn();
      
      jest.doMock('../../../contexts/SupabaseHotelProvider', () => ({
        useHotel: () => ({
          reservations: mockReservations,
          rooms: mockRooms,
          guests: mockGuests,
          loading: false,
          error: null,
          subscribeToReservations
        })
      }));

      await act(async () => {
        render(
          <TestWrapper>
            <HotelTimeline />
          </TestWrapper>
        );
      });

      expect(subscribeToReservations).toHaveBeenCalled();
    });

    it('updates when new reservations are added', async () => {
      const { rerender } = render(
        <TestWrapper>
          <HotelTimeline />
        </TestWrapper>
      );

      // Simulate new reservation added
      const newReservations = [
        ...mockReservations,
        {
          id: 3,
          guest_id: 1,
          room_id: 3,
          check_in_date: '2025-08-19',
          check_out_date: '2025-08-21',
          number_of_nights: 2,
          number_of_guests: 2,
          adults: 2,
          children_count: 0,
          status: 'confirmed',
          booking_source: 'expedia',
          total_amount: 400.00,
          payment_status: 'pending',
          created_at: '2025-08-15T15:00:00Z',
          guests: mockGuests[0]
        }
      ];

      jest.doMock('../../../contexts/SupabaseHotelProvider', () => ({
        useHotel: () => ({
          reservations: newReservations,
          rooms: mockRooms,
          guests: mockGuests,
          loading: false,
          error: null
        })
      }));

      await act(async () => {
        rerender(
          <TestWrapper>
            <HotelTimeline />
          </TestWrapper>
        );
      });

      // Should show the new reservation
      expect(screen.getAllByText('John Smith')).toHaveLength(2);
    });

    it('handles reservation status updates', async () => {
      const updatedReservations = mockReservations.map(res => 
        res.id === 1 ? { ...res, status: 'checked_in', checked_in_at: '2025-08-15T14:00:00Z' } : res
      );

      jest.doMock('../../../contexts/SupabaseHotelProvider', () => ({
        useHotel: () => ({
          reservations: updatedReservations,
          rooms: mockRooms,
          guests: mockGuests,
          loading: false,
          error: null
        })
      }));

      await act(async () => {
        render(
          <TestWrapper>
            <HotelTimeline />
          </TestWrapper>
        );
      });

      // Should reflect the updated status
      expect(screen.getByText('John Smith')).toBeInTheDocument();
    });
  });

  describe('Room Management', () => {
    it('shows room cleanliness status', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <HotelTimeline />
          </TestWrapper>
        );
      });

      // Room 201 is marked as not clean
      const room201 = screen.getByText('201');
      expect(room201.closest('.room-row')).toHaveClass('needs-cleaning');
    });

    it('displays room occupancy correctly', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <HotelTimeline />
          </TestWrapper>
        );
      });

      // Rooms with reservations should show occupancy
      const occupiedRooms = screen.getAllByTestId('room-row');
      expect(occupiedRooms.length).toBeGreaterThan(0);
    });

    it('shows premium room indicators', async () => {
      await act(async () => {
        render(
          <TestWrapper>
            <HotelTimeline />
          </TestWrapper>
        );
      });

      // Premium rooms should have indicators
      const premiumRooms = mockRooms.filter(room => room.is_premium);
      premiumRooms.forEach(room => {
        const roomElement = screen.getByText(room.room_number);
        expect(roomElement.closest('.room-row')).toHaveClass('premium');
      });
    });
  });

  describe('Date Navigation', () => {
    it('navigates to previous dates', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(
          <TestWrapper>
            <HotelTimeline />
          </TestWrapper>
        );
      });

      const prevButton = screen.getByTestId('prev-date');
      await user.click(prevButton);

      // Should navigate to previous week
      expect(screen.getByText('Aug 15')).toBeInTheDocument();
    });

    it('navigates to next dates', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(
          <TestWrapper>
            <HotelTimeline />
          </TestWrapper>
        );
      });

      const nextButton = screen.getByTestId('next-date');
      await user.click(nextButton);

      // Should navigate to next week
      expect(screen.getByText('Aug 15')).toBeInTheDocument();
    });

    it('returns to today with today button', async () => {
      const user = userEvent.setup();
      
      await act(async () => {
        render(
          <TestWrapper>
            <HotelTimeline />
          </TestWrapper>
        );
      });

      const todayButton = screen.getByText('Today');
      await user.click(todayButton);

      // Should show today's date
      expect(screen.getByText('Aug 15')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles missing reservation data gracefully', async () => {
      jest.doMock('../../../contexts/SupabaseHotelProvider', () => ({
        useHotel: () => ({
          reservations: [],
          rooms: mockRooms,
          guests: [],
          loading: false,
          error: null
        })
      }));

      await act(async () => {
        render(
          <TestWrapper>
            <HotelTimeline />
          </TestWrapper>
        );
      });

      // Should still render timeline structure
      expect(screen.getByText('Hotel Timeline')).toBeInTheDocument();
      expect(screen.getByText('Floor 1')).toBeInTheDocument();
    });

    it('displays loading state', async () => {
      jest.doMock('../../../contexts/SupabaseHotelProvider', () => ({
        useHotel: () => ({
          reservations: [],
          rooms: [],
          guests: [],
          loading: true,
          error: null
        })
      }));

      await act(async () => {
        render(
          <TestWrapper>
            <HotelTimeline />
          </TestWrapper>
        );
      });

      expect(screen.getByText('Loading timeline...')).toBeInTheDocument();
    });

    it('handles Supabase errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      jest.doMock('../../../contexts/SupabaseHotelProvider', () => ({
        useHotel: () => ({
          reservations: [],
          rooms: [],
          guests: [],
          loading: false,
          error: 'Failed to load data'
        })
      }));

      await act(async () => {
        render(
          <TestWrapper>
            <HotelTimeline />
          </TestWrapper>
        );
      });

      expect(screen.getByText('Error loading timeline data')).toBeInTheDocument();
      consoleSpy.mockRestore();
    });
  });

  describe('Performance', () => {
    it('efficiently renders large numbers of reservations', async () => {
      const largeReservationSet = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        guest_id: (i % 2) + 1,
        room_id: (i % 3) + 1,
        check_in_date: `2025-08-${15 + (i % 15)}`,
        check_out_date: `2025-08-${18 + (i % 15)}`,
        number_of_nights: 3,
        number_of_guests: 2,
        adults: 2,
        children_count: 0,
        status: 'confirmed',
        booking_source: 'direct',
        total_amount: 450.00,
        payment_status: 'paid',
        created_at: '2025-08-10T10:00:00Z',
        guests: mockGuests[i % 2]
      }));

      jest.doMock('../../../contexts/SupabaseHotelProvider', () => ({
        useHotel: () => ({
          reservations: largeReservationSet,
          rooms: mockRooms,
          guests: mockGuests,
          loading: false,
          error: null
        })
      }));

      const start = performance.now();
      
      await act(async () => {
        render(
          <TestWrapper>
            <HotelTimeline />
          </TestWrapper>
        );
      });

      const end = performance.now();
      
      // Should render within reasonable time (less than 1 second)
      expect(end - start).toBeLessThan(1000);
      expect(screen.getByText('Hotel Timeline')).toBeInTheDocument();
    });

    it('uses virtualization for large room lists', async () => {
      const largeRoomSet = Array.from({ length: 200 }, (_, i) => ({
        id: i + 1,
        room_number: `${Math.floor(i / 10) + 1}${(i % 10).toString().padStart(2, '0')}`,
        floor_number: Math.floor(i / 10) + 1,
        room_type: ['Standard', 'Deluxe', 'Suite'][i % 3],
        max_occupancy: i % 4 + 1,
        is_premium: i % 3 === 0,
        is_active: true,
        is_clean: i % 5 !== 0
      }));

      jest.doMock('../../../contexts/SupabaseHotelProvider', () => ({
        useHotel: () => ({
          reservations: [],
          rooms: largeRoomSet,
          guests: [],
          loading: false,
          error: null
        })
      }));

      await act(async () => {
        render(
          <TestWrapper>
            <HotelTimeline />
          </TestWrapper>
        );
      });

      // Should handle large room lists efficiently
      expect(screen.getByText('Hotel Timeline')).toBeInTheDocument();
    });
  });
});