import type { NextFunction, Request, Response } from "express";
import { isAllowedOrigin } from "../config/origins";

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function refererOrigin(referer: string | undefined): string | null {
  if (!referer) return null;
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

/**
 * CSRF defence for cookie-authenticated APIs (customer + admin refresh cookies are SameSite=None
 * so a separate-domain frontend can use them, which means the browser will attach them to
 * cross-site requests too).
 *
 * State-changing requests that arrive from a browser carry an `Origin` (or at least a `Referer`)
 * header. If it names an origin we don't trust, refuse the request before any handler runs.
 * Requests with neither header (server-to-server calls: Next.js SSR, Razorpay/Meta webhooks, curl)
 * are not browser-initiated, so they cannot be CSRF and pass through — they are authenticated by
 * their own means (signatures, bearer tokens).
 */
export function originGuard(req: Request, res: Response, next: NextFunction) {
  if (!UNSAFE_METHODS.has(req.method)) return next();

  const origin = req.get("origin") ?? refererOrigin(req.get("referer"));
  if (!origin) return next();
  if (isAllowedOrigin(origin)) return next();

  return res.status(403).json({
    success: false,
    error: { code: "FORBIDDEN_ORIGIN", message: "Request origin is not allowed" },
  });
}
