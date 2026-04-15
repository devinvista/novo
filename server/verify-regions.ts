import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { regions, subRegions } from "@shared/schema";
import { eq } from 'drizzle-orm';

const sqlite = new Database('okr.db');
const db = drizzle(sqlite);

async function verifyRegions() {
  console.log('🔍 Verificando estrutura de regiões...\n');

  const allRegions = await db.select().from(regions).orderBy(regions.name);
  const allSubRegions = await db.select().from(subRegions).orderBy(subRegions.name);

  console.log(`✅ Total de regiões: ${allRegions.length}`);
  console.log(`✅ Total de sub-regiões: ${allSubRegions.length}\n`);

  console.log('📋 Mapeamento Região → Sub-Região:');
  for (const region of allRegions) {
    const regionSubRegions = allSubRegions.filter(sr => sr.regionId === region.id);
    console.log(`\n🏢 ${region.name} (${region.code}):`);
    for (const subRegion of regionSubRegions) {
      console.log(`   └─ ${subRegion.name} (${subRegion.code})`);
    }
  }

  sqlite.close();
}

verifyRegions().catch(console.error);