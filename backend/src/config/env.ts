import { config as loadDotenv } from "dotenv";
import { z } from "zod";

loadDotenv();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  API_PREFIX: z.string().default("/api/v1"),
  DATABASE_URL: z.string().min(1),
  CORS_ORIGINS: z.string().default("http://localhost:3000,http://localhost:3001"),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  COOKIE_SECURE: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  // --- Customer (storefront) auth — fully cookie-based, separate secret from admin ---
  JWT_CUSTOMER_ACCESS_SECRET: z.string().min(32),
  JWT_CUSTOMER_ACCESS_EXPIRES_IN: z.string().default("15m"),
  /** Sliding session window — extended on every successful refresh while active */
  CUSTOMER_SESSION_SLIDING_DAYS: z.coerce.number().default(60),
  /** Absolute re-auth ceiling from login, regardless of activity (defense-in-depth) */
  CUSTOMER_SESSION_ABSOLUTE_DAYS: z.coerce.number().default(180),
  /** Password reset link validity — enforced server-side even if JWT-less token */
  PASSWORD_RESET_TOKEN_TTL_MINUTES: z.coerce.number().default(10),
  EMAIL_VERIFICATION_TOKEN_TTL_HOURS: z.coerce.number().default(48),
  /** Used to build absolute links in transactional emails (reset/verify) */
  FRONTEND_URL: z.string().default("http://localhost:3000"),
  CUSTOMER_MAX_FAILED_LOGINS: z.coerce.number().default(5),
  CUSTOMER_LOCKOUT_MINUTES: z.coerce.number().default(15),
  OTP_EXPIRES_MINUTES: z.coerce.number().default(10),
  OTP_MAX_ATTEMPTS: z.coerce.number().default(5),
  GUEST_TOKEN_EXPIRES_MINUTES: z.coerce.number().default(30),
  SEED_ADMIN_EMAIL: z.string().email().optional(),
  SEED_ADMIN_PASSWORD: z.string().optional(),
  SEED_ADMIN_NAME: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  RAZORPAY_MODE: z.enum(["test", "live"]).default("test"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_SECURE: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM_NAME: z.string().default("Vaibhav Celebrations"),
  EMAIL_FROM_ADDRESS: z.string().optional(),
  WHATSAPP_ENABLED: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  WHATSAPP_PROVIDER: z.enum(["meta", "twilio", "none"]).default("none"),
  WHATSAPP_BUSINESS_NUMBER: z.string().optional(),
  CLOUDFLARE_ACCOUNT_ID: z.string().optional(),
  CLOUDFLARE_API_TOKEN: z.string().optional(),
  CLOUDFLARE_R2_ACCESS_KEY_ID: z.string().optional(),
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: z.string().optional(),
  CLOUDFLARE_R2_BUCKET: z.string().optional(),
  CLOUDFLARE_R2_PUBLIC_BASE_URL: z.string().optional(),
  CLOUDFLARE_IMAGES_ACCOUNT_HASH: z.string().optional(),
  REVALIDATE_SECRET: z.string().optional(),
  FRONTEND_REVALIDATE_URL: z.string().optional(),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(600_000),
  RATE_LIMIT_MAX_PUBLIC: z.coerce.number().default(100),
  RATE_LIMIT_MAX_ADMIN: z.coerce.number().default(1000),
  RATE_LIMIT_MAX_UPLOAD: z.coerce.number().default(100),
  DEFAULT_GST_PERCENT: z.coerce.number().default(18),
  DEFAULT_MAX_BOOKINGS_PER_DAY: z.coerce.number().default(2),
  MIN_CONSULTATION_ADVANCE_DAYS: z.coerce.number().default(15),
  GIFT_REGISTRY_VALIDITY_DAYS: z.coerce.number().default(30),
  SENTRY_DSN: z.string().optional(),
  LOG_LEVEL: z.string().default("info"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  REDIS_CACHE_ENABLED: z
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

export const env = parsed.data;

export const corsOrigins = env.CORS_ORIGINS.split(",")
  .map((o) => o.trim())
  .filter(Boolean);
