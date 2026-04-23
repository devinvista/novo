import { Router } from "express";
import { storage } from "../../storage";
import { asyncHandler } from "../../middleware/async-handler";
import { validate } from "../../middleware/validate";
import { requireAuth, requireRole, sanitizeUsers } from "../../middleware/auth";
import { insertUserSchema } from "@shared/schema";
import * as UsersService from "./users.service";

export const usersRouter: Router = Router();
export const managersPublicRouter: Router = Router();

// Public slim endpoint used by registration form (no auth)
managersPublicRouter.get(
  "/managers/public",
  asyncHandler(async (_req, res) => {
    const managers = await storage.getManagers();
    res.json(managers.map((m: any) => ({ id: m.id, name: m.name })));
  })
);

// Authenticated endpoints
usersRouter.use(requireAuth);

usersRouter.get(
  "/users",
  asyncHandler(async (req: any, res) => {
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
  asyncHandler(async (req: any, res) => {
    const user = await UsersService.createUser(req.user, req.body);
    res.json(user);
  })
);

usersRouter.patch(
  "/users/:id",
  requireRole(["admin", "gestor"]),
  asyncHandler(async (req: any, res) => {
    const user = await UsersService.updateUser(req.user, parseInt(req.params.id), req.body);
    res.json(user);
  })
);

usersRouter.delete(
  "/users/:id",
  requireRole(["admin", "gestor"]),
  asyncHandler(async (req: any, res) => {
    await UsersService.deleteUser(req.user, parseInt(req.params.id));
    res.json({ message: "Usuário excluído com sucesso" });
  })
);

usersRouter.patch(
  "/users/:id/status",
  requireRole(["admin", "gestor"]),
  asyncHandler(async (req: any, res) => {
    const user = await UsersService.setUserActive(
      req.user,
      parseInt(req.params.id),
      Boolean(req.body?.active)
    );
    res.json(user);
  })
);

usersRouter.post(
  "/users/approve",
  requireRole(["admin", "gestor"]),
  asyncHandler(async (req: any, res) => {
    const user = await UsersService.approveUser(req.user, req.body);
    res.json(user);
  })
);
