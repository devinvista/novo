import type { Request, Response, NextFunction, RequestHandler } from "express";
import type { ZodSchema } from "zod";
import { fromZodError } from "zod-validation-error";
import { ValidationError } from "../errors/app-error";

type Source = "body" | "query" | "params";

/**
 * Validates a request property against a Zod schema. On success, the parsed
 * (possibly transformed) value replaces the original. On failure, throws a
 * ValidationError handled by the central error middleware.
 */
export function validate(schema: ZodSchema, source: Source = "body"): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse((req as any)[source]);
    if (!result.success) {
      const friendly = fromZodError(result.error, { prefix: null }).toString();
      return next(new ValidationError(friendly, result.error.flatten()));
    }
    (req as any)[source] = result.data;
    next();
  };
}
