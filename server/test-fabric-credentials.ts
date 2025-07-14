import { connectToFabric } from './fabric-storage';

console.log('🔍 Testing SQL Fabric credentials...');
console.log('SQL_USERNAME:', process.env.SQL_USERNAME);
console.log('SQL_PASSWORD:', process.env.SQL_PASSWORD ? '***' : 'NOT SET');

(async () => {
  try {
    const connected = await connectToFabric();
    if (connected) {
      console.log('✅ Successfully connected to Microsoft Fabric SQL Server');
    } else {
      console.log('❌ Failed to connect to Microsoft Fabric SQL Server');
    }
  } catch (error) {
    console.error('❌ Connection error:', error.message);
  }
})();