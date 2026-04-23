import { Router } from "express";
import { storage } from "../../storage";
import { asyncHandler } from "../../middleware/async-handler";
import { validate } from "../../middleware/validate";
import { requireAuth } from "../../middleware/auth";
import { insertActionSchema } from "@shared/schema";
import { intParam } from "../../lib/route-utils";
import { z } from "zod";
import * as ActionsService from "./actions.service";

export const actionsRouter: Router = Router();

actionsRouter.use(requireAuth);

// Extended schemas allowing the optional completionComment field used on updates.
const createActionSchema = insertActionSchema;
const updateActionSchema = insertActionSchema
  .partial()
  .extend({ completionComment: z.string().optional() });

actionsRouter.get(
  "/",
  asyncHandler(async (req: any, res) => {
    const limit = intParam(req.query.limit);
    const offset = intParam(req.query.offset);
    const actions = await storage.getActions({
      keyResultId: intParam(req.query.keyResultId),
      currentUserId: req.user?.id,
      ...(typeof limit === "number" && limit > 0 ? { limit: Math.min(limit, 200) } : {}),
      ...(typeof offset === "number" && offset >= 0 ? { offset } : {}),
    });
    res.json(actions);
  })
);

actionsRouter.post(
  "/",
  asyncHandler(async (req: any, _res, next) => {
    req.body = ActionsService.cleanActionBody(req.body);
    next();
  }),
  validate(createActionSchema),
  asyncHandler(async (req: any, res) => {
    const action = await ActionsService.createAction(req.user, req.body);
    res.status(201).json(action);
  })
);

actionsRouter.put(
  "/:id",
  asyncHandler(async (req: any, _res, next) => {
    req.body = ActionsService.cleanActionBody(req.body);
    next();
  }),
  validate(updateActionSchema),
  asyncHandler(async (req: any, res) => {
    const updated = await ActionsService.updateAction(
      req.user,
      parseInt(req.params.id),
      req.body
    );
    res.json(updated);
  })
);

actionsRouter.delete(
  "/:id",
  asyncHandler(async (req: any, res) => {
    await ActionsService.deleteAction(req.user, parseInt(req.params.id));
    res.sendStatus(204);
  })
);
