import { Router } from "express";
import { storage } from "../../storage";
import { asyncHandler } from "../../middleware/async-handler";
import { requireAuth, requireRole, sanitizeUser, sanitizeUsers } from "../../middleware/auth";
import { hashPassword } from "../../auth";
import { ForbiddenError, NotFoundError, ValidationError } from "../../errors/app-error";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";

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
    const currentUserId = req.user?.id;
    const currentUserRole = req.user?.role;

    let users = await storage.getUsers();

    if (currentUserRole === "gestor") {
      users = users.filter(
        (user: any) =>
          user.id === currentUserId ||
          (user.role === "operacional" && user.gestorId === currentUserId)
      );
    } else if (currentUserRole !== "admin") {
      users = users.filter((user: any) => user.id === currentUserId);
    }

    res.json(sanitizeUsers(users));
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

function validateGestorScope(currentUser: any, userData: any) {
  const cur = {
    solutionIds: Array.isArray(currentUser.solutionIds) ? currentUser.solutionIds : [],
    serviceLineIds: Array.isArray(currentUser.serviceLineIds) ? currentUser.serviceLineIds : [],
    serviceIds: Array.isArray(currentUser.serviceIds) ? currentUser.serviceIds : [],
  };

  const checkScope = (
    field: "solutionIds" | "serviceLineIds" | "serviceIds",
    msg: string
  ) => {
    const incoming = userData[field];
    if (!Array.isArray(incoming) || incoming.length === 0) return;
    if (cur[field].length === 0) return;
    const invalid = incoming.filter((id: number) => !cur[field].includes(id));
    if (invalid.length > 0) throw new ForbiddenError(msg);
  };

  checkScope("solutionIds", "Você não tem permissão para atribuir estas soluções ao usuário");
  checkScope(
    "serviceLineIds",
    "Você não tem permissão para atribuir estas linhas de serviço ao usuário"
  );
  checkScope("serviceIds", "Você não tem permissão para atribuir estes serviços ao usuário");
}

usersRouter.post(
  "/users",
  requireRole(["admin", "gestor"]),
  asyncHandler(async (req: any, res) => {
    let userData: any;
    try {
      userData = insertUserSchema.parse(req.body);
    } catch (err) {
      if (err instanceof z.ZodError) throw new ValidationError("Dados inválidos", err.issues);
      throw err;
    }

    const currentUser = req.user;

    if (currentUser?.role === "gestor" && userData.role !== "operacional") {
      throw new ForbiddenError("Gestores só podem criar usuários operacionais");
    }

    if (currentUser?.role === "gestor") {
      validateGestorScope(currentUser, userData);
      if (userData.role === "operacional") {
        userData.gestorId = currentUser.id;
      }
    }

    userData.password = await hashPassword(userData.password as string);
    userData.approved = true;

    const user = await storage.createUser(userData);
    res.json(sanitizeUser(user));
  })
);

usersRouter.patch(
  "/users/:id",
  requireRole(["admin", "gestor"]),
  asyncHandler(async (req: any, res) => {
    const id = parseInt(req.params.id);
    const userData = req.body;

    const targetUser = await storage.getUser(id);
    if (!targetUser) throw new NotFoundError("Usuário não encontrado");

    if (req.user?.role === "gestor") {
      if (targetUser.role !== "operacional" || (targetUser as any).gestorId !== req.user.id) {
        throw new ForbiddenError("Sem permissão para editar este usuário");
      }
      validateGestorScope(req.user, userData);
    }

    if (userData.password && userData.password.trim() !== "") {
      userData.password = await hashPassword(userData.password);
    } else {
      delete userData.password;
    }

    const user = await storage.updateUser(id, userData);
    res.json(sanitizeUser(user));
  })
);

usersRouter.delete(
  "/users/:id",
  requireRole(["admin", "gestor"]),
  asyncHandler(async (req: any, res) => {
    const id = parseInt(req.params.id);
    if (id === req.user?.id) {
      throw new ValidationError("Não é possível excluir seu próprio usuário");
    }

    const targetUser = await storage.getUser(id);
    if (!targetUser) throw new NotFoundError("Usuário não encontrado");

    if (req.user?.role === "gestor" && targetUser.role !== "operacional") {
      throw new ForbiddenError("Sem permissão para excluir este usuário");
    }

    await storage.deleteUser(id);
    res.json({ message: "Usuário excluído com sucesso" });
  })
);

usersRouter.patch(
  "/users/:id/status",
  requireRole(["admin", "gestor"]),
  asyncHandler(async (req: any, res) => {
    const id = parseInt(req.params.id);
    const { active } = req.body;

    const targetUser = await storage.getUser(id);
    if (!targetUser) throw new NotFoundError("Usuário não encontrado");

    if (req.user?.role === "gestor" && targetUser.role !== "operacional") {
      throw new ForbiddenError("Sem permissão para alterar status deste usuário");
    }

    const user = await storage.updateUser(id, { active });
    res.json(sanitizeUser(user));
  })
);

usersRouter.post(
  "/users/approve",
  requireRole(["admin", "gestor"]),
  asyncHandler(async (req: any, res) => {
    const { id, regionIds, subRegionIds, solutionIds, serviceLineIds, serviceIds } = req.body;

    const targetUser = await storage.getUser(id);
    if (!targetUser) throw new NotFoundError("Usuário não encontrado");

    if (req.user?.role === "gestor") {
      if (targetUser.role !== "operacional") {
        throw new ForbiddenError("Gestores só podem aprovar usuários operacionais");
      }
      if ((targetUser as any).gestorId !== req.user.id) {
        throw new ForbiddenError("Só é possível aprovar usuários vinculados a você");
      }
    }

    const gestor = (targetUser as any).gestorId
      ? await storage.getUserById((targetUser as any).gestorId)
      : null;

    let finalPermissions = {
      regionIds: regionIds || [],
      subRegionIds: subRegionIds || [],
      solutionIds: solutionIds || [],
      serviceLineIds: serviceLineIds || [],
      serviceIds: serviceIds || [],
    };

    if (gestor) {
      const inheritOrFilter = (
        incoming: number[],
        gestorScope: number[] | undefined
      ): number[] => {
        const scope = (gestorScope as number[]) || [];
        return incoming.length > 0 ? incoming.filter((id: number) => scope.includes(id)) : scope;
      };

      finalPermissions = {
        regionIds: inheritOrFilter(finalPermissions.regionIds, (gestor as any).regionIds),
        subRegionIds: inheritOrFilter(finalPermissions.subRegionIds, (gestor as any).subRegionIds),
        solutionIds: inheritOrFilter(finalPermissions.solutionIds, (gestor as any).solutionIds),
        serviceLineIds: inheritOrFilter(
          finalPermissions.serviceLineIds,
          (gestor as any).serviceLineIds
        ),
        serviceIds: inheritOrFilter(finalPermissions.serviceIds, (gestor as any).serviceIds),
      };
    }

    const user = await storage.approveUserWithPermissions(id, req.user!.id, finalPermissions);
    res.json(sanitizeUser(user));
  })
);
