import type { Request, Response, NextFunction } from "express";
import { UnauthorizedError, ForbiddenError } from "../errors/app-error";

/**
 * Request that has passed through `requireAuth`. Use it in route handlers
 * (via `asyncHandler<AuthenticatedRequest>(...)`) to access `req.user`
 * without optional chaining or `as any` casts.
 *
 * `req.user` is widened to `User | undefined` by the Express namespace
 * augmentation in `server/auth.ts`; this type narrows it to `User` because
 * the middleware guarantees its presence at runtime.
 */
export interface AuthenticatedRequest extends Request {
  user: Express.User;
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.isAuthenticated?.() || !req.user) {
    return next(new UnauthorizedError());
  }
  next();
}

export function requireRole(roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ForbiddenError());
    }
    next();
  };
}

/** Removes the password field before sending a user object to the client. */
export function sanitizeUser<T extends { password?: string } | null | undefined>(user: T): T {
  if (!user) return user;
  const { password: _password, ...rest } = user as { password?: string } & Record<string, unknown>;
  return rest as T;
}

export function sanitizeUsers<T extends { password?: string }>(users: T[]): T[] {
  return users.map(sanitizeUser);
}
