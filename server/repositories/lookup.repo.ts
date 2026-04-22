import {
  regions as regionsTable, subRegions as subRegionsTable, serviceLines,
  strategicIndicators, solutions as solutionsTable, services,
  type Region, type SubRegion, type ServiceLine, type StrategicIndicator,
  type Solution, type Service,
} from '@shared/pg-schema';
import { db } from '../pg-db';
import { eq, asc } from 'drizzle-orm';

export class LookupRepo {
  // ---- regions ----
  async getRegions(): Promise<Region[]> {
    return db.select().from(regionsTable).orderBy(asc(regionsTable.id));
  }
  async createRegion(data: { name: string; code: string }): Promise<Region> {
    const rows = await db.insert(regionsTable).values(data).returning();
    return rows[0];
  }
  async updateRegion(id: number, data: { name: string; code: string }): Promise<Region> {
    const rows = await db.update(regionsTable).set(data).where(eq(regionsTable.id, id)).returning();
    return rows[0];
  }
  async deleteRegion(id: number): Promise<void> {
    await db.delete(regionsTable).where(eq(regionsTable.id, id));
  }

  // ---- sub-regions ----
  async getSubRegions(regionId?: number): Promise<SubRegion[]> {
    if (regionId) {
      return db.select().from(subRegionsTable).where(eq(subRegionsTable.regionId, regionId)).orderBy(asc(subRegionsTable.id));
    }
    return db.select().from(subRegionsTable).orderBy(asc(subRegionsTable.id));
  }
  async createSubRegion(data: { name: string; code: string; regionId: number }): Promise<SubRegion> {
    const rows = await db.insert(subRegionsTable).values(data).returning();
    return rows[0];
  }
  async updateSubRegion(id: number, data: { name: string; code: string; regionId: number }): Promise<SubRegion> {
    const rows = await db.update(subRegionsTable).set(data).where(eq(subRegionsTable.id, id)).returning();
    return rows[0];
  }
  async deleteSubRegion(id: number): Promise<void> {
    await db.delete(subRegionsTable).where(eq(subRegionsTable.id, id));
  }

  // ---- solutions ----
  async getSolutions(): Promise<Solution[]> {
    return db.select().from(solutionsTable).orderBy(asc(solutionsTable.name));
  }
  async createSolution(data: { name: string; code: string; description?: string }): Promise<Solution> {
    const rows = await db.insert(solutionsTable).values(data).returning();
    return rows[0];
  }
  async updateSolution(id: number, data: { name: string; code: string; description?: string }): Promise<Solution> {
    const rows = await db.update(solutionsTable).set(data).where(eq(solutionsTable.id, id)).returning();
    return rows[0];
  }
  async deleteSolution(id: number): Promise<void> {
    await db.delete(solutionsTable).where(eq(solutionsTable.id, id));
  }

  // ---- service lines ----
  async getServiceLines(solutionId?: number): Promise<ServiceLine[]> {
    if (solutionId) {
      return db.select().from(serviceLines).where(eq(serviceLines.solutionId, solutionId)).orderBy(asc(serviceLines.name));
    }
    return db.select().from(serviceLines).orderBy(asc(serviceLines.name));
  }
  async createServiceLine(data: { name: string; code: string; description?: string; solutionId: number }): Promise<ServiceLine> {
    const rows = await db.insert(serviceLines).values(data).returning();
    return rows[0];
  }
  async updateServiceLine(id: number, data: { name: string; code: string; description?: string; solutionId: number }): Promise<ServiceLine> {
    const rows = await db.update(serviceLines).set(data).where(eq(serviceLines.id, id)).returning();
    return rows[0];
  }
  async deleteServiceLine(id: number): Promise<void> {
    await db.delete(serviceLines).where(eq(serviceLines.id, id));
  }

  // ---- services ----
  async getServices(serviceLineId?: number): Promise<Service[]> {
    if (serviceLineId) {
      return db.select().from(services).where(eq(services.serviceLineId, serviceLineId)).orderBy(asc(services.name));
    }
    return db.select().from(services).orderBy(asc(services.name));
  }
  async createService(data: { name: string; code: string; description?: string; serviceLineId: number }): Promise<Service> {
    const rows = await db.insert(services).values(data).returning();
    return rows[0];
  }
  async updateService(id: number, data: { name: string; code: string; description?: string; serviceLineId: number }): Promise<Service> {
    const rows = await db.update(services).set(data).where(eq(services.id, id)).returning();
    return rows[0];
  }
  async deleteService(id: number): Promise<void> {
    await db.delete(services).where(eq(services.id, id));
  }

  // ---- strategic indicators ----
  async getStrategicIndicators(): Promise<StrategicIndicator[]> {
    return db.select().from(strategicIndicators).orderBy(asc(strategicIndicators.name));
  }
  async createStrategicIndicator(data: { name: string; code: string; description?: string; unit?: string }): Promise<StrategicIndicator> {
    const rows = await db.insert(strategicIndicators).values(data).returning();
    return rows[0];
  }
  async updateStrategicIndicator(id: number, data: { name: string; code: string; description?: string; unit?: string }): Promise<StrategicIndicator> {
    const rows = await db.update(strategicIndicators).set(data).where(eq(strategicIndicators.id, id)).returning();
    return rows[0];
  }
  async deleteStrategicIndicator(id: number): Promise<void> {
    await db.delete(strategicIndicators).where(eq(strategicIndicators.id, id));
  }
}
