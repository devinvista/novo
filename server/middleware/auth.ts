import type { Request, Response, NextFunction } from "express";
import { UnauthorizedError, ForbiddenError } from "../errors/app-error";

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!(req as any).isAuthenticated?.() || !req.user) {
    return next(new UnauthorizedError());
  }
  next();
}

export function requireRole(roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = req.user as any;
    if (!user || !roles.includes(user.role)) {
      return next(new ForbiddenError());
    }
    next();
  };
}

/** Removes the password field before sending a user object to the client. */
export function sanitizeUser<T extends { password?: string } | null | undefined>(user: T): T {
  if (!user) return user;
  const { password: _password, ...rest } = user as any;
  return rest as T;
}

export function sanitizeUsers(users: any[]) {
  return users.map(sanitizeUser);
}
