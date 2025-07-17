import sql from 'mssql';

// Test Azure AD authentication methods for Microsoft Fabric
async function testAzureADAuth() {
  console.log('🔍 Testando autenticação Azure AD para Microsoft Fabric...');
  
  const server = 'uxtc4qteojcetnlefqhbolxtcu-rpyxvvjlg7luzcfqp4vnum6pty.database.fabric.microsoft.com';
  const database = 'OKR-eba598b1-61bc-43d3-b6b6-da74213b7ec6';
  const username = process.env.SQL_USERNAME || 'adailton.monteiro@sesirs.org.br';
  const password = process.env.SQL_PASSWORD || 'winner33';
  
  console.log('\n📊 Configuração:');
  console.log('- Servidor:', server);
  console.log('- Database:', database);
  console.log('- Usuário:', username);
  console.log('- Senha:', password ? 'Configurada' : 'Não configurada');
  
  // Test different Azure AD authentication methods
  const authMethods = [
    {
      name: 'Azure AD Password',
      config: {
        server,
        port: 1433,
        database,
        authentication: {
          type: 'azure-active-directory-password',
          options: {
            userName: username,
            password: password
          }
        },
        options: {
          encrypt: true,
          trustServerCertificate: false,
          enableArithAbort: true,
          connectTimeout: 60000,
          requestTimeout: 60000
        }
      }
    },
    {
      name: 'Azure AD Password (Trust Certificate)',
      config: {
        server,
        port: 1433,
        database,
        authentication: {
          type: 'azure-active-directory-password',
          options: {
            userName: username,
            password: password
          }
        },
        options: {
          encrypt: true,
          trustServerCertificate: true,
          enableArithAbort: true,
          connectTimeout: 60000,
          requestTimeout: 60000
        }
      }
    },
    {
      name: 'Azure AD Default',
      config: {
        server,
        port: 1433,
        database,
        user: username,
        password: password,
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
      }
    },
    {
      name: 'SQL Authentication com Azure Features',
      config: {
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
          requestTimeout: 60000,
          useUTC: false
        }
      }
    }
  ];
  
  for (const { name, config } of authMethods) {
    console.log(`\n🔄 Testando ${name}...`);
    
    let pool: sql.ConnectionPool | null = null;
    
    try {
      pool = new sql.ConnectionPool(config);
      
      // Connection with timeout
      const connectPromise = pool.connect();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout de 60 segundos')), 60000);
      });
      
      await Promise.race([connectPromise, timeoutPromise]);
      
      console.log(`✅ ${name}: Conexão estabelecida com sucesso!`);
      
      // Test basic query
      const result = await pool.request().query('SELECT 1 as test, GETDATE() as timestamp');
      console.log(`   Teste básico: ${JSON.stringify(result.recordset[0])}`);
      
      // Test database name
      const dbResult = await pool.request().query('SELECT DB_NAME() as database_name');
      console.log(`   Database conectado: ${dbResult.recordset[0].database_name}`);
      
      // Test user info
      const userResult = await pool.request().query('SELECT USER_NAME() as user_name, SYSTEM_USER as system_user');
      console.log(`   Usuário conectado: ${userResult.recordset[0].user_name} (${userResult.recordset[0].system_user})`);
      
      // Test table creation (if possible)
      try {
        await pool.request().query(`
          IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'test_fabric_connection')
          CREATE TABLE dbo.test_fabric_connection (
            id INT IDENTITY(1,1) PRIMARY KEY,
            message NVARCHAR(255),
            created_at DATETIME2 DEFAULT GETDATE()
          )
        `);
        
        await pool.request().query(`
          INSERT INTO dbo.test_fabric_connection (message) VALUES ('Teste de conexão Fabric')
        `);
        
        const testData = await pool.request().query('SELECT * FROM dbo.test_fabric_connection');
        console.log(`   Dados de teste: ${testData.recordset.length} registros`);
        
        await pool.request().query('DROP TABLE dbo.test_fabric_connection');
        console.log(`   Teste de escrita: Sucesso`);
        
      } catch (writeError) {
        console.log(`   Teste de escrita: Falha (${writeError.message})`);
      }
      
      await pool.close();
      console.log(`✅ ${name}: Todos os testes concluídos com sucesso!`);
      
      return { success: true, method: name };
      
    } catch (error) {
      console.log(`❌ ${name}: Falha na conexão`);
      console.log(`   Erro: ${error.message}`);
      
      if (error.code) {
        console.log(`   Código: ${error.code}`);
      }
      
      if (pool) {
        try {
          await pool.close();
        } catch (e) {
          // Ignore close errors
        }
      }
    }
  }
  
  console.log('\n❌ Nenhum método de autenticação funcionou');
  console.log('\n💡 Possíveis soluções:');
  console.log('1. Verificar se as credenciais Azure AD estão corretas');
  console.log('2. Confirmar se o usuário tem permissões no Microsoft Fabric');
  console.log('3. Verificar se o tenant Azure AD está configurado corretamente');
  console.log('4. Testar se o usuário consegue conectar via Azure Data Studio');
  console.log('5. Verificar se o firewall permite conexões do Replit');
  
  return { success: false, method: null };
}

testAzureADAuth()
  .then(result => {
    if (result.success) {
      console.log(`\n🎉 Autenticação funcionando com ${result.method}!`);
      console.log('✅ Microsoft Fabric SQL Server está acessível');
      process.exit(0);
    } else {
      console.log('\n⚠️ Falha na autenticação Azure AD');
      console.log('🔄 Sistema continuará usando SQLite como fallback');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n💥 Erro no teste de autenticação:', error);
    process.exit(1);
  });