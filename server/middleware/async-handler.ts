import type { Request, Response, NextFunction, RequestHandler } from "express";

type AsyncHandler<R extends Request = Request> = (
  req: R,
  res: Response,
  next: NextFunction
) => Promise<unknown>;

/**
 * Wraps an async route handler so any thrown/rejected error is forwarded to
 * the central error-handling middleware via next(err).
 *
 * Generic over the request type so routes that ran behind `requireAuth` can
 * declare `asyncHandler<AuthenticatedRequest>(...)` and access `req.user`
 * without `any` casts.
 */
export function asyncHandler<R extends Request = Request>(
  fn: AsyncHandler<R>
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req as R, res, next)).catch(next);
  };
}
