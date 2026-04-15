import { storage } from './hybrid-storage';

async function createExamples() {
  console.log('🌱 Criando 5 objetivos, 10 key results e 20 ações...');
  
  try {
    // Verificar se já existem dados
    const existingObjectives = await storage.getObjectives();
    if (existingObjectives.length > 0) {
      console.log('✅ Dados já existem no banco. Contando:');
      console.log(`📋 Objetivos: ${existingObjectives.length}`);
      const keyResults = await storage.getKeyResults();
      console.log(`🎯 Key Results: ${keyResults.length}`);
      const actions = await storage.getActions();
      console.log(`⚡ Ações: ${actions.length}`);
      return;
    }

    // Buscar usuário admin existente ou usar o testuser
    let adminUser;
    try {
      adminUser = await storage.getUserByUsername('admin');
    } catch {
      adminUser = await storage.getUserByUsername('testuser');
    }

    if (!adminUser) {
      adminUser = await storage.createUser({
        username: 'admin',
        password: 'admin123',
        name: 'Administrador SESI',
        email: 'admin@sesi.rs.gov.br',
        role: 'admin',
        regionId: 1,
        active: true
      });
    }

    console.log('👤 Usuário responsável:', adminUser.name);

    // 5 Objetivos
    const objectives = [];
    const objectiveData = [
      {
        title: 'Aumentar Matrículas em Educação Profissional',
        description: 'Expandir o número de matrículas em cursos de educação profissional em 25% durante o ano.',
        ownerId: adminUser.id,
        regionId: 1,
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        status: 'active'
      },
      {
        title: 'Melhorar Indicadores de Saúde Ocupacional', 
        description: 'Implementar programas de saúde ocupacional que reduzam acidentes de trabalho em 30%.',
        ownerId: adminUser.id,
        regionId: 2,
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        status: 'active'
      },
      {
        title: 'Ampliar Receita de Serviços',
        description: 'Aumentar a receita de serviços prestados às indústrias em 20% através de novos produtos.',
        ownerId: adminUser.id,
        regionId: 3,
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        status: 'active'
      },
      {
        title: 'Expandir Atendimento em Saúde Preventiva',
        description: 'Aumentar o número de trabalhadores atendidos em serviços de saúde preventiva em 15%.',
        ownerId: adminUser.id,
        regionId: 4,
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        status: 'active'
      },
      {
        title: 'Otimizar Sustentabilidade Operacional',
        description: 'Implementar práticas sustentáveis que melhorem a eficiência operacional em 15%.',
        ownerId: adminUser.id,
        regionId: 5,
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        status: 'active'
      }
    ];

    for (const obj of objectiveData) {
      const created = await storage.createObjective(obj);
      objectives.push(created);
      console.log(`📋 Objetivo criado: ${created.title}`);
    }

    // 10 Key Results (2 para cada objetivo)
    const keyResults = [];
    const keyResultsData = [
      // Objetivo 1
      {
        objectiveId: objectives[0].id,
        title: 'Atingir 5.000 novas matrículas em cursos técnicos',
        description: 'Meta de 5.000 novas matrículas em cursos técnicos e profissionalizantes',
        number: 1,
        strategicIndicatorIds: [3],
        serviceLineId: 1,
        initialValue: 20000,
        targetValue: 25000,
        currentValue: 21000,
        unit: 'matrículas',
        frequency: 'monthly',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        status: 'active'
      },
      {
        objectiveId: objectives[0].id,
        title: 'Aumentar cursos presenciais com mais de 4h em 30%',
        description: 'Aumentar oferta de cursos presenciais com carga horária superior a 4 horas',
        number: 2,
        strategicIndicatorIds: [6],
        serviceLineId: 2,
        initialValue: 3000,
        targetValue: 3900,
        currentValue: 3200,
        unit: 'matrículas',
        frequency: 'monthly',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        status: 'active'
      },
      // Objetivo 2
      {
        objectiveId: objectives[1].id,
        title: 'Atender 2.000 trabalhadores em programas de saúde',
        description: 'Meta de atendimento em programas de saúde ocupacional e preventiva',
        number: 1,
        strategicIndicatorIds: [5],
        serviceLineId: 13,
        initialValue: 15000,
        targetValue: 17000,
        currentValue: 15500,
        unit: 'trabalhadores',
        frequency: 'monthly',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        status: 'active'
      },
      {
        objectiveId: objectives[1].id,
        title: 'Atender 150 novas indústrias em programas de saúde',
        description: 'Expandir atendimento a novas indústrias com serviços de saúde ocupacional',
        number: 2,
        strategicIndicatorIds: [4],
        serviceLineId: 11,
        initialValue: 500,
        targetValue: 650,
        currentValue: 520,
        unit: 'indústrias',
        frequency: 'quarterly',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        status: 'active'
      },
      // Objetivo 3
      {
        objectiveId: objectives[2].id,
        title: 'Aumentar receita de serviços em R$ 2 milhões',
        description: 'Meta de aumento de receita através de novos contratos e serviços',
        number: 1,
        strategicIndicatorIds: [2],
        serviceLineId: 11,
        initialValue: 10000000,
        targetValue: 12000000,
        currentValue: 10500000,
        unit: 'R$',
        frequency: 'monthly',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        status: 'active'
      },
      {
        objectiveId: objectives[2].id,
        title: 'Reduzir custo hora/aluno em 10%',
        description: 'Otimizar custos operacionais para melhorar eficiência financeira',
        number: 2,
        strategicIndicatorIds: [7],
        serviceLineId: 2,
        initialValue: 50,
        targetValue: 45,
        currentValue: 48,
        unit: 'R$/hora',
        frequency: 'quarterly',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        status: 'active'
      },
      // Objetivo 4
      {
        objectiveId: objectives[3].id,
        title: 'Implementar 5 novos programas de saúde preventiva',
        description: 'Criar novos programas para ampliar atendimento preventivo nas indústrias',
        number: 1,
        strategicIndicatorIds: [5],
        serviceLineId: 11,
        initialValue: 0,
        targetValue: 5,
        currentValue: 2,
        unit: 'programas',
        frequency: 'quarterly',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        status: 'active'
      },
      {
        objectiveId: objectives[3].id,
        title: 'Ampliar cobertura para 500 novos trabalhadores',
        description: 'Expandir atendimento preventivo para novos trabalhadores industriais',
        number: 2,
        strategicIndicatorIds: [5],
        serviceLineId: 13,
        initialValue: 8000,
        targetValue: 8500,
        currentValue: 8200,
        unit: 'trabalhadores',
        frequency: 'monthly',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        status: 'active'
      },
      // Objetivo 5
      {
        objectiveId: objectives[4].id,
        title: 'Melhorar índice de sustentabilidade para 85%',
        description: 'Implementar práticas sustentáveis em todas as operações organizacionais',
        number: 1,
        strategicIndicatorIds: [1],
        serviceLineId: 11,
        initialValue: 70,
        targetValue: 85,
        currentValue: 75,
        unit: '%',
        frequency: 'quarterly',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        status: 'active'
      },
      {
        objectiveId: objectives[4].id,
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
      }
    ];

    for (const kr of keyResultsData) {
      const created = await storage.createKeyResult(kr);
      keyResults.push(created);
      console.log(`🎯 Key Result criado: ${created.title}`);
    }

    // 20 Ações (2 para cada key result)
    const actionsData = [
      // KR 1
      { keyResultId: keyResults[0].id, title: 'Campanha de divulgação digital', description: 'Desenvolver campanha digital para atrair novos alunos', number: 1, strategicIndicatorId: 3, responsibleId: adminUser.id, dueDate: '2025-03-31', status: 'pending', priority: 'high' },
      { keyResultId: keyResults[0].id, title: 'Parcerias com empresas locais', description: 'Estabelecer parcerias para indicação de funcionários', number: 2, strategicIndicatorId: 3, responsibleId: adminUser.id, dueDate: '2025-04-30', status: 'in_progress', priority: 'medium' },
      // KR 2
      { keyResultId: keyResults[1].id, title: 'Desenvolver 3 novos cursos técnicos', description: 'Criar cursos técnicos com carga horária superior a 4h', number: 1, strategicIndicatorId: 6, responsibleId: adminUser.id, dueDate: '2025-05-31', status: 'pending', priority: 'high' },
      { keyResultId: keyResults[1].id, title: 'Modernizar laboratórios de ensino', description: 'Atualizar equipamentos para cursos práticos', number: 2, strategicIndicatorId: 6, responsibleId: adminUser.id, dueDate: '2025-06-30', status: 'pending', priority: 'medium' },
      // KR 3
      { keyResultId: keyResults[2].id, title: 'Implementar programa de exames periódicos', description: 'Criar cronograma de exames médicos ocupacionais', number: 1, strategicIndicatorId: 5, responsibleId: adminUser.id, dueDate: '2025-02-28', status: 'completed', priority: 'high' },
      { keyResultId: keyResults[2].id, title: 'Ampliar equipe médica', description: 'Contratar 3 novos profissionais de saúde ocupacional', number: 2, strategicIndicatorId: 5, responsibleId: adminUser.id, dueDate: '2025-03-31', status: 'in_progress', priority: 'high' },
      // KR 4
      { keyResultId: keyResults[3].id, title: 'Mapeamento de novas indústrias', description: 'Identificar indústrias potenciais para novos contratos', number: 1, strategicIndicatorId: 4, responsibleId: adminUser.id, dueDate: '2025-04-15', status: 'in_progress', priority: 'medium' },
      { keyResultId: keyResults[3].id, title: 'Desenvolvimento de propostas comerciais', description: 'Criar propostas personalizadas para cada segmento', number: 2, strategicIndicatorId: 4, responsibleId: adminUser.id, dueDate: '2025-05-15', status: 'pending', priority: 'medium' },
      // KR 5
      { keyResultId: keyResults[4].id, title: 'Lançar 2 novos produtos de consultoria', description: 'Desenvolver serviços de consultoria em segurança', number: 1, strategicIndicatorId: 2, responsibleId: adminUser.id, dueDate: '2025-07-31', status: 'pending', priority: 'high' },
      { keyResultId: keyResults[4].id, title: 'Sistema de precificação dinâmica', description: 'Otimizar preços baseado em demanda', number: 2, strategicIndicatorId: 2, responsibleId: adminUser.id, dueDate: '2025-06-30', status: 'pending', priority: 'medium' },
      // KR 6
      { keyResultId: keyResults[5].id, title: 'Automatizar processos administrativos', description: 'Implementar sistema para reduzir custos', number: 1, strategicIndicatorId: 7, responsibleId: adminUser.id, dueDate: '2025-08-31', status: 'pending', priority: 'high' },
      { keyResultId: keyResults[5].id, title: 'Otimizar recursos didáticos', description: 'Melhorar eficiência no uso de materiais', number: 2, strategicIndicatorId: 7, responsibleId: adminUser.id, dueDate: '2025-09-30', status: 'pending', priority: 'medium' },
      // KR 7
      { keyResultId: keyResults[6].id, title: 'Pesquisa de necessidades industriais', description: 'Realizar diagnóstico das necessidades de saúde', number: 1, strategicIndicatorId: 5, responsibleId: adminUser.id, dueDate: '2025-03-15', status: 'completed', priority: 'high' },
      { keyResultId: keyResults[6].id, title: 'Protocolos de atendimento', description: 'Criar protocolos padronizados', number: 2, strategicIndicatorId: 5, responsibleId: adminUser.id, dueDate: '2025-04-30', status: 'in_progress', priority: 'high' },
      // KR 8
      { keyResultId: keyResults[7].id, title: 'Expandir horários de atendimento', description: 'Disponibilizar atendimento em turnos alternativos', number: 1, strategicIndicatorId: 5, responsibleId: adminUser.id, dueDate: '2025-05-31', status: 'pending', priority: 'medium' },
      { keyResultId: keyResults[7].id, title: 'Unidades móveis de saúde', description: 'Criar unidades móveis para atendimento', number: 2, strategicIndicatorId: 5, responsibleId: adminUser.id, dueDate: '2025-07-15', status: 'pending', priority: 'high' },
      // KR 9
      { keyResultId: keyResults[8].id, title: 'Implementar gestão de resíduos', description: 'Criar programa de gestão sustentável', number: 1, strategicIndicatorId: 1, responsibleId: adminUser.id, dueDate: '2025-06-30', status: 'pending', priority: 'high' },
      { keyResultId: keyResults[8].id, title: 'Certificação ISO 14001', description: 'Obter certificação ambiental', number: 2, strategicIndicatorId: 1, responsibleId: adminUser.id, dueDate: '2025-11-30', status: 'pending', priority: 'medium' },
      // KR 10
      { keyResultId: keyResults[9].id, title: 'Sistema de monitoramento de custos', description: 'Desenvolver dashboard para controle de custos', number: 1, strategicIndicatorId: 1, responsibleId: adminUser.id, dueDate: '2025-04-30', status: 'in_progress', priority: 'high' },
      { keyResultId: keyResults[9].id, title: 'Renegociar contratos com fornecedores', description: 'Otimizar contratos para reduzir custos', number: 2, strategicIndicatorId: 2, responsibleId: adminUser.id, dueDate: '2025-05-31', status: 'pending', priority: 'medium' }
    ];

    for (const action of actionsData) {
      const created = await storage.createAction(action);
      console.log(`⚡ Ação criada: ${created.title}`);
    }

    // Gerar checkpoints para os primeiros 5 key results
    for (let i = 0; i < 5; i++) {
      await storage.generateCheckpoints(keyResults[i].id);
      console.log(`📅 Checkpoints gerados para: ${keyResults[i].title}`);
    }

    console.log('\n🎉 Exemplos criados com sucesso!');
    console.log(`✅ 5 Objetivos`);
    console.log(`✅ 10 Key Results`);
    console.log(`✅ 20 Ações`);
    console.log(`✅ Checkpoints gerados para 5 KRs`);

  } catch (error) {
    console.error('❌ Erro ao criar exemplos:', error);
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  createExamples()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { createExamples };