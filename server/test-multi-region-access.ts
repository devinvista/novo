import { storage } from './storage.js';

/**
 * Script para testar o sistema de controle de acesso multi-regional
 */
async function testMultiRegionAccess() {
  console.log('🧪 Testando sistema de controle de acesso multi-regional...');
  
  try {
    // Criar usuário de teste com múltiplas regiões
    console.log('\n📝 Criando usuário de teste com múltiplas regiões...');
    const testUser = await storage.createUser({
      username: 'teste.multiregional',
      password: 'hash_teste',
      name: 'Usuário Multi-Regional',
      email: 'teste@multiregional.com',
      role: 'gestor',
      regionIds: [23, 24], // Central e Serra
      subRegionIds: [22, 23, 24], // Múltiplas sub-regiões
      approved: true,
      active: true,
    });
    
    console.log(`✅ Usuário criado com ID: ${testUser.id}`);
    console.log(`📍 Regiões: ${JSON.stringify(testUser.regionIds)}`);
    console.log(`🏘️ Sub-regiões: ${JSON.stringify(testUser.subRegionIds)}`);
    
    // Testar acesso a diferentes regiões
    console.log('\n🔍 Testando verificações de acesso...');
    
    // Teste 1: Acesso à região permitida
    const access1 = await storage.checkUserAccess(testUser.id, 23); // Central
    console.log(`✅ Acesso à região 23 (Central): ${access1 ? 'PERMITIDO' : 'NEGADO'}`);
    
    // Teste 2: Acesso à região não permitida
    const access2 = await storage.checkUserAccess(testUser.id, 25); // Região não atribuída
    console.log(`❌ Acesso à região 25: ${access2 ? 'PERMITIDO' : 'NEGADO'}`);
    
    // Teste 3: Acesso à sub-região permitida
    const access3 = await storage.checkUserAccess(testUser.id, undefined, 22);
    console.log(`✅ Acesso à sub-região 22: ${access3 ? 'PERMITIDO' : 'NEGADO'}`);
    
    // Teste 4: Acesso à sub-região não permitida
    const access4 = await storage.checkUserAccess(testUser.id, undefined, 30);
    console.log(`❌ Acesso à sub-região 30: ${access4 ? 'PERMITIDO' : 'NEGADO'}`);
    
    // Teste 5: Buscar objetivos com filtro regional
    console.log('\n🎯 Testando filtros de objetivos...');
    const objectives = await storage.getObjectives({
      currentUserId: testUser.id
    });
    console.log(`📊 Objetivos visíveis para o usuário: ${objectives.length}`);
    
    // Criar admin para teste
    console.log('\n👑 Testando acesso de administrador...');
    const adminUser = await storage.createUser({
      username: 'admin.teste',
      password: 'hash_admin',
      name: 'Admin Teste',
      email: 'admin@teste.com',
      role: 'admin',
      regionIds: [],
      subRegionIds: [],
      approved: true,
      active: true,
    });
    
    const adminAccess = await storage.checkUserAccess(adminUser.id, 99, 99);
    console.log(`✅ Acesso admin a qualquer região: ${adminAccess ? 'PERMITIDO' : 'NEGADO'}`);
    
    console.log('\n🎉 Testes de controle de acesso multi-regional concluídos!');
    console.log('📋 Resultados esperados:');
    console.log('   ✅ Usuário multi-regional: acesso apenas às suas regiões/sub-regiões');
    console.log('   ✅ Admin: acesso total a todas as regiões');
    console.log('   ✅ Filtros automáticos aplicados nas consultas');
    
  } catch (error) {
    console.error('❌ Erro durante os testes:', error);
    throw error;
  }
}

// Executar testes se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  testMultiRegionAccess()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Falha nos testes:', error);
      process.exit(1);
    });
}

export { testMultiRegionAccess };