import { db } from "./pg-db";
import {
  objectives,
  keyResults,
  actions,
  checkpoints,
  actionComments,
} from "@shared/pg-schema";
import { eq } from "drizzle-orm";

// IDs fixos conforme os dados inseridos pelo seed principal
const USERS = {
  admin: 1,
  gestorSul: 2,
  gestorSudeste: 3,
  gestorNordeste: 4,
  joao: 5,
  mariana: 6,
  fernanda: 7,
  lucas: 8,
  patricia: 9,
};

const REGIONS = { SUL: 1, SUDESTE: 2, NORDESTE: 3, CENTROOESTE: 4, NORTE: 5 };

const SL = {
  TELEMED: 1,
  PRONTUARIO: 2,
  TREIN_PRESENCIAL: 3,
  ELEARNING: 4,
  LOGISTICA: 5,
  BI: 6,
};

async function seedOKRs() {
  console.log("🎯 Iniciando seed de OKRs...");

  // ─── Objetivos ─────────────────────────────────────────────
  console.log("📌 Criando objetivos...");

  const [obj1] = await db
    .insert(objectives)
    .values({
      title: "Expandir cobertura de telemedicina na Região Sul",
      description:
        "Aumentar o número de consultas online e ampliar o alcance dos serviços digitais de saúde em todos os estados do Sul.",
      ownerId: USERS.gestorSul,
      regionId: REGIONS.SUL,
      subRegionIds: [1, 2, 3],
      startDate: "2025-01-01",
      endDate: "2025-06-30",
      status: "active",
      progress: "42.00",
      period: "2025-T1",
      serviceLineId: SL.TELEMED,
    })
    .returning();

  const [obj2] = await db
    .insert(objectives)
    .values({
      title: "Implantar prontuário eletrônico em 50 clínicas do Sudeste",
      description:
        "Digitalizar os processos clínicos das parceiras da região Sudeste com implementação completa do sistema de prontuário eletrônico.",
      ownerId: USERS.gestorSudeste,
      regionId: REGIONS.SUDESTE,
      subRegionIds: [4, 5, 6],
      startDate: "2025-01-01",
      endDate: "2025-09-30",
      status: "active",
      progress: "61.00",
      period: "2025-T1",
      serviceLineId: SL.PRONTUARIO,
    })
    .returning();

  const [obj3] = await db
    .insert(objectives)
    .values({
      title: "Atingir 1.000 horas de capacitação entregues no Nordeste",
      description:
        "Desenvolver e executar programas de treinamento presencial e EAD para equipes clínicas e administrativas da região Nordeste.",
      ownerId: USERS.gestorNordeste,
      regionId: REGIONS.NORDESTE,
      subRegionIds: [8, 9, 10],
      startDate: "2025-04-01",
      endDate: "2025-12-31",
      status: "active",
      progress: "28.00",
      period: "2025-T2",
      serviceLineId: SL.TREIN_PRESENCIAL,
    })
    .returning();

  const [obj4] = await db
    .insert(objectives)
    .values({
      title: "Aumentar NPS para 75+ em todas as regiões",
      description:
        "Elevar o índice de satisfação dos clientes através de melhorias no atendimento, agilidade e qualidade das soluções entregues.",
      ownerId: USERS.admin,
      regionId: REGIONS.SUDESTE,
      subRegionIds: [4, 5, 6, 7],
      startDate: "2025-01-01",
      endDate: "2025-12-31",
      status: "active",
      progress: "53.00",
      period: "2025-T1",
      serviceLineId: SL.BI,
    })
    .returning();

  const [obj5] = await db
    .insert(objectives)
    .values({
      title: "Reduzir churn de contratos para abaixo de 5%",
      description:
        "Implementar ações de retenção, QBRs e monitoramento proativo para reduzir cancelamentos de contratos.",
      ownerId: USERS.gestorSudeste,
      regionId: REGIONS.SUDESTE,
      subRegionIds: [4, 5],
      startDate: "2025-01-01",
      endDate: "2025-06-30",
      status: "completed",
      progress: "100.00",
      period: "2025-T1",
      serviceLineId: SL.BI,
    })
    .returning();

  const [obj6] = await db
    .insert(objectives)
    .values({
      title: "Otimizar logística de insumos hospitalares no Sul",
      description:
        "Mapear e otimizar a cadeia de suprimentos de insumos hospitalares para reduzir custos e aumentar disponibilidade.",
      ownerId: USERS.gestorSul,
      regionId: REGIONS.SUL,
      subRegionIds: [1, 2],
      startDate: "2025-07-01",
      endDate: "2025-12-31",
      status: "delayed",
      progress: "15.00",
      period: "2025-T3",
      serviceLineId: SL.LOGISTICA,
    })
    .returning();

  // ─── Resultados-Chave ──────────────────────────────────────
  console.log("🔑 Criando resultados-chave...");

  // KRs do Objetivo 1 — Telemedicina Sul
  const [kr1] = await db
    .insert(keyResults)
    .values({
      objectiveId: obj1.id,
      title: "Realizar 500 consultas online no trimestre",
      description: "Número total de consultas realizadas via plataforma de telemedicina",
      targetValue: "500",
      currentValue: "213",
      unit: "consultas",
      startDate: "2025-01-01",
      endDate: "2025-03-31",
      frequency: "monthly",
      status: "active",
      progress: "42.60",
      serviceLineId: SL.TELEMED,
      strategicIndicatorIds: [4],
    })
    .returning();

  const [kr2] = await db
    .insert(keyResults)
    .values({
      objectiveId: obj1.id,
      title: "Alcançar 80% de satisfação dos pacientes atendidos online",
      description: "Taxa de aprovação medida via pesquisa pós-consulta",
      targetValue: "80",
      currentValue: "74",
      unit: "%",
      startDate: "2025-01-01",
      endDate: "2025-06-30",
      frequency: "monthly",
      status: "active",
      progress: "92.50",
      serviceLineId: SL.TELEMED,
      strategicIndicatorIds: [2],
    })
    .returning();

  const [kr3] = await db
    .insert(keyResults)
    .values({
      objectiveId: obj1.id,
      title: "Integrar 10 novos hospitais à plataforma",
      description: "Contratos assinados e plataforma ativa",
      targetValue: "10",
      currentValue: "3",
      unit: "hospitais",
      startDate: "2025-01-01",
      endDate: "2025-06-30",
      frequency: "quarterly",
      status: "active",
      progress: "30.00",
      serviceLineId: SL.TELEMED,
      strategicIndicatorIds: [4],
    })
    .returning();

  // KRs do Objetivo 2 — Prontuário Sudeste
  const [kr4] = await db
    .insert(keyResults)
    .values({
      objectiveId: obj2.id,
      title: "Implantar prontuário em 50 clínicas",
      description: "Clínicas com sistema implantado e em uso ativo",
      targetValue: "50",
      currentValue: "31",
      unit: "clínicas",
      startDate: "2025-01-01",
      endDate: "2025-09-30",
      frequency: "monthly",
      status: "active",
      progress: "62.00",
      serviceLineId: SL.PRONTUARIO,
      strategicIndicatorIds: [4],
    })
    .returning();

  const [kr5] = await db
    .insert(keyResults)
    .values({
      objectiveId: obj2.id,
      title: "Capacitar 200 profissionais no uso do sistema",
      description: "Profissionais de saúde e administrativos treinados",
      targetValue: "200",
      currentValue: "124",
      unit: "profissionais",
      startDate: "2025-01-01",
      endDate: "2025-09-30",
      frequency: "monthly",
      status: "active",
      progress: "62.00",
      serviceLineId: SL.PRONTUARIO,
      strategicIndicatorIds: [6],
    })
    .returning();

  // KRs do Objetivo 3 — Capacitação Nordeste
  const [kr6] = await db
    .insert(keyResults)
    .values({
      objectiveId: obj3.id,
      title: "Entregar 1.000 horas de treinamento",
      description: "Total de horas de capacitação realizadas (presencial + EAD)",
      targetValue: "1000",
      currentValue: "280",
      unit: "horas",
      startDate: "2025-04-01",
      endDate: "2025-12-31",
      frequency: "monthly",
      status: "active",
      progress: "28.00",
      serviceLineId: SL.TREIN_PRESENCIAL,
      strategicIndicatorIds: [6],
    })
    .returning();

  const [kr7] = await db
    .insert(keyResults)
    .values({
      objectiveId: obj3.id,
      title: "Atingir 90% de aprovação nos cursos EAD",
      description: "Taxa de conclusão com aproveitamento nos módulos online",
      targetValue: "90",
      currentValue: "88",
      unit: "%",
      startDate: "2025-04-01",
      endDate: "2025-12-31",
      frequency: "monthly",
      status: "active",
      progress: "97.78",
      serviceLineId: SL.ELEARNING,
      strategicIndicatorIds: [7],
    })
    .returning();

  // KRs do Objetivo 4 — NPS
  const [kr8] = await db
    .insert(keyResults)
    .values({
      objectiveId: obj4.id,
      title: "NPS médio ≥ 75 ao final do ano",
      description: "Resultado do NPS consolidado em todas as regiões",
      targetValue: "75",
      currentValue: "68",
      unit: "pontos",
      startDate: "2025-01-01",
      endDate: "2025-12-31",
      frequency: "quarterly",
      status: "active",
      progress: "90.67",
      serviceLineId: SL.BI,
      strategicIndicatorIds: [2],
    })
    .returning();

  // KRs do Objetivo 5 — Churn (concluído)
  const [kr9] = await db
    .insert(keyResults)
    .values({
      objectiveId: obj5.id,
      title: "Reduzir churn para ≤ 5%",
      description: "Taxa de cancelamento de contratos no semestre",
      targetValue: "5",
      currentValue: "4.2",
      unit: "%",
      startDate: "2025-01-01",
      endDate: "2025-06-30",
      frequency: "monthly",
      status: "completed",
      progress: "100.00",
      serviceLineId: SL.BI,
      strategicIndicatorIds: [5],
    })
    .returning();

  // KRs do Objetivo 6 — Logística (atrasado)
  const [kr10] = await db
    .insert(keyResults)
    .values({
      objectiveId: obj6.id,
      title: "Mapear 100% dos fornecedores da cadeia Sul",
      description: "Diagnóstico completo de todos os fornecedores ativos",
      targetValue: "100",
      currentValue: "15",
      unit: "%",
      startDate: "2025-07-01",
      endDate: "2025-12-31",
      frequency: "monthly",
      status: "delayed",
      progress: "15.00",
      serviceLineId: SL.LOGISTICA,
      strategicIndicatorIds: [7],
    })
    .returning();

  // ─── Ações ─────────────────────────────────────────────────
  console.log("✅ Criando ações...");

  const acoes = [
    // KR1 — consultas online
    {
      keyResultId: kr1.id,
      title: "Lançar campanha de divulgação da plataforma nos hospitais parceiros",
      description: "E-mail mkt, materiais impressos e reunião com coordenadores",
      number: 1,
      responsibleId: USERS.joao,
      dueDate: "2025-02-28",
      status: "completed",
      priority: "high",
      serviceLineId: SL.TELEMED,
    },
    {
      keyResultId: kr1.id,
      title: "Implementar sistema de agendamento online integrado",
      description: "Integração da agenda médica com a plataforma de telemedicina",
      number: 2,
      responsibleId: USERS.joao,
      dueDate: "2025-03-15",
      status: "in_progress",
      priority: "high",
      serviceLineId: SL.TELEMED,
    },
    {
      keyResultId: kr1.id,
      title: "Treinar médicos e enfermeiros no uso da plataforma",
      description: "Workshops de 4h para equipes clínicas dos hospitais integrados",
      number: 3,
      responsibleId: USERS.joao,
      dueDate: "2025-03-31",
      status: "pending",
      priority: "medium",
      serviceLineId: SL.TELEMED,
    },
    // KR2 — satisfação telemedicina
    {
      keyResultId: kr2.id,
      title: "Implementar pesquisa automática de satisfação pós-consulta",
      description: "Envio automático de NPS por e-mail/SMS após cada consulta",
      number: 1,
      responsibleId: USERS.joao,
      dueDate: "2025-02-15",
      status: "completed",
      priority: "high",
      serviceLineId: SL.TELEMED,
    },
    {
      keyResultId: kr2.id,
      title: "Criar plano de ação para pontos negativos recorrentes",
      description: "Analisar feedbacks negativos e propor melhorias sistêmicas",
      number: 2,
      responsibleId: USERS.gestorSul,
      dueDate: "2025-04-30",
      status: "in_progress",
      priority: "medium",
      serviceLineId: SL.TELEMED,
    },
    // KR3 — integração hospitais
    {
      keyResultId: kr3.id,
      title: "Prospectar 20 hospitais candidatos à integração",
      description: "Levantamento de hospitais com perfil para telemedicina",
      number: 1,
      responsibleId: USERS.gestorSul,
      dueDate: "2025-02-28",
      status: "completed",
      priority: "high",
      serviceLineId: SL.TELEMED,
    },
    {
      keyResultId: kr3.id,
      title: "Negociar e fechar contratos com 10 hospitais",
      description: "Apresentação comercial, proposta e assinatura de contrato",
      number: 2,
      responsibleId: USERS.gestorSul,
      dueDate: "2025-05-31",
      status: "in_progress",
      priority: "high",
      serviceLineId: SL.TELEMED,
    },
    // KR4 — implantação prontuário
    {
      keyResultId: kr4.id,
      title: "Realizar diagnóstico técnico nas 50 clínicas",
      description: "Visita técnica para levantar infraestrutura e necessidades",
      number: 1,
      responsibleId: USERS.fernanda,
      dueDate: "2025-02-28",
      status: "completed",
      priority: "high",
      serviceLineId: SL.PRONTUARIO,
    },
    {
      keyResultId: kr4.id,
      title: "Implantar sistema nas 31 clínicas da fase 1",
      description: "Instalação, configuração e migração de dados históricos",
      number: 2,
      responsibleId: USERS.lucas,
      dueDate: "2025-05-31",
      status: "completed",
      priority: "high",
      serviceLineId: SL.PRONTUARIO,
    },
    {
      keyResultId: kr4.id,
      title: "Implantar sistema nas 19 clínicas restantes",
      description: "Fase 2 da implantação com suporte dedicado",
      number: 3,
      responsibleId: USERS.lucas,
      dueDate: "2025-09-30",
      status: "in_progress",
      priority: "high",
      serviceLineId: SL.PRONTUARIO,
    },
    // KR5 — capacitação prontuário
    {
      keyResultId: kr5.id,
      title: "Desenvolver material didático do sistema",
      description: "Manuais, vídeo-tutoriais e guia rápido para usuários",
      number: 1,
      responsibleId: USERS.fernanda,
      dueDate: "2025-03-15",
      status: "completed",
      priority: "medium",
      serviceLineId: SL.PRONTUARIO,
    },
    {
      keyResultId: kr5.id,
      title: "Realizar workshops de capacitação para 200 profissionais",
      description: "Turmas de 20 pessoas, 3h cada, com certificado de conclusão",
      number: 2,
      responsibleId: USERS.fernanda,
      dueDate: "2025-08-31",
      status: "in_progress",
      priority: "high",
      serviceLineId: SL.PRONTUARIO,
    },
    // KR6 — horas de treinamento
    {
      keyResultId: kr6.id,
      title: "Estruturar calendário de treinamentos Q2-Q4 Nordeste",
      description: "Cronograma com datas, locais e turmas por estado",
      number: 1,
      responsibleId: USERS.gestorNordeste,
      dueDate: "2025-04-30",
      status: "completed",
      priority: "high",
      serviceLineId: SL.TREIN_PRESENCIAL,
    },
    {
      keyResultId: kr6.id,
      title: "Executar treinamentos presenciais na Bahia (200h)",
      description: "Módulos de gestão hospitalar e protocolos clínicos",
      number: 2,
      responsibleId: USERS.patricia,
      dueDate: "2025-07-31",
      status: "in_progress",
      priority: "medium",
      serviceLineId: SL.TREIN_PRESENCIAL,
    },
    {
      keyResultId: kr6.id,
      title: "Lançar trilha EAD para equipes administrativas",
      description: "Plataforma online com módulos de faturamento e regulação",
      number: 3,
      responsibleId: USERS.patricia,
      dueDate: "2025-06-30",
      status: "pending",
      priority: "medium",
      serviceLineId: SL.ELEARNING,
    },
    // KR8 — NPS
    {
      keyResultId: kr8.id,
      title: "Implementar ciclo de QBR com top 30 clientes",
      description: "Reuniões trimestrais de revisão de resultados e expectativas",
      number: 1,
      responsibleId: USERS.gestorSudeste,
      dueDate: "2025-03-31",
      status: "completed",
      priority: "high",
      serviceLineId: SL.BI,
    },
    {
      keyResultId: kr8.id,
      title: "Criar dashboard de acompanhamento de NPS em tempo real",
      description: "Painel com NPS por região, produto e período",
      number: 2,
      responsibleId: USERS.fernanda,
      dueDate: "2025-04-30",
      status: "completed",
      priority: "high",
      serviceLineId: SL.BI,
    },
    {
      keyResultId: kr8.id,
      title: "Plano de ação para detratores identificados",
      description: "Ações corretivas para clientes com NPS < 6",
      number: 3,
      responsibleId: USERS.gestorSudeste,
      dueDate: "2025-09-30",
      status: "in_progress",
      priority: "high",
      serviceLineId: SL.BI,
    },
    // KR10 — Logística (atrasado)
    {
      keyResultId: kr10.id,
      title: "Contratar consultoria especializada em supply chain hospitalar",
      description: "RFP, seleção e contratação da empresa consultora",
      number: 1,
      responsibleId: USERS.gestorSul,
      dueDate: "2025-08-31",
      status: "delayed",
      priority: "high",
      serviceLineId: SL.LOGISTICA,
    },
    {
      keyResultId: kr10.id,
      title: "Mapear todos os fornecedores ativos na região Sul",
      description: "Cadastro, classificação por criticidade e avaliação de performance",
      number: 2,
      responsibleId: USERS.gestorSul,
      dueDate: "2025-10-31",
      status: "pending",
      priority: "high",
      serviceLineId: SL.LOGISTICA,
    },
  ];

  const createdActions = await db.insert(actions).values(acoes).returning();

  // ─── Checkpoints ───────────────────────────────────────────
  console.log("📅 Criando checkpoints...");

  await db.insert(checkpoints).values([
    // Checkpoints do KR1 — consultas (trimestral)
    {
      keyResultId: kr1.id,
      title: "T1 2025 — Consultas online",
      period: "2025-T1",
      targetValue: "150",
      actualValue: "213",
      progress: "100.00",
      status: "completed",
      dueDate: new Date("2025-03-31"),
      completedDate: new Date("2025-03-31"),
      notes: "Meta superada com campanha de divulgação bem-sucedida.",
    },
    {
      keyResultId: kr1.id,
      title: "T2 2025 — Consultas online",
      period: "2025-T2",
      targetValue: "350",
      actualValue: null,
      progress: "0.00",
      status: "pending",
      dueDate: new Date("2025-06-30"),
      notes: "Em andamento.",
    },
    // Checkpoints do KR4 — prontuário
    {
      keyResultId: kr4.id,
      title: "Fase 1 — 30 clínicas implantadas",
      period: "2025-T1",
      targetValue: "30",
      actualValue: "31",
      progress: "100.00",
      status: "completed",
      dueDate: new Date("2025-03-31"),
      completedDate: new Date("2025-03-28"),
      notes: "1 clínica extra concluída antes do prazo.",
    },
    {
      keyResultId: kr4.id,
      title: "Fase 2 — 50 clínicas implantadas",
      period: "2025-T3",
      targetValue: "50",
      actualValue: null,
      progress: "0.00",
      status: "pending",
      dueDate: new Date("2025-09-30"),
      notes: "Fase 2 iniciada com 19 clínicas restantes.",
    },
    // Checkpoints do KR6 — horas de treinamento
    {
      keyResultId: kr6.id,
      title: "Q2 — 300 horas entregues",
      period: "2025-T2",
      targetValue: "300",
      actualValue: "280",
      progress: "93.33",
      status: "completed",
      dueDate: new Date("2025-06-30"),
      completedDate: new Date("2025-06-30"),
      notes: "Levemente abaixo por cancelamento de uma turma por feriado.",
    },
    {
      keyResultId: kr6.id,
      title: "Q3 — 650 horas acumuladas",
      period: "2025-T3",
      targetValue: "650",
      actualValue: null,
      progress: "0.00",
      status: "pending",
      dueDate: new Date("2025-09-30"),
      notes: "Depende da execução das turmas presenciais na Bahia.",
    },
    // Checkpoint do KR9 — churn (concluído)
    {
      keyResultId: kr9.id,
      title: "S1 2025 — Churn ≤ 5%",
      period: "2025-T2",
      targetValue: "5",
      actualValue: "4.2",
      progress: "100.00",
      status: "completed",
      dueDate: new Date("2025-06-30"),
      completedDate: new Date("2025-06-30"),
      notes: "Meta atingida. Churn encerrou em 4,2%.",
    },
  ]);

  // ─── Comentários em ações ──────────────────────────────────
  console.log("💬 Criando comentários...");

  await db.insert(actionComments).values([
    {
      actionId: createdActions[0].id,
      userId: USERS.gestorSul,
      comment: "Campanha lançada com sucesso. Todos os hospitais parceiros foram notificados e os materiais enviados.",
    },
    {
      actionId: createdActions[1].id,
      userId: USERS.joao,
      comment: "Integração em fase de homologação. Aguardando validação do TI do Hospital Regional.",
    },
    {
      actionId: createdActions[1].id,
      userId: USERS.gestorSul,
      comment: "Prazo crítico — favor priorizar e escalar caso precise de suporte.",
    },
    {
      actionId: createdActions[7].id,
      userId: USERS.fernanda,
      comment: "Diagnóstico concluído em todas as clínicas da fase 1. Relatório enviado para o gestor.",
    },
    {
      actionId: createdActions[14].id,
      userId: USERS.patricia,
      comment: "Cronograma enviado para aprovação. Aguardando confirmação das salas em Salvador.",
    },
  ]);

  console.log("\n✅ Seed de OKRs concluído com sucesso!");
  console.log(`   - ${6} objetivos criados`);
  console.log(`   - ${10} resultados-chave criados`);
  console.log(`   - ${acoes.length} ações criadas`);
  console.log(`   - 7 checkpoints criados`);
  console.log(`   - 5 comentários criados`);
}

seedOKRs()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Erro no seed de OKRs:", err);
    process.exit(1);
  });
