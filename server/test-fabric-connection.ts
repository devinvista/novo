import { connectToFabric, executeQuery } from './fabric-storage';

async function testFabricConnection() {
  console.log('🔍 Testing Microsoft Fabric SQL Server connection...');
  
  try {
    // Test basic connection
    const connected = await connectToFabric();
    console.log('Connection status:', connected ? '✅ Connected' : '❌ Failed');
    
    if (connected) {
      // Test a simple query
      const result = await executeQuery('SELECT 1 as test');
      console.log('Query test result:', result);
      
      // Test table creation
      await executeQuery(`
        IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'test_table')
        BEGIN
          CREATE TABLE dbo.test_table (id INT IDENTITY(1,1) PRIMARY KEY, message NVARCHAR(255))
        END
      `);
      
      // Test insert
      await executeQuery(`
        INSERT INTO dbo.test_table (message) VALUES (?)
      `, ['Test message from Replit']);
      
      // Test select
      const testData = await executeQuery('SELECT * FROM dbo.test_table');
      console.log('Test data:', testData.recordset);
      
      // Cleanup
      await executeQuery('DROP TABLE dbo.test_table');
      
      console.log('✅ All tests passed! Microsoft Fabric is ready for use.');
    }
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    console.error('Full error:', error);
  }
}

testFabricConnection();