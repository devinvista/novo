import { Router } from "express";
import { z } from "zod";
import { storage } from "../../storage";
import { asyncHandler } from "../../middleware/async-handler";
import { validate } from "../../middleware/validate";
import {
  requireAuth,
  requireRole,
  sanitizeUsers,
  type AuthenticatedRequest,
} from "../../middleware/auth";
import { insertUserSchema } from "@shared/schema";
import * as UsersService from "./users.service";

export const usersRouter: Router = Router();
export const managersPublicRouter: Router = Router();

// Public slim endpoint used by registration form (no auth)
managersPublicRouter.get(
  "/managers/public",
  asyncHandler(async (_req, res) => {
    const managers = (await storage.getManagers()) as Array<{ id: number; name: string }>;
    res.json(managers.map((m) => ({ id: m.id, name: m.name })));
  })
);

// Authenticated endpoints
usersRouter.use(requireAuth);

// ─── Validation schemas ───────────────────────────────────────────────────
const idArray = z.array(z.coerce.number().int().positive()).optional();

/**
 * Update payload for `PATCH /users/:id`. Mirrors `insertUserSchema.partial()` but allows
 * an empty/blank password (which is then stripped by the service so the existing hash is kept).
 */
const updateUserSchema = insertUserSchema
  .partial()
  .extend({
    password: z.string().optional().or(z.literal("")),
    regionIds: idArray,
    subRegionIds: idArray,
    solutionIds: idArray,
    serviceLineIds: idArray,
    serviceIds: idArray,
    gestorId: z.coerce.number().int().positive().nullable().optional(),
    active: z.boolean().optional(),
  })
  .strict();

const setActiveSchema = z.object({ active: z.boolean() });

const approveUserSchema = z.object({
  id: z.coerce.number().int().positive(),
  regionIds: idArray,
  subRegionIds: idArray,
  solutionIds: idArray,
  serviceLineIds: idArray,
  serviceIds: idArray,
});

// ─── Routes ───────────────────────────────────────────────────────────────

usersRouter.get(
  "/users",
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    res.json(await UsersService.listVisibleUsers(req.user));
  })
);

usersRouter.get(
  "/managers",
  asyncHandler(async (_req, res) => {
    const managers = await storage.getManagers();
    res.json(sanitizeUsers(managers));
  })
);

usersRouter.get(
  "/pending-users",
  requireRole(["admin", "gestor"]),
  asyncHandler(async (_req, res) => {
    const pendingUsers = await storage.getPendingUsers();
    res.json(sanitizeUsers(pendingUsers));
  })
);

usersRouter.post(
  "/users",
  requireRole(["admin", "gestor"]),
  validate(insertUserSchema),
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const user = await UsersService.createUser(req.user, req.body);
    res.json(user);
  })
);

usersRouter.patch(
  "/users/:id",
  requireRole(["admin", "gestor"]),
  validate(updateUserSchema),
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const user = await UsersService.updateUser(req.user, parseInt(String(req.params.id)), req.body);
    res.json(user);
  })
);

usersRouter.delete(
  "/users/:id",
  requireRole(["admin", "gestor"]),
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    await UsersService.deleteUser(req.user, parseInt(String(req.params.id)));
    res.json({ message: "Usuário excluído com sucesso" });
  })
);

usersRouter.patch(
  "/users/:id/status",
  requireRole(["admin", "gestor"]),
  validate(setActiveSchema),
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const user = await UsersService.setUserActive(
      req.user,
      parseInt(String(req.params.id)),
      (req.body as { active: boolean }).active
    );
    res.json(user);
  })
);

usersRouter.post(
  "/users/approve",
  requireRole(["admin", "gestor"]),
  validate(approveUserSchema),
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const user = await UsersService.approveUser(req.user, req.body);
    res.json(user);
  })
);
