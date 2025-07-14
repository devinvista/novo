import { storage } from './hybrid-storage';

async function createActionsSimple() {
  console.log('⚡ Criando 20 ações simples...');
  
  try {
    // Buscar dados existentes
    const keyResults = await storage.getKeyResults();
    const adminUser = await storage.getUserByUsername('admin');
    
    console.log(`Key Results disponíveis: ${keyResults.length}`);
    console.log(`Usuário admin: ${adminUser?.name}`);

    if (keyResults.length === 0 || !adminUser) {
      throw new Error('Dados insuficientes para criar ações');
    }

    // Criar 2 ações para cada key result (até totalizar 20)
    const actionsToCreate = [
      'Desenvolver planejamento estratégico',
      'Implementar sistema de monitoramento',
      'Realizar treinamento da equipe',
      'Definir processos de qualidade',
      'Estabelecer parcerias comerciais',
      'Criar campanhas de marketing',
      'Otimizar processos operacionais',
      'Implementar controles de segurança',
      'Desenvolver novos produtos',
      'Melhorar atendimento ao cliente',
      'Realizar pesquisa de mercado',
      'Investir em tecnologia',
      'Capacitar recursos humanos',
      'Estabelecer métricas de performance',
      'Criar programa de sustentabilidade',
      'Implementar gestão de riscos',
      'Desenvolver cultura organizacional',
      'Melhorar comunicação interna',
      'Otimizar gestão financeira',
      'Implementar inovação tecnológica'
    ];

    let actionCount = 0;
    
    for (let i = 0; i < keyResults.length && actionCount < 20; i++) {
      const kr = keyResults[i];
      
      // Criar 2 ações por key result
      for (let j = 0; j < 2 && actionCount < 20; j++) {
        const actionTitle = actionsToCreate[actionCount];
        const actionData = {
          keyResultId: kr.id,
          title: actionTitle,
          description: `${actionTitle} para o key result: ${kr.title}`,
          number: j + 1,
          strategicIndicatorId: 1, // Simplificado - usar sempre o primeiro indicador
          responsibleId: adminUser.id,
          dueDate: '2025-06-30',
          status: actionCount % 3 === 0 ? 'completed' : (actionCount % 2 === 0 ? 'in_progress' : 'pending'),
          priority: actionCount % 2 === 0 ? 'high' : 'medium'
        };

        try {
          const created = await storage.createAction(actionData);
          console.log(`⚡ Ação ${actionCount + 1}: ${created.title}`);
          actionCount++;
        } catch (error) {
          console.log(`⚠️ Erro na ação ${actionCount + 1}: ${error.message}`);
          // Tentar uma versão simplificada
          const simpleAction = {
            keyResultId: kr.id,
            title: actionTitle,
            description: `Ação relacionada ao KR ${kr.id}`,
            number: j + 1,
            responsibleId: adminUser.id,
            dueDate: '2025-06-30',
            status: 'pending',
            priority: 'medium'
          };
          
          try {
            const created = await storage.createAction(simpleAction);
            console.log(`⚡ Ação ${actionCount + 1} (simplificada): ${created.title}`);
            actionCount++;
          } catch (error2) {
            console.log(`❌ Falha total na ação ${actionCount + 1}: ${error2.message}`);
          }
        }
      }
    }

    console.log(`\n🎉 Total de ações criadas: ${actionCount}`);
    
    return actionCount;

  } catch (error) {
    console.error('❌ Erro ao criar ações:', error);
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  createActionsSimple()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { createActionsSimple };