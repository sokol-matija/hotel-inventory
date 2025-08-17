// Database exploration to understand actual table structure
import { supabase } from '../../../supabase';

describe('Database Structure Exploration', () => {
  
  test('should explore rooms table structure', async () => {
    try {
      // Try to get just one room to see structure
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .limit(1);

      console.log('🏨 Rooms query result:');
      console.log('   Error:', error);
      console.log('   Data length:', data?.length);
      
      if (data && data.length > 0) {
        console.log('   First room structure:', Object.keys(data[0]));
        console.log('   First room data:', data[0]);
      }
    } catch (err) {
      console.log('   Caught error:', err);
    }
  });

  test('should explore guests table structure', async () => {
    try {
      const { data, error } = await supabase
        .from('guests')
        .select('*')
        .limit(1);

      console.log('👥 Guests query result:');
      console.log('   Error:', error);
      console.log('   Data length:', data?.length);
      
      if (data && data.length > 0) {
        console.log('   First guest structure:', Object.keys(data[0]));
        console.log('   First guest data:', data[0]);
      }
    } catch (err) {
      console.log('   Caught error:', err);
    }
  });

  test('should explore reservations table structure', async () => {
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .limit(1);

      console.log('📋 Reservations query result:');
      console.log('   Error:', error);
      console.log('   Data length:', data?.length);
      
      if (data && data.length > 0) {
        console.log('   First reservation structure:', Object.keys(data[0]));
        console.log('   First reservation data:', data[0]);
      }
    } catch (err) {
      console.log('   Caught error:', err);
    }
  });

  test('should explore room_types table structure', async () => {
    try {
      const { data, error } = await supabase
        .from('room_types')
        .select('*')
        .limit(1);

      console.log('🏠 Room Types query result:');
      console.log('   Error:', error);
      console.log('   Data length:', data?.length);
      
      if (data && data.length > 0) {
        console.log('   First room type structure:', Object.keys(data[0]));
        console.log('   First room type data:', data[0]);
      }
    } catch (err) {
      console.log('   Caught error:', err);
    }
  });

  test('should check what tables exist', async () => {
    try {
      // Test various table names to see what exists
      const tableTests = [
        'rooms',
        'guests', 
        'reservations',
        'room_types',
        'hotels',
        'companies',
        'pricing_tiers'
      ];

      for (const tableName of tableTests) {
        try {
          const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .limit(1);

          console.log(`📊 Table '${tableName}':`, {
            exists: !error,
            error: error?.message,
            hasData: data?.length > 0,
            recordCount: data?.length || 0
          });
          
          if (data && data.length > 0) {
            console.log(`   Structure: [${Object.keys(data[0]).join(', ')}]`);
          }
        } catch (err) {
          console.log(`   Table '${tableName}' error:`, err);
        }
      }
    } catch (err) {
      console.log('   General error:', err);
    }
  });
});