import { db } from "./db";
import { regions, subRegions } from "@shared/schema";
import { eq } from "drizzle-orm";

async function seedRegions() {
  console.log("🌱 Starting regions and sub-regions update...");

  try {
    // Update regions
    console.log("Updating regions...");
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
      await db.update(regions)
        .set({ name: region.name, code: region.code })
        .where(eq(regions.id, region.id));
    }
    
    // Insert new region 11 if it doesn't exist
    const [existingRegion11] = await db.select().from(regions).where(eq(regions.id, 11));
    if (!existingRegion11) {
      await db.insert(regions).values({ id: 11, name: "Vale do Taquari", code: "VT" });
    }

    // Update sub-regions  
    console.log("Updating sub-regions...");
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

    // Update or insert sub-regions
    for (const subRegion of subRegionData) {
      const [existing] = await db.select().from(subRegions).where(eq(subRegions.id, subRegion.id));
      if (existing) {
        await db.update(subRegions)
          .set({ name: subRegion.name, code: subRegion.code, regionId: subRegion.regionId })
          .where(eq(subRegions.id, subRegion.id));
      } else {
        await db.insert(subRegions).values(subRegion);
      }
    }

    console.log("✅ Regions and sub-regions seeded successfully!");
  } catch (error) {
    console.error("❌ Error seeding regions:", error);
    process.exit(1);
  }
  
  process.exit(0);
}

seedRegions();