import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { solutions, serviceLines, services } from "@shared/schema";

const sqlite = new Database('okr.db');
const db = drizzle(sqlite);

async function updateServices() {
  console.log('🔧 Atualizando estrutura de soluções, linhas de serviço e serviços...');

  // Clear existing data
  await db.delete(services);
  await db.delete(serviceLines);
  await db.delete(solutions);

  // Insert solutions
  const solutionData = [
    { name: 'Educação', description: 'Soluções educacionais do SESI' },
    { name: 'Saúde', description: 'Soluções de saúde e segurança do trabalho do SESI' }
  ];

  const insertedSolutions = [];
  for (const solution of solutionData) {
    const [inserted] = await db.insert(solutions).values(solution).returning();
    insertedSolutions.push(inserted);
  }

  console.log(`✅ ${insertedSolutions.length} soluções inseridas`);

  // Create solution lookup
  const solutionLookup = {};
  insertedSolutions.forEach(solution => {
    solutionLookup[solution.name] = solution.id;
  });

  // Insert service lines
  const serviceLineData = [
    // Educação
    { name: 'Educação Básica', description: 'Serviços de educação básica', solutionId: solutionLookup['Educação'] },
    { name: 'Educação Continuada', description: 'Serviços de educação continuada', solutionId: solutionLookup['Educação'] },
    { name: 'Evento', description: 'Eventos educacionais', solutionId: solutionLookup['Educação'] },
    
    // Saúde
    { name: 'Atividade Física', description: 'Serviços de atividade física e esportes', solutionId: solutionLookup['Saúde'] },
    { name: 'Evento', description: 'Eventos de saúde', solutionId: solutionLookup['Saúde'] },
    { name: 'Locação de Espaços', description: 'Locação de espaços esportivos', solutionId: solutionLookup['Saúde'] },
    { name: 'Normas Regulamentadoras', description: 'Treinamentos e cursos de normas regulamentadoras', solutionId: solutionLookup['Saúde'] },
    { name: 'Nutrição', description: 'Serviços de nutrição', solutionId: solutionLookup['Saúde'] },
    { name: 'Odontologia', description: 'Serviços odontológicos', solutionId: solutionLookup['Saúde'] },
    { name: 'Parque SESI', description: 'Parque SESI', solutionId: solutionLookup['Saúde'] },
    { name: 'Promoção da Saúde', description: 'Serviços de promoção da saúde', solutionId: solutionLookup['Saúde'] },
    { name: 'Saúde Mental', description: 'Serviços de saúde mental', solutionId: solutionLookup['Saúde'] },
    { name: 'Saúde Ocupacional', description: 'Serviços de saúde ocupacional', solutionId: solutionLookup['Saúde'] },
    { name: 'Segurança do Trabalho', description: 'Serviços de segurança do trabalho', solutionId: solutionLookup['Saúde'] },
    { name: 'Vacinação', description: 'Serviços de vacinação', solutionId: solutionLookup['Saúde'] }
  ];

  const insertedServiceLines = [];
  for (const serviceLine of serviceLineData) {
    const [inserted] = await db.insert(serviceLines).values(serviceLine).returning();
    insertedServiceLines.push(inserted);
  }

  console.log(`✅ ${insertedServiceLines.length} linhas de serviço inseridas`);

  // Create service line lookup
  const serviceLineLookup = {};
  insertedServiceLines.forEach(serviceLine => {
    const key = `${serviceLine.solutionId}-${serviceLine.name}`;
    serviceLineLookup[key] = serviceLine.id;
  });

  // Insert services
  const servicesData = [
    // Educação - Educação Básica
    { name: 'Educação de Jovens e Adultos', description: 'EJA', serviceLineId: serviceLineLookup[`${solutionLookup['Educação']}-Educação Básica`] },
    { name: 'Educação Infantil', description: 'Educação infantil', serviceLineId: serviceLineLookup[`${solutionLookup['Educação']}-Educação Básica`] },
    { name: 'Ensino Médio', description: 'Ensino médio', serviceLineId: serviceLineLookup[`${solutionLookup['Educação']}-Educação Básica`] },
    
    // Educação - Educação Continuada
    { name: 'Contraturno', description: 'Atividades no contraturno', serviceLineId: serviceLineLookup[`${solutionLookup['Educação']}-Educação Continuada`] },
    { name: 'Cursos SESI', description: 'Cursos oferecidos pelo SESI', serviceLineId: serviceLineLookup[`${solutionLookup['Educação']}-Educação Continuada`] },
    { name: 'Iniciação às Artes', description: 'Programas de iniciação artística', serviceLineId: serviceLineLookup[`${solutionLookup['Educação']}-Educação Continuada`] },
    { name: 'Educação para o Mundo do Trabalho', description: 'Preparação para o mercado de trabalho', serviceLineId: serviceLineLookup[`${solutionLookup['Educação']}-Educação Continuada`] },
    { name: 'Gestão e Formação Educacional', description: 'Gestão e formação de educadores', serviceLineId: serviceLineLookup[`${solutionLookup['Educação']}-Educação Continuada`] },
    
    // Educação - Evento
    { name: 'Mostra Sesi de Educação', description: 'Evento anual de educação', serviceLineId: serviceLineLookup[`${solutionLookup['Educação']}-Evento`] },
    
    // Saúde - Atividade Física
    { name: 'Eventos de Promoção da Saúde', description: 'Eventos para promoção da saúde através da atividade física', serviceLineId: serviceLineLookup[`${solutionLookup['Saúde']}-Atividade Física`] },
    { name: 'Academias', description: 'Serviços de academia', serviceLineId: serviceLineLookup[`${solutionLookup['Saúde']}-Atividade Física`] },
    { name: 'Empresa Fitness', description: 'Programas fitness corporativos', serviceLineId: serviceLineLookup[`${solutionLookup['Saúde']}-Atividade Física`] },
    { name: 'Ginástica Laboral', description: 'Ginástica laboral nas empresas', serviceLineId: serviceLineLookup[`${solutionLookup['Saúde']}-Atividade Física`] },
    { name: 'Oficinas', description: 'Oficinas de atividade física', serviceLineId: serviceLineLookup[`${solutionLookup['Saúde']}-Atividade Física`] },
    { name: 'Competições Esportivas', description: 'Organização de competições esportivas', serviceLineId: serviceLineLookup[`${solutionLookup['Saúde']}-Atividade Física`] },
    
    // Saúde - Evento
    { name: 'Conecta Saúde', description: 'Evento de conexão em saúde', serviceLineId: serviceLineLookup[`${solutionLookup['Saúde']}-Evento`] },
    
    // Saúde - Locação de Espaços
    { name: 'Locação de Espaços Esportivos', description: 'Locação de espaços para atividades esportivas', serviceLineId: serviceLineLookup[`${solutionLookup['Saúde']}-Locação de Espaços`] },
    
    // Saúde - Normas Regulamentadoras
    { name: 'Gestão de Treinamentos em SSI', description: 'Gestão de treinamentos em segurança e saúde industrial', serviceLineId: serviceLineLookup[`${solutionLookup['Saúde']}-Normas Regulamentadoras`] },
    { name: 'Curso de CIPA', description: 'Curso para membros da CIPA', serviceLineId: serviceLineLookup[`${solutionLookup['Saúde']}-Normas Regulamentadoras`] },
    { name: 'Normas Regulamentadoras', description: 'Treinamentos em normas regulamentadoras', serviceLineId: serviceLineLookup[`${solutionLookup['Saúde']}-Normas Regulamentadoras`] },
    { name: 'SIPAT', description: 'Semana Interna de Prevenção de Acidentes do Trabalho', serviceLineId: serviceLineLookup[`${solutionLookup['Saúde']}-Normas Regulamentadoras`] },
    
    // Saúde - Nutrição
    { name: 'Consulta com Nutricionista', description: 'Consultas individuais com nutricionista', serviceLineId: serviceLineLookup[`${solutionLookup['Saúde']}-Nutrição`] },
    { name: 'Oficinas', description: 'Oficinas de nutrição', serviceLineId: serviceLineLookup[`${solutionLookup['Saúde']}-Nutrição`] },
    
    // Saúde - Odontologia
    { name: 'Consultas Odontológicas', description: 'Consultas odontológicas', serviceLineId: serviceLineLookup[`${solutionLookup['Saúde']}-Odontologia`] },
    { name: 'Edital - UMO', description: 'Edital para Unidades Móveis Odontológicas', serviceLineId: serviceLineLookup[`${solutionLookup['Saúde']}-Odontologia`] },
    { name: 'Unidades Móveis Odontológicas', description: 'Atendimento odontológico móvel', serviceLineId: serviceLineLookup[`${solutionLookup['Saúde']}-Odontologia`] },
    
    // Saúde - Parque SESI
    { name: 'Parque SESI Canela', description: 'Serviços do Parque SESI em Canela', serviceLineId: serviceLineLookup[`${solutionLookup['Saúde']}-Parque SESI`] },
    
    // Saúde - Promoção da Saúde
    { name: 'Eventos de Promoção da Saúde', description: 'Eventos focados na promoção da saúde', serviceLineId: serviceLineLookup[`${solutionLookup['Saúde']}-Promoção da Saúde`] },
    { name: 'Oficinas', description: 'Oficinas de promoção da saúde', serviceLineId: serviceLineLookup[`${solutionLookup['Saúde']}-Promoção da Saúde`] },
    { name: 'Palestras de Promoção da Saúde', description: 'Palestras sobre promoção da saúde', serviceLineId: serviceLineLookup[`${solutionLookup['Saúde']}-Promoção da Saúde`] },
    { name: 'Workshop de Promoção da Saúde', description: 'Workshops sobre promoção da saúde', serviceLineId: serviceLineLookup[`${solutionLookup['Saúde']}-Promoção da Saúde`] },
    { name: 'Assessoria Técnica em Promoção da Saúde', description: 'Assessoria técnica especializada', serviceLineId: serviceLineLookup[`${solutionLookup['Saúde']}-Promoção da Saúde`] },
    { name: 'Consultoria e Assessoria em Saúde no Trabalho', description: 'Consultoria em saúde ocupacional', serviceLineId: serviceLineLookup[`${solutionLookup['Saúde']}-Promoção da Saúde`] },
    { name: 'Liga Esportiva', description: 'Organização de ligas esportivas', serviceLineId: serviceLineLookup[`${solutionLookup['Saúde']}-Promoção da Saúde`] },
    { name: 'Programa SESI de Doenças Crônicas Não Transmissíveis', description: 'Programa para prevenção de doenças crônicas', serviceLineId: serviceLineLookup[`${solutionLookup['Saúde']}-Promoção da Saúde`] },
    
    // Saúde - Saúde Mental
    { name: 'Assessoria Psicossocial', description: 'Assessoria em aspectos psicossociais', serviceLineId: serviceLineLookup[`${solutionLookup['Saúde']}-Saúde Mental`] },
    { name: 'Terapia', description: 'Serviços de terapia', serviceLineId: serviceLineLookup[`${solutionLookup['Saúde']}-Saúde Mental`] },
    { name: 'Avaliação Psicossocial', description: 'Avaliações psicossociais', serviceLineId: serviceLineLookup[`${solutionLookup['Saúde']}-Saúde Mental`] },
    { name: 'Campanhas em Saúde Mental', description: 'Campanhas de conscientização', serviceLineId: serviceLineLookup[`${solutionLookup['Saúde']}-Saúde Mental`] },
    { name: 'Desenvolvimento de Pessoas', description: 'Programas de desenvolvimento pessoal', serviceLineId: serviceLineLookup[`${solutionLookup['Saúde']}-Saúde Mental`] },
    { name: 'Mapeamentos em Saúde Mental', description: 'Mapeamento de saúde mental organizacional', serviceLineId: serviceLineLookup[`${solutionLookup['Saúde']}-Saúde Mental`] },
    { name: 'Palestras de saúde mental', description: 'Palestras sobre saúde mental', serviceLineId: serviceLineLookup[`${solutionLookup['Saúde']}-Saúde Mental`] },
    { name: 'Workshop de Saúde Mental', description: 'Workshops sobre saúde mental', serviceLineId: serviceLineLookup[`${solutionLookup['Saúde']}-Saúde Mental`] },
    
    // Saúde - Saúde Ocupacional
    { name: 'Consultas Ocupacionais', description: 'Consultas médicas ocupacionais', serviceLineId: serviceLineLookup[`${solutionLookup['Saúde']}-Saúde Ocupacional`] },
    { name: 'Saúde Auditiva', description: 'Serviços de saúde auditiva', serviceLineId: serviceLineLookup[`${solutionLookup['Saúde']}-Saúde Ocupacional`] },
    { name: 'Exames Complementares', description: 'Exames complementares ocupacionais', serviceLineId: serviceLineLookup[`${solutionLookup['Saúde']}-Saúde Ocupacional`] },
    { name: 'Gestão da Reabilitação', description: 'Gestão de programas de reabilitação', serviceLineId: serviceLineLookup[`${solutionLookup['Saúde']}-Saúde Ocupacional`] },
    { name: 'Gestão de Exames', description: 'Gestão de exames ocupacionais', serviceLineId: serviceLineLookup[`${solutionLookup['Saúde']}-Saúde Ocupacional`] },
    { name: 'Gestão do Absenteísmo', description: 'Gestão e controle do absenteísmo', serviceLineId: serviceLineLookup[`${solutionLookup['Saúde']}-Saúde Ocupacional`] },
    { name: 'Palestras de Saúde Ocupacional', description: 'Palestras sobre saúde ocupacional', serviceLineId: serviceLineLookup[`${solutionLookup['Saúde']}-Saúde Ocupacional`] },
    { name: 'Programa de Controle Médico de Saúde Ocupacional (PCMSO)', description: 'Programa PCMSO', serviceLineId: serviceLineLookup[`${solutionLookup['Saúde']}-Saúde Ocupacional`] },
    { name: 'Exame de Raio X', description: 'Exames radiológicos ocupacionais', serviceLineId: serviceLineLookup[`${solutionLookup['Saúde']}-Saúde Ocupacional`] },
    { name: 'SESMT', description: 'Serviços Especializados em Engenharia de Segurança e em Medicina do Trabalho', serviceLineId: serviceLineLookup[`${solutionLookup['Saúde']}-Saúde Ocupacional`] },
    
    // Saúde - Segurança do Trabalho
    { name: 'Ergonomia', description: 'Análises e consultoria em ergonomia', serviceLineId: serviceLineLookup[`${solutionLookup['Saúde']}-Segurança do Trabalho`] },
    { name: 'Consultoria em NR', description: 'Consultoria em Normas Regulamentadoras', serviceLineId: serviceLineLookup[`${solutionLookup['Saúde']}-Segurança do Trabalho`] },
    { name: 'Diagnóstico de prevenção de acidentes de trabalho (DPAT)', description: 'Diagnóstico DPAT', serviceLineId: serviceLineLookup[`${solutionLookup['Saúde']}-Segurança do Trabalho`] },
    { name: 'Laudo de Insalubridade', description: 'Elaboração de laudos de insalubridade', serviceLineId: serviceLineLookup[`${solutionLookup['Saúde']}-Segurança do Trabalho`] },
    { name: 'Laudo Técnico de Condições Ambientais do Trabalho (LTCAT)', description: 'Laudo LTCAT', serviceLineId: serviceLineLookup[`${solutionLookup['Saúde']}-Segurança do Trabalho`] },
    { name: 'Palestras de Segurança no Trabalho', description: 'Palestras sobre segurança do trabalho', serviceLineId: serviceLineLookup[`${solutionLookup['Saúde']}-Segurança do Trabalho`] },
    { name: 'Programa de Condições e Meio Ambiente de Trab. na Ind. da Construção (PCMAT)', description: 'Programa PCMAT', serviceLineId: serviceLineLookup[`${solutionLookup['Saúde']}-Segurança do Trabalho`] },
    { name: 'Programa de Gerenciamento de Riscos (PGR)', description: 'Programa PGR', serviceLineId: serviceLineLookup[`${solutionLookup['Saúde']}-Segurança do Trabalho`] },
    { name: 'Programa de Proteção Respiratória (PPR)', description: 'Programa PPR', serviceLineId: serviceLineLookup[`${solutionLookup['Saúde']}-Segurança do Trabalho`] },
    { name: 'Assessoria Técnica em Segurança do Trabalho', description: 'Assessoria técnica especializada', serviceLineId: serviceLineLookup[`${solutionLookup['Saúde']}-Segurança do Trabalho`] },
    { name: 'Assessoria SIPAT', description: 'Assessoria para organização da SIPAT', serviceLineId: serviceLineLookup[`${solutionLookup['Saúde']}-Segurança do Trabalho`] },
    { name: 'Avaliação Quantitativa', description: 'Avaliações quantitativas de riscos', serviceLineId: serviceLineLookup[`${solutionLookup['Saúde']}-Segurança do Trabalho`] },
    { name: 'Assessoria em Ergonomia', description: 'Assessoria especializada em ergonomia', serviceLineId: serviceLineLookup[`${solutionLookup['Saúde']}-Segurança do Trabalho`] },
    
    // Saúde - Vacinação
    { name: 'Campanha de Vacinação', description: 'Campanhas de vacinação corporativa', serviceLineId: serviceLineLookup[`${solutionLookup['Saúde']}-Vacinação`] },
    { name: 'Clínica de Vacina', description: 'Serviços de vacinação em clínica', serviceLineId: serviceLineLookup[`${solutionLookup['Saúde']}-Vacinação`] }
  ];

  let servicesCount = 0;
  for (const service of servicesData) {
    await db.insert(services).values(service);
    servicesCount++;
  }

  console.log(`✅ ${servicesCount} serviços inseridos`);
  console.log('🎉 Estrutura de serviços atualizada com sucesso!');

  sqlite.close();
}

updateServices().catch(console.error);