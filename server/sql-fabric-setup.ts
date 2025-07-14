import sql from 'mssql';

// Final Microsoft Fabric SQL Server setup with Azure AD authentication
async function setupFabricConnection() {
  console.log('🚀 Configurando Microsoft Fabric SQL Server com Azure AD...');
  
  const server = 'uxtc4qteojcetnlefqhbolxtcu-rpyxvvjlg7luzcfqp4vnum6pty.database.fabric.microsoft.com';
  const database = 'OKR-eba598b1-61bc-43d3-b6b6-da74213b7ec6';
  
  // Azure AD authentication configuration
  const azureConfig = {
    server,
    port: 1433,
    database,
    authentication: {
      type: 'azure-active-directory-password',
      options: {
        userName: process.env.SQL_USERNAME || 'adailton.monteiro@fiergs.org.br',
        password: process.env.SQL_PASSWORD || 'winner33',
        clientId: process.env.AZURE_CLIENT_ID || '04b07795-8ddb-461a-bbee-02f9e1bf7b46'
      }
    },
    options: {
      encrypt: true,
      trustServerCertificate: false,
      enableArithAbort: true,
      connectTimeout: 60000,
      requestTimeout: 60000,
      useUTC: false
    }
  };
  
  console.log('📊 Configuração Azure AD:');
  console.log('- Servidor:', server);
  console.log('- Database:', database);
  console.log('- Usuário:', azureConfig.authentication.options.userName);
  console.log('- Client ID:', azureConfig.authentication.options.clientId);
  
  try {
    const pool = new sql.ConnectionPool(azureConfig);
    await pool.connect();
    
    console.log('✅ Microsoft Fabric SQL Server conectado com sucesso!');
    
    // Test basic operations
    const testResult = await pool.request().query('SELECT 1 as test, GETDATE() as timestamp');
    console.log('✅ Query de teste:', testResult.recordset[0]);
    
    // Get database info
    const dbInfo = await pool.request().query(`
      SELECT 
        DB_NAME() as database_name,
        USER_NAME() as user_name,
        SYSTEM_USER as system_user,
        SERVERPROPERTY('ProductVersion') as version
    `);
    console.log('✅ Informações do banco:', dbInfo.recordset[0]);
    
    // List existing tables
    const tablesResult = await pool.request().query(`
      SELECT 
        TABLE_NAME,
        TABLE_SCHEMA,
        TABLE_TYPE
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `);
    console.log('✅ Tabelas existentes:', tablesResult.recordset.length);
    
    if (tablesResult.recordset.length > 0) {
      console.log('📋 Tabelas encontradas:');
      tablesResult.recordset.forEach((table, index) => {
        console.log(`   ${index + 1}. ${table.TABLE_SCHEMA}.${table.TABLE_NAME}`);
      });
    } else {
      console.log('📋 Nenhuma tabela encontrada - pronto para criação do schema OKR');
    }
    
    await pool.close();
    
    console.log('\n🎉 Microsoft Fabric SQL Server está totalmente operacional!');
    console.log('✅ Autenticação Azure AD funcionando');
    console.log('✅ Conexão estável estabelecida');
    console.log('✅ Pronto para operações OKR');
    
    return {
      success: true,
      config: azureConfig,
      tablesCount: tablesResult.recordset.length
    };
    
  } catch (error) {
    console.error('❌ Falha na conexão Microsoft Fabric:', error.message);
    
    if (error.code) {
      console.log('   Código de erro:', error.code);
    }
    
    console.log('\n💡 Soluções para problemas de autenticação Azure AD:');
    console.log('1. Verificar se SQL_USERNAME está correto (@fiergs.org.br)');
    console.log('2. Verificar se SQL_PASSWORD está correto');
    console.log('3. Verificar se AZURE_CLIENT_ID está configurado');
    console.log('4. Confirmar que o usuário tem permissões no Microsoft Fabric');
    console.log('5. Verificar se o tenant Azure AD está correto');
    
    return { success: false, error: error.message };
  }
}

// Test the connection and setup
setupFabricConnection()
  .then(result => {
    if (result.success) {
      console.log('\n🚀 Microsoft Fabric pronto para uso!');
      console.log('✅ Sistema pode ser migrado para SQL Fabric');
      process.exit(0);
    } else {
      console.log('\n⚠️ Microsoft Fabric não acessível');
      console.log('🔄 Sistema continuará usando SQLite como banco primário');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 Erro na configuração:', error);
    process.exit(1);
  });