import { storage } from './hybrid-storage';

async function addRemainingExamples() {
  console.log('🔧 Completando exemplos restantes...');
  
  try {
    // Verificar dados existentes
    const objectives = await storage.getObjectives();
    const keyResults = await storage.getKeyResults();
    const actions = await storage.getActions();
    
    console.log(`📊 Status atual:`);
    console.log(`  Objetivos: ${objectives.length}`);
    console.log(`  Key Results: ${keyResults.length}`);
    console.log(`  Ações: ${actions.length}`);

    // Buscar usuário admin
    const adminUser = await storage.getUserByUsername('admin');
    if (!adminUser) {
      throw new Error('Usuário admin não encontrado');
    }

    // Se temos menos de 10 key results, criar o último
    if (keyResults.length < 10) {
      const lastObjective = objectives[objectives.length - 1];
      const lastKeyResult = {
        objectiveId: lastObjective.id,
        title: 'Reduzir custos operacionais em 15%',
        description: 'Otimizar processos para reduzir custos e aumentar sustentabilidade',
        number: 2,
        strategicIndicatorIds: [1, 2],
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

      const createdKR = await storage.createKeyResult(lastKeyResult);
      console.log(`🎯 Key Result final criado: ${createdKR.title}`);
      keyResults.push(createdKR);
    }

    // Se temos menos de 20 ações, criar as restantes
    if (actions.length < 20) {
      const actionsToCreate = [];
      
      // Calcular quantas ações criar para cada KR
      const actionsPerKR = 2;
      const currentActionsPerKR = Math.floor(actions.length / keyResults.length);
      
      for (let i = 0; i < keyResults.length; i++) {
        const kr = keyResults[i];
        const existingActionsForKR = actions.filter(a => a.keyResultId === kr.id).length;
        const actionsNeeded = actionsPerKR - existingActionsForKR;
        
        for (let j = 0; j < actionsNeeded; j++) {
          const actionNumber = existingActionsForKR + j + 1;
          const action = {
            keyResultId: kr.id,
            title: `Ação ${actionNumber} para ${kr.title.substring(0, 30)}...`,
            description: `Descrição da ação ${actionNumber} relacionada ao key result`,
            number: actionNumber,
            strategicIndicatorId: Array.isArray(kr.strategicIndicatorIds) ? kr.strategicIndicatorIds[0] : 1,
            responsibleId: adminUser.id,
            dueDate: '2025-06-30',
            status: j === 0 ? 'in_progress' : 'pending',
            priority: j === 0 ? 'high' : 'medium'
          };
          actionsToCreate.push(action);
        }
      }

      // Criar as ações restantes
      let actionsCreated = 0;
      for (const action of actionsToCreate) {
        if (actions.length + actionsCreated >= 20) break;
        
        try {
          const created = await storage.createAction(action);
          console.log(`⚡ Ação criada: ${created.title}`);
          actionsCreated++;
        } catch (error) {
          console.log(`⚠️ Erro ao criar ação, pulando: ${error.message}`);
        }
      }

      console.log(`✅ ${actionsCreated} ações adicionais criadas`);
    }

    // Gerar checkpoints se necessário
    console.log('📅 Verificando checkpoints...');
    for (let i = 0; i < Math.min(5, keyResults.length); i++) {
      try {
        const checkpoints = await storage.getCheckpoints(keyResults[i].id);
        if (checkpoints.length === 0) {
          await storage.generateCheckpoints(keyResults[i].id);
          console.log(`📊 Checkpoints gerados para: ${keyResults[i].title}`);
        }
      } catch (error) {
        console.log(`⚠️ Erro ao gerar checkpoints para KR ${i + 1}: ${error.message}`);
      }
    }

    // Status final
    const finalObjectives = await storage.getObjectives();
    const finalKeyResults = await storage.getKeyResults();
    const finalActions = await storage.getActions();

    console.log('\n🎉 Status final dos exemplos:');
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
  addRemainingExamples()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { addRemainingExamples };