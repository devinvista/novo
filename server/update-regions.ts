import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { regions, subRegions } from "@shared/schema";

const sqlite = new Database('okr.db');
const db = drizzle(sqlite);

async function updateRegionsAndSubRegions() {
  console.log('🔧 Atualizando regiões e sub-regiões...');

  // Clear existing data
  await db.delete(subRegions);
  await db.delete(regions);

  // Insert new regions
  const regionData = [
    { name: 'Central', code: 'CEN' },
    { name: 'Departamento Regional', code: 'DR' },
    { name: 'Encosta da Serra', code: 'ES' },
    { name: 'Metropolitana', code: 'MET' },
    { name: 'Noroeste', code: 'NW' },
    { name: 'Norte', code: 'NO' },
    { name: 'Serra', code: 'SE' },
    { name: 'Sul', code: 'SU' },
    { name: 'Vale do Rio Pardo', code: 'VRP' },
    { name: 'Vale do Sinos', code: 'VS' },
    { name: 'Vale do Taquari', code: 'VT' }
  ];

  const insertedRegions = [];
  for (const region of regionData) {
    const [inserted] = await db.insert(regions).values(region).returning();
    insertedRegions.push(inserted);
  }

  console.log(`✅ ${insertedRegions.length} regiões inseridas`);

  // Create region lookup
  const regionLookup = {};
  insertedRegions.forEach(region => {
    regionLookup[region.name] = region.id;
  });

  // Insert sub-regions with correct mappings
  const subRegionData = [
    { name: 'Central', code: 'CEN-01', regionId: regionLookup['Central'] },
    { name: 'Negócio', code: 'DR-01', regionId: regionLookup['Departamento Regional'] },
    { name: 'Encosta da Serra', code: 'ES-01', regionId: regionLookup['Encosta da Serra'] },
    { name: 'Metropolitana 1', code: 'MET-01', regionId: regionLookup['Metropolitana'] },
    { name: 'Metropolitana 2', code: 'MET-02', regionId: regionLookup['Metropolitana'] },
    { name: 'Metropolitana 3', code: 'MET-03', regionId: regionLookup['Metropolitana'] },
    { name: 'Noroeste 1', code: 'NW-01', regionId: regionLookup['Noroeste'] },
    { name: 'Noroeste 2', code: 'NW-02', regionId: regionLookup['Noroeste'] },
    { name: 'Norte 1', code: 'NO-01', regionId: regionLookup['Norte'] },
    { name: 'Norte 2', code: 'NO-02', regionId: regionLookup['Norte'] },
    { name: 'Serra 1', code: 'SE-01', regionId: regionLookup['Serra'] },
    { name: 'Serra 2', code: 'SE-02', regionId: regionLookup['Serra'] },
    { name: 'Serra 3', code: 'SE-03', regionId: regionLookup['Serra'] },
    { name: 'Sul 1', code: 'SU-01', regionId: regionLookup['Sul'] },
    { name: 'Sul 2', code: 'SU-02', regionId: regionLookup['Sul'] },
    { name: 'Vale do Rio Pardo', code: 'VRP-01', regionId: regionLookup['Vale do Rio Pardo'] },
    { name: 'Vale dos Sinos 1', code: 'VS-01', regionId: regionLookup['Vale do Sinos'] },
    { name: 'Vale dos Sinos 2', code: 'VS-02', regionId: regionLookup['Vale do Sinos'] },
    { name: 'Vale dos Sinos 3', code: 'VS-03', regionId: regionLookup['Vale do Sinos'] },
    { name: 'Vale do Taquari 1', code: 'VT-01', regionId: regionLookup['Vale do Taquari'] },
    { name: 'Vale do Taquari 2', code: 'VT-02', regionId: regionLookup['Vale do Taquari'] }
  ];

  for (const subRegion of subRegionData) {
    await db.insert(subRegions).values(subRegion);
  }

  console.log(`✅ ${subRegionData.length} sub-regiões inseridas`);
  console.log('🎉 Regiões e sub-regiões atualizadas com sucesso!');

  sqlite.close();
}

updateRegionsAndSubRegions().catch(console.error);