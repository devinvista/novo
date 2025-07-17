import { db, sql } from "./db";
import { 
  users, regions, subRegions, solutions, serviceLines, services, strategicIndicators 
} from "@shared/schema";
import crypto from "crypto";

const hashPassword = (password: string): string => {
  return crypto.scryptSync(password, 'salt', 64).toString('hex');
};

async function seedDatabase() {
  console.log("Starting database seeding...");

  try {
    // Clear existing data
    await db.delete(users);
    await db.delete(subRegions);
    await db.delete(regions);
    await db.delete(services);
    await db.delete(serviceLines);
    await db.delete(solutions);
    await db.delete(strategicIndicators);

    // Seed Regions (10 regions)
    const regionData = [
      { name: "Norte", code: "NOR" },
      { name: "Nordeste", code: "NE" },
      { name: "Centro-Oeste", code: "CO" },
      { name: "Sudeste", code: "SE" },
      { name: "Sul", code: "SUL" },
      { name: "Rio Grande do Sul", code: "RS" },
      { name: "Vale do Rio dos Sinos", code: "VRS" },
      { name: "Serra Gaúcha", code: "SG" },
      { name: "Região Metropolitana", code: "RM" },
      { name: "Fronteira Oeste", code: "FO" }
    ];

    const insertedRegions = await db.insert(regions).values(regionData).returning();
    console.log(`✓ Seeded ${insertedRegions.length} regions`);

    // Seed Sub-regions (21 sub-regions)
    const subRegionData = [
      // Norte
      { name: "Acre", code: "AC", regionId: insertedRegions[0].id },
      { name: "Amazonas", code: "AM", regionId: insertedRegions[0].id },
      { name: "Roraima", code: "RR", regionId: insertedRegions[0].id },
      // Nordeste
      { name: "Bahia", code: "BA", regionId: insertedRegions[1].id },
      { name: "Ceará", code: "CE", regionId: insertedRegions[1].id },
      { name: "Pernambuco", code: "PE", regionId: insertedRegions[1].id },
      // Centro-Oeste
      { name: "Distrito Federal", code: "DF", regionId: insertedRegions[2].id },
      { name: "Goiás", code: "GO", regionId: insertedRegions[2].id },
      { name: "Mato Grosso", code: "MT", regionId: insertedRegions[2].id },
      // Sudeste
      { name: "São Paulo", code: "SP", regionId: insertedRegions[3].id },
      { name: "Rio de Janeiro", code: "RJ", regionId: insertedRegions[3].id },
      { name: "Minas Gerais", code: "MG", regionId: insertedRegions[3].id },
      // Sul
      { name: "Paraná", code: "PR", regionId: insertedRegions[4].id },
      { name: "Santa Catarina", code: "SC", regionId: insertedRegions[4].id },
      // RS regions
      { name: "Porto Alegre", code: "POA", regionId: insertedRegions[5].id },
      { name: "Caxias do Sul", code: "CXS", regionId: insertedRegions[5].id },
      { name: "Novo Hamburgo", code: "NH", regionId: insertedRegions[6].id },
      { name: "São Leopoldo", code: "SL", regionId: insertedRegions[6].id },
      { name: "Bento Gonçalves", code: "BG", regionId: insertedRegions[7].id },
      { name: "Canoas", code: "CAN", regionId: insertedRegions[8].id },
      { name: "Santana do Livramento", code: "SDL", regionId: insertedRegions[9].id }
    ];

    const insertedSubRegions = await db.insert(subRegions).values(subRegionData).returning();
    console.log(`✓ Seeded ${insertedSubRegions.length} sub-regions`);

    // Seed Solutions
    const solutionData = [
      { name: "Educação", description: "Soluções educacionais da FIERGS" },
      { name: "Saúde", description: "Soluções de saúde e segurança da FIERGS" }
    ];

    const insertedSolutions = await db.insert(solutions).values(solutionData).returning();
    console.log(`✓ Seeded ${insertedSolutions.length} solutions`);

    // Seed Service Lines
    const serviceLineData = [
      // Educação service lines
      { name: "Educação Básica", description: "Educação fundamental e média", solutionId: insertedSolutions[0].id },
      { name: "Educação Profissional", description: "Cursos técnicos e profissionalizantes", solutionId: insertedSolutions[0].id },
      { name: "Educação Superior", description: "Cursos de graduação e pós-graduação", solutionId: insertedSolutions[0].id },
      { name: "Educação Continuada", description: "Programas de capacitação e atualização", solutionId: insertedSolutions[0].id },
      // Saúde service lines
      { name: "Saúde Ocupacional", description: "Medicina e segurança do trabalho", solutionId: insertedSolutions[1].id },
      { name: "Promoção da Saúde", description: "Programas de prevenção e bem-estar", solutionId: insertedSolutions[1].id },
      { name: "Serviços Médicos", description: "Atendimento médico especializado", solutionId: insertedSolutions[1].id },
      { name: "Laboratórios", description: "Análises clínicas e diagnósticos", solutionId: insertedSolutions[1].id }
    ];

    const insertedServiceLines = await db.insert(serviceLines).values(serviceLineData).returning();
    console.log(`✓ Seeded ${insertedServiceLines.length} service lines`);

    // Seed Services
    const serviceData = [
      // Educação Básica services
      { name: "Ensino Fundamental", description: "Ensino fundamental completo", serviceLineId: insertedServiceLines[0].id },
      { name: "Ensino Médio", description: "Ensino médio regular", serviceLineId: insertedServiceLines[0].id },
      // Educação Profissional services
      { name: "Cursos Técnicos", description: "Formação técnica profissionalizante", serviceLineId: insertedServiceLines[1].id },
      { name: "Aprendizagem Industrial", description: "Programas de aprendizagem", serviceLineId: insertedServiceLines[1].id },
      // Educação Superior services
      { name: "Graduação", description: "Cursos de graduação", serviceLineId: insertedServiceLines[2].id },
      { name: "Pós-graduação", description: "Especialização e MBA", serviceLineId: insertedServiceLines[2].id },
      // Educação Continuada services
      { name: "Capacitação Empresarial", description: "Treinamentos corporativos", serviceLineId: insertedServiceLines[3].id },
      { name: "Consultoria Educacional", description: "Assessoria em educação", serviceLineId: insertedServiceLines[3].id },
      // Saúde Ocupacional services
      { name: "Exames Médicos", description: "Exames ocupacionais", serviceLineId: insertedServiceLines[4].id },
      { name: "SESMT", description: "Serviços Especializados em Segurança e Medicina do Trabalho", serviceLineId: insertedServiceLines[4].id },
      // Promoção da Saúde services
      { name: "Programas de Qualidade de Vida", description: "Ações de promoção da saúde", serviceLineId: insertedServiceLines[5].id },
      { name: "Prevenção de Doenças", description: "Campanhas preventivas", serviceLineId: insertedServiceLines[5].id },
      // Serviços Médicos services
      { name: "Clínica Médica", description: "Atendimento clínico geral", serviceLineId: insertedServiceLines[6].id },
      { name: "Especialidades Médicas", description: "Consultas especializadas", serviceLineId: insertedServiceLines[6].id },
      // Laboratórios services
      { name: "Análises Clínicas", description: "Exames laboratoriais", serviceLineId: insertedServiceLines[7].id },
      { name: "Diagnóstico por Imagem", description: "Exames de imagem", serviceLineId: insertedServiceLines[7].id }
    ];

    const insertedServices = await db.insert(services).values(serviceData).returning();
    console.log(`✓ Seeded ${insertedServices.length} services`);

    // Seed Strategic Indicators
    const strategicIndicatorData = [
      { name: "Sustentabilidade Operacional", description: "Indicador de sustentabilidade das operações", unit: "%" },
      { name: "Receita de Serviços", description: "Receita gerada pelos serviços", unit: "R$" },
      { name: "Matrículas em Educação", description: "Número total de matrículas em cursos educacionais", unit: "unidades" },
      { name: "Indústrias Atendidas em Saúde", description: "Número de indústrias atendidas pelos serviços de saúde", unit: "unidades" },
      { name: "Trabalhadores da Indústria Atendidos em Saúde", description: "Número de trabalhadores atendidos", unit: "pessoas" },
      { name: "Matrículas Presenciais com Mais de 4 Horas", description: "Matrículas em cursos presenciais extensos", unit: "unidades" },
      { name: "Custo Hora Aluno", description: "Custo por hora de ensino por aluno", unit: "R$/hora" }
    ];

    const insertedIndicators = await db.insert(strategicIndicators).values(strategicIndicatorData).returning();
    console.log(`✓ Seeded ${insertedIndicators.length} strategic indicators`);

    // Seed Users
    const userData = [
      {
        username: "admin",
        password: hashPassword("admin123"),
        name: "Administrador do Sistema",
        email: "admin@fiergs.org.br",
        role: "admin",
        regionId: insertedRegions[5].id, // Rio Grande do Sul
        subRegionId: insertedSubRegions[14].id, // Porto Alegre
        approved: true,
        active: true
      },
      {
        username: "gestor1",
        password: hashPassword("gestor123"),
        name: "Maria Silva",
        email: "maria.silva@fiergs.org.br",
        role: "gestor",
        regionId: insertedRegions[5].id,
        subRegionId: insertedSubRegions[14].id,
        approved: true,
        active: true
      },
      {
        username: "operacional1",
        password: hashPassword("op123"),
        name: "João Santos",
        email: "joao.santos@fiergs.org.br",
        role: "operacional",
        regionId: insertedRegions[5].id,
        subRegionId: insertedSubRegions[15].id,
        gestorId: 2, // Will be the second user (gestor1)
        approved: true,
        active: true
      }
    ];

    const insertedUsers = await db.insert(users).values(userData).returning();
    console.log(`✓ Seeded ${insertedUsers.length} users`);

    console.log("✅ Database seeding completed successfully!");

  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

// Run the seeding if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase().then(() => {
    console.log("Seeding completed, exiting...");
    process.exit(0);
  }).catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  });
}

export { seedDatabase };