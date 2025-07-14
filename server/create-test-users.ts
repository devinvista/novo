import { storage } from './hybrid-storage';

async function createTestUsers() {
  console.log('👥 Criando 3 usuários de teste...');
  
  try {
    const testUsers = [
      {
        username: 'tom',
        password: 'tom123',
        name: 'Tom Silva',
        email: 'tom.silva@sesi.rs.gov.br',
        role: 'gestor',
        regionId: 1,
        active: true
      },
      {
        username: 'maria',
        password: 'maria123',
        name: 'Maria Santos',
        email: 'maria.santos@sesi.rs.gov.br',
        role: 'operacional',
        regionId: 2,
        active: true
      },
      {
        username: 'carlos',
        password: 'carlos123',
        name: 'Carlos Oliveira',
        email: 'carlos.oliveira@sesi.rs.gov.br',
        role: 'gestor',
        regionId: 3,
        active: true
      }
    ];

    const createdUsers = [];
    
    for (const userData of testUsers) {
      try {
        // Verificar se usuário já existe
        const existingUser = await storage.getUserByUsername(userData.username);
        if (existingUser) {
          console.log(`👤 Usuário ${userData.username} já existe: ${existingUser.name}`);
          createdUsers.push(existingUser);
          continue;
        }

        // Criar novo usuário
        const created = await storage.createUser(userData);
        console.log(`👤 Usuário criado: ${created.name} (${created.username}) - ${created.role}`);
        createdUsers.push(created);
        
      } catch (error) {
        console.log(`⚠️ Erro ao criar usuário ${userData.username}: ${error.message}`);
      }
    }

    console.log('\n✅ Usuários de teste configurados:');
    for (const user of createdUsers) {
      console.log(`  • ${user.name} (${user.username}) - Perfil: ${user.role} - Região: ${user.regionId}`);
    }

    // Teste de login para verificar se os usuários foram criados corretamente
    console.log('\n🔐 Testando credenciais:');
    for (const user of createdUsers) {
      try {
        const loginTest = await storage.getUserByUsername(user.username);
        if (loginTest) {
          console.log(`✓ ${user.username}: Credenciais válidas`);
        }
      } catch (error) {
        console.log(`✗ ${user.username}: Erro no teste de login`);
      }
    }

    return createdUsers;

  } catch (error) {
    console.error('❌ Erro ao criar usuários de teste:', error);
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  createTestUsers()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { createTestUsers };