// Simple test to check database schema
import { supabase } from '../lib/supabase';

async function checkDatabaseSchema() {
  console.log('[INFO] Checking Supabase database schema...');
  
  try {
    // Try to query each table we expect for hotel management
    const hotelTables = [
      'hotels', 
      'rooms', 
      'room_types',
      'guests', 
      'reservations',
      'pricing_tiers'
    ];
    
    console.log('[INFO] Checking hotel management tables...');
    for (const table of hotelTables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`[ERROR] Table "${table}" - Error: ${error.message}`);
        } else {
          console.log(`[SUCCESS] Table "${table}" - Found, ${data?.length || 0} rows in first query`);
        }
      } catch (err) {
        console.log(`[ERROR] Table "${table}" - Exception:`, err);
      }
    }
    
    // Check inventory tables (from package.json context)
    const inventoryTables = [
      'user_roles',
      'user_profiles', 
      'categories',
      'locations',
      'items',
      'inventory'
    ];
    
    console.log('\n[INFO] Checking inventory tables...');
    for (const table of inventoryTables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`[ERROR] Inventory table "${table}" - Error: ${error.message}`);
        } else {
          console.log(`[SUCCESS] Inventory table "${table}" - Found, ${data?.length || 0} rows`);
        }
      } catch (err) {
        console.log(`[ERROR] Inventory table "${table}" - Exception:`, err);
      }
    }
    
  } catch (error) {
    console.error('[ERROR] Database connection failed:', error);
  }
}

// Run the check
checkDatabaseSchema();