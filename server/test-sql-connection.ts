import sql from 'mssql';

// Test simple SQL connection to Microsoft Fabric
async function testSQLConnection() {
  console.log('🔍 Testando conexão SQL simples com Microsoft Fabric...');
  
  const connectionString = `server=uxtc4qteojcetnlefqhbolxtcu-rpyxvvjlg7luzcfqp4vnum6pty.database.fabric.microsoft.com,1433;database=OKR-eba598b1-61bc-43d3-b6b6-da74213b7ec6;uid=${process.env.SQL_USERNAME};pwd=${process.env.SQL_PASSWORD};encrypt=true;trustServerCertificate=false;authentication=SqlPassword`;
  
  console.log('📊 Usando connection string approach (similar ao Go)');
  console.log('- Servidor: uxtc4qteojcetnlefqhbolxtcu-rpyxvvjlg7luzcfqp4vnum6pty.database.fabric.microsoft.com');
  console.log('- Database: OKR-eba598b1-61bc-43d3-b6b6-da74213b7ec6');
  console.log('- Username:', process.env.SQL_USERNAME ? 'Configurado' : 'Não configurado');
  console.log('- Password:', process.env.SQL_PASSWORD ? 'Configurado' : 'Não configurado');
  
  try {
    const pool = new sql.ConnectionPool(connectionString);
    await pool.connect();
    
    console.log('✅ Conexão estabelecida com sucesso!');
    
    // Test basic query
    const result = await pool.request().query('SELECT 1 as test, GETDATE() as timestamp');
    console.log('✅ Query básica:', result.recordset[0]);
    
    // Test database name
    const dbResult = await pool.request().query('SELECT DB_NAME() as database_name');
    console.log('✅ Database conectado:', dbResult.recordset[0].database_name);
    
    // Test user info
    const userResult = await pool.request().query('SELECT USER_NAME() as user_name, SYSTEM_USER as system_user');
    console.log('✅ Usuário conectado:', userResult.recordset[0]);
    
    await pool.close();
    
    console.log('\n🎉 Microsoft Fabric SQL Server está funcionando!');
    console.log('✅ Conexão com connection string foi bem-sucedida');
    
    return true;
    
  } catch (error) {
    console.log('❌ Falha na conexão SQL:', error.message);
    
    if (error.code) {
      console.log('   Código de erro:', error.code);
    }
    
    console.log('\n💡 Verificações necessárias:');
    console.log('1. Credenciais SQL_USERNAME e SQL_PASSWORD corretas');
    console.log('2. Usuário tem permissão no database OKR-eba598b1-61bc-43d3-b6b6-da74213b7ec6');
    console.log('3. Servidor Microsoft Fabric está acessível');
    console.log('4. Firewall permite conexões na porta 1433');
    
    return false;
  }
}

testSQLConnection()
  .then(success => {
    if (success) {
      console.log('\n🚀 Sistema pronto para usar Microsoft Fabric!');
      process.exit(0);
    } else {
      console.log('\n⚠️ Sistema continuará usando SQLite como fallback');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 Erro no teste:', error);
    process.exit(1);
  });