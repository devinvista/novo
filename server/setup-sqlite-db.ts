import { db } from "./db";
import { 
  users, regions, subRegions, solutions, serviceLines, services, 
  strategicIndicators, objectives, keyResults, actions, checkpoints 
} from "@shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function setupDatabase() {
  console.log("🔧 Configurando banco de dados SQLite...");

  try {
    // Limpar dados existentes
    await db.delete(checkpoints);
    await db.delete(actions);
    await db.delete(keyResults);
    await db.delete(objectives);
    await db.delete(users);
    await db.delete(services);
    await db.delete(serviceLines);
    await db.delete(solutions);
    await db.delete(strategicIndicators);
    await db.delete(subRegions);
    await db.delete(regions);
    console.log("✅ Dados existentes removidos");

    // Inserir regiões
    const regionsData = [
      { id: 1, name: "Região Metropolitana" },
      { id: 2, name: "Serra" },
      { id: 3, name: "Sul" },
      { id: 4, name: "Norte" },
      { id: 5, name: "Nordeste" },
      { id: 6, name: "Noroeste" },
      { id: 7, name: "Centro-Oeste" },
      { id: 8, name: "Sudoeste" },
      { id: 9, name: "Centro" },
      { id: 10, name: "Fronteira Oeste" },
      { id: 11, name: "Litoral Norte" }
    ];
    await db.insert(regions).values(regionsData);
    console.log("✅ Regiões inseridas");

    // Inserir sub-regiões
    const subRegionsData = [
      { id: 1, regionId: 1, name: "Grande Porto Alegre" },
      { id: 2, regionId: 1, name: "Pareci Novo" },
      { id: 3, regionId: 2, name: "Caxias do Sul" },
      { id: 4, regionId: 2, name: "Gramado-Canela" },
      { id: 5, regionId: 3, name: "Pelotas" },
      { id: 6, regionId: 3, name: "Camaquã" },
      { id: 7, regionId: 4, name: "Passo Fundo" },
      { id: 8, regionId: 4, name: "Erechim" },
      { id: 9, regionId: 5, name: "Bento Gonçalves" },
      { id: 10, regionId: 5, name: "Lajeado-Estrela" },
      { id: 11, regionId: 6, name: "Santa Rosa" },
      { id: 12, regionId: 6, name: "Ijuí" },
      { id: 13, regionId: 7, name: "Santa Maria" },
      { id: 14, regionId: 7, name: "Santiago" },
      { id: 15, regionId: 8, name: "Bagé" },
      { id: 16, regionId: 8, name: "Santana do Livramento" },
      { id: 17, regionId: 9, name: "Cachoeira do Sul" },
      { id: 18, regionId: 10, name: "Alegrete" },
      { id: 19, regionId: 10, name: "Uruguaiana" },
      { id: 20, regionId: 11, name: "Osório" },
      { id: 21, regionId: 11, name: "Torres" }
    ];
    await db.insert(subRegions).values(subRegionsData);
    console.log("✅ Sub-regiões inseridas");

    // Inserir soluções
    const solutionsData = [
      { id: 1, name: "Educação", description: "Soluções educacionais e capacitação profissional" },
      { id: 2, name: "Saúde", description: "Serviços de saúde e segurança do trabalho" }
    ];
    await db.insert(solutions).values(solutionsData);
    console.log("✅ Soluções inseridas");

    // Inserir linhas de serviço
    const serviceLinesData = [
      { id: 1, solutionId: 1, name: "Educação Básica", description: "Ensino fundamental e médio" },
      { id: 2, solutionId: 1, name: "Educação Profissional", description: "Cursos técnicos e profissionalizantes" },
      { id: 3, solutionId: 1, name: "Educação Superior", description: "Graduação e pós-graduação" },
      { id: 4, solutionId: 1, name: "Educação Continuada", description: "Capacitação e atualização profissional" },
      { id: 5, solutionId: 2, name: "Saúde Ocupacional", description: "Medicina e segurança do trabalho" },
      { id: 6, solutionId: 2, name: "Promoção da Saúde", description: "Programas de bem-estar e qualidade de vida" },
      { id: 7, solutionId: 2, name: "Reabilitação", description: "Fisioterapia e reabilitação profissional" }
    ];
    await db.insert(serviceLines).values(serviceLinesData);
    console.log("✅ Linhas de serviço inseridas");

    // Inserir serviços específicos
    const servicesData = [
      { id: 1, serviceLineId: 1, name: "Ensino Fundamental", description: "Educação básica - 1º ao 9º ano" },
      { id: 2, serviceLineId: 1, name: "Ensino Médio", description: "Educação básica - 1º ao 3º ano" },
      { id: 3, serviceLineId: 2, name: "Cursos Técnicos", description: "Formação técnica profissionalizante" },
      { id: 4, serviceLineId: 2, name: "Aprendizagem Industrial", description: "Programas de aprendizagem" },
      { id: 5, serviceLineId: 3, name: "Graduação Tecnológica", description: "Cursos superiores de tecnologia" },
      { id: 6, serviceLineId: 3, name: "Pós-Graduação", description: "Especialização e MBA" },
      { id: 7, serviceLineId: 4, name: "Capacitação Corporativa", description: "Treinamentos empresariais" },
      { id: 8, serviceLineId: 5, name: "Exames Ocupacionais", description: "Medicina do trabalho" },
      { id: 9, serviceLineId: 6, name: "Programas de Bem-estar", description: "Qualidade de vida no trabalho" },
      { id: 10, serviceLineId: 7, name: "Fisioterapia", description: "Reabilitação física" }
    ];
    await db.insert(services).values(servicesData);
    console.log("✅ Serviços inseridos");

    // Inserir indicadores estratégicos
    const strategicIndicatorsData = [
      { id: 1, name: "Sustentabilidade Operacional", description: "Indicador de sustentabilidade das operações" },
      { id: 2, name: "Receita de Serviços", description: "Receita gerada pelos serviços prestados" },
      { id: 3, name: "Matrículas em Educação", description: "Número de alunos matriculados" },
      { id: 4, name: "Indústrias Atendidas em Saúde", description: "Empresas atendidas nos serviços de saúde" },
      { id: 5, name: "Trabalhadores da Indústria Atendidos em Saúde", description: "Trabalhadores atendidos" },
      { id: 6, name: "Matrículas Presenciais com Mais de 4 Horas", description: "Matrículas em cursos presenciais longos" },
      { id: 7, name: "Custo Hora Aluno", description: "Custo por hora de ensino por aluno" }
    ];
    await db.insert(strategicIndicators).values(strategicIndicatorsData);
    console.log("✅ Indicadores estratégicos inseridos");

    // Criar usuários administradores
    const admin1Password = await hashPassword("admin123");
    const admin2Password = await hashPassword("admin456");

    const usersData = [
      {
        username: "admin",
        name: "Administrador Principal",
        email: "admin@fiergs.org.br",
        password: admin1Password,
        role: "admin" as const,
      },
      {
        username: "gestor",
        name: "Gestor Geral", 
        email: "gestor@fiergs.org.br",
        password: admin2Password,
        role: "admin" as const,
      }
    ];

    const createdUsers = await db.insert(users).values(usersData).returning();
    console.log("✅ Usuários administradores criados:");
    createdUsers.forEach(user => {
      console.log(`  - ${user.name} (${user.username}) - ID: ${user.id}`);
    });

    console.log("\n📋 Credenciais de acesso:");
    console.log("Usuário 1:");
    console.log(`  Username: admin`);
    console.log(`  Password: admin123`);
    console.log("Usuário 2:");
    console.log(`  Username: gestor`);
    console.log(`  Password: admin456`);

    console.log("\n🎉 Banco de dados configurado com sucesso!");

  } catch (error) {
    console.error("❌ Erro ao configurar banco de dados:", error);
  }
}

setupDatabase();