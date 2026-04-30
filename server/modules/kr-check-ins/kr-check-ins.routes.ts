import { Router } from "express";
import { z } from "zod";
import { storage } from "../../storage";
import { asyncHandler } from "../../middleware/async-handler";
import { requireAuth, type AuthenticatedRequest } from "../../middleware/auth";
import { NotFoundError, ValidationError } from "../../errors/app-error";
import { insertKrCheckInSchema } from "@shared/schema";
import { recordActivity } from "../../lib/audit-log";
import { recalcCheckpointStatuses, updateKrAndCascade } from "../../domain/checkpoints/recalc";
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

/**
 * Lista os KRs visíveis ao usuário atual que ainda NÃO receberam check-in
 * na semana corrente. Usado pelo badge da sidebar para sinalizar pendências.
 */
krCheckInsRouter.get(
  "/kr-check-ins/pending",
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const userKrs = await storage.getKeyResults({ currentUserId: req.user.id });
    const krs = userKrs as Array<{ id: number; title?: string; status?: string }>;
    const activeKrs = krs.filter((kr) => kr.status !== "completed" && kr.status !== "cancelled");
    if (activeKrs.length === 0) {
      res.json({ count: 0, items: [] });
      return;
    }
    const krIds = activeKrs.map((kr) => kr.id);
    const recent = await storage.checkIns.listAcrossKeyResults(krIds);
    const currentWeek = mondayOfWeek(new Date());
    const krsWithCheckIn = new Set(
      recent.filter((c) => c.weekStart === currentWeek).map((c) => c.keyResultId)
    );
    const pending = activeKrs.filter((kr) => !krsWithCheckIn.has(kr.id));
    res.json({
      count: pending.length,
      currentWeek,
      items: pending.map((kr) => ({ id: kr.id, title: kr.title })),
    });
  })
);

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

    // Caminho ÚNICO de gravação do currentValue do KR.
    if (parsed.currentValue) {
      const reported = parseFloat(parsed.currentValue.toString());
      if (Number.isFinite(reported)) {
        await updateKrAndCascade(keyResultId, reported);
        // Recalcula automaticamente o status dos checkpoints à luz do novo valor.
        await recalcCheckpointStatuses(keyResultId);
      }
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
