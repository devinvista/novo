import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { invalidateLookupCache } from "./cache";
import { lookupsRouter } from "./modules/lookups/lookups.routes";
import { actionCommentsRouter } from "./modules/action-comments/action-comments.routes";
import { adminLookupsRouter } from "./modules/admin-lookups/admin-lookups.routes";
import { objectivesRouter } from "./modules/objectives/objectives.routes";
import { keyResultsRouter } from "./modules/key-results/key-results.routes";
import { actionsRouter } from "./modules/actions/actions.routes";
import { checkpointsRouter } from "./modules/checkpoints/checkpoints.routes";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes";
import { quartersRouter } from "./modules/quarters/quarters.routes";
import { executiveSummaryRouter } from "./modules/executive-summary/executive-summary.routes";
import { usersRouter, managersPublicRouter } from "./modules/users/users.routes";
import { adminImportRouter } from "./modules/admin-import/admin-import.routes";

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes (login, register, logout, /api/user)
  setupAuth(app);

  // Auto-invalidate lookup caches after any successful admin mutation
  app.use("/api/admin", (req, res, next) => {
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next();
    res.on("finish", () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        invalidateLookupCache();
      }
    });
    next();
  });

  // Public endpoints (no auth)
  app.use("/api", managersPublicRouter);

  // Domain routers
  app.use("/api", lookupsRouter);
  app.use("/api", actionCommentsRouter);
  app.use("/api", usersRouter);
  app.use("/api/admin", adminLookupsRouter);
  app.use("/api/admin", adminImportRouter);
  app.use("/api/objectives", objectivesRouter);
  app.use("/api/key-results", keyResultsRouter);
  app.use("/api/actions", actionsRouter);
  app.use("/api/checkpoints", checkpointsRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/quarters", quartersRouter);
  app.use("/api/executive-summary", executiveSummaryRouter);

  return createServer(app);
}
