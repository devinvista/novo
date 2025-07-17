import sql from 'mssql';

// Comprehensive diagnosis of Microsoft Fabric connection issues
async function diagnoseFabricConnection() {
  console.log('🔍 Diagnóstico completo da conexão Microsoft Fabric...');
  
  const server = 'uxtc4qteojcetnlefqhbolxtcu-rpyxvvjlg7luzcfqp4vnum6pty.database.fabric.microsoft.com';
  const database = 'OKR-eba598b1-61bc-43d3-b6b6-da74213b7ec6';
  const password = process.env.SQL_PASSWORD || 'winner33';
  
  // Test without domain in username
  console.log('\n🔄 Testando usernames sem domínio...');
  
  const usernamesWithoutDomain = [
    'adailton.monteiro',
    'carlos.santos', 
    'maria.silva',
    'tom.johnson',
    'admin'
  ];
  
  for (const username of usernamesWithoutDomain) {
    console.log(`\n🔄 Testando: ${username}`);
    
    try {
      const connectionString = `server=${server},1433;database=${database};uid=${username};pwd=${password};encrypt=true;trustServerCertificate=false;authentication=SqlPassword`;
      
      const pool = new sql.ConnectionPool(connectionString);
      await pool.connect();
      
      console.log('✅ Conexão estabelecida!');
      
      const result = await pool.request().query('SELECT 1 as test, GETDATE() as timestamp');
      console.log('✅ Query executada:', result.recordset[0]);
      
      await pool.close();
      
      console.log(`\n🎉 SUCESSO COM ${username}!`);
      return { success: true, username, format: 'no-domain' };
      
    } catch (error) {
      console.log(`❌ ${username}: ${error.message}`);
    }
  }
  
  // Test with different authentication methods
  console.log('\n🔄 Testando diferentes métodos de autenticação...');
  
  const authMethods = [
    {
      name: 'Integrated Security',
      config: {
        server,
        port: 1433,
        database,
        options: {
          encrypt: true,
          trustServerCertificate: false,
          enableArithAbort: true,
          integratedSecurity: true
        }
      }
    },
    {
      name: 'Windows Authentication',
      config: {
        server,
        port: 1433,
        database,
        domain: 'fiergs.org.br',
        user: 'adailton.monteiro',
        password,
        options: {
          encrypt: true,
          trustServerCertificate: false,
          enableArithAbort: true
        }
      }
    },
    {
      name: 'Trust Server Certificate',
      config: {
        server,
        port: 1433,
        database,
        user: 'adailton.monteiro',
        password,
        options: {
          encrypt: true,
          trustServerCertificate: true,
          enableArithAbort: true
        }
      }
    }
  ];
  
  for (const { name, config } of authMethods) {
    console.log(`\n🔄 Testando ${name}...`);
    
    try {
      const pool = new sql.ConnectionPool(config);
      await pool.connect();
      
      console.log('✅ Conexão estabelecida!');
      
      const result = await pool.request().query('SELECT 1 as test');
      console.log('✅ Query executada:', result.recordset[0]);
      
      await pool.close();
      
      console.log(`\n🎉 SUCESSO COM ${name}!`);
      return { success: true, method: name };
      
    } catch (error) {
      console.log(`❌ ${name}: ${error.message}`);
    }
  }
  
  // Test connection string variations
  console.log('\n🔄 Testando variações de connection string...');
  
  const connectionStrings = [
    `Server=${server};Database=${database};User Id=adailton.monteiro;Password=${password};Encrypt=true;TrustServerCertificate=false;`,
    `Data Source=${server};Initial Catalog=${database};User ID=adailton.monteiro;Password=${password};Encrypt=yes;TrustServerCertificate=no;`,
    `server=${server};database=${database};user=adailton.monteiro;password=${password};encrypt=true;`,
    `server=${server},1433;database=${database};authentication=SqlPassword;uid=adailton.monteiro;pwd=${password};encrypt=true;TrustServerCertificate=true;`
  ];
  
  for (let i = 0; i < connectionStrings.length; i++) {
    const connStr = connectionStrings[i];
    console.log(`\n🔄 Testando connection string ${i + 1}...`);
    
    try {
      const pool = new sql.ConnectionPool(connStr);
      await pool.connect();
      
      console.log('✅ Conexão estabelecida!');
      
      const result = await pool.request().query('SELECT 1 as test');
      console.log('✅ Query executada:', result.recordset[0]);
      
      await pool.close();
      
      console.log(`\n🎉 SUCESSO COM CONNECTION STRING ${i + 1}!`);
      return { success: true, connectionString: connStr };
      
    } catch (error) {
      console.log(`❌ Connection string ${i + 1}: ${error.message}`);
    }
  }
  
  console.log('\n❌ TODOS OS TESTES FALHARAM');
  console.log('\n🔍 Análise do problema:');
  console.log('- Erro consistente: "Cannot open server [domain] requested by the login"');
  console.log('- Microsoft Fabric está interpretando o domínio do usuário como nome do servidor');
  console.log('- Isso sugere que o formato do username está incorreto para este tipo de servidor');
  console.log('- Possíveis causas: credenciais incorretas, configuração do servidor, ou limitações do Microsoft Fabric');
  
  return { success: false };
}

// Main execution
diagnoseFabricConnection()
  .then(result => {
    if (result.success) {
      console.log('\n🎉 Diagnóstico concluído - Microsoft Fabric funcionando!');
      console.log('✅ Formato funcional encontrado');
      process.exit(0);
    } else {
      console.log('\n⚠️ Diagnóstico concluído - Microsoft Fabric não acessível');
      console.log('🔄 Sistema continuará usando SQLite como banco primário');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 Erro no diagnóstico:', error);
    process.exit(1);
  });