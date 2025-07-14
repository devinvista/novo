import sql from 'mssql';

async function diagnoseFabricConnection() {
  console.log('🔍 Diagnosticando conexão com Microsoft Fabric SQL Server...');
  
  // Display connection details (without showing sensitive info)
  console.log('\n📊 Detalhes da conexão:');
  console.log('- Servidor:', process.env.SQL_SERVER || 'uxtc4qteojcetnlefqhbolxtcu-rpyxvvjlg7luzcfqp4vnum6pty.database.fabric.microsoft.com');
  console.log('- Porta:', process.env.SQL_PORT || '1433');
  console.log('- Database:', process.env.SQL_DATABASE || 'OKR-eba598b1-61bc-43d3-b6b6-da74213b7ec6');
  console.log('- Username:', process.env.SQL_USERNAME ? '✅ Configurado' : '❌ Não configurado');
  console.log('- Password:', process.env.SQL_PASSWORD ? '✅ Configurado' : '❌ Não configurado');
  
  // Test different connection configurations
  const connectionConfigs = [
    {
      name: 'Configuração Padrão',
      config: {
        server: process.env.SQL_SERVER || 'uxtc4qteojcetnlefqhbolxtcu-rpyxvvjlg7luzcfqp4vnum6pty.database.fabric.microsoft.com',
        port: parseInt(process.env.SQL_PORT || '1433'),
        database: process.env.SQL_DATABASE || 'OKR-eba598b1-61bc-43d3-b6b6-da74213b7ec6',
        user: process.env.SQL_USERNAME,
        password: process.env.SQL_PASSWORD,
        options: {
          encrypt: true,
          trustServerCertificate: false,
          enableArithAbort: true,
          requestTimeout: 30000,
          connectionTimeout: 30000,
          appName: 'OKR-Replit'
        }
      }
    },
    {
      name: 'Configuração com Trust Certificate',
      config: {
        server: process.env.SQL_SERVER || 'uxtc4qteojcetnlefqhbolxtcu-rpyxvvjlg7luzcfqp4vnum6pty.database.fabric.microsoft.com',
        port: parseInt(process.env.SQL_PORT || '1433'),
        database: process.env.SQL_DATABASE || 'OKR-eba598b1-61bc-43d3-b6b6-da74213b7ec6',
        user: process.env.SQL_USERNAME,
        password: process.env.SQL_PASSWORD,
        options: {
          encrypt: true,
          trustServerCertificate: true,
          enableArithAbort: true,
          requestTimeout: 30000,
          connectionTimeout: 30000,
          appName: 'OKR-Replit'
        }
      }
    },
    {
      name: 'Configuração Azure AD',
      config: {
        server: process.env.SQL_SERVER || 'uxtc4qteojcetnlefqhbolxtcu-rpyxvvjlg7luzcfqp4vnum6pty.database.fabric.microsoft.com',
        port: parseInt(process.env.SQL_PORT || '1433'),
        database: process.env.SQL_DATABASE || 'OKR-eba598b1-61bc-43d3-b6b6-da74213b7ec6',
        authentication: {
          type: 'default'
        },
        options: {
          encrypt: true,
          trustServerCertificate: false,
          enableArithAbort: true,
          requestTimeout: 30000,
          connectionTimeout: 30000,
          appName: 'OKR-Replit'
        }
      }
    }
  ];
  
  for (const { name, config } of connectionConfigs) {
    console.log(`\n🔄 Testando ${name}...`);
    
    try {
      const pool = new sql.ConnectionPool(config);
      await pool.connect();
      
      console.log(`✅ ${name}: Conexão estabelecida com sucesso!`);
      
      // Test a simple query
      const result = await pool.request().query('SELECT 1 as test, GETDATE() as timestamp');
      console.log(`📊 Resultado do teste: ${JSON.stringify(result.recordset[0])}`);
      
      // Test database access
      const dbTest = await pool.request().query('SELECT DB_NAME() as database_name');
      console.log(`🏢 Database conectado: ${dbTest.recordset[0].database_name}`);
      
      await pool.close();
      
      console.log(`✅ ${name}: Teste completo realizado com sucesso!`);
      return true;
      
    } catch (error) {
      console.log(`❌ ${name}: Falha na conexão`);
      console.log(`   Erro: ${error.message}`);
      if (error.code) {
        console.log(`   Código: ${error.code}`);
      }
      if (error.number) {
        console.log(`   Número: ${error.number}`);
      }
    }
  }
  
  console.log('\n❌ Todas as configurações de conexão falharam');
  console.log('\n💡 Possíveis soluções:');
  console.log('1. Verifique se as credenciais SQL_USERNAME e SQL_PASSWORD estão corretas');
  console.log('2. Confirme se o servidor Microsoft Fabric está acessível');
  console.log('3. Verifique se o firewall permite conexões na porta 1433');
  console.log('4. Confirme se o usuário tem permissões no database especificado');
  console.log('5. Teste com Azure AD authentication se disponível');
  
  return false;
}

diagnoseFabricConnection()
  .then((success) => {
    if (success) {
      console.log('\n🎉 Diagnóstico concluído: Conexão funcional!');
      process.exit(0);
    } else {
      console.log('\n⚠️ Diagnóstico concluído: Conexão com problemas');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('\n💥 Erro no diagnóstico:', error);
    process.exit(1);
  });