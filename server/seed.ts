import { db } from "./pg-db";
import {
  users,
  regions as regionsTable,
  subRegions as subRegionsTable,
  solutions as solutionsTable,
  serviceLines,
  services,
  strategicIndicators,
} from "@shared/pg-schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { eq } from "drizzle-orm";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function seed() {
  console.log("🌱 Iniciando seed do banco de dados...");

  // ─── Regiões ───────────────────────────────────────────────
  console.log("📍 Criando regiões...");
  const [regSul] = await db
    .insert(regionsTable)
    .values({ name: "Sul", code: "SUL" })
    .onConflictDoNothing()
    .returning();

  const [regSudeste] = await db
    .insert(regionsTable)
    .values({ name: "Sudeste", code: "SUDESTE" })
    .onConflictDoNothing()
    .returning();

  const [regNordeste] = await db
    .insert(regionsTable)
    .values({ name: "Nordeste", code: "NORDESTE" })
    .onConflictDoNothing()
    .returning();

  const [regCentroOeste] = await db
    .insert(regionsTable)
    .values({ name: "Centro-Oeste", code: "CENTROOESTE" })
    .onConflictDoNothing()
    .returning();

  const [regNorte] = await db
    .insert(regionsTable)
    .values({ name: "Norte", code: "NORTE" })
    .onConflictDoNothing()
    .returning();

  // Buscar regiões existentes caso o insert tenha sido ignorado
  const allRegions = await db.select().from(regionsTable);
  const getRegion = (code: string) => allRegions.find((r) => r.code === code)!;

  // ─── Sub-regiões ───────────────────────────────────────────
  console.log("📍 Criando sub-regiões...");
  await db
    .insert(subRegionsTable)
    .values([
      { name: "Paraná", code: "PR", regionId: getRegion("SUL").id },
      { name: "Santa Catarina", code: "SC", regionId: getRegion("SUL").id },
      { name: "Rio Grande do Sul", code: "RS", regionId: getRegion("SUL").id },
      { name: "São Paulo", code: "SP", regionId: getRegion("SUDESTE").id },
      { name: "Rio de Janeiro", code: "RJ", regionId: getRegion("SUDESTE").id },
      { name: "Minas Gerais", code: "MG", regionId: getRegion("SUDESTE").id },
      { name: "Espírito Santo", code: "ES", regionId: getRegion("SUDESTE").id },
      { name: "Bahia", code: "BA", regionId: getRegion("NORDESTE").id },
      { name: "Pernambuco", code: "PE", regionId: getRegion("NORDESTE").id },
      { name: "Ceará", code: "CE", regionId: getRegion("NORDESTE").id },
      { name: "Mato Grosso", code: "MT", regionId: getRegion("CENTROOESTE").id },
      { name: "Goiás", code: "GO", regionId: getRegion("CENTROOESTE").id },
      { name: "Distrito Federal", code: "DF", regionId: getRegion("CENTROOESTE").id },
      { name: "Pará", code: "PA", regionId: getRegion("NORTE").id },
      { name: "Amazonas", code: "AM", regionId: getRegion("NORTE").id },
    ])
    .onConflictDoNothing();

  const allSubRegions = await db.select().from(subRegionsTable);
  const getSub = (code: string) => allSubRegions.find((s) => s.code === code)!;

  // ─── Soluções ──────────────────────────────────────────────
  console.log("💡 Criando soluções...");
  await db
    .insert(solutionsTable)
    .values([
      {
        name: "Saúde Digital",
        code: "SAUDE_DIGITAL",
        description: "Soluções para transformação digital na área da saúde",
      },
      {
        name: "Educação Corporativa",
        code: "EDUCACAO_CORP",
        description: "Programas de capacitação e desenvolvimento de equipes",
      },
      {
        name: "Gestão de Operações",
        code: "GESTAO_OPS",
        description: "Otimização de processos e operações empresariais",
      },
    ])
    .onConflictDoNothing();

  const allSolutions = await db.select().from(solutionsTable);
  const getSolution = (code: string) => allSolutions.find((s) => s.code === code)!;

  // ─── Linhas de Serviço ─────────────────────────────────────
  console.log("📋 Criando linhas de serviço...");
  await db
    .insert(serviceLines)
    .values([
      {
        name: "Telemedicina",
        code: "TELEMED",
        description: "Consultas e acompanhamento médico remoto",
        solutionId: getSolution("SAUDE_DIGITAL").id,
      },
      {
        name: "Prontuário Eletrônico",
        code: "PRONTUARIO",
        description: "Gestão digital de registros médicos",
        solutionId: getSolution("SAUDE_DIGITAL").id,
      },
      {
        name: "Treinamento Presencial",
        code: "TREIN_PRESENCIAL",
        description: "Programas de treinamento em formato presencial",
        solutionId: getSolution("EDUCACAO_CORP").id,
      },
      {
        name: "E-Learning",
        code: "ELEARNING",
        description: "Plataformas de aprendizado a distância",
        solutionId: getSolution("EDUCACAO_CORP").id,
      },
      {
        name: "Logística e Supply Chain",
        code: "LOGISTICA",
        description: "Otimização de cadeias de suprimento",
        solutionId: getSolution("GESTAO_OPS").id,
      },
      {
        name: "Business Intelligence",
        code: "BI",
        description: "Análise de dados e inteligência de negócios",
        solutionId: getSolution("GESTAO_OPS").id,
      },
    ])
    .onConflictDoNothing();

  const allServiceLines = await db.select().from(serviceLines);
  const getSL = (code: string) => allServiceLines.find((s) => s.code === code)!;

  // ─── Serviços ──────────────────────────────────────────────
  console.log("🔧 Criando serviços...");
  await db
    .insert(services)
    .values([
      {
        name: "Consulta Online",
        code: "CONSULTA_ONLINE",
        description: "Consulta médica via videochamada",
        serviceLineId: getSL("TELEMED").id,
      },
      {
        name: "Monitoramento Remoto",
        code: "MONIT_REMOTO",
        description: "Acompanhamento de pacientes em casa",
        serviceLineId: getSL("TELEMED").id,
      },
      {
        name: "Implantação de Prontuário",
        code: "IMPL_PRONTUARIO",
        description: "Implementação do sistema de prontuário eletrônico",
        serviceLineId: getSL("PRONTUARIO").id,
      },
      {
        name: "Workshop In-Company",
        code: "WORKSHOP",
        description: "Treinamentos customizados dentro da empresa cliente",
        serviceLineId: getSL("TREIN_PRESENCIAL").id,
      },
      {
        name: "Curso EAD Certificado",
        code: "CURSO_EAD",
        description: "Cursos com certificação a distância",
        serviceLineId: getSL("ELEARNING").id,
      },
      {
        name: "Mapeamento de Processos",
        code: "MAPEAMENTO",
        description: "Diagnóstico e mapeamento da cadeia logística",
        serviceLineId: getSL("LOGISTICA").id,
      },
      {
        name: "Dashboard Executivo",
        code: "DASHBOARD",
        description: "Painel de indicadores para alta liderança",
        serviceLineId: getSL("BI").id,
      },
    ])
    .onConflictDoNothing();

  const allServices = await db.select().from(services);
  const getService = (code: string) => allServices.find((s) => s.code === code)!;

  // ─── Indicadores Estratégicos ──────────────────────────────
  console.log("📊 Criando indicadores estratégicos...");
  await db
    .insert(strategicIndicators)
    .values([
      {
        name: "Receita Bruta",
        code: "RECEITA_BRUTA",
        description: "Total de receita gerada antes de deduções",
        unit: "R$",
      },
      {
        name: "NPS (Net Promoter Score)",
        code: "NPS",
        description: "Índice de satisfação e lealdade dos clientes",
        unit: "pontos",
      },
      {
        name: "Taxa de Retenção de Clientes",
        code: "RETENCAO",
        description: "Percentual de clientes mantidos no período",
        unit: "%",
      },
      {
        name: "Número de Novos Contratos",
        code: "NOVOS_CONTRATOS",
        description: "Quantidade de contratos fechados no período",
        unit: "unidades",
      },
      {
        name: "Taxa de Evasão (Churn)",
        code: "CHURN",
        description: "Percentual de cancelamentos no período",
        unit: "%",
      },
      {
        name: "Horas de Capacitação Entregues",
        code: "HORAS_CAPAC",
        description: "Total de horas de treinamento realizadas",
        unit: "horas",
      },
      {
        name: "Índice de Produtividade",
        code: "PRODUTIVIDADE",
        description: "Eficiência das equipes em relação à meta",
        unit: "%",
      },
    ])
    .onConflictDoNothing();

  // ─── Usuários ──────────────────────────────────────────────
  console.log("👤 Criando usuários...");

  const existingAdmin = await db
    .select()
    .from(users)
    .where(eq(users.username, "admin"))
    .limit(1);

  if (existingAdmin.length === 0) {
    // Admin principal
    await db.insert(users).values({
      username: "admin",
      password: await hashPassword("Admin@123"),
      name: "Administrador Sistema",
      email: "admin@empresa.com.br",
      role: "admin",
      active: true,
      approved: true,
      approvedAt: new Date(),
      regionIds: [getRegion("SUL").id, getRegion("SUDESTE").id, getRegion("NORDESTE").id, getRegion("CENTROOESTE").id, getRegion("NORTE").id],
      subRegionIds: allSubRegions.map((s) => s.id),
      solutionIds: allSolutions.map((s) => s.id),
      serviceLineIds: allServiceLines.map((s) => s.id),
      serviceIds: allServices.map((s) => s.id),
    });
    console.log("   ✅ Admin criado — login: admin / senha: Admin@123");
  } else {
    console.log("   ⏭️  Admin já existe, ignorado.");
  }

  // Gestores regionais
  const gestores = [
    {
      username: "gestor.sul",
      password: await hashPassword("Gestor@123"),
      name: "Carlos Eduardo Souza",
      email: "carlos.souza@empresa.com.br",
      role: "gestor",
      active: true,
      approved: true,
      approvedAt: new Date(),
      regionIds: [getRegion("SUL").id],
      subRegionIds: [getSub("PR").id, getSub("SC").id, getSub("RS").id],
      solutionIds: allSolutions.map((s) => s.id),
      serviceLineIds: allServiceLines.map((s) => s.id),
      serviceIds: allServices.map((s) => s.id),
    },
    {
      username: "gestor.sudeste",
      password: await hashPassword("Gestor@123"),
      name: "Ana Beatriz Lima",
      email: "ana.lima@empresa.com.br",
      role: "gestor",
      active: true,
      approved: true,
      approvedAt: new Date(),
      regionIds: [getRegion("SUDESTE").id],
      subRegionIds: [getSub("SP").id, getSub("RJ").id, getSub("MG").id, getSub("ES").id],
      solutionIds: allSolutions.map((s) => s.id),
      serviceLineIds: allServiceLines.map((s) => s.id),
      serviceIds: allServices.map((s) => s.id),
    },
    {
      username: "gestor.nordeste",
      password: await hashPassword("Gestor@123"),
      name: "Roberto Alves Mendes",
      email: "roberto.mendes@empresa.com.br",
      role: "gestor",
      active: true,
      approved: true,
      approvedAt: new Date(),
      regionIds: [getRegion("NORDESTE").id],
      subRegionIds: [getSub("BA").id, getSub("PE").id, getSub("CE").id],
      solutionIds: [getSolution("SAUDE_DIGITAL").id, getSolution("GESTAO_OPS").id],
      serviceLineIds: [getSL("TELEMED").id, getSL("BI").id, getSL("LOGISTICA").id],
      serviceIds: [getService("CONSULTA_ONLINE").id, getService("DASHBOARD").id, getService("MAPEAMENTO").id],
    },
  ];

  for (const gestor of gestores) {
    const existing = await db.select().from(users).where(eq(users.username, gestor.username)).limit(1);
    if (existing.length === 0) {
      await db.insert(users).values(gestor);
      console.log(`   ✅ Gestor criado — login: ${gestor.username} / senha: Gestor@123`);
    } else {
      console.log(`   ⏭️  ${gestor.username} já existe, ignorado.`);
    }
  }

  // Buscar IDs dos gestores para vincular operacionais
  const allUsersAfterGestores = await db.select().from(users);
  const getGestorId = (username: string) =>
    allUsersAfterGestores.find((u) => u.username === username)?.id;

  // Usuários operacionais
  const operacionais = [
    {
      username: "joao.silva",
      password: await hashPassword("Op@123456"),
      name: "João Pedro Silva",
      email: "joao.silva@empresa.com.br",
      role: "operacional",
      active: true,
      approved: true,
      approvedAt: new Date(),
      gestorId: getGestorId("gestor.sul"),
      regionIds: [getRegion("SUL").id],
      subRegionIds: [getSub("PR").id, getSub("SC").id],
      solutionIds: [getSolution("SAUDE_DIGITAL").id],
      serviceLineIds: [getSL("TELEMED").id, getSL("PRONTUARIO").id],
      serviceIds: [getService("CONSULTA_ONLINE").id, getService("IMPL_PRONTUARIO").id],
    },
    {
      username: "mariana.costa",
      password: await hashPassword("Op@123456"),
      name: "Mariana Costa Ferreira",
      email: "mariana.costa@empresa.com.br",
      role: "operacional",
      active: true,
      approved: true,
      approvedAt: new Date(),
      gestorId: getGestorId("gestor.sul"),
      regionIds: [getRegion("SUL").id],
      subRegionIds: [getSub("RS").id],
      solutionIds: [getSolution("EDUCACAO_CORP").id],
      serviceLineIds: [getSL("TREIN_PRESENCIAL").id, getSL("ELEARNING").id],
      serviceIds: [getService("WORKSHOP").id, getService("CURSO_EAD").id],
    },
    {
      username: "fernanda.rocha",
      password: await hashPassword("Op@123456"),
      name: "Fernanda Rocha Santos",
      email: "fernanda.rocha@empresa.com.br",
      role: "operacional",
      active: true,
      approved: true,
      approvedAt: new Date(),
      gestorId: getGestorId("gestor.sudeste"),
      regionIds: [getRegion("SUDESTE").id],
      subRegionIds: [getSub("SP").id, getSub("RJ").id],
      solutionIds: [getSolution("GESTAO_OPS").id],
      serviceLineIds: [getSL("BI").id, getSL("LOGISTICA").id],
      serviceIds: [getService("DASHBOARD").id, getService("MAPEAMENTO").id],
    },
    {
      username: "lucas.oliveira",
      password: await hashPassword("Op@123456"),
      name: "Lucas Oliveira Teixeira",
      email: "lucas.oliveira@empresa.com.br",
      role: "operacional",
      active: true,
      approved: true,
      approvedAt: new Date(),
      gestorId: getGestorId("gestor.sudeste"),
      regionIds: [getRegion("SUDESTE").id],
      subRegionIds: [getSub("MG").id, getSub("ES").id],
      solutionIds: [getSolution("SAUDE_DIGITAL").id, getSolution("GESTAO_OPS").id],
      serviceLineIds: [getSL("TELEMED").id, getSL("BI").id],
      serviceIds: [getService("MONIT_REMOTO").id, getService("DASHBOARD").id],
    },
    {
      username: "patricia.nascimento",
      password: await hashPassword("Op@123456"),
      name: "Patrícia Nascimento Alves",
      email: "patricia.nascimento@empresa.com.br",
      role: "operacional",
      active: true,
      approved: true,
      approvedAt: new Date(),
      gestorId: getGestorId("gestor.nordeste"),
      regionIds: [getRegion("NORDESTE").id],
      subRegionIds: [getSub("BA").id, getSub("PE").id],
      solutionIds: [getSolution("SAUDE_DIGITAL").id],
      serviceLineIds: [getSL("TELEMED").id],
      serviceIds: [getService("CONSULTA_ONLINE").id, getService("MONIT_REMOTO").id],
    },
    {
      username: "thiago.barbosa",
      password: await hashPassword("Op@123456"),
      name: "Thiago Barbosa Correia",
      email: "thiago.barbosa@empresa.com.br",
      role: "operacional",
      active: false,
      approved: false,
      gestorId: getGestorId("gestor.nordeste"),
      regionIds: [getRegion("NORDESTE").id],
      subRegionIds: [getSub("CE").id],
      solutionIds: [getSolution("GESTAO_OPS").id],
      serviceLineIds: [getSL("LOGISTICA").id],
      serviceIds: [getService("MAPEAMENTO").id],
    },
  ];

  for (const op of operacionais) {
    const existing = await db.select().from(users).where(eq(users.username, op.username)).limit(1);
    if (existing.length === 0) {
      await db.insert(users).values(op);
      const status = op.approved ? "aprovado" : "pendente aprovação";
      console.log(`   ✅ Operacional criado — login: ${op.username} / senha: Op@123456 (${status})`);
    } else {
      console.log(`   ⏭️  ${op.username} já existe, ignorado.`);
    }
  }

  console.log("\n✅ Seed concluído com sucesso!");
  console.log("\n📋 Resumo dos logins criados:");
  console.log("  admin            / Admin@123   → Administrador geral");
  console.log("  gestor.sul       / Gestor@123  → Gestor da região Sul");
  console.log("  gestor.sudeste   / Gestor@123  → Gestora da região Sudeste");
  console.log("  gestor.nordeste  / Gestor@123  → Gestor da região Nordeste");
  console.log("  joao.silva       / Op@123456   → Operacional (Sul / Saúde Digital)");
  console.log("  mariana.costa    / Op@123456   → Operacional (Sul / Educação)");
  console.log("  fernanda.rocha   / Op@123456   → Operacional (Sudeste / Gestão Ops)");
  console.log("  lucas.oliveira   / Op@123456   → Operacional (Sudeste / Saúde+Ops)");
  console.log("  patricia.nascimento / Op@123456 → Operacional (Nordeste / Saúde)");
  console.log("  thiago.barbosa   / Op@123456   → Operacional INATIVO aguardando aprovação");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Erro no seed:", err);
    process.exit(1);
  });
