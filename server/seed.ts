import { db } from "./db";
import { regions, subRegions, serviceLines, strategicIndicators, solutions } from "@shared/schema";

async function seed() {
  console.log("🌱 Starting database seed...");

  try {
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

    for (const region of regionData) {
      await db.insert(regions).values(region).onConflictDoNothing();
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

    for (const subRegion of subRegionData) {
      await db.insert(subRegions).values(subRegion).onConflictDoNothing();
    }

    // Get solutions first
    console.log("Getting solutions...");
    const solutionsList = await db.select().from(solutions);
    const saudeId = solutionsList.find(s => s.name === "Saúde")?.id;
    const educacaoId = solutionsList.find(s => s.name === "Educação")?.id;

    // Seed service lines
    console.log("Seeding service lines...");
    const serviceLineData = [
      { id: 1, name: "Atenção à Saúde", solutionId: saudeId! },
      { id: 2, name: "Segurança e Saúde no Trabalho", solutionId: saudeId! },
      { id: 3, name: "Educação Básica", solutionId: educacaoId! },
      { id: 4, name: "Educação Superior", solutionId: educacaoId! },
      { id: 5, name: "Educação Profissional", solutionId: educacaoId! }
    ];

    for (const serviceLine of serviceLineData) {
      await db.insert(serviceLines).values(serviceLine).onConflictDoNothing();
    }

    // Seed strategic indicators
    console.log("Seeding strategic indicators...");
    const indicatorData = [
      { id: 1, name: "Receita", description: "Receita total em reais", unit: "R$", active: true },
      { id: 2, name: "Matrículas", description: "Número total de matrículas", unit: "unidades", active: true },
      { id: 3, name: "Sustentabilidade", description: "Índice de sustentabilidade", unit: "%", active: true },
      { id: 4, name: "Saúde Indústria", description: "Atendimentos de saúde para indústria", unit: "unidades", active: true },
      { id: 5, name: "Satisfação do Cliente", description: "Índice de satisfação dos clientes", unit: "%", active: true },
      { id: 6, name: "Eficiência Operacional", description: "Índice de eficiência operacional", unit: "%", active: true },
      { id: 7, name: "Inovação", description: "Número de projetos de inovação", unit: "projetos", active: true }
    ];

    for (const indicator of indicatorData) {
      await db.insert(strategicIndicators).values(indicator).onConflictDoNothing();
    }

    console.log("✅ Database seeded successfully!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
  
  process.exit(0);
}

seed();