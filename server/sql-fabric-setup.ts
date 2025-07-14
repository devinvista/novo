import { setupFabricDatabase } from './setup-fabric-database';

// This script sets up the SQL Fabric database when authentication is available
async function runSetup() {
  console.log('🚀 Starting SQL Fabric setup...');
  
  try {
    await setupFabricDatabase();
    console.log('✅ SQL Fabric setup completed successfully!');
    console.log('🔄 The system will now use SQL Fabric as the primary database');
  } catch (error) {
    console.error('❌ SQL Fabric setup failed:', error.message);
    console.log('⚠️ The system will continue using SQLite as the primary database');
    console.log('💡 To enable SQL Fabric, ensure proper Azure authentication is configured');
  }
}

runSetup();