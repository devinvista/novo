import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";

describe("smoke: minimal express app", () => {
  it("responds to a basic health route", async () => {
    const app = express();
    app.get("/health", (_req, res) => res.json({ status: "ok" }));
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});
