/**
 * Test DDD GetNew API to see what invoice structure they expect
 */

const API_KEY = '603e5ce1-e6ce-4622-9a0e-ba3cd097a5f5';

async function testGetNew() {
  console.log('🧪 Testing DDD_GetNew API...\n');

  const response = await fetch('https://api.dddinvoices.com/api/service/EUeInvoices.DDDI_GetNew', {
    method: 'POST',
    headers: {
      'Authorization': `IoT ${API_KEY}:EUeInvoices`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      Complexity: 'Minimal',
      IncludeInfo: true
    })
  });

  const result = await response.json();

  if (result.Status === 'OK') {
    console.log('✅ SUCCESS!\n');
    console.log('📋 Sample Invoice Object:');
    console.log(JSON.stringify(result.Result.Result.Invoice, null, 2));
  } else {
    console.log('❌ FAILED');
    console.log(result);
  }
}

testGetNew();
