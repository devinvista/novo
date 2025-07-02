import { db } from "./db";
import { solutions, serviceLines, services } from "@shared/schema";
import { eq } from "drizzle-orm";

async function seedSolutions() {
  try {
    console.log("Starting solutions seed...");
    
    // Clear existing data
    await db.delete(services);
    await db.delete(serviceLines);
    await db.delete(solutions);
    
    // Insert solutions
    const [educacao] = await db.insert(solutions)
      .values({ name: "Educação" })
      .returning();
    
    const [saude] = await db.insert(solutions)
      .values({ name: "Saúde" })
      .returning();
    
    console.log("Created solutions:", { educacao, saude });
    
    // Education service lines and services
    const educationData = [
      { 
        line: "Educação Básica", 
        services: ["Educação de Jovens e Adultos", "Educação Infantil", "Ensino Médio"]
      },
      {
        line: "Educação Continuada",
        services: ["Contraturno", "Cursos SESI", "Iniciação às Artes", "Educação para o Mundo do Trabalho", "Gestão e Formação Educacional"]
      },
      {
        line: "Evento",
        services: ["Mostra Sesi de Educação"]
      }
    ];
    
    for (const { line, services: serviceList } of educationData) {
      const [serviceLine] = await db.insert(serviceLines)
        .values({ name: line, solutionId: educacao.id })
        .returning();
      
      for (const serviceName of serviceList) {
        await db.insert(services)
          .values({ name: serviceName, serviceLineId: serviceLine.id });
      }
    }
    
    // Health service lines and services
    const healthData = [
      {
        line: "Atividade Física",
        services: ["Eventos de Promoção da Saúde", "Academias", "Empresa Fitness", "Ginástica Laboral", "Oficinas", "Competições Esportivas"]
      },
      {
        line: "Evento",
        services: ["Conecta Saúde"]
      },
      {
        line: "Locação de Espaços",
        services: ["Locação de Espaços Esportivos"]
      },
      {
        line: "Normas Regulamentadoras",
        services: ["Gestão de Treinamentos em SSI", "Curso de CIPA", "Normas Regulamentadoras", "SIPAT"]
      },
      {
        line: "Nutrição",
        services: ["Consulta com Nutricionista", "Oficinas"]
      },
      {
        line: "Odontologia",
        services: ["Consultas Odontológicas", "Edital - UMO", "Unidades Móveis Odontológicas"]
      },
      {
        line: "Parque SESI",
        services: ["Parque SESI Canela"]
      },
      {
        line: "Promoção da Saúde",
        services: ["Eventos de Promoção da Saúde", "Oficinas", "Palestras de Promoção da Saúde", "Workshop de Promoção da Saúde", 
                  "Assessoria Técnica em Promoção da Saúde", "Consultoria e Assessoria em Saúde no Trabalho", 
                  "Liga Esportiva", "Programa SESI de Doenças Crônicas Não Transmissíveis"]
      },
      {
        line: "Saúde Mental",
        services: ["Assessoria Psicossocial", "Terapia", "Avaliação Psicossocial", "Campanhas em Saúde Mental", 
                  "Desenvolvimento de Pessoas", "Mapeamentos em Saúde Mental", "Palestras de saúde mental", "Workshop de Saúde Mental"]
      },
      {
        line: "Saúde Ocupacional",
        services: ["Consultas Ocupacionais", "Saúde Auditiva", "Exames Complementares", "Gestão da Reabilitação", 
                  "Gestão de Exames", "Gestão do Absenteísmo", "Palestras de Saúde Ocupacional", 
                  "Programa de Controle Médico de Saúde Ocupacional (PCMSO)", "Exame de Raio X", "SESMT"]
      },
      {
        line: "Segurança do Trabalho",
        services: ["Ergonomia", "Consultoria em NR", "Diagnóstico de prevenção de acidentes de trabalho (DPAT)", 
                  "Laudo de Insalubridade", "Laudo Técnico de Condições Ambientais do Trabalho (LTCAT)", 
                  "Palestras de Segurança no Trabalho", "Programa de Condições e Meio Ambiente de Trab. na Ind. da Construção (PCMAT)", 
                  "Programa de Gerenciamento de Riscos (PGR)", "Programa de Proteção Respiratória (PPR)", 
                  "Assessoria Técnica em Segurança do Trabalho", "Assessoria SIPAT", "Avaliação Quantitativa", "Assessoria em Ergonomia"]
      },
      {
        line: "Vacinação",
        services: ["Campanha de Vacinação", "Clínica de Vacina"]
      }
    ];
    
    for (const { line, services: serviceList } of healthData) {
      const [serviceLine] = await db.insert(serviceLines)
        .values({ name: line, solutionId: saude.id })
        .returning();
      
      for (const serviceName of serviceList) {
        await db.insert(services)
          .values({ name: serviceName, serviceLineId: serviceLine.id });
      }
    }
    
    console.log("Solutions seed completed successfully!");
  } catch (error) {
    console.error("Error seeding solutions:", error);
    throw error;
  }
}

// Run the seed
seedSolutions().catch(console.error);