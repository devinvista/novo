// Configure timezone for Brazil (UTC-3)
process.env.TZ = 'America/Sao_Paulo';

import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { env, isProd } from "./config/env";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { log, httpLogger, logger } from "./infra/logger";
import { requestId } from "./middleware/request-id";
import { errorHandler } from "./middleware/error-handler";
import { testConnection } from "./pg-db";

const app = express();

// Security headers — strict CSP in production, relaxed in dev for Vite HMR
app.use(
  helmet({
    contentSecurityPolicy: isProd
      ? {
          useDefaults: true,
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "blob:"],
            fontSrc: ["'self'", "data:"],
            connectSrc: ["'self'"],
            objectSrc: ["'none'"],
            frameAncestors: ["'self'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
          },
        }
      : false,
    crossOriginEmbedderPolicy: false,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Request correlation id (must run before logger so it's included in logs)
app.use(requestId);

// HTTP request logging (pino)
app.use(httpLogger);

// Global rate limiter — protects all /api routes from abuse/scraping
const globalApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Muitas requisições. Aguarde um instante e tente novamente." },
});
app.use("/api", globalApiLimiter);

// Stricter rate limit for auth endpoints (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Muitas tentativas. Tente novamente em 15 minutos." },
});

app.use("/api/login", authLimiter);
app.use("/api/register", authLimiter);

// Healthcheck endpoint
app.get("/health", async (_req, res) => {
  try {
    await testConnection();
    res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      env: process.env.NODE_ENV ?? "development",
    });
  } catch {
    res.status(503).json({
      status: "error",
      timestamp: new Date().toISOString(),
      message: "Database connection failed",
    });
  }
});

(async () => {
  const server = await registerRoutes(app);

  // Centralized error handler (typed AppError, ZodError, fallback)
  app.use(errorHandler);

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Support PORT env var (required for Hostinger) with fallback to 5000
  const port = env.PORT;
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    }
  );
})();
