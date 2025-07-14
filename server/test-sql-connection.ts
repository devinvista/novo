import sql from 'mssql';

async function testDirectConnection() {
  console.log('🧪 Testing direct SQL Server connection...');
  
  // Try simple SQL authentication
  const config = {
    server: 'uxtc4qteojcetnlefqhbolxtcu-rpyxvvjlg7luzcfqp4vnum6pty.database.fabric.microsoft.com',
    port: 1433,
    database: 'OKR-eba598b1-61bc-43d3-b6b6-da74213b7ec6',
    user: process.env.SQL_USERNAME || '',
    password: process.env.SQL_PASSWORD || '',
    options: {
      encrypt: true,
      trustServerCertificate: true,
      enableArithAbort: true
    },
    connectionTimeout: 30000,
    requestTimeout: 30000
  };
  
  console.log('🔌 Connection config:');
  console.log(`   Server: ${config.server}`);
  console.log(`   Port: ${config.port}`);
  console.log(`   Database: ${config.database}`);
  console.log(`   User: ${config.user}`);
  console.log(`   Password: ${config.password ? '[SET]' : '[NOT SET]'}`);
  
  try {
    const pool = new sql.ConnectionPool(config);
    
    console.log('🔄 Attempting connection...');
    await pool.connect();
    
    console.log('✅ Connected successfully!');
    
    // Test a simple query
    const request = pool.request();
    const result = await request.query('SELECT 1 as test');
    console.log('📊 Test query result:', result.recordset);
    
    await pool.close();
    console.log('🔌 Connection closed');
    
    return true;
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('   Original error:', error.originalError?.message || 'No additional details');
    return false;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  testDirectConnection()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { testDirectConnection };