"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.corsOrigins = exports.env = void 0;
const dotenv_1 = require("dotenv");
const zod_1 = require("zod");
(0, dotenv_1.config)();
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(["development", "test", "production"]).default("development"),
    PORT: zod_1.z.coerce.number().default(4000),
    API_PREFIX: zod_1.z.string().default("/api/v1"),
    DATABASE_URL: zod_1.z.string().min(1),
    CORS_ORIGINS: zod_1.z.string().default("http://localhost:3000,http://localhost:3001"),
    JWT_ACCESS_SECRET: zod_1.z.string().min(32),
    JWT_REFRESH_SECRET: zod_1.z.string().min(32),
    JWT_ACCESS_EXPIRES_IN: zod_1.z.string().default("15m"),
    JWT_REFRESH_EXPIRES_IN: zod_1.z.string().default("7d"),
    COOKIE_SECURE: zod_1.z
        .string()
        .optional()
        .transform((v) => v === "true"),
    // --- Customer (storefront) auth — fully cookie-based, separate secret from admin ---
    JWT_CUSTOMER_ACCESS_SECRET: zod_1.z.string().min(32),
    JWT_CUSTOMER_ACCESS_EXPIRES_IN: zod_1.z.string().default("15m"),
    /** Sliding session window — extended on every successful refresh while active */
    CUSTOMER_SESSION_SLIDING_DAYS: zod_1.z.coerce.number().default(60),
    /** Absolute re-auth ceiling from login, regardless of activity (defense-in-depth) */
    CUSTOMER_SESSION_ABSOLUTE_DAYS: zod_1.z.coerce.number().default(180),
    /** Password reset link validity — enforced server-side even if JWT-less token */
    PASSWORD_RESET_TOKEN_TTL_MINUTES: zod_1.z.coerce.number().default(10),
    EMAIL_VERIFICATION_TOKEN_TTL_HOURS: zod_1.z.coerce.number().default(48),
    /** Used to build absolute links in transactional emails (reset/verify) */
    FRONTEND_URL: zod_1.z.string().default("http://localhost:3000"),
    CUSTOMER_MAX_FAILED_LOGINS: zod_1.z.coerce.number().default(5),
    CUSTOMER_LOCKOUT_MINUTES: zod_1.z.coerce.number().default(15),
    OTP_EXPIRES_MINUTES: zod_1.z.coerce.number().default(10),
    OTP_MAX_ATTEMPTS: zod_1.z.coerce.number().default(5),
    GUEST_TOKEN_EXPIRES_MINUTES: zod_1.z.coerce.number().default(30),
    SEED_ADMIN_EMAIL: zod_1.z.string().email().optional(),
    SEED_ADMIN_PASSWORD: zod_1.z.string().optional(),
    SEED_ADMIN_NAME: zod_1.z.string().optional(),
    RAZORPAY_KEY_ID: zod_1.z.string().optional(),
    RAZORPAY_KEY_SECRET: zod_1.z.string().optional(),
    RAZORPAY_WEBHOOK_SECRET: zod_1.z.string().optional(),
    RAZORPAY_MODE: zod_1.z.enum(["test", "live"]).default("test"),
    SMTP_HOST: zod_1.z.string().optional(),
    SMTP_PORT: zod_1.z.coerce.number().optional(),
    SMTP_SECURE: zod_1.z
        .string()
        .optional()
        .transform((v) => v === "true"),
    SMTP_USER: zod_1.z.string().optional(),
    SMTP_PASS: zod_1.z.string().optional(),
    EMAIL_FROM_NAME: zod_1.z.string().default("Vaibhav Celebrations"),
    EMAIL_FROM_ADDRESS: zod_1.z.string().email().optional(),
    EMAIL_REPLY_TO: zod_1.z.string().email().optional(),
    WHATSAPP_ENABLED: zod_1.z
        .string()
        .optional()
        .transform((v) => v === "true"),
    WHATSAPP_PROVIDER: zod_1.z.enum(["meta", "none"]).default("none"),
    WHATSAPP_BUSINESS_NUMBER: zod_1.z.string().optional(),
    WHATSAPP_META_ACCESS_TOKEN: zod_1.z.string().optional(),
    WHATSAPP_META_PHONE_NUMBER_ID: zod_1.z.string().optional(),
    WHATSAPP_META_BUSINESS_ACCOUNT_ID: zod_1.z.string().optional(),
    WHATSAPP_META_API_VERSION: zod_1.z.string().default("v21.0"),
    WHATSAPP_WEBHOOK_VERIFY_TOKEN: zod_1.z.string().optional(),
    WHATSAPP_APP_SECRET: zod_1.z.string().optional(),
    CLOUDFLARE_ACCOUNT_ID: zod_1.z.string().optional(),
    CLOUDFLARE_API_TOKEN: zod_1.z.string().optional(),
    CLOUDFLARE_R2_ACCESS_KEY_ID: zod_1.z.string().optional(),
    CLOUDFLARE_R2_SECRET_ACCESS_KEY: zod_1.z.string().optional(),
    CLOUDFLARE_R2_BUCKET: zod_1.z.string().optional(),
    CLOUDFLARE_R2_PUBLIC_BASE_URL: zod_1.z.string().optional(),
    CLOUDFLARE_IMAGES_ACCOUNT_HASH: zod_1.z.string().optional(),
    REVALIDATE_SECRET: zod_1.z.string().optional(),
    FRONTEND_REVALIDATE_URL: zod_1.z.string().optional(),
    RATE_LIMIT_WINDOW_MS: zod_1.z.coerce.number().default(600_000),
    RATE_LIMIT_MAX_PUBLIC: zod_1.z.coerce.number().default(100),
    RATE_LIMIT_MAX_ADMIN: zod_1.z.coerce.number().default(1000),
    RATE_LIMIT_MAX_UPLOAD: zod_1.z.coerce.number().default(100),
    DEFAULT_GST_PERCENT: zod_1.z.coerce.number().default(18),
    DEFAULT_MAX_BOOKINGS_PER_DAY: zod_1.z.coerce.number().default(2),
    MIN_CONSULTATION_ADVANCE_DAYS: zod_1.z.coerce.number().default(15),
    GIFT_REGISTRY_VALIDITY_DAYS: zod_1.z.coerce.number().default(30),
    SENTRY_DSN: zod_1.z.string().optional(),
    LOG_LEVEL: zod_1.z.string().default("info"),
    REDIS_URL: zod_1.z.string().default("redis://localhost:6379"),
    REDIS_CACHE_ENABLED: zod_1.z
        .string()
        .optional()
        .transform((v) => v !== "false")
        .default("true"),
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
    process.exit(1);
}
exports.env = parsed.data;
exports.corsOrigins = exports.env.CORS_ORIGINS.split(",")
    .map((o) => o.trim())
    .filter(Boolean);
//# sourceMappingURL=env.js.map