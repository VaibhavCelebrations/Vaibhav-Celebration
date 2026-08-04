import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { UnauthorizedError } from "../lib/errors";

export type CustomerJwtPayload = {
  sub: string;
  email: string;
  type: "customer_access";
};

export type CustomerAuthenticatedRequest = Request & {
  customer?: CustomerJwtPayload;
};

export const CUSTOMER_ACCESS_COOKIE = "vbc_customer_access";
export const CUSTOMER_SESSION_COOKIE = "vbc_customer_session";

/**
 * Verifies the httpOnly access-token cookie. Unlike the admin panel (Bearer
 * header + localStorage), the storefront never touches the token in JS —
 * every request just needs `credentials: "include"`. This eliminates XSS
 * token theft as an attack vector entirely for customer accounts.
 */
export function requireCustomer(req: CustomerAuthenticatedRequest, _res: Response, next: NextFunction) {
  const token = req.cookies?.[CUSTOMER_ACCESS_COOKIE] as string | undefined;
  if (!token) {
    return next(new UnauthorizedError("Please sign in to continue"));
  }
  try {
    const payload = jwt.verify(token, env.JWT_CUSTOMER_ACCESS_SECRET) as CustomerJwtPayload;
    if (payload.type !== "customer_access") {
      return next(new UnauthorizedError("Invalid token type"));
    }
    req.customer = payload;
    return next();
  } catch {
    return next(new UnauthorizedError("Your session has expired. Please sign in again."));
  }
}

/** Best-effort — attaches req.customer if a valid cookie is present, never rejects. */
export function optionalCustomer(req: CustomerAuthenticatedRequest, _res: Response, next: NextFunction) {
  const token = req.cookies?.[CUSTOMER_ACCESS_COOKIE] as string | undefined;
  if (!token) return next();
  try {
    const payload = jwt.verify(token, env.JWT_CUSTOMER_ACCESS_SECRET) as CustomerJwtPayload;
    if (payload.type === "customer_access") {
      req.customer = payload;
    }
  } catch {
    // ignore — anonymous
  }
  return next();
}
