import type { NextFunction, Request, Response } from "express";
import type { AdminRole } from "@prisma/client";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { ForbiddenError, UnauthorizedError } from "../lib/errors";

export type AdminJwtPayload = {
  sub: string;
  email: string;
  role: AdminRole;
  type: "access";
};

export type AuthenticatedRequest = Request & {
  admin?: AdminJwtPayload;
};

export function requireAdmin(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(new UnauthorizedError());
  }

  const token = header.slice("Bearer ".length);
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AdminJwtPayload;
    if (payload.type !== "access") {
      return next(new UnauthorizedError("Invalid token type"));
    }
    req.admin = payload;
    return next();
  } catch {
    return next(new UnauthorizedError("Invalid or expired token"));
  }
}

export function requireRoles(...roles: AdminRole[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.admin) {
      return next(new UnauthorizedError());
    }
    if (!roles.includes(req.admin.role)) {
      return next(new ForbiddenError());
    }
    return next();
  };
}
