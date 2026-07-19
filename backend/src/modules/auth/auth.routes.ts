import { Router } from "express";
import { z } from "zod";
import { env } from "../../config/env";
import { validate } from "../../middleware/validate";
import {
  getAdminById,
  getRefreshCookieName,
  loginAdmin,
  refreshAccessToken,
} from "./auth.service";
import { requireAdmin, type AuthenticatedRequest } from "../../middleware/auth";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const authRouter = Router();

authRouter.post("/admin/login", validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body as z.infer<typeof loginSchema>;
    const result = await loginAdmin(email, password);

    res.cookie(getRefreshCookieName(), result.refreshToken, {
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
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

authRouter.post("/admin/refresh", async (req, res, next) => {
  try {
    const token = req.cookies?.[getRefreshCookieName()] as string | undefined;
    if (!token) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Missing refresh token" },
      });
    }

    const result = await refreshAccessToken(token);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/admin/logout", (_req, res) => {
  res.clearCookie(getRefreshCookieName(), { path: "/" });
  res.json({ success: true, data: { loggedOut: true } });
});

authRouter.get("/admin/me", requireAdmin, async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const admin = await getAdminById(authReq.admin!.sub);
    res.json({ success: true, data: admin });
  } catch (err) {
    next(err);
  }
});
