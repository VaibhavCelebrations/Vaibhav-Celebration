import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { rateLimit, ipKeyGenerator } from "express-rate-limit";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { corsOrigins, env } from "./config/env";
import { logger } from "./lib/logger";
import { errorHandler } from "./middleware/error-handler";
import { noStore } from "./middleware/no-store";
import { getUploadDir } from "./integrations/media/storage";

import { authRouter } from "./modules/auth/auth.routes";
import { customerAuthRouter } from "./modules/customer-auth/customer-auth.routes";
import { healthRouter } from "./modules/health/health.routes";
import { guestRouter } from "./modules/guest/guest.routes";
import { themesRouter, adminThemesRouter } from "./modules/themes/themes.routes";
import {
  productsRouter,
  productCategoriesRouter,
  adminProductsRouter,
  adminProductCategoriesRouter,
} from "./modules/catalog/catalog.routes";
import { cartRouter, wishlistRouter } from "./modules/shop/shop.routes";
import { shopCheckoutRouter, ordersRouter, accountOrdersRouter } from "./modules/orders/orders.routes";
import { registryRouter, accountRegistryRouter, adminRegistryRouter } from "./modules/registry/registry.routes";
import { packagesRouter, adminPackagesRouter } from "./modules/packages/packages.routes";
import { adminExtraServicesRouter } from "./modules/extra-services/extra-services.routes";
import { pricingRouter } from "./modules/pricing/pricing.routes";
import { galleryRouter, adminGalleryRouter } from "./modules/gallery/gallery.routes";
import { contentRouter, adminContentRouter } from "./modules/content/content.routes";
import { blogRouter, adminBlogRouter } from "./modules/blog/blog.routes";
import { eventsRouter, adminEventsRouter } from "./modules/events/events.routes";
import { mediaRouter } from "./modules/media/media.routes";
import { availabilityRouter } from "./modules/availability/availability.routes";
import {
  bookingsRouter,
  checkoutRouter,
  adminBookingsRouter,
} from "./modules/bookings/bookings.routes";
import {
  paymentsRouter,
  invoicesRouter,
  adminInvoicesRouter,
} from "./modules/payments/payments.routes";
import {
  consultationsRouter,
  adminConsultationsRouter,
} from "./modules/consultations/consultations.routes";
import {
  leadsPublicRouter,
  adminLeadsRouter,
  adminCustomersRouter,
} from "./modules/crm/crm.routes";
import { chatbotRouter, adminChatbotRouter } from "./modules/chatbot/chatbot.routes";
import { pagesRouter, adminPagesRouter } from "./modules/pages/pages.routes";
import { publicSettingsRouter } from "./modules/settings/public-settings.routes";
import {
  adminCapacityRouter,
  adminSettingsRouter,
  adminAuditRouter,
  adminCacheRouter,
} from "./modules/admin/admin-ops.routes";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);

  app.use(
    helmet({
      contentSecurityPolicy: env.NODE_ENV === "production" ? undefined : false,
      // P4 — Changed from cross-origin (permissive) to same-site.
      // Prevents cross-origin embedded resources (iframes, img) from reading
      // admin API responses. Same-site is appropriate for a first-party admin SPA.
      crossOriginResourcePolicy: { policy: "same-site" },
    }),
  );

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || corsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(null, false);
      },
      credentials: true,
    }),
  );

  // Razorpay webhook needs raw body for signature verification
  app.use(
    `${env.API_PREFIX}/payments/webhook`,
    express.raw({ type: "application/json" }),
    (req, _res, next) => {
      if (Buffer.isBuffer(req.body)) {
        (req as express.Request & { rawBody?: string }).rawBody = req.body.toString("utf8");
        try {
          req.body = JSON.parse((req as express.Request & { rawBody?: string }).rawBody ?? "{}");
        } catch {
          // leave as buffer; handler will stringify
        }
      }
      next();
    },
  );

  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  app.use(
    pinoHttp({
      logger,
      autoLogging: env.NODE_ENV !== "test",
      // P1 — Redact credential-carrying headers at the HTTP logger level.
      // These paths are in addition to the base logger's redact list and cover
      // the pino-http-specific request/response object shape.
      redact: {
        paths: [
          "req.headers.authorization",  // Bearer JWT access token
          "req.headers.cookie",          // Refresh-token cookie
          "res.headers['set-cookie']",   // Outbound Set-Cookie on login/refresh
          // P6 — Body field redaction (guards against future body serializers)
          "req.body.password",
          "req.body.newPassword",
          "req.body.currentPassword",
          "req.body.otp",
          "req.body.token",
          "req.body.refreshToken",
        ],
        censor: "[REDACTED]",
      },
    }),
  );

  // Local media uploads (dev / fallback when R2 unset)
  app.use("/uploads", express.static(getUploadDir()));

  // ─── Rate Limiters ────────────────────────────────────────────────────────
  //
  // Keying strategy:
  //   • Public limiters  → keyed by IP (default)
  //   • Admin limiters   → keyed by JWT `sub` (admin user ID) so that
  //     multiple admins on the same office network each get their own quota.
  //     Falls back to IP when no valid Bearer token is present (the auth
  //     middleware will reject it anyway).

  /** Extracts admin user-id from Bearer JWT — falls back to IP. */
  function adminKeyGenerator(req: express.Request): string {
    const header = req.headers.authorization;
    if (header?.startsWith("Bearer ")) {
      try {
        const token = header.slice(7);
        // Decode without full verification — we only need the sub for bucketing.
        // Full cryptographic verification still happens in requireAdmin middleware.
        const parts = token.split(".");
        const b64Payload = parts[1];
        if (parts.length === 3 && b64Payload) {
          const payload = JSON.parse(Buffer.from(b64Payload, "base64url").toString("utf8")) as {
            sub?: string;
          };
          if (payload.sub) return `admin:${payload.sub}`;
        }
      } catch {
        // fall through to IP
      }
    }
    return `ip:${ipKeyGenerator(req.ip ?? "unknown")}`;
  }

  /** Public CMS endpoints — keyed by IP. */
  const publicLimiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX_PUBLIC,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: { code: "RATE_LIMITED", message: "Too many requests. Please wait and try again." },
    },
  });

  /** Auth / login endpoints — keyed by IP, tight. */
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: { code: "RATE_LIMITED", message: "Too many authentication attempts. Please wait 15 minutes." },
    },
  });

  /** High-sensitivity write endpoints (bookings, consultations, leads) — keyed by IP. */
  const strictLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: { code: "RATE_LIMITED", message: "Too many requests. Please wait and try again." },
    },
  });

  /** Customer signup/login/password-reset — keyed by IP, tight (brute-force protection). */
  const customerAuthLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: { code: "RATE_LIMITED", message: "Too many attempts. Please wait 15 minutes." },
    },
  });

  /** Guest OTP — keyed by IP, very tight. */
  const otpLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: { code: "RATE_LIMITED", message: "Too many OTP attempts. Please wait 15 minutes." },
    },
  });

  /**
   * Admin panel — keyed by JWT sub (admin user ID).
   * 1 000 requests per 10-minute window per admin user.
   * Multiple admins sharing one office IP each get their own full quota.
   */
  const adminLimiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX_ADMIN,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: adminKeyGenerator,
    validate: { ip: false },
    message: {
      success: false,
      error: {
        code: "RATE_LIMITED",
        message:
          "Admin request limit reached. Your quota resets automatically — please wait a moment and retry.",
      },
    },
  });

  /**
   * Media upload endpoints (presign + multipart) — keyed by JWT sub.
   * Prevents accidental bulk-upload loops from exhausting R2 or bandwidth.
   * 100 upload operations per 10-minute window per admin user.
   */
  const mediaUploadLimiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX_UPLOAD,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: adminKeyGenerator,
    validate: { ip: false },
    message: {
      success: false,
      error: {
        code: "RATE_LIMITED",
        message: "Upload limit reached. You can upload up to 100 files per 10 minutes. Please wait and retry.",
      },
    },
  });

  // Health check — no rate limiting (used by uptime monitors)
  app.use(healthRouter);

  const api = express.Router();

  // Auth & guest — IP-keyed, tight
  api.use("/auth", authLimiter, authRouter);
  api.use("/customer/auth", customerAuthLimiter, customerAuthRouter);
  api.use("/guest", otpLimiter, guestRouter);

  // Public CMS — IP-keyed, 100/10min
  api.use("/themes", publicLimiter, themesRouter);
  api.use("/products", publicLimiter, productsRouter);
  api.use("/product-categories", publicLimiter, productCategoriesRouter);
  api.use("/packages", publicLimiter, packagesRouter);
  api.use("/pricing", publicLimiter, pricingRouter);
  api.use("/gallery", publicLimiter, galleryRouter);
  api.use(contentRouter); // no extra limiter — served via static-ish reads
  api.use("/pages", publicLimiter, pagesRouter);
  api.use("/settings", publicLimiter, publicSettingsRouter);
  api.use("/blog", publicLimiter, blogRouter);
  api.use("/events", publicLimiter, eventsRouter);

  // Customer shop — requireCustomer enforced inside the routers themselves
  api.use("/cart", publicLimiter, cartRouter);
  api.use("/wishlist", publicLimiter, wishlistRouter);
  api.use("/shop/checkout", publicLimiter, shopCheckoutRouter);
  api.use("/shop/orders", strictLimiter, ordersRouter);
  api.use("/account/orders", publicLimiter, accountOrdersRouter);
  api.use("/account/registries", publicLimiter, accountRegistryRouter);
  api.use("/registry", publicLimiter, registryRouter);

  // Booking journey — mix of public & strict
  api.use("/availability", publicLimiter, availabilityRouter);
  api.use("/bookings", strictLimiter, bookingsRouter);
  api.use("/checkout", checkoutRouter);
  api.use("/payments", paymentsRouter);
  api.use("/invoices", publicLimiter, invoicesRouter);
  api.use("/consultations", strictLimiter, consultationsRouter);
  api.use("/leads", strictLimiter, leadsPublicRouter);
  api.use("/chatbot", publicLimiter, chatbotRouter);

  // ─── Admin Panel ──────────────────────────────────────────────────────────
  // All admin routes: JWT-keyed rate limit + Cache-Control: no-store (P3).
  // noStore prevents browsers / CDN from caching PII or admin data.
  api.use("/admin/themes", adminLimiter, noStore, adminThemesRouter);
  api.use("/admin/products", adminLimiter, noStore, adminProductsRouter);
  api.use("/admin/product-categories", adminLimiter, noStore, adminProductCategoriesRouter);
  api.use("/admin/registries", adminLimiter, noStore, adminRegistryRouter);
  api.use("/admin/packages", adminLimiter, noStore, adminPackagesRouter);
  api.use("/admin/extra-services", adminLimiter, noStore, adminExtraServicesRouter);
  api.use("/admin/gallery", adminLimiter, noStore, adminGalleryRouter);
  api.use("/admin", adminLimiter, noStore, adminContentRouter);
  api.use("/admin/pages", adminLimiter, noStore, adminPagesRouter);
  api.use("/admin/blog", adminLimiter, noStore, adminBlogRouter);
  api.use("/admin/events", adminLimiter, noStore, adminEventsRouter);
  // Media router: general browsing uses adminLimiter; upload paths get an
  // additional tighter mediaUploadLimiter (100/10min) on top.
  const mediaAdminRouter = express.Router();
  mediaAdminRouter.use(adminLimiter);
  mediaAdminRouter.use(noStore);
  mediaAdminRouter.use(["/presign", "/upload", "/upload-binary", "/complete"], mediaUploadLimiter);
  mediaAdminRouter.use(mediaRouter);
  api.use("/admin/media", mediaAdminRouter);
  api.use("/admin/bookings", adminLimiter, noStore, adminBookingsRouter);
  api.use("/admin/invoices", adminLimiter, noStore, adminInvoicesRouter);
  api.use("/admin/consultations", adminLimiter, noStore, adminConsultationsRouter);
  api.use("/admin/leads", adminLimiter, noStore, adminLeadsRouter);
  api.use("/admin/customers", adminLimiter, noStore, adminCustomersRouter);
  api.use("/admin/chatbot", adminLimiter, noStore, adminChatbotRouter);
  api.use("/admin/capacity-rules", adminLimiter, noStore, adminCapacityRouter);
  api.use("/admin/settings", adminLimiter, noStore, adminSettingsRouter);
  api.use("/admin/audit-log", adminLimiter, noStore, adminAuditRouter);
  api.use("/admin/cache", adminLimiter, noStore, adminCacheRouter);

  app.use(env.API_PREFIX, api);

  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: { code: "NOT_FOUND", message: "Route not found" },
    });
  });

  app.use(errorHandler);

  return app;
}
