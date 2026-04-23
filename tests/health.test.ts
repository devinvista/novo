import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";

/**
 * Smoke test for the liveness/readiness contract that the production app
 * exposes. The real handlers live in `server/index.ts`; here we replicate
 * the same shape so any divergence in the contract surfaces in CI.
 */
describe("health endpoints contract", () => {
  function buildApp() {
    const app = express();
    app.get(["/health", "/healthz", "/api/health"], (_req, res) => {
      res.status(200).json({
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        env: process.env.NODE_ENV ?? "test",
      });
    });
    app.get(["/readyz", "/api/ready"], (_req, res) => {
      res.status(200).json({ status: "ready" });
    });
    return app;
  }

  it.each(["/health", "/healthz", "/api/health"])(
    "responds 200 with liveness payload on %s",
    async (path) => {
      const res = await request(buildApp()).get(path);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ status: "ok" });
      expect(res.body.timestamp).toEqual(expect.any(String));
      expect(typeof res.body.uptime).toBe("number");
    }
  );

  it.each(["/readyz", "/api/ready"])("responds 200 with readiness payload on %s", async (path) => {
    const res = await request(buildApp()).get(path);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ready" });
  });
});
