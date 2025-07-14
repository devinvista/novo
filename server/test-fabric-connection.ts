import { connectToFabric } from './fabric-storage';

async function testConnection() {
  console.log('🔄 Testing Microsoft Fabric connection...');
  
  try {
    const connected = await connectToFabric();
    if (connected) {
      console.log('✅ Microsoft Fabric connection successful!');
    } else {
      console.log('⚠️ Using SQLite fallback - Microsoft Fabric not available');
    }
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  testConnection()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { testConnection };