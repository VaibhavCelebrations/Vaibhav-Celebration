"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const express_rate_limit_1 = require("express-rate-limit");
const helmet_1 = __importDefault(require("helmet"));
const pino_http_1 = __importDefault(require("pino-http"));
const env_1 = require("./config/env");
const logger_1 = require("./lib/logger");
const error_handler_1 = require("./middleware/error-handler");
const no_store_1 = require("./middleware/no-store");
const storage_1 = require("./integrations/media/storage");
const auth_routes_1 = require("./modules/auth/auth.routes");
const customer_auth_routes_1 = require("./modules/customer-auth/customer-auth.routes");
const health_routes_1 = require("./modules/health/health.routes");
const guest_routes_1 = require("./modules/guest/guest.routes");
const themes_routes_1 = require("./modules/themes/themes.routes");
const catalog_routes_1 = require("./modules/catalog/catalog.routes");
const collections_routes_1 = require("./modules/catalog/collections.routes");
const shop_routes_1 = require("./modules/shop/shop.routes");
const orders_routes_1 = require("./modules/orders/orders.routes");
const registry_routes_1 = require("./modules/registry/registry.routes");
const packages_routes_1 = require("./modules/packages/packages.routes");
const extra_services_routes_1 = require("./modules/extra-services/extra-services.routes");
const pricing_routes_1 = require("./modules/pricing/pricing.routes");
const builder_routes_1 = require("./modules/builder/builder.routes");
const gallery_routes_1 = require("./modules/gallery/gallery.routes");
const content_routes_1 = require("./modules/content/content.routes");
const blog_routes_1 = require("./modules/blog/blog.routes");
const events_routes_1 = require("./modules/events/events.routes");
const media_routes_1 = require("./modules/media/media.routes");
const payments_routes_1 = require("./modules/payments/payments.routes");
const consultations_routes_1 = require("./modules/consultations/consultations.routes");
const crm_routes_1 = require("./modules/crm/crm.routes");
const chatbot_routes_1 = require("./modules/chatbot/chatbot.routes");
const pages_routes_1 = require("./modules/pages/pages.routes");
const public_settings_routes_1 = require("./modules/settings/public-settings.routes");
const admin_ops_routes_1 = require("./modules/admin/admin-ops.routes");
const recycle_bin_routes_1 = require("./modules/admin/recycle-bin.routes");
const whatsapp_routes_1 = require("./modules/whatsapp/whatsapp.routes");
function createApp() {
    const app = (0, express_1.default)();
    app.set("trust proxy", 1);
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: env_1.env.NODE_ENV === "production" ? undefined : false,
        // P4 — Changed from cross-origin (permissive) to same-site.
        // Prevents cross-origin embedded resources (iframes, img) from reading
        // admin API responses. Same-site is appropriate for a first-party admin SPA.
        crossOriginResourcePolicy: { policy: "same-site" },
    }));
    app.use((0, cors_1.default)({
        origin(origin, callback) {
            if (!origin || env_1.corsOrigins.includes(origin)) {
                callback(null, true);
                return;
            }
            callback(null, false);
        },
        credentials: true,
    }));
    // Razorpay webhook needs raw body for signature verification
    app.use(`${env_1.env.API_PREFIX}/payments/webhook`, express_1.default.raw({ type: "application/json" }), (req, _res, next) => {
        if (Buffer.isBuffer(req.body)) {
            req.rawBody = req.body.toString("utf8");
            try {
                req.body = JSON.parse(req.rawBody ?? "{}");
            }
            catch {
                // leave as buffer; handler will stringify
            }
        }
        next();
    });
    // Meta WhatsApp webhook needs raw body for X-Hub-Signature-256 verification
    app.use(`${env_1.env.API_PREFIX}/whatsapp/webhook`, express_1.default.raw({ type: "application/json" }), (req, _res, next) => {
        if (Buffer.isBuffer(req.body)) {
            req.rawBody = req.body.toString("utf8");
            try {
                req.body = JSON.parse(req.rawBody ?? "{}");
            }
            catch {
                // leave as buffer; handler will stringify
            }
        }
        next();
    });
    app.use(express_1.default.json({ limit: "2mb" }));
    app.use(express_1.default.urlencoded({ extended: true }));
    app.use((0, cookie_parser_1.default)());
    app.use((0, pino_http_1.default)({
        logger: logger_1.logger,
        autoLogging: env_1.env.NODE_ENV !== "test",
        // P1 — Redact credential-carrying headers at the HTTP logger level.
        // These paths are in addition to the base logger's redact list and cover
        // the pino-http-specific request/response object shape.
        redact: {
            paths: [
                "req.headers.authorization", // Bearer JWT access token
                "req.headers.cookie", // Refresh-token cookie
                "res.headers['set-cookie']", // Outbound Set-Cookie on login/refresh
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
    }));
    // Local media uploads (dev / fallback when R2 unset)
    app.use("/uploads", (_req, res, next) => {
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
        next();
    }, express_1.default.static((0, storage_1.getUploadDir)()));
    // ─── Rate Limiters ────────────────────────────────────────────────────────
    //
    // Keying strategy:
    //   • Public limiters  → keyed by IP (default)
    //   • Admin limiters   → keyed by JWT `sub` (admin user ID) so that
    //     multiple admins on the same office network each get their own quota.
    //     Falls back to IP when no valid Bearer token is present (the auth
    //     middleware will reject it anyway).
    /** Extracts admin user-id from Bearer JWT — falls back to IP. */
    function adminKeyGenerator(req) {
        const header = req.headers.authorization;
        if (header?.startsWith("Bearer ")) {
            try {
                const token = header.slice(7);
                // Decode without full verification — we only need the sub for bucketing.
                // Full cryptographic verification still happens in requireAdmin middleware.
                const parts = token.split(".");
                const b64Payload = parts[1];
                if (parts.length === 3 && b64Payload) {
                    const payload = JSON.parse(Buffer.from(b64Payload, "base64url").toString("utf8"));
                    if (payload.sub)
                        return `admin:${payload.sub}`;
                }
            }
            catch {
                // fall through to IP
            }
        }
        return `ip:${(0, express_rate_limit_1.ipKeyGenerator)(req.ip ?? "unknown")}`;
    }
    /** Public CMS endpoints — keyed by IP. */
    const publicLimiter = (0, express_rate_limit_1.rateLimit)({
        windowMs: env_1.env.RATE_LIMIT_WINDOW_MS,
        max: env_1.env.RATE_LIMIT_MAX_PUBLIC,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
            success: false,
            error: { code: "RATE_LIMITED", message: "Too many requests. Please wait and try again." },
        },
    });
    /** Auth / login endpoints — keyed by IP, tight. */
    const authLimiter = (0, express_rate_limit_1.rateLimit)({
        windowMs: 15 * 60 * 1000,
        max: 20,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
            success: false,
            error: { code: "RATE_LIMITED", message: "Too many authentication attempts. Please wait 15 minutes." },
        },
    });
    /** High-sensitivity write endpoints (orders, consultations, leads) — keyed by IP. */
    const strictLimiter = (0, express_rate_limit_1.rateLimit)({
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
    const customerAuthLimiter = (0, express_rate_limit_1.rateLimit)({
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
    const otpLimiter = (0, express_rate_limit_1.rateLimit)({
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
    const adminLimiter = (0, express_rate_limit_1.rateLimit)({
        windowMs: env_1.env.RATE_LIMIT_WINDOW_MS,
        max: env_1.env.RATE_LIMIT_MAX_ADMIN,
        standardHeaders: true,
        legacyHeaders: false,
        keyGenerator: adminKeyGenerator,
        validate: { ip: false },
        message: {
            success: false,
            error: {
                code: "RATE_LIMITED",
                message: "Admin request limit reached. Your quota resets automatically — please wait a moment and retry.",
            },
        },
    });
    /**
     * Media upload endpoints (presign + multipart) — keyed by JWT sub.
     * Prevents accidental bulk-upload loops from exhausting R2 or bandwidth.
     * 100 upload operations per 10-minute window per admin user.
     */
    const mediaUploadLimiter = (0, express_rate_limit_1.rateLimit)({
        windowMs: env_1.env.RATE_LIMIT_WINDOW_MS,
        max: env_1.env.RATE_LIMIT_MAX_UPLOAD,
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
    app.use(health_routes_1.healthRouter);
    const api = express_1.default.Router();
    // Auth & guest — IP-keyed, tight
    api.use("/auth", authLimiter, auth_routes_1.authRouter);
    api.use("/customer/auth", customerAuthLimiter, customer_auth_routes_1.customerAuthRouter);
    api.use("/guest", otpLimiter, guest_routes_1.guestRouter);
    // Public CMS — IP-keyed, 100/10min
    api.use("/themes", publicLimiter, themes_routes_1.themesRouter);
    api.use("/products", publicLimiter, catalog_routes_1.productsRouter);
    api.use("/product-categories", publicLimiter, catalog_routes_1.productCategoriesRouter);
    api.use("/collections", publicLimiter, collections_routes_1.productCollectionsRouter);
    api.use("/packages", publicLimiter, packages_routes_1.packagesRouter);
    api.use("/pricing", publicLimiter, pricing_routes_1.pricingRouter);
    api.use("/builder", publicLimiter, builder_routes_1.builderRouter);
    api.use("/gallery", publicLimiter, gallery_routes_1.galleryRouter);
    api.use(content_routes_1.contentRouter); // no extra limiter — served via static-ish reads
    api.use("/pages", publicLimiter, pages_routes_1.pagesRouter);
    api.use("/settings", publicLimiter, public_settings_routes_1.publicSettingsRouter);
    api.use("/blog", publicLimiter, blog_routes_1.blogRouter);
    api.use("/events", publicLimiter, events_routes_1.eventsRouter);
    // Customer shop — requireCustomer enforced inside the routers themselves
    api.use("/cart", publicLimiter, shop_routes_1.cartRouter);
    api.use("/wishlist", publicLimiter, shop_routes_1.wishlistRouter);
    api.use("/shop/delivery-settings", publicLimiter, shop_routes_1.deliverySettingsRouter);
    api.use("/shop/checkout", publicLimiter, orders_routes_1.shopCheckoutRouter);
    api.use("/shop/orders", strictLimiter, orders_routes_1.ordersRouter);
    api.use("/account/orders", publicLimiter, orders_routes_1.accountOrdersRouter);
    api.use("/account/registries", publicLimiter, registry_routes_1.accountRegistryRouter);
    api.use("/registry", publicLimiter, registry_routes_1.registryRouter);
    api.use("/whatsapp/webhook", whatsapp_routes_1.whatsappWebhookRouter);
    api.use("/payments", payments_routes_1.paymentsRouter);
    api.use("/invoices", publicLimiter, payments_routes_1.invoicesRouter);
    api.use("/consultations", strictLimiter, consultations_routes_1.consultationsRouter);
    api.use("/leads", strictLimiter, crm_routes_1.leadsPublicRouter);
    api.use("/chatbot", publicLimiter, chatbot_routes_1.chatbotRouter);
    // ─── Admin Panel ──────────────────────────────────────────────────────────
    // All admin routes: JWT-keyed rate limit + Cache-Control: no-store (P3).
    // noStore prevents browsers / CDN from caching PII or admin data.
    api.use("/admin/themes", adminLimiter, no_store_1.noStore, themes_routes_1.adminThemesRouter);
    api.use("/admin/products", adminLimiter, no_store_1.noStore, catalog_routes_1.adminProductsRouter);
    api.use("/admin/product-categories", adminLimiter, no_store_1.noStore, catalog_routes_1.adminProductCategoriesRouter);
    api.use("/admin/collections", adminLimiter, no_store_1.noStore, collections_routes_1.adminProductCollectionsRouter);
    api.use("/admin/registries", adminLimiter, no_store_1.noStore, registry_routes_1.adminRegistryRouter);
    api.use("/admin/packages", adminLimiter, no_store_1.noStore, packages_routes_1.adminPackagesRouter);
    api.use("/admin/extra-services", adminLimiter, no_store_1.noStore, extra_services_routes_1.adminExtraServicesRouter);
    api.use("/admin/gallery", adminLimiter, no_store_1.noStore, gallery_routes_1.adminGalleryRouter);
    api.use("/admin", adminLimiter, no_store_1.noStore, content_routes_1.adminContentRouter);
    api.use("/admin/pages", adminLimiter, no_store_1.noStore, pages_routes_1.adminPagesRouter);
    api.use("/admin/blog", adminLimiter, no_store_1.noStore, blog_routes_1.adminBlogRouter);
    api.use("/admin/events", adminLimiter, no_store_1.noStore, events_routes_1.adminEventsRouter);
    // Media router: general browsing uses adminLimiter; upload paths get an
    // additional tighter mediaUploadLimiter (100/10min) on top.
    const mediaAdminRouter = express_1.default.Router();
    mediaAdminRouter.use(adminLimiter);
    mediaAdminRouter.use(no_store_1.noStore);
    mediaAdminRouter.use(["/presign", "/upload", "/upload-binary", "/complete"], mediaUploadLimiter);
    mediaAdminRouter.use(media_routes_1.mediaRouter);
    api.use("/admin/media", mediaAdminRouter);
    api.use("/admin/orders", adminLimiter, no_store_1.noStore, orders_routes_1.adminOrdersRouter);
    api.use("/admin/invoices", adminLimiter, no_store_1.noStore, payments_routes_1.adminInvoicesRouter);
    api.use("/admin/payments", adminLimiter, no_store_1.noStore, payments_routes_1.adminPaymentsRouter);
    api.use("/admin/consultations", adminLimiter, no_store_1.noStore, consultations_routes_1.adminConsultationsRouter);
    api.use("/admin/leads", adminLimiter, no_store_1.noStore, crm_routes_1.adminLeadsRouter);
    api.use("/admin/customers", adminLimiter, no_store_1.noStore, crm_routes_1.adminCustomersRouter);
    api.use("/admin/chatbot", adminLimiter, no_store_1.noStore, chatbot_routes_1.adminChatbotRouter);
    api.use("/admin/calendar", adminLimiter, no_store_1.noStore, admin_ops_routes_1.adminCalendarRouter);
    api.use("/admin/settings", adminLimiter, no_store_1.noStore, admin_ops_routes_1.adminSettingsRouter);
    api.use("/admin/audit-log", adminLimiter, no_store_1.noStore, admin_ops_routes_1.adminAuditRouter);
    api.use("/admin/cache", adminLimiter, no_store_1.noStore, admin_ops_routes_1.adminCacheRouter);
    api.use("/admin/recycle-bin", adminLimiter, no_store_1.noStore, recycle_bin_routes_1.recycleBinRouter);
    app.use(env_1.env.API_PREFIX, api);
    app.use((_req, res) => {
        res.status(404).json({
            success: false,
            error: { code: "NOT_FOUND", message: "Route not found" },
        });
    });
    app.use(error_handler_1.errorHandler);
    return app;
}
//# sourceMappingURL=app.js.map