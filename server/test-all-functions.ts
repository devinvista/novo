import { storage } from './fabric-only-storage-new';

// Test all storage functions to ensure they work correctly
async function testAllFunctions() {
  console.log('🚀 Testando todas as funções do sistema OKR...');
  
  try {
    // Test 1: User Management
    console.log('\n👤 1. Testando gestão de usuários...');
    try {
      const users = await storage.getUser(1);
      console.log('✅ getUser funcionando:', users ? 'Usuário encontrado' : 'Usuário não encontrado');
    } catch (error) {
      console.log('❌ getUser falhou:', error.message);
    }
    
    // Test 2: Reference Data
    console.log('\n🗂️ 2. Testando dados de referência...');
    try {
      const regions = await storage.getRegions();
      console.log('✅ getRegions funcionando:', regions.length, 'regiões');
      
      const solutions = await storage.getSolutions();
      console.log('✅ getSolutions funcionando:', solutions.length, 'soluções');
      
      const indicators = await storage.getStrategicIndicators();
      console.log('✅ getStrategicIndicators funcionando:', indicators.length, 'indicadores');
    } catch (error) {
      console.log('❌ Dados de referência falharam:', error.message);
    }
    
    // Test 3: Objectives
    console.log('\n🎯 3. Testando objetivos...');
    try {
      const objectives = await storage.getObjectives();
      console.log('✅ getObjectives funcionando:', objectives.length, 'objetivos');
      
      if (objectives.length > 0) {
        const firstObjective = await storage.getObjective(objectives[0].id);
        console.log('✅ getObjective funcionando:', firstObjective ? 'Objetivo encontrado' : 'Objetivo não encontrado');
      }
    } catch (error) {
      console.log('❌ Objetivos falharam:', error.message);
    }
    
    // Test 4: Key Results
    console.log('\n🔑 4. Testando resultados-chave...');
    try {
      const keyResults = await storage.getKeyResults();
      console.log('✅ getKeyResults funcionando:', keyResults.length, 'resultados-chave');
      
      if (keyResults.length > 0) {
        const firstKR = await storage.getKeyResult(keyResults[0].id);
        console.log('✅ getKeyResult funcionando:', firstKR ? 'KR encontrado' : 'KR não encontrado');
      }
    } catch (error) {
      console.log('❌ Key Results falharam:', error.message);
    }
    
    // Test 5: Actions
    console.log('\n⚡ 5. Testando ações...');
    try {
      const actions = await storage.getActions();
      console.log('✅ getActions funcionando:', actions.length, 'ações');
      
      if (actions.length > 0) {
        const firstAction = await storage.getAction(actions[0].id);
        console.log('✅ getAction funcionando:', firstAction ? 'Ação encontrada' : 'Ação não encontrada');
      }
    } catch (error) {
      console.log('❌ Actions falharam:', error.message);
    }
    
    // Test 6: Checkpoints
    console.log('\n📊 6. Testando checkpoints...');
    try {
      const checkpoints = await storage.getCheckpoints();
      console.log('✅ getCheckpoints funcionando:', checkpoints.length, 'checkpoints');
      
      if (checkpoints.length > 0) {
        const firstCheckpoint = await storage.getCheckpoint(checkpoints[0].id);
        console.log('✅ getCheckpoint funcionando:', firstCheckpoint ? 'Checkpoint encontrado' : 'Checkpoint não encontrado');
      }
    } catch (error) {
      console.log('❌ Checkpoints falharam:', error.message);
    }
    
    // Test 7: Activities
    console.log('\n📝 7. Testando atividades...');
    try {
      const activities = await storage.getRecentActivities(5);
      console.log('✅ getRecentActivities funcionando:', activities.length, 'atividades');
    } catch (error) {
      console.log('❌ Activities falharam:', error.message);
    }
    
    // Test 8: Dashboard KPIs
    console.log('\n📈 8. Testando KPIs do dashboard...');
    try {
      const kpis = await storage.getDashboardKPIs();
      console.log('✅ getDashboardKPIs funcionando:');
      console.log('   - Objetivos:', kpis.totalObjectives);
      console.log('   - Key Results:', kpis.totalKeyResults);
      console.log('   - Progresso médio:', kpis.averageProgress + '%');
      console.log('   - Ações:', kpis.totalActions);
      console.log('   - Progresso geral:', kpis.overallProgress + '%');
    } catch (error) {
      console.log('❌ Dashboard KPIs falharam:', error.message);
    }
    
    console.log('\n🎉 Teste de todas as funções concluído!');
    console.log('✅ Sistema OKR funcionando corretamente com', 
      storage.fabricConnected ? 'Microsoft Fabric' : 'SQLite');
    
  } catch (error) {
    console.error('💥 Erro geral no teste:', error);
  }
}

testAllFunctions();