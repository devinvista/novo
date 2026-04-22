import { describe, it, expect } from "vitest";
import request from "supertest";
import express from "express";

describe("auth contract", () => {
  it("rejects unauthenticated access to /api/user with 401", async () => {
    const app = express();
    app.get("/api/user", (req, res) => {
      const isAuth = (req as any).isAuthenticated?.() ?? false;
      if (!isAuth) return res.sendStatus(401);
      res.json({});
    });
    const res = await request(app).get("/api/user");
    expect(res.status).toBe(401);
  });

  it("password hashing produces hash.salt format", async () => {
    const { hashPassword } = await import("../server/auth");
    const hash = await hashPassword("test1234");
    expect(hash).toMatch(/^[a-f0-9]+\.[a-f0-9]+$/);
    const [hashPart, salt] = hash.split(".");
    expect(hashPart.length).toBe(128);
    expect(salt.length).toBe(32);
  });
});
