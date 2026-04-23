import { Router } from "express";
import { db } from "../../pg-db";
import { actionDependencies, actions } from "@shared/schema";
import { eq, and, or, inArray } from "drizzle-orm";
import { asyncHandler } from "../../middleware/async-handler";
import { requireAuth } from "../../middleware/auth";
import { BadRequestError, NotFoundError } from "../../errors/app-error";

export const actionDependenciesRouter: Router = Router();

actionDependenciesRouter.use(requireAuth);

async function getActionOrThrow(id: number) {
  const [row] = await db.select({ id: actions.id }).from(actions).where(eq(actions.id, id)).limit(1);
  if (!row) throw new NotFoundError(`Ação ${id} não encontrada`);
  return row;
}

async function hasCycle(from: number, to: number): Promise<boolean> {
  const visited = new Set<number>();
  const queue = [to];
  while (queue.length) {
    const current = queue.shift()!;
    if (current === from) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    const deps = await db
      .select({ actionId: actionDependencies.actionId })
      .from(actionDependencies)
      .where(eq(actionDependencies.dependsOnId, current));
    for (const d of deps) queue.push(d.actionId);
  }
  return false;
}

actionDependenciesRouter.get(
  "/",
  asyncHandler(async (req: any, res) => {
    const actionIds = req.query.actionIds
      ? String(req.query.actionIds).split(",").map(Number).filter(Boolean)
      : undefined;

    if (actionIds && actionIds.length > 0) {
      const rows = await db
        .select()
        .from(actionDependencies)
        .where(
          or(
            inArray(actionDependencies.actionId, actionIds),
            inArray(actionDependencies.dependsOnId, actionIds),
          )
        );
      return res.json(rows);
    }

    const rows = await db.select().from(actionDependencies);
    res.json(rows);
  })
);

actionDependenciesRouter.post(
  "/",
  asyncHandler(async (req: any, res) => {
    const actionId = parseInt(req.body.actionId);
    const dependsOnId = parseInt(req.body.dependsOnId);

    if (!actionId || !dependsOnId) throw new BadRequestError("actionId e dependsOnId são obrigatórios");
    if (actionId === dependsOnId) throw new BadRequestError("Uma ação não pode depender de si mesma");

    await Promise.all([getActionOrThrow(actionId), getActionOrThrow(dependsOnId)]);

    const allExisting = await db
      .select()
      .from(actionDependencies)
      .where(eq(actionDependencies.actionId, actionId));
    const isDuplicate = allExisting.some((r) => r.dependsOnId === dependsOnId);
    if (isDuplicate) throw new BadRequestError("Esta dependência já existe");

    if (await hasCycle(actionId, dependsOnId)) {
      throw new BadRequestError("Esta dependência criaria um ciclo entre as ações");
    }

    const [inserted] = await db
      .insert(actionDependencies)
      .values({ actionId, dependsOnId })
      .returning();

    res.status(201).json(inserted);
  })
);

actionDependenciesRouter.delete(
  "/:actionId/:dependsOnId",
  asyncHandler(async (req: any, res) => {
    const actionId = parseInt(req.params.actionId);
    const dependsOnId = parseInt(req.params.dependsOnId);

    const deleted = await db
      .delete(actionDependencies)
      .where(
        and(
          eq(actionDependencies.actionId, actionId),
          eq(actionDependencies.dependsOnId, dependsOnId),
        )
      )
      .returning();

    if (deleted.length === 0) throw new NotFoundError("Dependência não encontrada");

    res.json({ ok: true });
  })
);
