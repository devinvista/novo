// Test API endpoint directly
import { storage } from "./index";

async function testApiEndpoint() {
  console.log('🔍 Testing API endpoint directly...');
  
  try {
    // Simulate the API call with user ID 10
    const keyResults = await storage.getKeyResults(undefined, 10);
    const kr = keyResults.find(k => k.title === 'Key Result Teste');
    
    console.log('📊 Direct storage call result:');
    console.log('- title:', kr?.title);
    console.log('- progress field type:', typeof kr?.progress);
    console.log('- progress field value:', JSON.stringify(kr?.progress));
    console.log('- currentValue:', kr?.currentValue);
    console.log('- targetValue:', kr?.targetValue);
    
    console.log('\n🔍 Complete object:');
    console.log(JSON.stringify(kr, null, 2));
    
  } catch (error) {
    console.error('❌ Error testing API endpoint:', error);
    throw error;
  }
}

// Execute the test
testApiEndpoint().then(() => {
  console.log('✅ Test completed');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});