// Populate test data for Supabase integration testing
import { supabase } from '../../../supabase';

describe('Populate Test Data', () => {
  
  test('should populate guests table with test data', async () => {
    try {
      const testGuests = [
        {
          first_name: 'John',
          last_name: 'Doe',
          email: 'john.doe@example.com',
          phone: '+385-91-123-4567',
          nationality: 'Croatian',
          preferred_language: 'en',
          has_pets: false,
          is_vip: false
        },
        {
          first_name: 'Jane', 
          last_name: 'Smith',
          email: 'jane.smith@example.com',
          phone: '+385-91-234-5678',
          nationality: 'German',
          preferred_language: 'de',
          has_pets: false,
          is_vip: true,
          vip_level: 2
        },
        {
          first_name: 'Marco',
          last_name: 'Rossi',
          email: 'marco.rossi@example.com',
          phone: '+385-91-345-6789',
          nationality: 'Italian',
          preferred_language: 'it',
          has_pets: true,
          is_vip: false
        },
        {
          first_name: 'Ana',
          last_name: 'Kovač',
          email: 'ana.kovac@example.com',
          phone: '+385-91-456-7890',
          nationality: 'Croatian',
          preferred_language: 'hr',
          has_pets: false,
          is_vip: false
        },
        {
          first_name: 'Hans',
          last_name: 'Müller',
          email: 'hans.muller@example.com', 
          phone: '+385-91-567-8901',
          nationality: 'Austrian',
          preferred_language: 'de',
          has_pets: false,
          is_vip: true,
          vip_level: 1
        },
        {
          first_name: 'Sophie',
          last_name: 'Laurent',
          email: 'sophie.laurent@example.com',
          phone: '+385-91-678-9012',
          nationality: 'French',
          preferred_language: 'fr',
          has_pets: true,
          is_vip: false
        }
      ];

      const { data, error } = await supabase
        .from('guests')
        .insert(testGuests)
        .select();

      expect(error).toBeNull();
      expect(data).toHaveLength(6);

      console.log(`✅ Created ${data?.length} test guests successfully`);
      data?.forEach((guest, index) => {
        console.log(`   ${index + 1}. ${guest.first_name} ${guest.last_name} (${guest.nationality})`);
      });

    } catch (err) {
      console.error('❌ Error creating test guests:', err);
      throw err;
    }
  });

  test('should populate rooms table with test data (without room_types)', async () => {
    try {
      const testRooms = [
        {
          number: '101',
          floor: 1,
          room_type_id: '00000000-0000-0000-0000-000000000001', // Dummy UUID
          is_active: true,
          is_cleaned: true,
          is_out_of_order: false
        },
        {
          number: '102',
          floor: 1,
          room_type_id: '00000000-0000-0000-0000-000000000001',
          is_active: true,
          is_cleaned: true,
          is_out_of_order: false
        },
        {
          number: '103',
          floor: 1,
          room_type_id: '00000000-0000-0000-0000-000000000002', // Different type
          is_active: true,
          is_cleaned: true,
          is_out_of_order: false
        },
        {
          number: '201',
          floor: 2,
          room_type_id: '00000000-0000-0000-0000-000000000001',
          is_active: true,
          is_cleaned: true,
          is_out_of_order: false
        },
        {
          number: '202',
          floor: 2,
          room_type_id: '00000000-0000-0000-0000-000000000002',
          is_active: true,
          is_cleaned: true,
          is_out_of_order: false
        },
        {
          number: '203',
          floor: 2,
          room_type_id: '00000000-0000-0000-0000-000000000003', // Premium
          is_active: true,
          is_cleaned: true,
          is_out_of_order: false,
          is_premium: true
        },
        {
          number: '301',
          floor: 3,
          room_type_id: '00000000-0000-0000-0000-000000000003',
          is_active: true,
          is_cleaned: true,
          is_out_of_order: false,
          is_premium: true
        },
        {
          number: '302',
          floor: 3,
          room_type_id: '00000000-0000-0000-0000-000000000003',
          is_active: true,
          is_cleaned: true,
          is_out_of_order: false,
          is_premium: true
        }
      ];

      const { data, error } = await supabase
        .from('rooms')
        .insert(testRooms)
        .select();

      expect(error).toBeNull();
      expect(data).toHaveLength(8);

      console.log(`✅ Created ${data?.length} test rooms successfully`);
      data?.forEach((room, index) => {
        console.log(`   ${index + 1}. Room ${room.number} (Floor ${room.floor})`);
      });

    } catch (err) {
      console.error('❌ Error creating test rooms:', err);
      throw err;
    }
  });

  test('should create test reservations with existing guests and rooms', async () => {
    try {
      // First get the created guests and rooms
      const [guestsResult, roomsResult] = await Promise.all([
        supabase.from('guests').select('*').limit(6),
        supabase.from('rooms').select('*').limit(8)
      ]);

      if (guestsResult.error || roomsResult.error) {
        throw new Error('Failed to fetch guests or rooms for reservations');
      }

      const guests = guestsResult.data || [];
      const rooms = roomsResult.data || [];

      if (guests.length === 0 || rooms.length === 0) {
        console.log('📝 Skipping reservations - no guests or rooms available');
        return;
      }

      // Create test reservations
      const today = new Date();
      const testReservations = [
        {
          primary_guest_id: guests[0].id,
          room_id: rooms[0].id,
          check_in: new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow
          check_out: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // +3 days
          adults: 2,
          children: 0,
          status: 'confirmed',
          booking_source: 'direct',
          special_requests: 'Test reservation #1',
          seasonal_period: 'A',
          base_room_rate: 150.00,
          number_of_nights: 2,
          subtotal_accommodation: 300.00,
          vat_accommodation: 75.00,
          total_amount: 375.00,
          total_vat_amount: 75.00,
          confirmation_number: 'TEST-001',
          payment_status: 'pending'
        },
        {
          primary_guest_id: guests[1].id,
          room_id: rooms[1].id,
          check_in: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // +5 days
          check_out: new Date(today.getTime() + 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // +8 days
          adults: 1,
          children: 0,
          status: 'confirmed',
          booking_source: 'booking.com',
          special_requests: 'Late check-in requested',
          seasonal_period: 'B',
          base_room_rate: 180.00,
          number_of_nights: 3,
          subtotal_accommodation: 540.00,
          vat_accommodation: 135.00,
          total_amount: 675.00,
          total_vat_amount: 135.00,
          confirmation_number: 'TEST-002',
          payment_status: 'paid'
        }
      ];

      const { data, error } = await supabase
        .from('reservations')
        .insert(testReservations)
        .select();

      expect(error).toBeNull();
      expect(data).toHaveLength(2);

      console.log(`✅ Created ${data?.length} test reservations successfully`);
      data?.forEach((reservation, index) => {
        console.log(`   ${index + 1}. ${reservation.confirmation_number} - Room ${rooms.find(r => r.id === reservation.room_id)?.number} (${reservation.status})`);
      });

    } catch (err) {
      console.error('❌ Error creating test reservations:', err);
      throw err;
    }
  });

  test('should verify test data was created successfully', async () => {
    try {
      const [guestsCount, roomsCount, reservationsCount] = await Promise.all([
        supabase.from('guests').select('id').then(r => r.data?.length || 0),
        supabase.from('rooms').select('id').then(r => r.data?.length || 0),
        supabase.from('reservations').select('id').then(r => r.data?.length || 0)
      ]);

      console.log('📊 Test Data Summary:');
      console.log(`   👥 Guests: ${guestsCount}`);
      console.log(`   🏨 Rooms: ${roomsCount}`);
      console.log(`   📋 Reservations: ${reservationsCount}`);

      expect(guestsCount).toBeGreaterThan(0);
      expect(roomsCount).toBeGreaterThan(0);
      expect(reservationsCount).toBeGreaterThan(0);

      console.log('✅ All test data created successfully!');

    } catch (err) {
      console.error('❌ Error verifying test data:', err);
      throw err;
    }
  });
});