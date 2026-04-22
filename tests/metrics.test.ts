import { describe, it, expect } from "vitest";
import request from "supertest";
import express from "express";
import { metricsMiddleware, metricsHandler } from "../server/infra/metrics";

describe("metrics endpoint", () => {
  it("exposes prometheus metrics in text format", async () => {
    const app = express();
    app.use(metricsMiddleware);
    app.get("/ping", (_req, res) => res.json({ ok: true }));
    app.get("/metrics", metricsHandler);

    await request(app).get("/ping");
    const res = await request(app).get("/metrics");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/plain/);
    expect(res.text).toContain("http_requests_total");
    expect(res.text).toContain("http_request_duration_seconds");
    expect(res.text).toContain("process_cpu_seconds_total");
  });
});
