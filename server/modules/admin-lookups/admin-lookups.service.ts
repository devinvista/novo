/**
 * Serviço de Admin Lookups — centraliza as regras de integridade (guards de exclusão)
 * e os CRUDs de entidades auxiliares administradas apenas por admin.
 */
import { storage } from "../../storage";
import { BadRequestError } from "../../errors/app-error";

function parseIndicatorIds(kr: any): number[] {
  const raw = kr.strategicIndicatorIds;
  if (Array.isArray(raw)) return raw;
  try {
    return JSON.parse(raw || "[]");
  } catch {
    return [];
  }
}

// ────────────── Strategic Indicators ──────────────
export async function createStrategicIndicator(data: any) {
  return storage.createStrategicIndicator(data);
}

export async function updateStrategicIndicator(id: number, data: any) {
  return storage.updateStrategicIndicator(id, data);
}

export async function deleteStrategicIndicator(id: number) {
  const keyResults = await storage.getKeyResults({});
  const isUsed = keyResults.some((kr: any) => parseIndicatorIds(kr).includes(id));
  if (isUsed) {
    throw new BadRequestError(
      "Não é possível excluir indicador que está sendo usado em resultados-chave"
    );
  }
  await storage.deleteStrategicIndicator(id);
}

// ────────────── Regions ──────────────
export async function createRegion(data: any) {
  return storage.createRegion(data);
}

export async function updateRegion(id: number, data: any) {
  return storage.updateRegion(id, data);
}

export async function deleteRegion(id: number) {
  const [objectives, subRegions] = await Promise.all([
    storage.getObjectives({}),
    storage.getSubRegions(),
  ]);
  if (
    objectives.some((o: any) => o.regionId === id) ||
    subRegions.some((s: any) => s.regionId === id)
  ) {
    throw new BadRequestError(
      "Não é possível excluir região que possui objetivos ou sub-regiões associadas"
    );
  }
  await storage.deleteRegion(id);
}

// ────────────── Sub-regions ──────────────
export async function createSubRegion(data: any) {
  return storage.createSubRegion(data);
}

export async function updateSubRegion(id: number, data: any) {
  return storage.updateSubRegion(id, data);
}

export async function deleteSubRegion(id: number) {
  const objectives = await storage.getObjectives({});
  if (objectives.some((o: any) => o.subRegionId === id)) {
    throw new BadRequestError(
      "Não é possível excluir sub-região que possui objetivos associados"
    );
  }
  await storage.deleteSubRegion(id);
}

// ────────────── Solutions ──────────────
export async function createSolution(data: any) {
  return storage.createSolution(data);
}

export async function updateSolution(id: number, data: any) {
  return storage.updateSolution(id, data);
}

export async function deleteSolution(id: number) {
  const serviceLines = await storage.getServiceLines();
  if (serviceLines.some((sl: any) => sl.solutionId === id)) {
    throw new BadRequestError(
      "Não é possível excluir solução que possui linhas de serviço associadas"
    );
  }
  await storage.deleteSolution(id);
}

// ────────────── Service Lines ──────────────
export async function createServiceLine(data: any) {
  return storage.createServiceLine(data);
}

export async function updateServiceLine(id: number, data: any) {
  return storage.updateServiceLine(id, data);
}

export async function deleteServiceLine(id: number) {
  const [services, objectives, keyResults] = await Promise.all([
    storage.getServices(),
    storage.getObjectives({}),
    storage.getKeyResults({}),
  ]);
  if (
    services.some((s: any) => s.serviceLineId === id) ||
    objectives.some((o: any) => o.serviceLineId === id) ||
    keyResults.some((kr: any) => kr.serviceLineId === id)
  ) {
    throw new BadRequestError(
      "Não é possível excluir linha de serviço que está sendo utilizada"
    );
  }
  await storage.deleteServiceLine(id);
}

// ────────────── Services ──────────────
export async function createService(data: any) {
  return storage.createService(data);
}

export async function updateService(id: number, data: any) {
  return storage.updateService(id, data);
}

export async function deleteService(id: number) {
  const keyResults = await storage.getKeyResults({});
  if (keyResults.some((kr: any) => kr.serviceId === id)) {
    throw new BadRequestError(
      "Não é possível excluir serviço que está sendo utilizado em resultados-chave"
    );
  }
  await storage.deleteService(id);
}
