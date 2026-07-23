import { Router } from "express";
import { z } from "zod";
import { env } from "../../config/env";
import { validate } from "../../middleware/validate";
import {
  getAdminById,
  getRefreshCookieName,
  loginAdmin,
  logoutAdmin,
  refreshAccessToken,
} from "./auth.service";
import { requireAdmin, type AuthenticatedRequest } from "../../middleware/auth";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

/**
 * P5 — Cookie path restriction.
 *
 * Narrowing the path from "/" to the auth prefix means the browser will ONLY
 * attach the refresh cookie to /api/v1/auth/* requests. Every other admin API
 * call (gallery, themes, bookings …) will NOT carry the cookie, dramatically
 * reducing the surface area where it could be logged or intercepted.
 */
const COOKIE_PATH = `${env.API_PREFIX}/auth`;


export const authRouter = Router();


// ─── Login ────────────────────────────────────────────────────────────────────

authRouter.post("/admin/login", validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body as z.infer<typeof loginSchema>;

    const result = await loginAdmin(
      email,
      password,
      req.ip,
      req.headers["user-agent"],
    );

    res.cookie(getRefreshCookieName(), result.refreshToken, {
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: "strict", // upgraded from lax → strict for admin cookie
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: COOKIE_PATH, // P5: narrowed from "/" to auth prefix only
    });

    res.json({
      success: true,
      data: {
        accessToken: result.accessToken,
        admin: result.admin,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── Refresh (with rotation) ──────────────────────────────────────────────────

authRouter.post("/admin/refresh", async (req, res, next) => {
  try {
    const rawToken = req.cookies?.[getRefreshCookieName()] as string | undefined;
    if (!rawToken) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Missing refresh token" },
      });
    }

    const result = await refreshAccessToken(rawToken, req.ip, req.headers["user-agent"]);

    // P2 — Set the NEW rotated refresh token as a fresh HttpOnly cookie
    res.cookie(getRefreshCookieName(), result.newRefreshToken, {
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: COOKIE_PATH,
    });

    res.json({
      success: true,
      data: {
        accessToken: result.accessToken,
        admin: result.admin,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── Logout ───────────────────────────────────────────────────────────────────

authRouter.post("/admin/logout", async (req, res) => {
  const rawToken = req.cookies?.[getRefreshCookieName()] as string | undefined;

  // P2 — Server-side revocation of the entire token family
  if (rawToken) {
    await logoutAdmin(rawToken);
  }

  res.clearCookie(getRefreshCookieName(), { path: COOKIE_PATH });
  res.json({ success: true, data: { loggedOut: true } });
});

// ─── Current user ─────────────────────────────────────────────────────────────

authRouter.get("/admin/me", requireAdmin, async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const admin = await getAdminById(authReq.admin!.sub);
    res.json({ success: true, data: admin });
  } catch (err) {
    next(err);
  }
});
