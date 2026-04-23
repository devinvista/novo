import type {
  InsertObjective, InsertKeyResult, InsertAction, InsertActionComment,
} from '@shared/schema';

import {
  UserRepo, LookupRepo, ObjectiveRepo, KeyResultRepo,
  ActionRepo, CheckpointRepo, DashboardRepo, ActivityRepo, KrCheckInRepo,
  sessionStore,
} from '../repositories';

import type { IStorage } from './interface';

/**
 * PgStorage acts as a thin facade composing per-aggregate repositories.
 * Domain logic lives in `server/repositories/*`. New code is encouraged to
 * import the specific repo it needs instead of going through this facade.
 */
export class PgStorage implements IStorage {
  sessionStore: any = sessionStore;

  readonly users = new UserRepo();
  readonly lookups = new LookupRepo();
  readonly objectives = new ObjectiveRepo(this.users);
  readonly keyResults = new KeyResultRepo(this.users, this.objectives);
  readonly actions = new ActionRepo(this.users, this.objectives);
  readonly checkpoints = new CheckpointRepo(this.users, this.objectives, this.keyResults);
  readonly dashboard = new DashboardRepo(this.objectives, this.keyResults, this.actions);
  readonly activities = new ActivityRepo();
  readonly checkIns = new KrCheckInRepo();

  // ---------- Users ----------
  getUser(id: number) { return this.users.getUser(id); }
  getUserByUsername(username: string) { return this.users.getUserByUsername(username); }
  getUsers() { return this.users.getUsers(); }
  getManagers() { return this.users.getManagers(); }
  getPendingUsers() { return this.users.getPendingUsers(); }
  createUser(user: any) { return this.users.createUser(user); }
  updateUser(id: number, user: any) { return this.users.updateUser(id, user); }
  deleteUser(id: number) { return this.users.deleteUser(id); }
  approveUser(id: number, approvedBy: number, subRegionId?: number) {
    return this.users.approveUser(id, approvedBy, subRegionId);
  }
  approveUserWithPermissions(id: number, approvedBy: number, permissions: any) {
    return this.users.approveUserWithPermissions(id, approvedBy, permissions);
  }
  getUserById(id: number) { return this.users.getUser(id); }

  // ---------- Lookups ----------
  getRegions() { return this.lookups.getRegions(); }
  getSubRegions(regionId?: number) { return this.lookups.getSubRegions(regionId); }
  getSolutions() { return this.lookups.getSolutions(); }
  getServiceLines(solutionId?: number) { return this.lookups.getServiceLines(solutionId); }
  getServices(serviceLineId?: number) { return this.lookups.getServices(serviceLineId); }
  getStrategicIndicators() { return this.lookups.getStrategicIndicators(); }

  createStrategicIndicator(data: any) { return this.lookups.createStrategicIndicator(data); }
  updateStrategicIndicator(id: number, data: any) { return this.lookups.updateStrategicIndicator(id, data); }
  deleteStrategicIndicator(id: number) { return this.lookups.deleteStrategicIndicator(id); }

  createRegion(data: any) { return this.lookups.createRegion(data); }
  updateRegion(id: number, data: any) { return this.lookups.updateRegion(id, data); }
  deleteRegion(id: number) { return this.lookups.deleteRegion(id); }

  createSubRegion(data: any) { return this.lookups.createSubRegion(data); }
  updateSubRegion(id: number, data: any) { return this.lookups.updateSubRegion(id, data); }
  deleteSubRegion(id: number) { return this.lookups.deleteSubRegion(id); }

  createSolution(data: any) { return this.lookups.createSolution(data); }
  updateSolution(id: number, data: any) { return this.lookups.updateSolution(id, data); }
  deleteSolution(id: number) { return this.lookups.deleteSolution(id); }

  createServiceLine(data: any) { return this.lookups.createServiceLine(data); }
  updateServiceLine(id: number, data: any) { return this.lookups.updateServiceLine(id, data); }
  deleteServiceLine(id: number) { return this.lookups.deleteServiceLine(id); }

  createService(data: any) { return this.lookups.createService(data); }
  updateService(id: number, data: any) { return this.lookups.updateService(id, data); }
  deleteService(id: number) { return this.lookups.deleteService(id); }

  // ---------- Dashboard / Quarters ----------
  getAvailableQuarters() { return this.dashboard.getAvailableQuarters(); }
  getQuarterlyData(quarter?: string, currentUserId?: number, filters?: any) {
    return this.dashboard.getQuarterlyData(quarter, currentUserId, filters);
  }
  getQuarterlyStats() { return this.dashboard.getQuarterlyStats(); }
  getDashboardKPIs(currentUserId?: number, filters?: any) {
    return this.dashboard.getDashboardKPIs(currentUserId, filters);
  }

  // ---------- Objectives ----------
  getObjectives(filters?: any) { return this.objectives.getObjectives(filters); }
  getObjective(id: number, currentUserId?: number) { return this.objectives.getObjective(id, currentUserId); }
  createObjective(objective: InsertObjective) { return this.objectives.createObjective(objective); }
  updateObjective(id: number, objective: Partial<InsertObjective>) {
    return this.objectives.updateObjective(id, objective);
  }
  /**
   * Soft-delete em cascata: arquiva o objetivo e todos os seus KRs/ações.
   * Mantém os dados e permite restauração via /api/trash.
   */
  async deleteObjective(id: number): Promise<void> {
    const krIds = await this.objectives.getKeyResultIdsForObjective(id);
    for (const krId of krIds) {
      await this.keyResults.softDeleteKeyResult(krId);
    }
    await this.objectives.softDeleteObjective(id);
  }

  // ---------- Key Results ----------
  getKeyResults(filters?: any) { return this.keyResults.getKeyResults(filters); }
  getKeyResult(id: number, currentUserId?: number) { return this.keyResults.getKeyResult(id, currentUserId); }
  createKeyResult(keyResult: InsertKeyResult) { return this.keyResults.createKeyResult(keyResult); }
  updateKeyResult(id: number, keyResult: Partial<InsertKeyResult>) {
    return this.keyResults.updateKeyResult(id, keyResult);
  }
  deleteKeyResult(id: number) { return this.keyResults.deleteKeyResult(id); }

  // ---------- Actions ----------
  getActions(filters?: any) { return this.actions.getActions(filters); }
  getAction(id: number, currentUserId?: number) { return this.actions.getAction(id, currentUserId); }
  createAction(action: InsertAction) { return this.actions.createAction(action); }
  updateAction(id: number, action: Partial<InsertAction>) { return this.actions.updateAction(id, action); }
  deleteAction(id: number) { return this.actions.deleteAction(id); }

  getActionComments(actionId: number) { return this.actions.getActionComments(actionId); }
  createActionComment(comment: InsertActionComment) { return this.actions.createActionComment(comment); }

  // ---------- Checkpoints ----------
  getCheckpoints(keyResultId?: number, currentUserId?: number) {
    return this.checkpoints.getCheckpoints(keyResultId, currentUserId);
  }
  getCheckpoint(id: number, currentUserId?: number) { return this.checkpoints.getCheckpoint(id, currentUserId); }
  updateCheckpoint(id: number, data: any) { return this.checkpoints.updateCheckpoint(id, data); }
  deleteCheckpoint(id: number) { return this.checkpoints.deleteCheckpoint(id); }
  generateCheckpoints(keyResultId: number) { return this.checkpoints.generateCheckpoints(keyResultId); }
}

export const storage = new PgStorage();
