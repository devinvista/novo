import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { AppError } from "../errors/app-error";
import { logger } from "../infra/logger";

interface ErrorPayload {
  message: string;
  code: string;
  requestId: string;
  details?: unknown;
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  let status = 500;
  let payload: ErrorPayload = {
    message: "Erro interno do servidor",
    code: "INTERNAL_ERROR",
    requestId: req.id,
  };

  if (err instanceof AppError) {
    status = err.status;
    payload = {
      message: err.message,
      code: err.code,
      requestId: req.id,
      details: err.details,
    };
  } else if (err instanceof ZodError) {
    status = 422;
    payload = {
      message: fromZodError(err, { prefix: null }).toString(),
      code: "VALIDATION_ERROR",
      requestId: req.id,
      details: err.flatten(),
    };
  } else if (err instanceof Error) {
    const anyErr = err as any;
    status = anyErr.status || anyErr.statusCode || 500;
    payload = {
      message: err.message || payload.message,
      code: anyErr.code || payload.code,
      requestId: req.id,
    };
  }

  if (status >= 500) {
    logger.error({ err, requestId: req.id, path: req.path, method: req.method }, payload.message);
  } else {
    logger.warn({ requestId: req.id, path: req.path, method: req.method, status }, payload.message);
  }

  if (!res.headersSent) {
    res.status(status).json(payload);
  }
}
