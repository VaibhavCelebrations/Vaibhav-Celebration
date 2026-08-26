import { Router } from "express";
import { z } from "zod";
import { env } from "../../config/env";
import { validate } from "../../middleware/validate";
import {
  CUSTOMER_ACCESS_COOKIE,
  CUSTOMER_SESSION_COOKIE,
  requireCustomer,
  type CustomerAuthenticatedRequest,
} from "../../middleware/customer-auth";
import {
  changePassword,
  getCustomerById,
  loginCustomer,
  logoutAllSessions,
  logoutCustomer,
  refreshCustomerSession,
  requestPasswordReset,
  resetPassword,
  signupCustomer,
  updateCustomerProfile,
  verifyEmail,
} from "./customer-auth.service";

/**
 * Password policy: min 8 chars with upper, lower, and digit — enterprise
 * baseline. Both access AND session tokens live in httpOnly cookies only;
 * nothing touches localStorage or JS-readable storage on the client.
 */
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/[0-9]/, "Password must include a number");

const signupSchema = z.object({
  name: z.string().min(1, "Name is required").max(120, "Name is too long"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(6, "Phone number must be at least 6 characters").max(20, "Phone number cannot exceed 20 characters").optional(),
  password: passwordSchema,
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const SESSION_COOKIE_PATH = `${env.API_PREFIX}/customer/auth`;

function setAuthCookies(res: import("express").Response, result: { accessToken: string; sessionToken: string; sessionExpiresAt: Date }) {
  res.cookie(CUSTOMER_ACCESS_COOKIE, result.accessToken, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SECURE ? "none" : "lax",
    maxAge: 15 * 60 * 1000, // matches JWT_CUSTOMER_ACCESS_EXPIRES_IN default; refreshed silently
    path: "/",
  });
  res.cookie(CUSTOMER_SESSION_COOKIE, result.sessionToken, {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SECURE ? "none" : "lax",
    expires: result.sessionExpiresAt,
    path: SESSION_COOKIE_PATH,
  });
}

function clearAuthCookies(res: import("express").Response) {
  // Browsers only clear a cookie when secure/sameSite match the attributes it
  // was set with — path alone is not enough for SameSite=None cookies.
  const sameSite = env.COOKIE_SECURE ? "none" : "lax";
  res.clearCookie(CUSTOMER_ACCESS_COOKIE, { path: "/", secure: env.COOKIE_SECURE, sameSite });
  res.clearCookie(CUSTOMER_SESSION_COOKIE, { path: SESSION_COOKIE_PATH, secure: env.COOKIE_SECURE, sameSite });
}

export const customerAuthRouter = Router();

customerAuthRouter.post("/signup", validate(signupSchema), async (req, res, next) => {
  try {
    const result = await signupCustomer({
      ...req.body,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });
    setAuthCookies(res, result);
    return res.status(201).json({ success: true, data: { user: result.user } });
  } catch (err) {
    return next(err);
  }
});

customerAuthRouter.post("/login", validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body as z.infer<typeof loginSchema>;
    const result = await loginCustomer({ email, password, ipAddress: req.ip, userAgent: req.headers["user-agent"] });
    setAuthCookies(res, result);
    return res.json({ success: true, data: { user: result.user } });
  } catch (err) {
    return next(err);
  }
});

customerAuthRouter.post("/refresh", async (req, res, next) => {
  try {
    const rawToken = req.cookies?.[CUSTOMER_SESSION_COOKIE] as string | undefined;
    if (!rawToken) {
      return res.status(401).json({ success: false, error: { code: "UNAUTHORIZED", message: "Not signed in" } });
    }
    const result = await refreshCustomerSession(rawToken, req.ip, req.headers["user-agent"]);
    setAuthCookies(res, result);
    return res.json({ success: true, data: { user: result.user } });
  } catch (err) {
    clearAuthCookies(res);
    return next(err);
  }
});

customerAuthRouter.post("/logout", async (req, res) => {
  const rawToken = req.cookies?.[CUSTOMER_SESSION_COOKIE] as string | undefined;
  await logoutCustomer(rawToken);
  clearAuthCookies(res);
  return res.json({ success: true, data: { loggedOut: true } });
});

customerAuthRouter.post("/logout-all", requireCustomer, async (req, res, next) => {
  try {
    await logoutAllSessions((req as CustomerAuthenticatedRequest).customer!.sub);
    clearAuthCookies(res);
    return res.json({ success: true, data: { loggedOut: true } });
  } catch (err) {
    return next(err);
  }
});

customerAuthRouter.get("/me", requireCustomer, async (req, res, next) => {
  try {
    const customer = (req as CustomerAuthenticatedRequest).customer!;
    return res.json({ success: true, data: await getCustomerById(customer.sub) });
  } catch (err) {
    return next(err);
  }
});

customerAuthRouter.patch(
  "/me",
  requireCustomer,
  validate(z.object({ name: z.string().min(1).max(120).optional(), phone: z.string().min(6).max(20).optional() })),
  async (req, res, next) => {
    try {
      const customer = (req as CustomerAuthenticatedRequest).customer!;
      return res.json({ success: true, data: await updateCustomerProfile(customer.sub, req.body) });
    } catch (err) {
      return next(err);
    }
  },
);

customerAuthRouter.post(
  "/password/change",
  requireCustomer,
  validate(z.object({ currentPassword: z.string().min(1), newPassword: passwordSchema })),
  async (req, res, next) => {
    try {
      const customer = (req as CustomerAuthenticatedRequest).customer!;
      await changePassword(customer.sub, req.body.currentPassword, req.body.newPassword);
      clearAuthCookies(res);
      return res.json({ success: true, data: { passwordChanged: true } });
    } catch (err) {
      return next(err);
    }
  },
);

// ─── Password reset (nodemailer link, 10-minute validity) ───────────────────

customerAuthRouter.post(
  "/password/forgot",
  validate(z.object({ email: z.string().email() })),
  async (req, res, next) => {
    try {
      await requestPasswordReset(req.body.email, req.ip);
      // Always the same response — do not reveal whether the email exists.
      return res.json({
        success: true,
        data: { message: "If an account exists for that email, a reset link has been sent." },
      });
    } catch (err) {
      return next(err);
    }
  },
);

customerAuthRouter.post(
  "/password/reset",
  validate(z.object({ token: z.string().min(1), newPassword: passwordSchema })),
  async (req, res, next) => {
    try {
      await resetPassword(req.body.token, req.body.newPassword);
      return res.json({ success: true, data: { passwordReset: true } });
    } catch (err) {
      return next(err);
    }
  },
);

customerAuthRouter.post(
  "/email/verify",
  validate(z.object({ token: z.string().min(1) })),
  async (req, res, next) => {
    try {
      await verifyEmail(req.body.token);
      return res.json({ success: true, data: { verified: true } });
    } catch (err) {
      return next(err);
    }
  },
);
