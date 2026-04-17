/**
 * Script de seed completo com dados de teste realistas
 * Execute com: npx tsx server/seed-full.ts
 */
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../shared/pg-schema';

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString('hex')}.${salt}`;
}

const client = postgres(process.env.DATABASE_URL!, { ssl: 'require' });
const db = drizzle(client, { schema });

async function clearAll() {
  console.log('🧹 Limpando dados existentes...');
  await db.delete(schema.actionComments);
  await db.delete(schema.checkpoints);
  await db.delete(schema.actions);
  await db.delete(schema.keyResults);
  await db.delete(schema.objectives);
  // Keep admin user, delete others
  await db.delete(schema.users).where(eq(schema.users.role, 'operacional'));
  await db.delete(schema.users).where(eq(schema.users.role, 'gestor'));
  await db.delete(schema.strategicIndicators);
  await db.delete(schema.services);
  await db.delete(schema.serviceLines);
  await db.delete(schema.solutions);
  await db.delete(schema.subRegions);
  await db.delete(schema.regions);
  console.log('✅ Dados limpos');
}

async function seedRegions() {
  console.log('📍 Criando regiões...');
  const regionsData = [
    { name: 'Serra Gaúcha', code: 'SERRA' },
    { name: 'Grande Porto Alegre', code: 'GPA' },
    { name: 'Vale do Rio dos Sinos', code: 'VRSINOS' },
    { name: 'Fronteira Oeste', code: 'FROESTE' },
    { name: 'Missões', code: 'MISSOES' },
    { name: 'Norte', code: 'NORTE' },
    { name: 'Nordeste', code: 'NORDESTE' },
    { name: 'Planalto', code: 'PLANALTO' },
    { name: 'Centro-Sul', code: 'CSUL' },
    { name: 'Sul', code: 'SUL' },
  ];
  const inserted = await db.insert(schema.regions).values(regionsData).returning();
  console.log(`✅ ${inserted.length} regiões criadas`);
  return inserted;
}

async function seedSubRegions(regions: typeof schema.regions.$inferSelect[]) {
  console.log('📍 Criando sub-regiões...');
  const subRegionsData = [
    { name: 'Caxias do Sul', code: 'CXS', regionId: regions[0].id },
    { name: 'Bento Gonçalves', code: 'BTG', regionId: regions[0].id },
    { name: 'Gramado', code: 'GRM', regionId: regions[0].id },
    { name: 'Porto Alegre', code: 'POA', regionId: regions[1].id },
    { name: 'Canoas', code: 'CAN', regionId: regions[1].id },
    { name: 'Novo Hamburgo', code: 'NHU', regionId: regions[2].id },
    { name: 'São Leopoldo', code: 'SLO', regionId: regions[2].id },
    { name: 'Alegrete', code: 'ALE', regionId: regions[3].id },
    { name: 'Uruguaiana', code: 'URU', regionId: regions[3].id },
    { name: 'Santo Ângelo', code: 'STA', regionId: regions[4].id },
    { name: 'Ijuí', code: 'IJU', regionId: regions[4].id },
    { name: 'Passo Fundo', code: 'PFU', regionId: regions[5].id },
    { name: 'Erechim', code: 'ERE', regionId: regions[5].id },
    { name: 'Canguçu', code: 'CGU', regionId: regions[8].id },
    { name: 'Pelotas', code: 'PEL', regionId: regions[9].id },
    { name: 'Rio Grande', code: 'RGR', regionId: regions[9].id },
  ];
  const inserted = await db.insert(schema.subRegions).values(subRegionsData).returning();
  console.log(`✅ ${inserted.length} sub-regiões criadas`);
  return inserted;
}

async function seedSolutions() {
  console.log('💡 Criando soluções...');
  const solutionsData = [
    { name: 'SESI', code: 'SESI', description: 'Serviço Social da Indústria' },
    { name: 'SENAI', code: 'SENAI', description: 'Serviço Nacional de Aprendizagem Industrial' },
    { name: 'IEL', code: 'IEL', description: 'Instituto Euvaldo Lodi' },
    { name: 'FIERGS', code: 'FIERGS', description: 'Federação das Indústrias do Estado do Rio Grande do Sul' },
  ];
  const inserted = await db.insert(schema.solutions).values(solutionsData).returning();
  console.log(`✅ ${inserted.length} soluções criadas`);
  return inserted;
}

async function seedServiceLines(solutions: typeof schema.solutions.$inferSelect[]) {
  console.log('🔧 Criando linhas de serviço...');
  const sesi = solutions.find(s => s.code === 'SESI')!;
  const senai = solutions.find(s => s.code === 'SENAI')!;
  const iel = solutions.find(s => s.code === 'IEL')!;
  const fiergs = solutions.find(s => s.code === 'FIERGS')!;

  const serviceLinesData = [
    { name: 'Saúde e Segurança', code: 'SASISEG', description: 'Saúde ocupacional e segurança do trabalho', solutionId: sesi.id },
    { name: 'Educação e Cultura', code: 'SASEDU', description: 'Educação básica e programas culturais', solutionId: sesi.id },
    { name: 'Lazer e Qualidade de Vida', code: 'SASLAZ', description: 'Programas de lazer e bem-estar', solutionId: sesi.id },
    { name: 'Educação Profissional', code: 'SENEDPRO', description: 'Formação técnica e profissional', solutionId: senai.id },
    { name: 'Tecnologia e Inovação', code: 'SENTEC', description: 'Soluções tecnológicas e inovação', solutionId: senai.id },
    { name: 'Consultoria Industrial', code: 'SENCON', description: 'Consultoria para a indústria', solutionId: senai.id },
    { name: 'Estágios e Empregos', code: 'IELEMP', description: 'Programas de estágio e colocação profissional', solutionId: iel.id },
    { name: 'Inovação e Competitividade', code: 'IELINOV', description: 'Projetos de inovação empresarial', solutionId: iel.id },
    { name: 'Representação Industrial', code: 'FIEREP', description: 'Representação da indústria gaúcha', solutionId: fiergs.id },
    { name: 'Relações do Trabalho', code: 'FIEREL', description: 'Negociações coletivas e relações trabalhistas', solutionId: fiergs.id },
  ];
  const inserted = await db.insert(schema.serviceLines).values(serviceLinesData).returning();
  console.log(`✅ ${inserted.length} linhas de serviço criadas`);
  return inserted;
}

async function seedServices(serviceLines: typeof schema.serviceLines.$inferSelect[]) {
  console.log('⚙️ Criando serviços...');
  const sasSeg = serviceLines.find(s => s.code === 'SASISEG')!;
  const sasEdu = serviceLines.find(s => s.code === 'SASEDU')!;
  const senEdPro = serviceLines.find(s => s.code === 'SENEDPRO')!;
  const senTec = serviceLines.find(s => s.code === 'SENTEC')!;
  const ielEmp = serviceLines.find(s => s.code === 'IELEMP')!;
  const ielInov = serviceLines.find(s => s.code === 'IELINOV')!;

  const servicesData = [
    { name: 'SESMT - Serviços Especializados', code: 'SESMT', description: 'Serviços especializados em segurança do trabalho', serviceLineId: sasSeg.id },
    { name: 'Ginástica Laboral', code: 'GINLAB', description: 'Programas de ginástica laboral nas empresas', serviceLineId: sasSeg.id },
    { name: 'Saúde Mental', code: 'SAUMEL', description: 'Programas de saúde mental e bem-estar psicológico', serviceLineId: sasSeg.id },
    { name: 'EJA - Educação de Jovens', code: 'EJA', description: 'Educação de jovens e adultos', serviceLineId: sasEdu.id },
    { name: 'Escola SESI', code: 'ESCSESI', description: 'Educação básica nas escolas SESI', serviceLineId: sasEdu.id },
    { name: 'Aprendizagem Industrial', code: 'APRIND', description: 'Cursos de aprendizagem para jovens', serviceLineId: senEdPro.id },
    { name: 'Cursos Técnicos', code: 'CURTEC', description: 'Cursos técnicos de nível médio', serviceLineId: senEdPro.id },
    { name: 'Qualificação Profissional', code: 'QUALPRO', description: 'Cursos de qualificação e atualização', serviceLineId: senEdPro.id },
    { name: 'Automação Industrial', code: 'AUTIND', description: 'Soluções de automação para indústrias', serviceLineId: senTec.id },
    { name: 'IoT e Indústria 4.0', code: 'IOT4', description: 'Implementação de IoT e tecnologias 4.0', serviceLineId: senTec.id },
    { name: 'Programa de Estágio', code: 'PROEST', description: 'Intermediação de estágios universitários', serviceLineId: ielEmp.id },
    { name: 'Banco de Talentos', code: 'BANTEL', description: 'Recrutamento e seleção de talentos', serviceLineId: ielEmp.id },
    { name: 'Startups e Inovação', code: 'STAINOV', description: 'Apoio a startups e projetos inovadores', serviceLineId: ielInov.id },
  ];
  const inserted = await db.insert(schema.services).values(servicesData).returning();
  console.log(`✅ ${inserted.length} serviços criados`);
  return inserted;
}

async function seedStrategicIndicators() {
  console.log('📊 Criando indicadores estratégicos...');
  const indicatorsData = [
    { name: 'Receita Total', code: 'REC', description: 'Receita total gerada pelos serviços', unit: 'R$' },
    { name: 'Número de Atendimentos', code: 'ATEND', description: 'Quantidade de atendimentos realizados', unit: 'un' },
    { name: 'Empresas Atendidas', code: 'EMPR', description: 'Número de empresas atendidas no período', unit: 'un' },
    { name: 'Trabalhadores Beneficiados', code: 'TRAB', description: 'Trabalhadores que receberam algum benefício', unit: 'un' },
    { name: 'Matrículas Realizadas', code: 'MAT', description: 'Número de matrículas em cursos e programas', unit: 'un' },
    { name: 'Índice de Satisfação', code: 'ISAT', description: 'Índice de satisfação dos clientes e beneficiários', unit: '%' },
    { name: 'Taxa de Conclusão', code: 'TCONCL', description: 'Taxa de conclusão dos cursos e programas', unit: '%' },
    { name: 'Horas de Capacitação', code: 'HCAP', description: 'Total de horas de capacitação oferecidas', unit: 'h' },
    { name: 'NPS - Net Promoter Score', code: 'NPS', description: 'Índice de recomendação dos serviços', unit: 'pts' },
    { name: 'Empregos Gerados', code: 'EMPGER', description: 'Empregos gerados ou intermediados', unit: 'un' },
  ];
  const inserted = await db.insert(schema.strategicIndicators).values(indicatorsData).returning();
  console.log(`✅ ${inserted.length} indicadores estratégicos criados`);
  return inserted;
}

async function seedUsers(
  regions: typeof schema.regions.$inferSelect[],
  subRegions: typeof schema.subRegions.$inferSelect[],
  solutions: typeof schema.solutions.$inferSelect[],
  serviceLines: typeof schema.serviceLines.$inferSelect[],
  services: typeof schema.services.$inferSelect[]
) {
  console.log('👥 Criando usuários...');

  // Get admin id
  const adminRows = await db.select().from(schema.users).where(eq(schema.users.username, 'admin'));
  const adminId = adminRows[0]?.id;

  const senha = await hashPassword('teste123');

  const gestores = [
    {
      username: 'gestor.serra',
      password: senha,
      name: 'Carlos Eduardo Fontana',
      email: 'carlos.fontana@fiergs.org.br',
      role: 'gestor',
      active: true,
      approved: true,
      approvedAt: new Date('2025-01-10'),
      approvedBy: adminId,
      regionIds: [regions[0].id],
      subRegionIds: [subRegions[0].id, subRegions[1].id, subRegions[2].id],
      solutionIds: [solutions[0].id, solutions[1].id],
      serviceLineIds: [serviceLines[0].id, serviceLines[1].id, serviceLines[3].id],
      serviceIds: [services[0].id, services[1].id, services[5].id],
      gestorId: null,
    },
    {
      username: 'gestor.poa',
      password: senha,
      name: 'Ana Paula Silveira',
      email: 'ana.silveira@fiergs.org.br',
      role: 'gestor',
      active: true,
      approved: true,
      approvedAt: new Date('2025-01-12'),
      approvedBy: adminId,
      regionIds: [regions[1].id],
      subRegionIds: [subRegions[3].id, subRegions[4].id],
      solutionIds: [solutions[0].id, solutions[2].id],
      serviceLineIds: [serviceLines[0].id, serviceLines[6].id, serviceLines[7].id],
      serviceIds: [services[2].id, services[3].id, services[10].id],
      gestorId: null,
    },
    {
      username: 'gestor.norte',
      password: senha,
      name: 'Roberto Machado Souza',
      email: 'roberto.souza@fiergs.org.br',
      role: 'gestor',
      active: true,
      approved: true,
      approvedAt: new Date('2025-01-15'),
      approvedBy: adminId,
      regionIds: [regions[5].id, regions[6].id],
      subRegionIds: [subRegions[11].id, subRegions[12].id],
      solutionIds: [solutions[1].id, solutions[3].id],
      serviceLineIds: [serviceLines[3].id, serviceLines[4].id],
      serviceIds: [services[6].id, services[7].id, services[8].id],
      gestorId: null,
    },
  ];

  const gestoresInserted = await db.insert(schema.users).values(gestores).returning();
  console.log(`  ✅ ${gestoresInserted.length} gestores criados`);

  const operacionais = [
    {
      username: 'op.fontana',
      password: senha,
      name: 'Fernanda Britto Moreira',
      email: 'fernanda.moreira@fiergs.org.br',
      role: 'operacional',
      active: true,
      approved: true,
      approvedAt: new Date('2025-01-20'),
      approvedBy: gestoresInserted[0].id,
      regionIds: [regions[0].id],
      subRegionIds: [subRegions[0].id, subRegions[1].id],
      solutionIds: [solutions[0].id],
      serviceLineIds: [serviceLines[0].id, serviceLines[1].id],
      serviceIds: [services[0].id, services[1].id],
      gestorId: gestoresInserted[0].id,
    },
    {
      username: 'op.lucas',
      password: senha,
      name: 'Lucas Henrique Zanella',
      email: 'lucas.zanella@fiergs.org.br',
      role: 'operacional',
      active: true,
      approved: true,
      approvedAt: new Date('2025-01-22'),
      approvedBy: gestoresInserted[0].id,
      regionIds: [regions[0].id],
      subRegionIds: [subRegions[0].id, subRegions[2].id],
      solutionIds: [solutions[1].id],
      serviceLineIds: [serviceLines[3].id],
      serviceIds: [services[5].id, services[6].id],
      gestorId: gestoresInserted[0].id,
    },
    {
      username: 'op.silveira',
      password: senha,
      name: 'Mariana Costa Oliveira',
      email: 'mariana.oliveira@fiergs.org.br',
      role: 'operacional',
      active: true,
      approved: true,
      approvedAt: new Date('2025-01-25'),
      approvedBy: gestoresInserted[1].id,
      regionIds: [regions[1].id],
      subRegionIds: [subRegions[3].id],
      solutionIds: [solutions[0].id, solutions[2].id],
      serviceLineIds: [serviceLines[0].id, serviceLines[6].id],
      serviceIds: [services[2].id, services[10].id],
      gestorId: gestoresInserted[1].id,
    },
    {
      username: 'op.pedro',
      password: senha,
      name: 'Pedro Augusto Lemos',
      email: 'pedro.lemos@fiergs.org.br',
      role: 'operacional',
      active: true,
      approved: true,
      approvedAt: new Date('2025-01-28'),
      approvedBy: gestoresInserted[1].id,
      regionIds: [regions[1].id],
      subRegionIds: [subRegions[3].id, subRegions[4].id],
      solutionIds: [solutions[2].id],
      serviceLineIds: [serviceLines[7].id],
      serviceIds: [services[11].id, services[12].id],
      gestorId: gestoresInserted[1].id,
    },
    {
      username: 'op.norte',
      password: senha,
      name: 'Juliana Ferreira Pinto',
      email: 'juliana.pinto@fiergs.org.br',
      role: 'operacional',
      active: true,
      approved: true,
      approvedAt: new Date('2025-02-01'),
      approvedBy: gestoresInserted[2].id,
      regionIds: [regions[5].id],
      subRegionIds: [subRegions[11].id],
      solutionIds: [solutions[1].id],
      serviceLineIds: [serviceLines[3].id, serviceLines[4].id],
      serviceIds: [services[6].id, services[7].id, services[8].id],
      gestorId: gestoresInserted[2].id,
    },
    {
      username: 'op.pendente',
      password: senha,
      name: 'Thiago Almeida Ramos',
      email: 'thiago.ramos@fiergs.org.br',
      role: 'operacional',
      active: true,
      approved: false,
      regionIds: [],
      subRegionIds: [],
      solutionIds: [],
      serviceLineIds: [],
      serviceIds: [],
      gestorId: null,
    },
  ];

  const operacionaisInserted = await db.insert(schema.users).values(operacionais).returning();
  console.log(`  ✅ ${operacionaisInserted.length} usuários operacionais criados (1 pendente de aprovação)`);

  return { gestores: gestoresInserted, operacionais: operacionaisInserted, adminId };
}

async function seedObjectives(
  users: { gestores: any[]; operacionais: any[]; adminId: number },
  regions: any[],
  serviceLines: any[]
) {
  console.log('🎯 Criando objetivos...');

  const objectives = [
    {
      title: 'Ampliar a cobertura de serviços de saúde ocupacional na Serra Gaúcha',
      description: 'Expandir os atendimentos de saúde e segurança do trabalho para atingir mais trabalhadores da indústria da Serra Gaúcha, incluindo pequenas e médias empresas.',
      ownerId: users.gestores[0].id,
      regionId: regions[0].id,
      subRegionIds: [1, 2, 3],
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      status: 'active',
      progress: '42.50',
      period: '2025-T2',
      serviceLineId: serviceLines[0].id,
    },
    {
      title: 'Aumentar o número de matrículas em cursos técnicos do SENAI na Serra',
      description: 'Ampliar a oferta de cursos técnicos e profissionalizantes para atender à demanda crescente do mercado de trabalho industrial.',
      ownerId: users.gestores[0].id,
      regionId: regions[0].id,
      subRegionIds: [1, 3],
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      status: 'active',
      progress: '65.00',
      period: '2025-T2',
      serviceLineId: serviceLines[3].id,
    },
    {
      title: 'Elevar o índice de satisfação dos clientes na Grande Porto Alegre',
      description: 'Melhorar a qualidade dos serviços prestados e aumentar o índice de satisfação medido pelo NPS anual.',
      ownerId: users.gestores[1].id,
      regionId: regions[1].id,
      subRegionIds: [4, 5],
      startDate: '2025-01-01',
      endDate: '2025-06-30',
      status: 'active',
      progress: '78.30',
      period: '2025-T1',
      serviceLineId: serviceLines[0].id,
    },
    {
      title: 'Implementar programa de estágios IEL em empresas de Porto Alegre',
      description: 'Expandir as parcerias com empresas para colocação de estudantes em programas de estágio supervisionado.',
      ownerId: users.gestores[1].id,
      regionId: regions[1].id,
      subRegionIds: [4],
      startDate: '2025-03-01',
      endDate: '2025-12-31',
      status: 'active',
      progress: '30.00',
      period: '2025-T2',
      serviceLineId: serviceLines[6].id,
    },
    {
      title: 'Ampliar oferta de qualificação profissional na região Norte',
      description: 'Desenvolver e implementar novos programas de qualificação para atender as necessidades do setor industrial do norte gaúcho.',
      ownerId: users.gestores[2].id,
      regionId: regions[5].id,
      subRegionIds: [12, 13],
      startDate: '2025-02-01',
      endDate: '2025-11-30',
      status: 'active',
      progress: '55.00',
      period: '2025-T2',
      serviceLineId: serviceLines[3].id,
    },
    {
      title: 'Digitalizar processos internos de gestão OKR',
      description: 'Implementar sistema digital de gestão por objetivos e resultados-chave para todas as regionais do FIERGS.',
      ownerId: users.adminId,
      regionId: regions[0].id,
      subRegionIds: [],
      startDate: '2025-01-01',
      endDate: '2025-06-30',
      status: 'completed',
      progress: '100.00',
      period: '2025-T1',
      serviceLineId: serviceLines[4].id,
    },
  ];

  const inserted = await db.insert(schema.objectives).values(objectives).returning();
  console.log(`✅ ${inserted.length} objetivos criados`);
  return inserted;
}

async function seedKeyResults(
  objectives: any[],
  serviceLines: any[],
  services: any[],
  indicators: any[]
) {
  console.log('📈 Criando resultados-chave...');

  const ind = (code: string) => indicators.find(i => i.code === code)?.id;
  const sl = (code: string) => serviceLines.find(s => s.code === code)?.id;
  const svc = (code: string) => services.find(s => s.code === code)?.id;

  const keyResults = [
    // Objetivo 1 - Saúde Serra Gaúcha
    {
      objectiveId: objectives[0].id,
      title: 'Atender 250 empresas com serviços de segurança do trabalho',
      description: 'Realizar atendimentos de SESMT e consultoria de segurança em pelo menos 250 empresas da região.',
      targetValue: '250.00',
      currentValue: '142.00',
      unit: 'empresas',
      strategicIndicatorIds: [ind('EMPR'), ind('ATEND')],
      serviceLineIds: [sl('SASISEG')],
      serviceLineId: sl('SASISEG'),
      serviceId: svc('SESMT'),
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      frequency: 'monthly',
      status: 'active',
      progress: '56.80',
    },
    {
      objectiveId: objectives[0].id,
      title: 'Beneficiar 5.000 trabalhadores com programas de ginástica laboral',
      description: 'Implementar programas regulares de ginástica laboral em empresas da Serra Gaúcha.',
      targetValue: '5000.00',
      currentValue: '2340.00',
      unit: 'trabalhadores',
      strategicIndicatorIds: [ind('TRAB')],
      serviceLineIds: [sl('SASISEG')],
      serviceLineId: sl('SASISEG'),
      serviceId: svc('GINLAB'),
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      frequency: 'monthly',
      status: 'active',
      progress: '46.80',
    },
    {
      objectiveId: objectives[0].id,
      title: 'Gerar R$ 1.200.000 em receita com serviços de saúde',
      description: 'Alcançar meta de receita anual com serviços de saúde e segurança do trabalho.',
      targetValue: '1200000.00',
      currentValue: '487500.00',
      unit: 'R$',
      strategicIndicatorIds: [ind('REC')],
      serviceLineIds: [sl('SASISEG')],
      serviceLineId: sl('SASISEG'),
      serviceId: svc('SESMT'),
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      frequency: 'quarterly',
      status: 'active',
      progress: '40.63',
    },
    // Objetivo 2 - Matrículas SENAI Serra
    {
      objectiveId: objectives[1].id,
      title: 'Atingir 1.500 matrículas em cursos técnicos',
      description: 'Aumentar o número de matrículas em cursos técnicos de nível médio e qualificação profissional.',
      targetValue: '1500.00',
      currentValue: '987.00',
      unit: 'matrículas',
      strategicIndicatorIds: [ind('MAT')],
      serviceLineIds: [sl('SENEDPRO')],
      serviceLineId: sl('SENEDPRO'),
      serviceId: svc('CURTEC'),
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      frequency: 'monthly',
      status: 'active',
      progress: '65.80',
    },
    {
      objectiveId: objectives[1].id,
      title: 'Taxa de conclusão dos cursos acima de 85%',
      description: 'Manter a taxa de conclusão de todos os cursos ofertados acima de 85%.',
      targetValue: '85.00',
      currentValue: '88.50',
      unit: '%',
      strategicIndicatorIds: [ind('TCONCL')],
      serviceLineIds: [sl('SENEDPRO')],
      serviceLineId: sl('SENEDPRO'),
      serviceId: svc('QUALPRO'),
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      frequency: 'quarterly',
      status: 'active',
      progress: '100.00',
    },
    // Objetivo 3 - Satisfação Porto Alegre
    {
      objectiveId: objectives[2].id,
      title: 'Atingir NPS de 75 pontos ou superior',
      description: 'Elevar o índice de recomendação dos serviços SESI na GPA para 75 pontos.',
      targetValue: '75.00',
      currentValue: '71.00',
      unit: 'pts',
      strategicIndicatorIds: [ind('NPS')],
      serviceLineIds: [sl('SASISEG')],
      serviceLineId: sl('SASISEG'),
      serviceId: svc('SESMT'),
      startDate: '2025-01-01',
      endDate: '2025-06-30',
      frequency: 'quarterly',
      status: 'active',
      progress: '94.67',
    },
    {
      objectiveId: objectives[2].id,
      title: 'Reduzir prazo médio de atendimento para 3 dias úteis',
      description: 'Melhorar eficiência no atendimento reduzindo o tempo de resposta médio.',
      targetValue: '3.00',
      currentValue: '4.20',
      unit: 'dias',
      strategicIndicatorIds: [ind('ISAT')],
      serviceLineIds: [sl('SASISEG')],
      serviceLineId: sl('SASISEG'),
      serviceId: svc('SAUMEL'),
      startDate: '2025-01-01',
      endDate: '2025-06-30',
      frequency: 'monthly',
      status: 'active',
      progress: '71.43',
    },
    // Objetivo 4 - Estágios IEL
    {
      objectiveId: objectives[3].id,
      title: 'Firmar convênio com 80 empresas para receber estagiários',
      description: 'Ampliar a rede de empresas conveniadas para colocação de estagiários universitários.',
      targetValue: '80.00',
      currentValue: '24.00',
      unit: 'empresas',
      strategicIndicatorIds: [ind('EMPR')],
      serviceLineIds: [sl('IELEMP')],
      serviceLineId: sl('IELEMP'),
      serviceId: svc('PROEST'),
      startDate: '2025-03-01',
      endDate: '2025-12-31',
      frequency: 'monthly',
      status: 'active',
      progress: '30.00',
    },
    {
      objectiveId: objectives[3].id,
      title: 'Colocar 200 estagiários em empresas parceiras',
      description: 'Realizar a colocação efetiva de estudantes em programas de estágio supervisionado.',
      targetValue: '200.00',
      currentValue: '58.00',
      unit: 'estagiários',
      strategicIndicatorIds: [ind('EMPGER')],
      serviceLineIds: [sl('IELEMP')],
      serviceLineId: sl('IELEMP'),
      serviceId: svc('PROEST'),
      startDate: '2025-03-01',
      endDate: '2025-12-31',
      frequency: 'monthly',
      status: 'active',
      progress: '29.00',
    },
    // Objetivo 5 - Qualificação Norte
    {
      objectiveId: objectives[4].id,
      title: 'Ofertar 2.000 horas de capacitação profissional',
      description: 'Ampliar a carga horária total de cursos de qualificação ofertados na região Norte.',
      targetValue: '2000.00',
      currentValue: '1100.00',
      unit: 'horas',
      strategicIndicatorIds: [ind('HCAP')],
      serviceLineIds: [sl('SENEDPRO')],
      serviceLineId: sl('SENEDPRO'),
      serviceId: svc('QUALPRO'),
      startDate: '2025-02-01',
      endDate: '2025-11-30',
      frequency: 'monthly',
      status: 'active',
      progress: '55.00',
    },
    // Objetivo 6 - Digitalização (concluído)
    {
      objectiveId: objectives[5].id,
      title: 'Implantar sistema OKR em todas as 10 regionais',
      description: 'Implementar o sistema de gestão OKR digital em todas as regionais do FIERGS.',
      targetValue: '10.00',
      currentValue: '10.00',
      unit: 'regionais',
      strategicIndicatorIds: [ind('EMPR')],
      serviceLineIds: [sl('SENTEC')],
      serviceLineId: sl('SENTEC'),
      serviceId: svc('IOT4'),
      startDate: '2025-01-01',
      endDate: '2025-06-30',
      frequency: 'monthly',
      status: 'completed',
      progress: '100.00',
    },
  ];

  const inserted = await db.insert(schema.keyResults).values(keyResults).returning();
  console.log(`✅ ${inserted.length} resultados-chave criados`);
  return inserted;
}

async function seedActions(
  keyResults: any[],
  users: { gestores: any[]; operacionais: any[] },
  serviceLines: any[],
  services: any[],
  indicators: any[]
) {
  console.log('✅ Criando ações...');

  const sl = (code: string) => serviceLines.find(s => s.code === code)?.id;
  const svc = (code: string) => services.find(s => s.code === code)?.id;
  const ind = (code: string) => indicators.find(i => i.code === code)?.id;

  const actions = [
    // KR 1 - Atender 250 empresas
    {
      keyResultId: keyResults[0].id,
      title: 'Mapear empresas da Serra sem atendimento SESMT',
      description: 'Realizar levantamento completo das empresas da Serra Gaúcha que ainda não possuem atendimento SESMT, priorizando aquelas com maior número de colaboradores.',
      number: 1,
      responsibleId: users.operacionais[0].id,
      serviceLineId: sl('SASISEG'),
      serviceId: svc('SESMT'),
      strategicIndicatorId: ind('EMPR'),
      dueDate: '2025-03-31',
      status: 'completed',
      priority: 'high',
    },
    {
      keyResultId: keyResults[0].id,
      title: 'Realizar visitas técnicas às 50 maiores indústrias',
      description: 'Agendar e executar visitas técnicas de diagnóstico às 50 maiores indústrias da região para apresentação dos serviços SESMT.',
      number: 2,
      responsibleId: users.operacionais[0].id,
      serviceLineId: sl('SASISEG'),
      serviceId: svc('SESMT'),
      strategicIndicatorId: ind('EMPR'),
      dueDate: '2025-05-31',
      status: 'in_progress',
      priority: 'high',
    },
    {
      keyResultId: keyResults[0].id,
      title: 'Contratar 2 técnicos de segurança do trabalho',
      description: 'Reforçar a equipe com 2 técnicos de segurança para ampliar a capacidade de atendimento.',
      number: 3,
      responsibleId: users.gestores[0].id,
      serviceLineId: sl('SASISEG'),
      serviceId: svc('SESMT'),
      strategicIndicatorId: ind('EMPR'),
      dueDate: '2025-04-30',
      status: 'completed',
      priority: 'critical',
    },
    // KR 2 - Ginástica Laboral
    {
      keyResultId: keyResults[1].id,
      title: 'Desenvolver programa de ginástica laboral personalizado por setor',
      description: 'Criar módulos específicos de ginástica laboral para setores metalúrgico, têxtil e alimentício da Serra.',
      number: 1,
      responsibleId: users.operacionais[0].id,
      serviceLineId: sl('SASISEG'),
      serviceId: svc('GINLAB'),
      strategicIndicatorId: ind('TRAB'),
      dueDate: '2025-02-28',
      status: 'completed',
      priority: 'medium',
    },
    {
      keyResultId: keyResults[1].id,
      title: 'Implementar ginástica laboral em 30 novas empresas no T2',
      description: 'Iniciar o programa de ginástica laboral em pelo menos 30 novas empresas no segundo trimestre.',
      number: 2,
      responsibleId: users.operacionais[0].id,
      serviceLineId: sl('SASISEG'),
      serviceId: svc('GINLAB'),
      strategicIndicatorId: ind('TRAB'),
      dueDate: '2025-06-30',
      status: 'in_progress',
      priority: 'medium',
    },
    // KR 3 - Receita
    {
      keyResultId: keyResults[2].id,
      title: 'Elaborar proposta comercial para grandes indústrias',
      description: 'Criar pacotes customizados de serviços de saúde para empresas com mais de 500 funcionários.',
      number: 1,
      responsibleId: users.gestores[0].id,
      serviceLineId: sl('SASISEG'),
      serviceId: svc('SESMT'),
      strategicIndicatorId: ind('REC'),
      dueDate: '2025-03-15',
      status: 'completed',
      priority: 'high',
    },
    // KR 4 - Matrículas Técnicos
    {
      keyResultId: keyResults[3].id,
      title: 'Lançar 3 novos cursos técnicos alinhados ao mercado',
      description: 'Desenvolver e lançar cursos técnicos em Automação Industrial, Eletrotécnica e Mecatrônica.',
      number: 1,
      responsibleId: users.operacionais[1].id,
      serviceLineId: sl('SENEDPRO'),
      serviceId: svc('CURTEC'),
      strategicIndicatorId: ind('MAT'),
      dueDate: '2025-04-30',
      status: 'completed',
      priority: 'high',
    },
    {
      keyResultId: keyResults[3].id,
      title: 'Realizar campanha de captação de alunos',
      description: 'Executar campanha de marketing digital e presencial para divulgação dos cursos técnicos.',
      number: 2,
      responsibleId: users.operacionais[1].id,
      serviceLineId: sl('SENEDPRO'),
      serviceId: svc('CURTEC'),
      strategicIndicatorId: ind('MAT'),
      dueDate: '2025-05-31',
      status: 'in_progress',
      priority: 'medium',
    },
    {
      keyResultId: keyResults[3].id,
      title: 'Firmar parceria com 15 indústrias para bolsas de estudo',
      description: 'Negociar convênios com indústrias locais para concessão de bolsas de estudo para filhos de colaboradores.',
      number: 3,
      responsibleId: users.gestores[0].id,
      serviceLineId: sl('SENEDPRO'),
      serviceId: svc('CURTEC'),
      strategicIndicatorId: ind('MAT'),
      dueDate: '2025-06-30',
      status: 'pending',
      priority: 'medium',
    },
    // KR 6 - NPS Porto Alegre
    {
      keyResultId: keyResults[5].id,
      title: 'Implementar pesquisa de satisfação pós-atendimento',
      description: 'Criar e implantar processo automático de pesquisa de satisfação após cada atendimento realizado.',
      number: 1,
      responsibleId: users.operacionais[2].id,
      serviceLineId: sl('SASISEG'),
      serviceId: svc('SAUMEL'),
      strategicIndicatorId: ind('NPS'),
      dueDate: '2025-02-28',
      status: 'completed',
      priority: 'high',
    },
    {
      keyResultId: keyResults[5].id,
      title: 'Treinamento de equipe em excelência no atendimento',
      description: 'Capacitar toda a equipe de atendimento com treinamento focado em excelência e relacionamento com o cliente.',
      number: 2,
      responsibleId: users.gestores[1].id,
      serviceLineId: sl('SASISEG'),
      serviceId: svc('SAUMEL'),
      strategicIndicatorId: ind('ISAT'),
      dueDate: '2025-03-31',
      status: 'completed',
      priority: 'high',
    },
    // KR 8 - Convênios IEL
    {
      keyResultId: keyResults[7].id,
      title: 'Apresentar programa IEL em associações empresariais',
      description: 'Realizar apresentações do programa de estágios IEL em associações comerciais e industriais de Porto Alegre.',
      number: 1,
      responsibleId: users.operacionais[2].id,
      serviceLineId: sl('IELEMP'),
      serviceId: svc('PROEST'),
      strategicIndicatorId: ind('EMPR'),
      dueDate: '2025-04-30',
      status: 'in_progress',
      priority: 'high',
    },
    {
      keyResultId: keyResults[7].id,
      title: 'Criar portal digital de vagas de estágio',
      description: 'Desenvolver plataforma digital para cadastro de vagas e candidatos ao programa de estágio.',
      number: 2,
      responsibleId: users.operacionais[3].id,
      serviceLineId: sl('IELEMP'),
      serviceId: svc('BANTEL'),
      strategicIndicatorId: ind('EMPGER'),
      dueDate: '2025-05-31',
      status: 'in_progress',
      priority: 'critical',
    },
    // KR 10 - Horas Capacitação Norte
    {
      keyResultId: keyResults[9].id,
      title: 'Contratar instrutores para cursos técnicos no Norte',
      description: 'Selecionar e contratar instrutores qualificados para ministrar cursos técnicos na região Norte.',
      number: 1,
      responsibleId: users.gestores[2].id,
      serviceLineId: sl('SENEDPRO'),
      serviceId: svc('QUALPRO'),
      strategicIndicatorId: ind('HCAP'),
      dueDate: '2025-03-31',
      status: 'completed',
      priority: 'high',
    },
    {
      keyResultId: keyResults[9].id,
      title: 'Adaptar infraestrutura para cursos EAD',
      description: 'Configurar laboratórios de informática e studio de gravação para cursos no formato EAD.',
      number: 2,
      responsibleId: users.operacionais[4].id,
      serviceLineId: sl('SENEDPRO'),
      serviceId: svc('QUALPRO'),
      strategicIndicatorId: ind('HCAP'),
      dueDate: '2025-04-30',
      status: 'in_progress',
      priority: 'medium',
    },
    {
      keyResultId: keyResults[9].id,
      title: 'Realizar 5 turmas de qualificação no T2',
      description: 'Executar 5 turmas de qualificação profissional com no mínimo 20 alunos cada no segundo trimestre.',
      number: 3,
      responsibleId: users.operacionais[4].id,
      serviceLineId: sl('SENEDPRO'),
      serviceId: svc('QUALPRO'),
      strategicIndicatorId: ind('HCAP'),
      dueDate: '2025-06-30',
      status: 'pending',
      priority: 'medium',
    },
    // KR 11 - Sistema OKR (concluído)
    {
      keyResultId: keyResults[10].id,
      title: 'Mapear requisitos com todas as regionais',
      description: 'Levantar os requisitos e necessidades de cada regional para o sistema de gestão OKR.',
      number: 1,
      responsibleId: users.gestores[0].id,
      serviceLineId: sl('SENTEC'),
      serviceId: svc('IOT4'),
      strategicIndicatorId: ind('EMPR'),
      dueDate: '2025-01-31',
      status: 'completed',
      priority: 'high',
    },
    {
      keyResultId: keyResults[10].id,
      title: 'Treinar usuários administradores do sistema',
      description: 'Capacitar os gestores e usuários-chave de cada regional para utilização do sistema OKR.',
      number: 2,
      responsibleId: users.gestores[0].id,
      serviceLineId: sl('SENTEC'),
      serviceId: svc('IOT4'),
      strategicIndicatorId: ind('EMPR'),
      dueDate: '2025-03-31',
      status: 'completed',
      priority: 'high',
    },
  ];

  const inserted = await db.insert(schema.actions).values(actions).returning();
  console.log(`✅ ${inserted.length} ações criadas`);
  return inserted;
}

async function seedCheckpoints(keyResults: any[]) {
  console.log('📅 Criando checkpoints...');

  const checkpoints = [
    // KR 1 - Atender empresas (mensal, Jan-Dez)
    { keyResultId: keyResults[0].id, title: '31/01 1/12', period: '(01/01 a 31/01)', targetValue: '20.83', actualValue: '22.00', progress: '100.00', status: 'completed', dueDate: new Date('2025-01-31'), completedAt: new Date('2025-01-31'), notes: 'Meta superada no primeiro mês.' },
    { keyResultId: keyResults[0].id, title: '28/02 2/12', period: '(01/02 a 28/02)', targetValue: '41.67', actualValue: '45.00', progress: '100.00', status: 'completed', dueDate: new Date('2025-02-28'), completedAt: new Date('2025-02-28'), notes: 'Continuamos acima da meta acumulada.' },
    { keyResultId: keyResults[0].id, title: '31/03 3/12', period: '(01/03 a 31/03)', targetValue: '62.50', actualValue: '78.00', progress: '100.00', status: 'completed', dueDate: new Date('2025-03-31'), completedAt: new Date('2025-03-31'), notes: 'Resultado da campanha de mapeamento.' },
    { keyResultId: keyResults[0].id, title: '30/04 4/12', period: '(01/04 a 30/04)', targetValue: '83.33', actualValue: '100.00', progress: '100.00', status: 'completed', dueDate: new Date('2025-04-30'), completedAt: new Date('2025-04-30'), notes: 'Excelente desempenho.' },
    { keyResultId: keyResults[0].id, title: '31/05 5/12', period: '(01/05 a 31/05)', targetValue: '104.17', actualValue: '120.00', progress: '100.00', status: 'completed', dueDate: new Date('2025-05-31'), completedAt: new Date('2025-05-31'), notes: 'Resultado da contratação de novos técnicos.' },
    { keyResultId: keyResults[0].id, title: '30/06 6/12', period: '(01/06 a 30/06)', targetValue: '125.00', actualValue: '142.00', progress: '100.00', status: 'completed', dueDate: new Date('2025-06-30'), notes: null },
    { keyResultId: keyResults[0].id, title: '31/07 7/12', period: '(01/07 a 31/07)', targetValue: '145.83', actualValue: null, progress: '0.00', status: 'pending', dueDate: new Date('2025-07-31'), notes: null },
    { keyResultId: keyResults[0].id, title: '31/08 8/12', period: '(01/08 a 31/08)', targetValue: '166.67', actualValue: null, progress: '0.00', status: 'pending', dueDate: new Date('2025-08-31'), notes: null },
    { keyResultId: keyResults[0].id, title: '30/09 9/12', period: '(01/09 a 30/09)', targetValue: '187.50', actualValue: null, progress: '0.00', status: 'pending', dueDate: new Date('2025-09-30'), notes: null },
    { keyResultId: keyResults[0].id, title: '31/10 10/12', period: '(01/10 a 31/10)', targetValue: '208.33', actualValue: null, progress: '0.00', status: 'pending', dueDate: new Date('2025-10-31'), notes: null },
    { keyResultId: keyResults[0].id, title: '30/11 11/12', period: '(01/11 a 30/11)', targetValue: '229.17', actualValue: null, progress: '0.00', status: 'pending', dueDate: new Date('2025-11-30'), notes: null },
    { keyResultId: keyResults[0].id, title: '31/12 12/12', period: '(01/12 a 31/12)', targetValue: '250.00', actualValue: null, progress: '0.00', status: 'pending', dueDate: new Date('2025-12-31'), notes: null },

    // KR 4 - Matrículas técnicos (mensal)
    { keyResultId: keyResults[3].id, title: '31/01 1/12', period: '(01/01 a 31/01)', targetValue: '125.00', actualValue: '138.00', progress: '100.00', status: 'completed', dueDate: new Date('2025-01-31'), completedAt: new Date('2025-01-31'), notes: 'Início promissor do ano letivo.' },
    { keyResultId: keyResults[3].id, title: '28/02 2/12', period: '(01/02 a 28/02)', targetValue: '250.00', actualValue: '267.00', progress: '100.00', status: 'completed', dueDate: new Date('2025-02-28'), notes: null },
    { keyResultId: keyResults[3].id, title: '31/03 3/12', period: '(01/03 a 31/03)', targetValue: '375.00', actualValue: '412.00', progress: '100.00', status: 'completed', dueDate: new Date('2025-03-31'), notes: 'Novos cursos lançados impulsionaram as matrículas.' },
    { keyResultId: keyResults[3].id, title: '30/04 4/12', period: '(01/04 a 30/04)', targetValue: '500.00', actualValue: '545.00', progress: '100.00', status: 'completed', dueDate: new Date('2025-04-30'), notes: null },
    { keyResultId: keyResults[3].id, title: '31/05 5/12', period: '(01/05 a 31/05)', targetValue: '625.00', actualValue: '678.00', progress: '100.00', status: 'completed', dueDate: new Date('2025-05-31'), notes: 'Campanha de captação gerou bons resultados.' },
    { keyResultId: keyResults[3].id, title: '30/06 6/12', period: '(01/06 a 30/06)', targetValue: '750.00', actualValue: '820.00', progress: '100.00', status: 'completed', dueDate: new Date('2025-06-30'), notes: 'Semestre encerrado acima da meta.' },
    { keyResultId: keyResults[3].id, title: '31/07 7/12', period: '(01/07 a 31/07)', targetValue: '875.00', actualValue: '987.00', progress: '100.00', status: 'completed', dueDate: new Date('2025-07-31'), notes: null },
    { keyResultId: keyResults[3].id, title: '31/08 8/12', period: '(01/08 a 31/08)', targetValue: '1000.00', actualValue: null, progress: '0.00', status: 'pending', dueDate: new Date('2025-08-31'), notes: null },

    // KR 6 - NPS (trimestral)
    { keyResultId: keyResults[5].id, title: '31/03 1/2', period: '(01/01 a 31/03)', targetValue: '37.50', actualValue: '68.00', progress: '100.00', status: 'completed', dueDate: new Date('2025-03-31'), completedAt: new Date('2025-03-31'), notes: 'Pesquisa do T1 concluída. Acima do esperado.' },
    { keyResultId: keyResults[5].id, title: '30/06 2/2', period: '(01/04 a 30/06)', targetValue: '75.00', actualValue: '71.00', progress: '94.67', status: 'in_progress', dueDate: new Date('2025-06-30'), notes: 'Próximo da meta. Melhorias sendo implementadas.' },
  ];

  const inserted = await db.insert(schema.checkpoints).values(checkpoints).returning();
  console.log(`✅ ${inserted.length} checkpoints criados`);
  return inserted;
}

async function seedActionComments(actions: any[], users: { gestores: any[]; operacionais: any[]; adminId: number }) {
  console.log('💬 Criando comentários nas ações...');

  const comments = [
    // Ação 1 - Mapear empresas (completed)
    {
      actionId: actions[0].id,
      userId: users.operacionais[0].id,
      comment: 'Iniciamos o levantamento junto ao CIERGS. Temos lista inicial com 380 empresas potenciais na região.',
      createdAt: new Date('2025-01-15'),
    },
    {
      actionId: actions[0].id,
      userId: users.gestores[0].id,
      comment: 'Bom progresso! Priorizar as empresas com mais de 100 funcionários na primeira fase.',
      createdAt: new Date('2025-01-16'),
    },
    {
      actionId: actions[0].id,
      userId: users.operacionais[0].id,
      comment: '🤖 SISTEMA: Status alterado de "Pendente" para "Em Progresso"',
      createdAt: new Date('2025-01-15'),
    },
    {
      actionId: actions[0].id,
      userId: users.operacionais[0].id,
      comment: 'Mapeamento concluído. Identificadas 312 empresas sem atendimento SESMT. Planilha disponível no drive.',
      createdAt: new Date('2025-01-30'),
    },
    {
      actionId: actions[0].id,
      userId: users.operacionais[0].id,
      comment: '🤖 SISTEMA: Status alterado de "Em Progresso" para "Concluída"',
      createdAt: new Date('2025-01-30'),
    },

    // Ação 2 - Visitas técnicas (in_progress)
    {
      actionId: actions[1].id,
      userId: users.operacionais[0].id,
      comment: '🤖 SISTEMA: Ação criada com prioridade "Alta" e prazo 31/05/2025',
      createdAt: new Date('2025-02-01'),
    },
    {
      actionId: actions[1].id,
      userId: users.operacionais[0].id,
      comment: 'Agendadas 15 visitas para fevereiro. Aproveitaremos o mapeamento para priorizar as empresas.',
      createdAt: new Date('2025-02-05'),
    },
    {
      actionId: actions[1].id,
      userId: users.gestores[0].id,
      comment: 'Certifiquem-se de levar material de apresentação atualizado com nossos novos serviços de saúde mental.',
      createdAt: new Date('2025-02-06'),
    },
    {
      actionId: actions[1].id,
      userId: users.operacionais[0].id,
      comment: 'Fevereiro encerrado: 18 visitas realizadas. Março previstas 20 visitas. Taxa de conversão ~40%.',
      createdAt: new Date('2025-02-28'),
    },

    // Ação 7 - Novos cursos técnicos (completed)
    {
      actionId: actions[6].id,
      userId: users.operacionais[1].id,
      comment: '🤖 SISTEMA: Ação criada com prioridade "Alta" e prazo 30/04/2025',
      createdAt: new Date('2025-01-10'),
    },
    {
      actionId: actions[6].id,
      userId: users.operacionais[1].id,
      comment: 'Apresentado projeto dos 3 cursos à coordenação pedagógica. Aprovados com ajustes na grade de Mecatrônica.',
      createdAt: new Date('2025-02-15'),
    },
    {
      actionId: actions[6].id,
      userId: users.gestores[0].id,
      comment: 'Ótimo trabalho! Os cursos de Automação estão muito demandados pelas indústrias da região.',
      createdAt: new Date('2025-02-16'),
    },
    {
      actionId: actions[6].id,
      userId: users.operacionais[1].id,
      comment: 'Cursos lançados oficialmente. Já temos 45 pré-inscrições para Automação Industrial!',
      createdAt: new Date('2025-04-25'),
    },

    // Ação 10 - Pesquisa satisfação (completed)
    {
      actionId: actions[9].id,
      userId: users.operacionais[2].id,
      comment: '🤖 SISTEMA: Ação criada com prioridade "Alta" e prazo 28/02/2025',
      createdAt: new Date('2025-01-05'),
    },
    {
      actionId: actions[9].id,
      userId: users.operacionais[2].id,
      comment: 'Ferramenta de pesquisa configurada no sistema. Enviamos para validação da gerência.',
      createdAt: new Date('2025-01-20'),
    },
    {
      actionId: actions[9].id,
      userId: users.gestores[1].id,
      comment: 'Aprovado! Incluir também campo de comentários abertos para capturar sugestões qualitativas.',
      createdAt: new Date('2025-01-21'),
    },
    {
      actionId: actions[9].id,
      userId: users.operacionais[2].id,
      comment: 'Sistema de pesquisa implantado e operacional. Primeiro retorno: 89% de satisfação nos atendimentos de janeiro!',
      createdAt: new Date('2025-02-27'),
    },

    // Ação 12 - Portal de estágios (in_progress)
    {
      actionId: actions[12].id,
      userId: users.operacionais[3].id,
      comment: '🤖 SISTEMA: Ação criada com prioridade "Crítica" e prazo 31/05/2025',
      createdAt: new Date('2025-03-05'),
    },
    {
      actionId: actions[12].id,
      userId: users.operacionais[3].id,
      comment: 'Levantamento de requisitos concluído. Precisamos decidir entre desenvolver internamente ou contratar plataforma terceira.',
      createdAt: new Date('2025-03-20'),
    },
    {
      actionId: actions[12].id,
      userId: users.gestores[1].id,
      comment: 'Vamos contratar plataforma terceira. Custos de desenvolvimento próprio são muito altos. Solicitar 3 cotações.',
      createdAt: new Date('2025-03-21'),
    },
    {
      actionId: actions[12].id,
      userId: users.operacionais[3].id,
      comment: 'Cotações recebidas. Recomendo a plataforma Conecta Estágios - melhor custo-benefício e já tem integração com sistemas universitários.',
      createdAt: new Date('2025-04-10'),
    },
  ];

  const inserted = await db.insert(schema.actionComments).values(comments).returning();
  console.log(`✅ ${inserted.length} comentários criados`);
}

async function main() {
  console.log('🌱 Iniciando seed completo do banco de dados...\n');

  try {
    await clearAll();

    const regions = await seedRegions();
    const subRegions = await seedSubRegions(regions);
    const solutions = await seedSolutions();
    const serviceLines = await seedServiceLines(solutions);
    const services = await seedServices(serviceLines);
    const indicators = await seedStrategicIndicators();
    const users = await seedUsers(regions, subRegions, solutions, serviceLines, services);
    const objectives = await seedObjectives(users, regions, serviceLines);
    const keyResults = await seedKeyResults(objectives, serviceLines, services, indicators);
    const actions = await seedActions(keyResults, users, serviceLines, services, indicators);
    await seedCheckpoints(keyResults);
    await seedActionComments(actions, users);

    console.log('\n✅ Seed completo finalizado com sucesso!');
    console.log('\n📋 Credenciais de acesso:');
    console.log('  👑 Admin:      admin / admin123');
    console.log('  👔 Gestor 1:   gestor.serra / teste123');
    console.log('  👔 Gestor 2:   gestor.poa / teste123');
    console.log('  👔 Gestor 3:   gestor.norte / teste123');
    console.log('  👤 Operacional: op.fontana / teste123');
    console.log('  👤 Operacional: op.lucas / teste123');
    console.log('  👤 Operacional: op.silveira / teste123');
    console.log('  👤 Operacional: op.pedro / teste123');
    console.log('  👤 Operacional: op.norte / teste123');
    console.log('  ⏳ Pendente:   op.pendente / teste123 (aguardando aprovação)');

  } catch (error) {
    console.error('❌ Erro durante o seed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

main();
