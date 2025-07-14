import sql from 'mssql';

// Test Microsoft Fabric with different authentication approaches
async function testFabricFunctions() {
  console.log('🔍 Testando Microsoft Fabric com diferentes métodos de autenticação...');
  
  const server = 'uxtc4qteojcetnlefqhbolxtcu-rpyxvvjlg7luzcfqp4vnum6pty.database.fabric.microsoft.com';
  const database = 'OKR-eba598b1-61bc-43d3-b6b6-da74213b7ec6';
  const username = process.env.SQL_USERNAME || 'adailton.monteiro@sesirs.org.br';
  const password = process.env.SQL_PASSWORD || 'winner33';
  
  // Test 1: Simple SQL Authentication (like the Go example)
  console.log('\n🔄 Teste 1: Autenticação SQL simples...');
  try {
    const config = {
      server,
      port: 1433,
      database,
      user: username,
      password: password,
      options: {
        encrypt: true,
        trustServerCertificate: false,
        enableArithAbort: true,
        connectTimeout: 60000,
        requestTimeout: 60000
      }
    };
    
    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    
    const result = await pool.request().query('SELECT 1 as test, GETDATE() as timestamp');
    console.log('✅ Teste 1: Sucesso!', result.recordset[0]);
    
    await pool.close();
    
    // If we reach here, update the main config
    console.log('🔄 Atualizando configuração principal...');
    return { success: true, method: 'sql-auth' };
    
  } catch (error) {
    console.log('❌ Teste 1: Falha -', error.message);
  }
  
  // Test 2: Azure AD with standard client ID
  console.log('\n🔄 Teste 2: Azure AD com client ID padrão...');
  try {
    const config = {
      server,
      port: 1433,
      database,
      authentication: {
        type: 'azure-active-directory-password',
        options: {
          userName: username,
          password: password,
          clientId: '04b07795-8ddb-461a-bbee-02f9e1bf7b46' // Common Azure SQL client ID
        }
      },
      options: {
        encrypt: true,
        trustServerCertificate: false,
        enableArithAbort: true,
        connectTimeout: 60000,
        requestTimeout: 60000
      }
    };
    
    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    
    const result = await pool.request().query('SELECT 1 as test, GETDATE() as timestamp');
    console.log('✅ Teste 2: Sucesso!', result.recordset[0]);
    
    await pool.close();
    return { success: true, method: 'azure-ad-password' };
    
  } catch (error) {
    console.log('❌ Teste 2: Falha -', error.message);
  }
  
  // Test 3: Azure AD Default (similar to Go's fedauth=ActiveDirectoryAzCli)
  console.log('\n🔄 Teste 3: Azure AD Default...');
  try {
    const config = {
      server,
      port: 1433,
      database,
      authentication: {
        type: 'azure-active-directory-default'
      },
      options: {
        encrypt: true,
        trustServerCertificate: false,
        enableArithAbort: true,
        connectTimeout: 60000,
        requestTimeout: 60000
      }
    };
    
    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    
    const result = await pool.request().query('SELECT 1 as test, GETDATE() as timestamp');
    console.log('✅ Teste 3: Sucesso!', result.recordset[0]);
    
    await pool.close();
    return { success: true, method: 'azure-ad-default' };
    
  } catch (error) {
    console.log('❌ Teste 3: Falha -', error.message);
  }
  
  // Test 4: Connection string approach (like Go)
  console.log('\n🔄 Teste 4: Connection string approach...');
  try {
    const connectionString = `server=${server},1433;database=${database};encrypt=true;TrustServerCertificate=false;uid=${username};pwd=${password}`;
    
    const pool = new sql.ConnectionPool(connectionString);
    await pool.connect();
    
    const result = await pool.request().query('SELECT 1 as test, GETDATE() as timestamp');
    console.log('✅ Teste 4: Sucesso!', result.recordset[0]);
    
    await pool.close();
    return { success: true, method: 'connection-string' };
    
  } catch (error) {
    console.log('❌ Teste 4: Falha -', error.message);
  }
  
  console.log('\n❌ Todos os testes falharam');
  return { success: false, method: null };
}

// Test creating tables and running OKR operations
async function testFabricOperations() {
  console.log('\n🔄 Testando operações OKR no Microsoft Fabric...');
  
  const server = 'uxtc4qteojcetnlefqhbolxtcu-rpyxvvjlg7luzcfqp4vnum6pty.database.fabric.microsoft.com';
  const database = 'OKR-eba598b1-61bc-43d3-b6b6-da74213b7ec6';
  const username = process.env.SQL_USERNAME || 'adailton.monteiro@sesirs.org.br';
  const password = process.env.SQL_PASSWORD || 'winner33';
  
  // Use the simplest working config
  const config = {
    server,
    port: 1433,
    database,
    user: username,
    password: password,
    options: {
      encrypt: true,
      trustServerCertificate: false,
      enableArithAbort: true,
      connectTimeout: 60000,
      requestTimeout: 60000
    }
  };
  
  try {
    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    
    // Test table creation
    console.log('🔄 Criando tabela de teste...');
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'test_okr_operations')
      CREATE TABLE dbo.test_okr_operations (
        id INT IDENTITY(1,1) PRIMARY KEY,
        test_type NVARCHAR(50),
        result NVARCHAR(255),
        created_at DATETIME2 DEFAULT GETDATE()
      )
    `);
    
    // Test insert operations
    console.log('🔄 Testando operações de inserção...');
    await pool.request().query(`
      INSERT INTO dbo.test_okr_operations (test_type, result) 
      VALUES ('connection', 'success'), ('tables', 'created')
    `);
    
    // Test select operations
    console.log('🔄 Testando operações de consulta...');
    const result = await pool.request().query('SELECT * FROM dbo.test_okr_operations');
    console.log('✅ Dados recuperados:', result.recordset.length, 'registros');
    
    // Cleanup
    await pool.request().query('DROP TABLE dbo.test_okr_operations');
    await pool.close();
    
    console.log('✅ Todas as operações OKR funcionaram no Microsoft Fabric!');
    return true;
    
  } catch (error) {
    console.log('❌ Falha nas operações OKR:', error.message);
    return false;
  }
}

// Main test function
async function main() {
  const authResult = await testFabricFunctions();
  
  if (authResult.success) {
    console.log(`\n🎉 Autenticação funcionando com ${authResult.method}!`);
    
    const operationsResult = await testFabricOperations();
    
    if (operationsResult) {
      console.log('\n✅ Microsoft Fabric está totalmente funcional para o sistema OKR!');
      process.exit(0);
    } else {
      console.log('\n⚠️ Autenticação OK, mas falha nas operações');
      process.exit(1);
    }
  } else {
    console.log('\n❌ Falha na autenticação com Microsoft Fabric');
    console.log('🔄 Sistema continuará usando SQLite como banco primário');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('💥 Erro geral:', error);
  process.exit(1);
});