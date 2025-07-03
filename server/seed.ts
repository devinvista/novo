import { db } from "./db";
import { regions, subRegions, serviceLines, strategicIndicators, solutions } from "@shared/schema";

async function seed() {
  console.log("🌱 Starting database seed...");

  try {
    // Seed regions
    console.log("Seeding regions...");
    const regionData = [
      { id: 1, name: "Central", code: "CE" },
      { id: 2, name: "Metropolitana 1", code: "M1" },
      { id: 3, name: "Metropolitana 2", code: "M2" },
      { id: 4, name: "Metropolitana 3", code: "M3" },
      { id: 5, name: "Norte 1", code: "N1" },
      { id: 6, name: "Norte 2", code: "N2" },
      { id: 7, name: "Oeste", code: "OE" },
      { id: 8, name: "Sudeste", code: "SE" },
      { id: 9, name: "Sul 1", code: "S1" },
      { id: 10, name: "Sul 2", code: "S2" }
    ];

    for (const region of regionData) {
      await db.insert(regions).values(region).onConflictDoNothing();
    }

    // Seed sub-regions
    console.log("Seeding sub-regions...");
    const subRegionData = [
      { id: 1, name: "Brasília", code: "BSB", regionId: 1 },
      { id: 2, name: "São Paulo", code: "SAO", regionId: 2 },
      { id: 3, name: "Campinas", code: "CPQ", regionId: 2 },
      { id: 4, name: "Rio de Janeiro", code: "RIO", regionId: 3 },
      { id: 5, name: "Niterói", code: "NIT", regionId: 3 },
      { id: 6, name: "Belo Horizonte", code: "BHZ", regionId: 4 },
      { id: 7, name: "Contagem", code: "CTG", regionId: 4 },
      { id: 8, name: "Uberlândia", code: "UDI", regionId: 4 },
      { id: 9, name: "Belém", code: "BEL", regionId: 5 },
      { id: 10, name: "Manaus", code: "MAO", regionId: 5 },
      { id: 11, name: "Fortaleza", code: "FOR", regionId: 6 },
      { id: 12, name: "Recife", code: "REC", regionId: 6 },
      { id: 13, name: "Salvador", code: "SSA", regionId: 6 },
      { id: 14, name: "Goiânia", code: "GYN", regionId: 7 },
      { id: 15, name: "Campo Grande", code: "CGR", regionId: 7 },
      { id: 16, name: "Vitória", code: "VIX", regionId: 8 },
      { id: 17, name: "Vila Velha", code: "VVL", regionId: 8 },
      { id: 18, name: "Curitiba", code: "CWB", regionId: 9 },
      { id: 19, name: "Londrina", code: "LDB", regionId: 9 },
      { id: 20, name: "Porto Alegre", code: "POA", regionId: 10 },
      { id: 21, name: "Florianópolis", code: "FLN", regionId: 10 }
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