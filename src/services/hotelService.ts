// hotelService.ts - Hotel management service with Supabase integration
export interface Reservation {
  id: number;
  guest_id: number;
  room_id: number;
  check_in_date: string;
  check_out_date: string;
  status: 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled';
  total_amount: number;
  special_requests?: string;
  created_at: string;
  updated_at: string;
}

export interface Room {
  id: number;
  room_number: string;
  room_type: string;
  floor: number;
  bed_type: string;
  max_occupancy: number;
  status: 'available' | 'occupied' | 'maintenance' | 'cleaning';
  rate_per_night: number;
  amenities: string[];
}

export interface Guest {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth?: string;
  nationality?: string;
  passport_number?: string;
  created_at: string;
}

export const hotelService = {
  // Reservation methods
  async getReservations(): Promise<Reservation[]> {
    // Mock implementation - in real app would use Supabase
    return [];
  },

  async createReservation(reservation: Omit<Reservation, 'id' | 'created_at' | 'updated_at'>): Promise<Reservation> {
    const newReservation: Reservation = {
      ...reservation,
      id: Date.now(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    return newReservation;
  },

  async updateReservation(id: number, updates: Partial<Reservation>): Promise<Reservation> {
    // Mock implementation
    const reservation: Reservation = {
      id,
      guest_id: 1,
      room_id: 1,
      check_in_date: '2024-01-01',
      check_out_date: '2024-01-02',
      status: 'confirmed',
      total_amount: 100,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: new Date().toISOString(),
      ...updates
    };
    return reservation;
  },

  // Room methods
  async getRooms(): Promise<Room[]> {
    return [];
  },

  async updateRoomStatus(roomId: number, status: Room['status']): Promise<void> {
    // Mock implementation
  },

  // Guest methods
  async getGuests(): Promise<Guest[]> {
    return [];
  },

  async createGuest(guest: Omit<Guest, 'id' | 'created_at'>): Promise<Guest> {
    const newGuest: Guest = {
      ...guest,
      id: Date.now(),
      created_at: new Date().toISOString()
    };
    return newGuest;
  }
};