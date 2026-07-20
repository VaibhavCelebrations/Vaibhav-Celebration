import type { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { ForbiddenError, UnauthorizedError } from "../lib/errors";
import type { AuthenticatedRequest } from "./auth";

export type GuestJwtPayload = {
  sub: string; // referenceCode
  referenceType: string;
  email: string;
  type: "guest";
};

export type GuestAuthenticatedRequest = AuthenticatedRequest & {
  guest?: GuestJwtPayload;
};

export function requireGuest(req: GuestAuthenticatedRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(new UnauthorizedError());
  }

  try {
    const payload = jwt.verify(header.slice(7), env.JWT_ACCESS_SECRET) as GuestJwtPayload;
    if (payload.type !== "guest") {
      return next(new UnauthorizedError("Invalid token type"));
    }
    req.guest = payload;
    return next();
  } catch {
    return next(new UnauthorizedError("Invalid or expired guest token"));
  }
}

/** Ensure guest token is scoped to the path param reference code */
export function requireGuestScope(paramName: string) {
  return (req: GuestAuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.guest) return next(new UnauthorizedError());
    const code = req.params[paramName];
    if (!code || req.guest.sub !== code) {
      return next(new ForbiddenError("Token is not scoped to this resource"));
    }
    return next();
  };
}

export function signGuestToken(payload: Omit<GuestJwtPayload, "type">) {
  return jwt.sign({ ...payload, type: "guest" }, env.JWT_ACCESS_SECRET, {
    expiresIn: `${env.GUEST_TOKEN_EXPIRES_MINUTES}m`,
  });
}
