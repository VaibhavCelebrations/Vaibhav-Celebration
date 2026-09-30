import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import jwt from "jsonwebtoken";
import pinoHttp from "pino-http";
import { env } from "./config/env";
import { isAllowedOrigin } from "./config/origins";
import { createLimiter, ipKey } from "./lib/rate-limit";
import { originGuard } from "./middleware/origin-guard";
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
import { productCollectionsRouter, adminProductCollectionsRouter } from "./modules/catalog/collections.routes";
import { cartRouter, wishlistRouter, deliverySettingsRouter } from "./modules/shop/shop.routes";
import { shopCheckoutRouter, ordersRouter, accountOrdersRouter, adminOrdersRouter, guestCheckoutRouter } from "./modules/orders/orders.routes";
import { registryRouter, accountRegistryRouter, adminRegistryRouter } from "./modules/registry/registry.routes";
import { packagesRouter, adminPackagesRouter } from "./modules/packages/packages.routes";
import { adminExtraServicesRouter } from "./modules/extra-services/extra-services.routes";
import { pricingRouter } from "./modules/pricing/pricing.routes";
import { builderRouter } from "./modules/builder/builder.routes";
import { galleryRouter, adminGalleryRouter } from "./modules/gallery/gallery.routes";
import { contentRouter, adminContentRouter } from "./modules/content/content.routes";
import { blogRouter, adminBlogRouter } from "./modules/blog/blog.routes";
import { eventsRouter, adminEventsRouter } from "./modules/events/events.routes";
import { mediaRouter } from "./modules/media/media.routes";
import {
  paymentsRouter,
  invoicesRouter,
  adminInvoicesRouter,
  adminPaymentsRouter,
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
  adminCalendarRouter,
  adminSettingsRouter,
  adminAuditRouter,
  adminCacheRouter,
} from "./modules/admin/admin-ops.routes";
import { recycleBinRouter } from "./modules/admin/recycle-bin.routes";
import {
  adminSuppliersRouter,
  adminPurchaseOrdersRouter,
} from "./modules/inventory/inventory.routes";
import { adminInventoryReportsRouter } from "./modules/inventory/reports.routes";
import { whatsappWebhookRouter } from "./modules/whatsapp/whatsapp.routes";
import { accountConsentRouter } from "./modules/consent/consent.routes";

