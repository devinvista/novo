import client from "prom-client";
import type { Request, Response, NextFunction } from "express";

export const registry = new client.Registry();

client.collectDefaultMetrics({ register: registry });

const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
});

const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
  registers: [registry],
});

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    const route = (req.route?.path as string) || req.baseUrl + req.path || req.path;
    const labels = {
      method: req.method,
      route,
      status_code: String(res.statusCode),
    };
    const elapsedSeconds = Number(process.hrtime.bigint() - start) / 1e9;
    httpRequestDuration.observe(labels, elapsedSeconds);
    httpRequestsTotal.inc(labels);
  });
  next();
}

export async function metricsHandler(_req: Request, res: Response) {
  res.set("Content-Type", registry.contentType);
  res.end(await registry.metrics());
}
