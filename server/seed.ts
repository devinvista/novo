import { db } from "./db";
import { regions, subRegions, serviceLines, strategicIndicators, solutions, services } from "@shared/schema";

async function seed() {
  console.log("🌱 Starting database seed...");

  try {
    // Seed solutions first
    console.log("Seeding solutions...");
    const solutionData = [
      { id: 1, name: "Educação", description: "Soluções em educação" },
      { id: 2, name: "Saúde", description: "Soluções em saúde" }
    ];

    try {
      await db.insert(solutions).values(solutionData);
    } catch (error) {
      console.log('Solutions already exist, skipping...');
    }

    // Seed regions
    console.log("Seeding regions...");
    const regionData = [
      { id: 1, name: "Central", code: "CEN" },
      { id: 2, name: "Departamento Regional", code: "DR" },
      { id: 3, name: "Encosta da Serra", code: "ES" },
      { id: 4, name: "Metropolitana", code: "MET" },
      { id: 5, name: "Noroeste", code: "NO" },
      { id: 6, name: "Norte", code: "N" },
      { id: 7, name: "Serra", code: "S" },
      { id: 8, name: "Sul", code: "SU" },
      { id: 9, name: "Vale do Rio Pardo", code: "VRP" },
      { id: 10, name: "Vale do Sinos", code: "VS" },
      { id: 11, name: "Vale do Taquari", code: "VT" }
    ];

    try {
      await db.insert(regions).values(regionData);
    } catch (error) {
      console.log('Regions already exist, skipping...');
    }

    // Seed sub-regions
    console.log("Seeding sub-regions...");
    const subRegionData = [
      { id: 1, name: "Central", code: "CEN", regionId: 1 },
      { id: 2, name: "Negócio", code: "NEG", regionId: 2 },
      { id: 3, name: "Encosta da Serra", code: "ES", regionId: 3 },
      { id: 4, name: "Metropolitana 1", code: "MET1", regionId: 4 },
      { id: 5, name: "Metropolitana 2", code: "MET2", regionId: 4 },
      { id: 6, name: "Metropolitana 3", code: "MET3", regionId: 4 },
      { id: 7, name: "Noroeste 2", code: "NO2", regionId: 5 },
      { id: 8, name: "Noroeste 1", code: "NO1", regionId: 5 },
      { id: 9, name: "Norte 2", code: "N2", regionId: 6 },
      { id: 10, name: "Norte 1", code: "N1", regionId: 6 },
      { id: 11, name: "Serra 3", code: "S3", regionId: 7 },
      { id: 12, name: "Serra 1", code: "S1", regionId: 7 },
      { id: 13, name: "Serra 2", code: "S2", regionId: 7 },
      { id: 14, name: "Sul 1", code: "SU1", regionId: 8 },
      { id: 15, name: "Sul 2", code: "SU2", regionId: 8 },
      { id: 16, name: "Vale do Rio Pardo", code: "VRP", regionId: 9 },
      { id: 17, name: "Vale dos Sinos 1", code: "VS1", regionId: 10 },
      { id: 18, name: "Vale dos Sinos 2", code: "VS2", regionId: 10 },
      { id: 19, name: "Vale dos Sinos 3", code: "VS3", regionId: 10 },
      { id: 20, name: "Vale do Taquari 2", code: "VT2", regionId: 11 },
      { id: 21, name: "Vale do Taquari 1", code: "VT1", regionId: 11 }
    ];

    try {
      await db.insert(subRegions).values(subRegionData);
    } catch (error) {
      console.log('Sub-regions already exist, skipping...');
    }

    // Seed service lines with known solution IDs
    console.log("Seeding service lines...");
    const serviceLineData = [
      { id: 1, name: "Atenção à Saúde", description: "Serviços de atenção à saúde", solutionId: 2 },
      { id: 2, name: "Segurança e Saúde no Trabalho", description: "Serviços de segurança e saúde no trabalho", solutionId: 2 },
      { id: 3, name: "Educação Básica", description: "Serviços de educação básica", solutionId: 1 },
      { id: 4, name: "Educação Superior", description: "Serviços de educação superior", solutionId: 1 },
      { id: 5, name: "Educação Profissional", description: "Serviços de educação profissional", solutionId: 1 }
    ];

    try {
      await db.insert(serviceLines).values(serviceLineData);
    } catch (error) {
      console.log('Service lines already exist, skipping...');
    }

    // Seed services
    console.log("Seeding services...");
    const servicesData = [
      { id: 1, name: "Clínicas Médicas", description: "Serviços de clínicas médicas", serviceLineId: 1 },
      { id: 2, name: "Odontologia", description: "Serviços odontológicos", serviceLineId: 1 },
      { id: 3, name: "SESMT", description: "Serviços Especializados em Engenharia de Segurança e em Medicina do Trabalho", serviceLineId: 2 },
      { id: 4, name: "Ensino Fundamental", description: "Ensino fundamental", serviceLineId: 3 },
      { id: 5, name: "Ensino Médio", description: "Ensino médio", serviceLineId: 3 },
      { id: 6, name: "Graduação", description: "Cursos de graduação", serviceLineId: 4 },
      { id: 7, name: "Pós-graduação", description: "Cursos de pós-graduação", serviceLineId: 4 },
      { id: 8, name: "Cursos Técnicos", description: "Cursos técnicos profissionais", serviceLineId: 5 },
      { id: 9, name: "Qualificação Profissional", description: "Cursos de qualificação profissional", serviceLineId: 5 }
    ];

    try {
      await db.insert(services).values(servicesData);
    } catch (error) {
      console.log('Services already exist, skipping...');
    }

    // Seed strategic indicators
    console.log("Seeding strategic indicators...");
    const indicatorData = [
      { id: 1, name: "Sustentabilidade Operacional", description: "Indicador de sustentabilidade das operações organizacionais", unit: "%" },
      { id: 2, name: "Receita de Serviços", description: "Receita gerada através da prestação de serviços", unit: "R$" },
      { id: 3, name: "Matrículas em Educação", description: "Número de matrículas realizadas em programas educacionais", unit: "unidades" },
      { id: 4, name: "Indústrias Atendidas em Saúde", description: "Quantidade de indústrias atendidas pelos serviços de saúde", unit: "unidades" },
      { id: 5, name: "Trabalhadores da Indústria Atendidos em Saúde", description: "Número de trabalhadores industriais atendidos pelos serviços de saúde", unit: "pessoas" },
      { id: 6, name: "Matrículas Presenciais com Mais de 4 Horas", description: "Matrículas em cursos presenciais com carga horária superior a 4 horas", unit: "unidades" },
      { id: 7, name: "Custo Hora Aluno", description: "Custo por hora de cada aluno nos programas educacionais", unit: "R$/hora" }
    ];

    try {
      await db.insert(strategicIndicators).values(indicatorData);
    } catch (error) {
      console.log('Strategic indicators already exist, skipping...');
    }

    console.log("✅ Database seeded successfully!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
  
  process.exit(0);
}

seed();