import sql from 'mssql';

// Test different credential formats for Microsoft Fabric
async function testFabricCredentials() {
  console.log('🔍 Testando diferentes formatos de credenciais para Microsoft Fabric...');
  
  const server = 'uxtc4qteojcetnlefqhbolxtcu-rpyxvvjlg7luzcfqp4vnum6pty.database.fabric.microsoft.com';
  const database = 'OKR-eba598b1-61bc-43d3-b6b6-da74213b7ec6';
  
  // Test configurations without Azure AD
  const testConfigs = [
    {
      name: 'SQL Auth - Configuração Básica',
      config: {
        server,
        port: 1433,
        database,
        user: process.env.SQL_USERNAME,
        password: process.env.SQL_PASSWORD,
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
      name: 'SQL Auth - Sem Encrypt',
      config: {
        server,
        port: 1433,
        database,
        user: process.env.SQL_USERNAME,
        password: process.env.SQL_PASSWORD,
        options: {
          encrypt: false,
          trustServerCertificate: true,
          enableArithAbort: true,
          connectTimeout: 60000,
          requestTimeout: 60000
        }
      }
    },
    {
      name: 'SQL Auth - Força TLS',
      config: {
        server,
        port: 1433,
        database,
        user: process.env.SQL_USERNAME,
        password: process.env.SQL_PASSWORD,
        options: {
          encrypt: 'strict',
          trustServerCertificate: false,
          enableArithAbort: true,
          connectTimeout: 60000,
          requestTimeout: 60000
        }
      }
    }
  ];
  
  console.log('\n📊 Informações das credenciais:');
  console.log('- Username:', process.env.SQL_USERNAME ? 'Configurado' : 'Não configurado');
  console.log('- Password:', process.env.SQL_PASSWORD ? 'Configurado' : 'Não configurado');
  console.log('- Servidor:', server);
  console.log('- Database:', database);
  
  for (const { name, config } of testConfigs) {
    console.log(`\n🔄 Testando ${name}...`);
    
    let pool: sql.ConnectionPool | null = null;
    
    try {
      pool = new sql.ConnectionPool(config);
      
      // Set timeout
      const connectPromise = pool.connect();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout de 60 segundos')), 60000);
      });
      
      await Promise.race([connectPromise, timeoutPromise]);
      
      console.log(`✅ ${name}: Conexão estabelecida!`);
      
      // Test query
      const result = await pool.request().query('SELECT 1 as test, GETDATE() as now');
      console.log(`   Resultado: ${JSON.stringify(result.recordset[0])}`);
      
      // Test database
      const dbResult = await pool.request().query('SELECT DB_NAME() as current_db');
      console.log(`   Database: ${dbResult.recordset[0].current_db}`);
      
      await pool.close();
      console.log(`✅ ${name}: Teste completo com sucesso!`);
      
      return true;
      
    } catch (error) {
      console.log(`❌ ${name}: Falha`);
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
  
  console.log('\n❌ Nenhuma configuração funcionou');
  console.log('\n💡 Possíveis problemas:');
  console.log('1. Credenciais incorretas ou expiradas');
  console.log('2. Servidor Microsoft Fabric não acessível');
  console.log('3. Firewall bloqueando conexões');
  console.log('4. Formato de usuário incorreto (pode precisar de @domain)');
  console.log('5. Database não existe ou usuário sem permissão');
  
  return false;
}

testFabricCredentials()
  .then(success => {
    if (success) {
      console.log('\n🎉 Credenciais funcionando corretamente!');
      process.exit(0);
    } else {
      console.log('\n⚠️ Problema com as credenciais');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n💥 Erro no teste:', error);
    process.exit(1);
  });