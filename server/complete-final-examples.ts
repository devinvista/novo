import { storage } from './hybrid-storage';

async function completeFinalExamples() {
  console.log('🎯 Completando os últimos exemplos...');
  
  try {
    // Verificar dados atuais
    const objectives = await storage.getObjectives();
    const keyResults = await storage.getKeyResults();
    const actions = await storage.getActions();
    
    console.log(`📊 Status atual:`);
    console.log(`  Objetivos: ${objectives.length}`);
    console.log(`  Key Results: ${keyResults.length}`);
    console.log(`  Ações: ${actions.length}`);

    const adminUser = await storage.getUserByUsername('admin');
    
    // Criar o 10º key result se necessário
    if (keyResults.length < 10) {
      const lastObjective = objectives[objectives.length - 1];
      const lastKR = {
        objectiveId: lastObjective.id,
        title: 'Reduzir custos operacionais em 15%',
        description: 'Otimizar processos para reduzir custos operacionais',
        number: 2,
        strategicIndicatorIds: [1],
        serviceLineId: 2,
        initialValue: 100,
        targetValue: 85,
        currentValue: 95,
        unit: '%',
        frequency: 'monthly',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        status: 'active'
      };

      const created = await storage.createKeyResult(lastKR);
      console.log(`🎯 Key Result 10 criado: ${created.title}`);
    }

    // Criar as últimas 2 ações se necessário
    if (actions.length < 20) {
      const actionsNeeded = 20 - actions.length;
      const lastKR = await storage.getKeyResults();
      
      for (let i = 0; i < actionsNeeded; i++) {
        const actionData = {
          keyResultId: lastKR[lastKR.length - 1].id,
          title: i === 0 ? 'Otimizar gestão financeira' : 'Implementar inovação tecnológica',
          description: `Ação final ${i + 1} para completar os exemplos`,
          number: i + 1,
          responsibleId: adminUser.id,
          dueDate: '2025-06-30',
          status: 'pending',
          priority: 'medium'
        };

        const created = await storage.createAction(actionData);
        console.log(`⚡ Ação ${actions.length + i + 1} criada: ${created.title}`);
      }
    }

    // Status final
    const finalObjectives = await storage.getObjectives();
    const finalKeyResults = await storage.getKeyResults();
    const finalActions = await storage.getActions();

    console.log('\n🎉 EXEMPLOS COMPLETOS!');
    console.log(`✅ ${finalObjectives.length} Objetivos`);
    console.log(`✅ ${finalKeyResults.length} Key Results`);
    console.log(`✅ ${finalActions.length} Ações`);

    return {
      objectives: finalObjectives.length,
      keyResults: finalKeyResults.length,
      actions: finalActions.length
    };

  } catch (error) {
    console.error('❌ Erro ao completar exemplos:', error);
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  completeFinalExamples()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { completeFinalExamples };