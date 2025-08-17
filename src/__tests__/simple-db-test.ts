// Simple test to check database schema
import { supabase } from '../lib/supabase';

async function checkDatabaseSchema() {
  console.log('= Checking Supabase database schema...');
  
  try {
    // Check what tables exist
    const { data: tablesData, error: tablesError } = await supabase
      .rpc('get_schema_tables') 
      .catch(() => ({ data: null, error: null }));
    
    if (tablesError) {
      console.log('  Could not list tables via RPC, trying direct queries...');
    }
    
    // Try to query each table we expect
    const tableTests = [
      'hotels', 
      'rooms', 
      'room_types',
      'guests', 
      'reservations',
      'pricing_tiers'
    ];
    
    for (const table of tableTests) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`L Table "${table}" - Error: ${error.message}`);
        } else {
          console.log(` Table "${table}" - Found, ${data?.length || 0} rows in first query`);
        }
      } catch (err) {
        console.log(`L Table "${table}" - Exception:`, err);
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
    
    console.log('\n=æ Checking inventory tables...');
    for (const table of inventoryTables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`L Inventory table "${table}" - Error: ${error.message}`);
        } else {
          console.log(` Inventory table "${table}" - Found, ${data?.length || 0} rows`);
        }
      } catch (err) {
        console.log(`L Inventory table "${table}" - Exception:`, err);
      }
    }
    
  } catch (error) {
    console.error('L Database connection failed:', error);
  }
}

// Run the check
checkDatabaseSchema();