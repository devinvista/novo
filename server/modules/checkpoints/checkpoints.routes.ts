import { Router } from "express";
import { storage } from "../../storage";
import { asyncHandler } from "../../middleware/async-handler";
import { requireAuth } from "../../middleware/auth";
import { NotFoundError } from "../../errors/app-error";
import { convertBRToDatabase, formatBrazilianNumber } from "../../shared/formatters";
import { recalcKeyResultFromCheckpoints } from "../../domain/checkpoints/recalc";
import { intParam } from "../../lib/route-utils";

export const checkpointsRouter: Router = Router();

checkpointsRouter.use(requireAuth);

checkpointsRouter.get(
  "/",
  asyncHandler(async (req: any, res) => {
    const checkpoints = await storage.getCheckpoints(intParam(req.query.keyResultId), req.user.id);
    const checkpointsBR = checkpoints.map((c: any) => ({
      ...c,
      actualValue: c.actualValue ? formatBrazilianNumber(c.actualValue) : null,
      targetValue: formatBrazilianNumber(c.targetValue || "0"),
      progress: c.progress ? parseFloat(c.progress).toFixed(2) : "0",
    }));
    res.json(checkpointsBR);
  })
);

checkpointsRouter.get(
  "/:id",
  asyncHandler(async (req: any, res) => {
    const id = parseInt(req.params.id);
    const checkpoint = await storage.getCheckpoint(id, req.user.id);
    if (!checkpoint) throw new NotFoundError("Checkpoint não encontrado ou sem acesso");
    res.json(checkpoint);
  })
);

checkpointsRouter.post(
  "/:id/update",
  asyncHandler(async (req: any, res) => {
    const id = parseInt(req.params.id);
    const { actualValue, status } = req.body;

    const existing = await storage.getCheckpoint(id, req.user.id);
    if (!existing) throw new NotFoundError("Checkpoint não encontrado ou sem acesso");

    const actualValueDb = actualValue ? convertBRToDatabase(actualValue) : 0;
    const updated = await storage.updateCheckpoint(id, {
      actualValue: actualValueDb.toString(),
      status: status || "pending",
    });

    await recalcKeyResultFromCheckpoints(existing.keyResultId);

    res.json({
      ...updated,
      actualValue: formatBrazilianNumber(updated.actualValue || "0"),
      targetValue: formatBrazilianNumber(updated.targetValue || "0"),
      progress: updated.progress ? parseFloat(updated.progress).toFixed(2) : "0.00",
    });
  })
);

checkpointsRouter.put(
  "/:id",
  asyncHandler(async (req: any, res) => {
    const id = parseInt(req.params.id);
    const { actualValue, notes, status, completedDate, completedAt } = req.body;

    const existing = await storage.getCheckpoint(id, req.user.id);
    if (!existing) throw new NotFoundError("Checkpoint não encontrado ou sem acesso");

    const targetValue = convertBRToDatabase(existing.targetValue);
    const actual = convertBRToDatabase(actualValue);
    const progress = targetValue > 0 ? (actual / targetValue) * 100 : 0;

    const updateData: any = {
      actualValue: actual.toString(),
      notes,
      status: status || "completed",
      progress: progress.toString(),
    };

    if (status === "completed") {
      updateData.completedDate = completedDate ? new Date(completedDate) : new Date();
      updateData.completedAt = completedAt ? new Date(completedAt) : new Date();
    } else {
      updateData.completedDate = null;
      updateData.completedAt = null;
    }

    const checkpoint = await storage.updateCheckpoint(id, updateData);
    await recalcKeyResultFromCheckpoints(existing.keyResultId);
    res.json(checkpoint);
  })
);

checkpointsRouter.delete(
  "/:id",
  asyncHandler(async (req: any, res) => {
    const id = parseInt(req.params.id);
    const existing = await storage.getCheckpoint(id, req.user.id);
    if (!existing) throw new NotFoundError("Checkpoint não encontrado ou sem acesso");
    await storage.deleteCheckpoint(id);
    res.sendStatus(204);
  })
);
