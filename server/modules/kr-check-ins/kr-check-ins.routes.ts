import { Router } from "express";
import { z } from "zod";
import { storage } from "../../storage";
import { asyncHandler } from "../../middleware/async-handler";
import { requireAuth, type AuthenticatedRequest } from "../../middleware/auth";
import { NotFoundError, ValidationError } from "../../errors/app-error";
import { insertKrCheckInSchema } from "@shared/schema";
import { recordActivity } from "../../lib/audit-log";
import { recalcObjectiveCascade } from "../../domain/checkpoints/recalc";
import { convertBRToDatabase } from "../../shared/formatters";

export const krCheckInsRouter: Router = Router();

krCheckInsRouter.use(requireAuth);

/**
 * Lista todos os check-ins visíveis ao usuário atual (cascata pelos KRs visíveis).
 * Usado pelo painel para identificar KRs que ainda não receberam check-in na semana.
 */
krCheckInsRouter.get(
  "/kr-check-ins",
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const userKrs = await storage.getKeyResults({ currentUserId: req.user.id });
    const krIds = (userKrs as Array<{ id: number }>).map((kr) => kr.id);
    const items = await storage.checkIns.listAcrossKeyResults(krIds);
    res.json(items);
  })
);

/** Calcula a data ISO (YYYY-MM-DD) da segunda-feira da semana de uma data. */
function mondayOfWeek(date: Date): string {
  const d = new Date(date);
  const day = d.getDay(); // 0=dom 1=seg ... 6=sáb
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

krCheckInsRouter.get(
  "/key-results/:id/check-ins",
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const keyResultId = parseInt(String(req.params.id));
    const kr = await storage.getKeyResult(keyResultId, req.user.id);
    if (!kr) throw new NotFoundError("Resultado-chave não encontrado ou sem acesso");
    const items = await storage.checkIns.list(keyResultId);
    res.json(items);
  })
);

krCheckInsRouter.post(
  "/key-results/:id/check-ins",
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const keyResultId = parseInt(String(req.params.id));
    const kr = await storage.getKeyResult(keyResultId, req.user.id);
    if (!kr) throw new NotFoundError("Resultado-chave não encontrado ou sem acesso");

    const body: Record<string, unknown> = { ...(req.body as Record<string, unknown>), keyResultId };
    if (!body.weekStart) body.weekStart = mondayOfWeek(new Date());
    if (body.currentValue && typeof body.currentValue === "string") {
      body.currentValue = convertBRToDatabase(body.currentValue).toString();
    }

    let parsed: z.infer<typeof insertKrCheckInSchema>;
    try {
      parsed = insertKrCheckInSchema.parse(body);
    } catch (err) {
      if (err instanceof z.ZodError) throw new ValidationError("Dados inválidos", err.issues);
      throw err;
    }

    const created = await storage.checkIns.create({
      ...parsed,
      authorId: req.user.id,
    });

    // Atualiza KR com o valor reportado e recalcula cascata pai
    if (parsed.currentValue) {
      const target = parseFloat((kr.targetValue ?? "0").toString());
      const cur = parseFloat(parsed.currentValue.toString());
      const progress = target > 0 ? Math.min((cur / target) * 100, 100) : 0;
      await storage.updateKeyResult(keyResultId, {
        currentValue: parsed.currentValue.toString(),
        progress: progress.toString(),
      });
      if (kr.objectiveId) await recalcObjectiveCascade(kr.objectiveId);
    }

    await recordActivity({
      userId: req.user.id,
      action: "check_in",
      entityType: "kr_check_in",
      entityId: created.id,
      after: created,
      meta: { keyResultId, status: parsed.status, confidence: parsed.confidence },
    });

    res.status(201).json(created);
  })
);

krCheckInsRouter.get(
  "/key-results/:id/check-ins/latest",
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const keyResultId = parseInt(String(req.params.id));
    const kr = await storage.getKeyResult(keyResultId, req.user.id);
    if (!kr) throw new NotFoundError("Resultado-chave não encontrado ou sem acesso");
    const latest = await storage.checkIns.latest(keyResultId);
    res.json(latest ?? null);
  })
);
