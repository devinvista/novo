import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { solutions, serviceLines, services } from "@shared/schema";
import { eq } from 'drizzle-orm';

const sqlite = new Database('okr.db');
const db = drizzle(sqlite);

async function verifyServices() {
  console.log('🔍 Verificando estrutura de serviços...\n');

  const allSolutions = await db.select().from(solutions).orderBy(solutions.name);
  const allServiceLines = await db.select().from(serviceLines).orderBy(serviceLines.name);
  const allServices = await db.select().from(services).orderBy(services.name);

  console.log(`✅ Total de soluções: ${allSolutions.length}`);
  console.log(`✅ Total de linhas de serviço: ${allServiceLines.length}`);
  console.log(`✅ Total de serviços: ${allServices.length}\n`);

  console.log('📋 Hierarquia completa:');
  for (const solution of allSolutions) {
    console.log(`\n🏢 ${solution.name}:`);
    const solutionServiceLines = allServiceLines.filter(sl => sl.solutionId === solution.id);
    
    for (const serviceLine of solutionServiceLines) {
      console.log(`  📂 ${serviceLine.name}:`);
      const lineServices = allServices.filter(s => s.serviceLineId === serviceLine.id);
      
      for (const service of lineServices) {
        console.log(`    └─ ${service.name}`);
      }
    }
  }

  sqlite.close();
}

verifyServices().catch(console.error);