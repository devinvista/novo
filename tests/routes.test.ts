import { describe, it, expect, beforeEach, vi } from "vitest";
import express, { type Express } from "express";
import request from "supertest";

/**
 * Route integration tests — exercises the real Express routers with the
 * `storage` facade mocked. Auth middleware is replaced with a stub so we
 * can test authorization branches in isolation. No live DB required.
 */

type AuthState = { authenticated: boolean; user?: { id: number; role: string } };

async function buildApp(authState: AuthState) {
  // Mock storage before the routers are imported
  vi.resetModules();
  vi.doMock("../server/storage", () => ({
    storage: {
      getObjectives: vi.fn().mockResolvedValue([
        { id: 1, title: "Objetivo X", ownerId: 1, status: "active" },
      ]),
      getObjective: vi.fn().mockResolvedValue({ id: 1, title: "Objetivo X", ownerId: 1 }),
      createObjective: vi.fn().mockResolvedValue({ id: 99, title: "Novo" }),
      getKeyResults: vi.fn().mockResolvedValue([{ id: 1, title: "KR 1" }]),
      getActions: vi.fn().mockResolvedValue([]),
    },
  }));

  // Stub auth middleware
  vi.doMock("../server/middleware/auth", () => ({
    requireAuth: (req: any, res: any, next: any) => {
      if (!authState.authenticated) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      req.user = authState.user;
      req.isAuthenticated = () => true;
      next();
    },
    requireRole: () => (_req: any, _res: any, next: any) => next(),
    sanitizeUser: (u: any) => u,
  }));

  const app: Express = express();
  app.use(express.json());

  const objectivesModule: any = await import("../server/modules/objectives/objectives.routes");
  const router = objectivesModule.default ?? objectivesModule.objectivesRouter ?? objectivesModule.router;
  if (router) {
    app.use("/api/objectives", router);
  }

  return { app, hasRouter: Boolean(router) };
}

describe("objectives routes", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("rejects unauthenticated GET /api/objectives with 401", async () => {
    const { app, hasRouter } = await buildApp({ authenticated: false });
    if (!hasRouter) {
      // Router shape unexpected — make the test discoverable rather than silently passing
      expect.fail("objectives router could not be resolved from module exports");
    }
    const res = await request(app).get("/api/objectives");
    expect(res.status).toBe(401);
  });

  it("returns objectives list for authenticated user", async () => {
    const { app, hasRouter } = await buildApp({
      authenticated: true,
      user: { id: 1, role: "admin" },
    });
    if (!hasRouter) {
      expect.fail("objectives router could not be resolved from module exports");
    }
    const res = await request(app).get("/api/objectives");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toMatchObject({ id: 1, title: "Objetivo X" });
  });
});
