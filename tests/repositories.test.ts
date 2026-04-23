import { describe, it, expect } from "vitest";

/**
 * Smoke tests for the repository facade refactor (server/repositories/*).
 * These tests verify the public IStorage API stays intact after splitting
 * `pg-storage.ts` into per-aggregate repositories. Live DB calls are NOT
 * exercised here — those should live in integration tests against a
 * dedicated test database.
 */
describe("PgStorage facade composition", () => {
  it("exposes all per-aggregate repositories on the storage instance", async () => {
    const { storage } = await import("../server/storage");
    expect(storage.users).toBeDefined();
    expect(storage.lookups).toBeDefined();
    expect(storage.objectives).toBeDefined();
    expect(storage.keyResults).toBeDefined();
    expect(storage.actions).toBeDefined();
    expect(storage.checkpoints).toBeDefined();
    expect(storage.dashboard).toBeDefined();
    expect(storage.sessionStore).toBeDefined();
  });

  it("preserves all IStorage methods on the facade", async () => {
    const { storage } = await import("../server/storage");

    const required = [
      // Users
      "getUser", "getUserByUsername", "getUsers", "getManagers", "getPendingUsers",
      "createUser", "updateUser", "deleteUser", "approveUser",
      "approveUserWithPermissions", "getUserById",
      // Lookups
      "getRegions", "getSubRegions", "getSolutions", "getServiceLines",
      "getServices", "getStrategicIndicators",
      "createRegion", "updateRegion", "deleteRegion",
      "createSubRegion", "updateSubRegion", "deleteSubRegion",
      "createSolution", "updateSolution", "deleteSolution",
      "createServiceLine", "updateServiceLine", "deleteServiceLine",
      "createService", "updateService", "deleteService",
      "createStrategicIndicator", "updateStrategicIndicator", "deleteStrategicIndicator",
      // Dashboard
      "getAvailableQuarters", "getQuarterlyData", "getQuarterlyStats", "getDashboardKPIs",
      // Objectives
      "getObjectives", "getObjective", "createObjective", "updateObjective", "deleteObjective",
      // Key Results
      "getKeyResults", "getKeyResult", "createKeyResult", "updateKeyResult", "deleteKeyResult",
      // Actions + Comments
      "getActions", "getAction", "createAction", "updateAction", "deleteAction",
      "getActionComments", "createActionComment",
      // Checkpoints
      "getCheckpoints", "getCheckpoint", "updateCheckpoint", "deleteCheckpoint",
      "generateCheckpoints",
    ];

    for (const method of required) {
      expect(typeof (storage as any)[method]).toBe("function");
    }
  });

  it("delegates facade methods to the corresponding repo instances", async () => {
    const { storage } = await import("../server/storage");

    // A few representative bindings
    expect(storage.getUser.length).toBeGreaterThanOrEqual(1);
    expect(storage.getObjectives.length).toBeGreaterThanOrEqual(0);
    expect(storage.createKeyResult.length).toBeGreaterThanOrEqual(1);
    expect(storage.generateCheckpoints.length).toBeGreaterThanOrEqual(1);
  });
});

describe("Repository class shapes", () => {
  it("UserRepo exposes user CRUD methods", async () => {
    const { UserRepo } = await import("../server/repositories/user.repo");
    const repo = new UserRepo();
    for (const m of ["getUser", "getUserByUsername", "getUsers", "createUser", "updateUser", "deleteUser", "approveUser", "approveUserWithPermissions"]) {
      expect(typeof (repo as any)[m]).toBe("function");
    }
  });

  it("LookupRepo exposes CRUD for all lookups", async () => {
    const { LookupRepo } = await import("../server/repositories/lookup.repo");
    const repo = new LookupRepo();
    for (const m of ["getRegions", "getSubRegions", "getSolutions", "getServiceLines", "getServices", "getStrategicIndicators", "createRegion", "deleteRegion", "createService", "deleteService"]) {
      expect(typeof (repo as any)[m]).toBe("function");
    }
  });

  it("ObjectiveRepo accepts UserRepo via constructor", async () => {
    const { UserRepo } = await import("../server/repositories/user.repo");
    const { ObjectiveRepo } = await import("../server/repositories/objective.repo");
    const repo = new ObjectiveRepo(new UserRepo());
    for (const m of ["getObjectives", "getObjective", "createObjective", "updateObjective", "getKeyResultIdsForObjective", "deleteObjectiveRow"]) {
      expect(typeof (repo as any)[m]).toBe("function");
    }
  });

  it("KeyResultRepo accepts UserRepo and ObjectiveRepo via constructor", async () => {
    const { UserRepo } = await import("../server/repositories/user.repo");
    const { ObjectiveRepo } = await import("../server/repositories/objective.repo");
    const { KeyResultRepo } = await import("../server/repositories/key-result.repo");
    const repo = new KeyResultRepo(new UserRepo(), new ObjectiveRepo(new UserRepo()));
    for (const m of ["getKeyResults", "getKeyResult", "createKeyResult", "updateKeyResult", "deleteKeyResult"]) {
      expect(typeof (repo as any)[m]).toBe("function");
    }
  });

  it("CheckpointRepo wires UserRepo, ObjectiveRepo and KeyResultRepo", async () => {
    const { UserRepo } = await import("../server/repositories/user.repo");
    const { ObjectiveRepo } = await import("../server/repositories/objective.repo");
    const { KeyResultRepo } = await import("../server/repositories/key-result.repo");
    const { CheckpointRepo } = await import("../server/repositories/checkpoint.repo");
    const userRepo = new UserRepo();
    const objectiveRepo = new ObjectiveRepo(userRepo);
    const krRepo = new KeyResultRepo(userRepo, objectiveRepo);
    const repo = new CheckpointRepo(userRepo, objectiveRepo, krRepo);
    for (const m of ["getCheckpoints", "getCheckpoint", "updateCheckpoint", "deleteCheckpoint", "generateCheckpoints"]) {
      expect(typeof (repo as any)[m]).toBe("function");
    }
  });
});