export function createApp() {
  const app = express();

  // Number of reverse-proxy hops in front of the app (nginx = 1; nginx behind a cloud LB = 2).
  // It must match reality: too low and every client shares the proxy's IP (one shared rate-limit
  // bucket); too high and clients can spoof X-Forwarded-For to dodge rate limits.
  app.set("trust proxy", env.TRUST_PROXY);
  app.disable("x-powered-by");

  app.use(
    helmet({
      // This is a JSON API — nothing it returns should ever render or be framed.
      contentSecurityPolicy: {
        useDefaults: false,
        directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"], baseUri: ["'none'"], formAction: ["'none'"] },
      },
      strictTransportSecurity: { maxAge: 63_072_000, includeSubDomains: true },
      referrerPolicy: { policy: "no-referrer" },
      // P4 — same-site (not cross-origin): other origins can't embed/read API responses.
      crossOriginResourcePolicy: { policy: "same-site" },
    }),
  );

  // Allowlist shared with the CSRF origin guard — see config/origins.ts.
  app.use(
    cors({
      origin(origin, callback) {
        callback(null, !origin || isAllowedOrigin(origin));
      },
      credentials: true,
      methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      maxAge: 600,
    }),
  );

  // Razorpay webhook needs raw body for signature verification
  app.use(
    `${env.API_PREFIX}/payments/webhook`,
    express.raw({ type: "application/json", limit: "1mb" }),
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

  // Meta WhatsApp webhook needs raw body for X-Hub-Signature-256 verification
  app.use(
    `${env.API_PREFIX}/whatsapp/webhook`,
    express.raw({ type: "application/json", limit: "1mb" }),
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

  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false, limit: "100kb" }));
  app.use(cookieParser());
  // CSRF: refuse state-changing requests whose Origin/Referer isn't on the allowlist.
  app.use(env.API_PREFIX, originGuard);

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
  app.use(
    "/uploads",
    (_req, res, next) => {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      // Uploaded files are data, never documents: forbid script execution and type sniffing.
      res.setHeader("Content-Security-Policy", "default-src 'none'; img-src 'self'; media-src 'self'; sandbox");
      res.setHeader("X-Content-Type-Options", "nosniff");
      next();
    },
    express.static(getUploadDir()),
  );

  // ─── Rate Limiters ────────────────────────────────────────────────────────
  //
  // All limiters are Redis-backed (shared across API replicas) — see lib/rate-limit.ts.
  //
  // Keying strategy:
  //   • Public limiters  → keyed by IP (default)
  //   • Admin limiters   → keyed by the *verified* JWT `sub` (admin user ID) so that
  //     multiple admins on the same office network each get their own quota.
  //     Falls back to IP when there is no valid Bearer token — an unverified token must
  //     never choose its own bucket, or an attacker could mint a fresh bucket per request.

  /** Extracts the admin user-id from a cryptographically verified Bearer JWT — falls back to IP. */
  function adminKeyGenerator(req: express.Request): string {
    const header = req.headers.authorization;
    if (header?.startsWith("Bearer ")) {
      try {
        const payload = jwt.verify(header.slice(7), env.JWT_ACCESS_SECRET, { algorithms: ["HS256"] }) as {
          sub?: string;
        };
        if (payload.sub) return `admin:${payload.sub}`;
      } catch {
        // invalid / expired token — bucket by IP; requireAdmin will reject it anyway
      }
    }
    return ipKey(req);
  }

  /** Public CMS endpoints — keyed by IP. */
  const publicLimiter = createLimiter({
    name: "public",
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX_PUBLIC,
    message: "Too many requests. Please wait and try again.",
  });

  /** Auth / login endpoints — keyed by IP, tight. */
  const authLimiter = createLimiter({
    name: "auth",
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: "Too many authentication attempts. Please wait 15 minutes.",
  });

  /** High-sensitivity write endpoints (orders, consultations, leads) — keyed by IP. */
  const strictLimiter = createLimiter({
    name: "strict",
    windowMs: 10 * 60 * 1000,
    max: 10,
    message: "Too many requests. Please wait and try again.",
  });

  /** Customer signup/login/password-reset — keyed by IP, tight (brute-force protection). */
  const customerAuthLimiter = createLimiter({
    name: "customer-auth",
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: "Too many attempts. Please wait 15 minutes.",
  });

  /**
   * Session upkeep (`GET /me`, `POST /refresh`) — every signed-in tab calls these on load and every
   * time the 15-minute access token lapses, so they must not share the brute-force budget above.
   * Refresh tokens are 32 random bytes; guessing is not a realistic threat at this rate.
   */
  const customerSessionLimiter = createLimiter({
    name: "customer-session",
    windowMs: 15 * 60 * 1000,
    max: 300,
    message: "Too many requests. Please wait and try again.",
  });

  /** Guest OTP — keyed by IP, very tight. */
  const otpLimiter = createLimiter({
    name: "otp",
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: "Too many OTP attempts. Please wait 15 minutes.",
  });

  /** Chatbot flow reads happen on every page load with the widget — generous but bounded. */
  const chatbotFlowLimiter = createLimiter({
    name: "chatbot-flow",
    windowMs: 60 * 1000,
    max: env.RATE_LIMIT_CHATBOT_FLOW_PER_MINUTE,
    message: "Too many requests. Please slow down.",
  });

  /**
   * Chatbot session saves create CRM leads (and can trigger notifications) — the abuse target
   * for spam/lead flooding. Small hourly allowance per IP; a real visitor completes one or two flows.
   */
  const chatbotSessionLimiter = createLimiter({
    name: "chatbot-session",
    windowMs: 60 * 60 * 1000,
    max: env.RATE_LIMIT_CHATBOT_SESSIONS_PER_HOUR,
    message: "You've reached the chat limit for now. Please try again later or contact us on WhatsApp.",
  });

  /** Razorpay / Meta webhooks are signature-verified; the limiter only caps floods of forged calls. */
  const webhookLimiter = createLimiter({
    name: "webhook",
    windowMs: 60 * 1000,
    max: 300,
    message: "Too many requests.",
  });

  /**
   * Admin panel — keyed by verified JWT sub (admin user ID).
   * Multiple admins sharing one office IP each get their own full quota.
   */
  const adminLimiter = createLimiter({
    name: "admin",
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX_ADMIN,
    keyGenerator: adminKeyGenerator,
    validate: { ip: false },
    message: "Admin request limit reached. Your quota resets automatically — please wait a moment and retry.",
  });

  /**
   * Media upload endpoints (presign + multipart) — keyed by verified JWT sub.
   * Prevents accidental bulk-upload loops from exhausting R2 or bandwidth.
   */
  const mediaUploadLimiter = createLimiter({
    name: "media-upload",
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX_UPLOAD,
    keyGenerator: adminKeyGenerator,
    validate: { ip: false },
    message: `Upload limit reached. You can upload up to ${env.RATE_LIMIT_MAX_UPLOAD} files per 10 minutes. Please wait and retry.`,
  });

  // Health check — no rate limiting (used by uptime monitors)
  app.use(healthRouter);

  const api = express.Router();

  // Auth & guest — IP-keyed, tight
  api.use("/auth", authLimiter, authRouter);
  // Guest-checkout OTP paths get the tighter OTP limiter (applied before the auth router).
  api.use("/customer/auth/guest-checkout", otpLimiter);
  api.use(
    "/customer/auth",
    (req, res, next) => {
      const isSessionUpkeep =
        (req.method === "GET" && req.path === "/me") || (req.method === "POST" && req.path === "/refresh");
      return (isSessionUpkeep ? customerSessionLimiter : customerAuthLimiter)(req, res, next);
    },
    customerAuthRouter,
  );
  api.use("/guest", otpLimiter, guestRouter);

  // Public CMS — IP-keyed, 100/10min
  api.use("/themes", publicLimiter, themesRouter);
  api.use("/products", publicLimiter, productsRouter);
  api.use("/product-categories", publicLimiter, productCategoriesRouter);
  api.use("/collections", publicLimiter, productCollectionsRouter);
  api.use("/packages", publicLimiter, packagesRouter);
  api.use("/pricing", publicLimiter, pricingRouter);
  api.use("/builder", publicLimiter, builderRouter);
  api.use("/gallery", publicLimiter, galleryRouter);
  api.use(publicLimiter, contentRouter);
  api.use("/pages", publicLimiter, pagesRouter);
  api.use("/settings", publicLimiter, publicSettingsRouter);
  api.use("/blog", publicLimiter, blogRouter);
  api.use("/events", publicLimiter, eventsRouter);

  // Customer shop — requireCustomer enforced inside the routers themselves
  api.use("/cart", publicLimiter, cartRouter);
  api.use("/wishlist", publicLimiter, wishlistRouter);
  api.use("/shop/delivery-settings", publicLimiter, deliverySettingsRouter);
  api.use("/shop/checkout", publicLimiter, shopCheckoutRouter);
  // Guest checkout: quote/shop/direct/package under publicLimiter;
  // verify-payment is a sensitive write — apply strictLimiter in addition.
  api.use("/shop/guest-checkout/verify-payment", strictLimiter);
  api.use("/shop/guest-checkout", publicLimiter, guestCheckoutRouter);
  api.use("/shop/orders", strictLimiter, ordersRouter);
  api.use("/account/orders", publicLimiter, accountOrdersRouter);
  api.use("/account/registries", publicLimiter, accountRegistryRouter);
  api.use("/account/consents", publicLimiter, accountConsentRouter);
  api.use("/registry", publicLimiter, registryRouter);

  api.use("/whatsapp/webhook", webhookLimiter, whatsappWebhookRouter);
  // Webhooks get their own (looser) limiter; everything else under /payments uses the public one.
  api.use("/payments/webhook", webhookLimiter);
  api.use(
    "/payments",
    (req, res, next) => (req.path === "/webhook" ? next() : publicLimiter(req, res, next)),
    paymentsRouter,
  );
  api.use("/invoices", publicLimiter, invoicesRouter);
  api.use("/consultations", strictLimiter, consultationsRouter);
  api.use("/leads", strictLimiter, leadsPublicRouter);
  // Chatbot: flow reads and lead-creating session saves are limited separately (see limiters above).
  api.use("/chatbot/session", chatbotSessionLimiter);
  api.use("/chatbot", chatbotFlowLimiter, chatbotRouter);

  // ─── Admin Panel ──────────────────────────────────────────────────────────
  // All admin routes: JWT-keyed rate limit + Cache-Control: no-store (P3).
  // noStore prevents browsers / CDN from caching PII or admin data.
  api.use("/admin/themes", adminLimiter, noStore, adminThemesRouter);
  api.use("/admin/products", adminLimiter, noStore, adminProductsRouter);
  api.use("/admin/product-categories", adminLimiter, noStore, adminProductCategoriesRouter);
  api.use("/admin/collections", adminLimiter, noStore, adminProductCollectionsRouter);
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
  api.use("/admin/orders", adminLimiter, noStore, adminOrdersRouter);
  api.use("/admin/invoices", adminLimiter, noStore, adminInvoicesRouter);
  api.use("/admin/payments", adminLimiter, noStore, adminPaymentsRouter);
  api.use("/admin/consultations", adminLimiter, noStore, adminConsultationsRouter);
  api.use("/admin/leads", adminLimiter, noStore, adminLeadsRouter);
  api.use("/admin/customers", adminLimiter, noStore, adminCustomersRouter);
  api.use("/admin/chatbot", adminLimiter, noStore, adminChatbotRouter);
  api.use("/admin/calendar", adminLimiter, noStore, adminCalendarRouter);
  api.use("/admin/settings", adminLimiter, noStore, adminSettingsRouter);
  api.use("/admin/audit-log", adminLimiter, noStore, adminAuditRouter);
  api.use("/admin/cache", adminLimiter, noStore, adminCacheRouter);
  api.use("/admin/recycle-bin", adminLimiter, noStore, recycleBinRouter);
  // Inventory management (suppliers, warehouses, purchase orders, reports).
  api.use("/admin/suppliers", adminLimiter, noStore, adminSuppliersRouter);
  api.use("/admin/purchase-orders", adminLimiter, noStore, adminPurchaseOrdersRouter);
  api.use("/admin/inventory-reports", adminLimiter, noStore, adminInventoryReportsRouter);

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
