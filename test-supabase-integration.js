// Simple test to verify Supabase integration works
// This is a temporary test script to validate the refactoring

const { supabase } = require('./dist/lib/supabase');

async function testSupabaseConnection() {
  console.log('🧪 Testing Supabase Connection...');
  
  try {
    // Test basic connectivity
    const { data, error } = await supabase
      .from('hotels')
      .select('id, name')
      .limit(1);
    
    if (error) {
      console.error('❌ Supabase connection failed:', error);
      return false;
    }
    
    if (data && data.length > 0) {
      console.log('✅ Successfully connected to Supabase');
      console.log(`✅ Found hotel: ${data[0].name} (ID: ${data[0].id})`);
      return true;
    } else {
      console.log('⚠️  Connected but no hotels found');
      return false;
    }
  } catch (error) {
    console.error('❌ Error testing connection:', error);
    return false;
  }
}

async function testRoomData() {
  console.log('\n🧪 Testing Room Data...');
  
  try {
    const { data, error } = await supabase
      .from('rooms')
      .select('id, number, floor')
      .limit(5);
    
    if (error) {
      console.error('❌ Room data query failed:', error);
      return false;
    }
    
    console.log(`✅ Found ${data?.length || 0} rooms`);
    if (data && data.length > 0) {
      console.log(`✅ Sample room: Room ${data[0].number} on Floor ${data[0].floor}`);
    }
    return true;
  } catch (error) {
    console.error('❌ Error testing room data:', error);
    return false;
  }
}

async function testReservationData() {
  console.log('\n🧪 Testing Reservation Data...');
  
  try {
    const { data, error } = await supabase
      .from('reservations')
      .select('id, confirmation_number, status')
      .limit(3);
    
    if (error) {
      console.error('❌ Reservation data query failed:', error);
      return false;
    }
    
    console.log(`✅ Found ${data?.length || 0} reservations`);
    if (data && data.length > 0) {
      console.log(`✅ Sample reservation: ${data[0].confirmation_number} (${data[0].status})`);
    }
    return true;
  } catch (error) {
    console.error('❌ Error testing reservation data:', error);
    return false;
  }
}

async function runAllTests() {
  console.log('🏨 Hotel Porec - Supabase Integration Test\n');
  
  const results = [];
  
  results.push(await testSupabaseConnection());
  results.push(await testRoomData());
  results.push(await testReservationData());
  
  const successCount = results.filter(Boolean).length;
  const totalTests = results.length;
  
  console.log('\n📊 Test Results:');
  console.log(`✅ ${successCount}/${totalTests} tests passed`);
  
  if (successCount === totalTests) {
    console.log('🎉 All tests passed! Supabase integration is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Check the database setup and configuration.');
  }
  
  return successCount === totalTests;
}

// Run the tests
if (require.main === module) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { runAllTests };