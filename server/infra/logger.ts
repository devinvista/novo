import pino from "pino";
import pinoHttp from "pino-http";
import { isProd } from "../config/env";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isProd ? "info" : "debug"),
  base: undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      "req.headers.cookie",
      "req.headers.authorization",
      "req.body.password",
      "req.body.currentPassword",
      "req.body.newPassword",
      "*.password",
    ],
    censor: "[REDACTED]",
  },
  transport: isProd
    ? undefined
    : {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" },
      },
});

export const httpLogger = pinoHttp({
  logger,
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  customProps: (req: any) => ({ requestId: req.id }),
  autoLogging: {
    ignore: (req) => {
      const url = req.url ?? "";
      if (url === "/health") return true;
      if (!isProd && !url.startsWith("/api")) return true;
      return false;
    },
  },
  serializers: {
    req(req) {
      return { id: (req as any).id, method: req.method, url: req.url };
    },
    res(res) {
      return { statusCode: res.statusCode };
    },
  },
});

/** Backwards-compatible helper used by legacy call sites. */
export function log(message: string, source = "express") {
  if (source === "error") logger.error(message);
  else logger.info({ source }, message);
}
