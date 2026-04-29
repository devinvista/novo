import { Router } from "express";
import { storage } from "../../storage";
import { asyncHandler } from "../../middleware/async-handler";
import { validate } from "../../middleware/validate";
import { requireAuth, type AuthenticatedRequest } from "../../middleware/auth";
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
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const limit = intParam(req.query.limit);
    const offset = intParam(req.query.offset);
    const actions = await storage.getActions({
      keyResultId: intParam(req.query.keyResultId),
      regionId: intParam(req.query.regionId),
      subRegionId: intParam(req.query.subRegionId),
      currentUserId: req.user.id,
      ...(typeof limit === "number" && limit > 0 ? { limit: Math.min(limit, 200) } : {}),
      ...(typeof offset === "number" && offset >= 0 ? { offset } : {}),
    });
    res.json(actions);
  })
);

actionsRouter.post(
  "/",
  asyncHandler((req, _res, next) => {
    req.body = ActionsService.cleanActionBody(req.body);
    return Promise.resolve(next());
  }),
  validate(createActionSchema),
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const action = await ActionsService.createAction(req.user, req.body);
    res.status(201).json(action);
  })
);

actionsRouter.put(
  "/:id",
  asyncHandler((req, _res, next) => {
    req.body = ActionsService.cleanActionBody(req.body);
    return Promise.resolve(next());
  }),
  validate(updateActionSchema),
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    const updated = await ActionsService.updateAction(
      req.user,
      parseInt(String(req.params.id)),
      req.body
    );
    res.json(updated);
  })
);

actionsRouter.delete(
  "/:id",
  asyncHandler<AuthenticatedRequest>(async (req, res) => {
    await ActionsService.deleteAction(req.user, parseInt(String(req.params.id)));
    res.sendStatus(204);
  })
);
