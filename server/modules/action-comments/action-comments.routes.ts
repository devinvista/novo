import { Router } from "express";
import { z } from "zod";
import { storage } from "../../storage";
import { asyncHandler } from "../../middleware/async-handler";
import { validate } from "../../middleware/validate";
import { requireAuth, type AuthenticatedRequest } from "../../middleware/auth";
import { NotFoundError } from "../../errors/app-error";

export const actionCommentsRouter: Router = Router();

actionCommentsRouter.use(requireAuth);

// Bulk count of comments per action (for indicators)
actionCommentsRouter.get(
  "/action-comment-counts",
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const userId = req.user.id;
    const actions = (await storage.getActions({ currentUserId: userId })) as Array<{ id: number }>;
    const counts: Record<number, number> = {};
    await Promise.all(
      actions.map(async (action) => {
        const comments = await storage.getActionComments(action.id);
        counts[action.id] = comments.length;
      })
    );
    res.json(counts);
  })
);

const actionParamSchema = z.object({
  actionId: z.coerce.number().int().positive(),
});

actionCommentsRouter.get(
  "/actions/:actionId/comments",
  validate(actionParamSchema, "params"),
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const { actionId } = req.params as unknown as { actionId: number };
    const userId = req.user.id;

    const action = await storage.getAction(actionId, userId);
    if (!action) throw new NotFoundError("Ação não encontrada ou sem acesso");

    const comments = await storage.getActionComments(actionId);
    res.json(comments);
  })
);

const createCommentSchema = z.object({
  comment: z.string().trim().min(1, "Comentário não pode ser vazio").max(5000),
});

actionCommentsRouter.post(
  "/actions/:actionId/comments",
  validate(actionParamSchema, "params"),
  validate(createCommentSchema, "body"),
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const { actionId } = req.params as unknown as { actionId: number };
    const userId = req.user.id;

    const action = await storage.getAction(actionId, userId);
    if (!action) throw new NotFoundError("Ação não encontrada ou sem acesso");

    const newComment = await storage.createActionComment({
      actionId,
      userId,
      comment: (req.body as { comment: string }).comment,
    });

    const all = (await storage.getActionComments(actionId)) as Array<{ id: number }>;
    const added = all.find((c) => c.id === newComment.id);
    res.status(201).json(added);
  })
);
