import { config as loadDotenv } from "dotenv";
import { z } from "zod";

loadDotenv();

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.preprocess((val) => (val ? Number(val) : 4000), z.number().int().positive()),

  API_PREFIX: z.string().default("/api/v1"),
  DATABASE_URL: z.string().min(1),
  CORS_ORIGINS: z.string().default("http://localhost:3000,http://localhost:3001"),
  /** Number of reverse-proxy hops in front of the app (nginx = 1, nginx behind a cloud LB = 2). Drives req.ip and rate-limit keys. */
  /** When true, unsafe production settings (see findProductionConfigProblems) abort startup. Enabled in the Docker/production compose files. */
  ENFORCE_PRODUCTION_CHECKS: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(1),
  /** Allow this project's Vercel preview URLs as CORS origins. Never enable in production. */
  ALLOW_VERCEL_PREVIEWS: z
    .string()
    .optional()
    .transform((v) => v === "true"),
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
  RESEND_API_KEY: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_SECURE: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM_NAME: z.string().default("Vaibhav Celebrations"),
  EMAIL_FROM_ADDRESS: z.string().email().optional(),
  EMAIL_REPLY_TO: z.string().email().optional(),
  WHATSAPP_ENABLED: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  /** "mock" simulates sends for local/dev/test — no network call, no real message. "meta" calls the real Graph API. "none" is accepted for backwards compatibility with older .env files. */
  WHATSAPP_PROVIDER: z.enum(["meta", "mock", "none"]).default("mock"),
  /** Business-facing contact number (display/CTA only) — NEVER used as the Graph API sending endpoint. */
  WHATSAPP_BUSINESS_NUMBER: z.string().optional(),
  WHATSAPP_META_ACCESS_TOKEN: z.string().optional(),
  /** The Meta-issued Phone Number ID used for the Graph API `{id}/messages` endpoint — distinct from WHATSAPP_BUSINESS_NUMBER. */
  WHATSAPP_META_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_META_BUSINESS_ACCOUNT_ID: z.string().optional(),
  WHATSAPP_META_API_VERSION: z.string().default("v21.0"),
  WHATSAPP_WEBHOOK_VERIFY_TOKEN: z.string().optional(),
  WHATSAPP_APP_SECRET: z.string().optional(),
  /** Phone verification (WhatsApp OTP-based). */
  PHONE_VERIFICATION_TOKEN_TTL_MINUTES: z.coerce.number().default(10),
  /** Template name used for Meta WhatsApp Authentication OTP. Defaults to phone_otp_verification. */
  WHATSAPP_PHONE_OTP_TEMPLATE: z.string().default("phone_otp_verification"),
  /** Whether the Meta Authentication template includes a copy-code button component. */
  WHATSAPP_AUTH_HAS_COPY_CODE_BUTTON: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  /** Explicit opt-in gate for scripts/test-whatsapp.ts to send a REAL template message. Never enabled by default. */
  TEST_WHATSAPP_SEND: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  /** Gates the best-effort WhatsApp welcome message on signup — off until the welcome_message template is Meta-approved. */
  WHATSAPP_WELCOME_ENABLED: z
    .string()
    .optional()
    .transform((v) => v === "true"),
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
  /** Chatbot lead capture: max sessions saved per IP per hour. */
  RATE_LIMIT_CHATBOT_SESSIONS_PER_HOUR: z.coerce.number().default(10),
  /** Chatbot flow reads (page loads): max per IP per minute. */
  RATE_LIMIT_CHATBOT_FLOW_PER_MINUTE: z.coerce.number().default(60),
  /** Max upload size for media (MB). Files are buffered in memory, so keep this modest on small instances. */
  MEDIA_MAX_UPLOAD_MB: z.coerce.number().default(50),
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

// Cross-site cookies (Vercel frontend/admin <-> Render API) require
// Secure=true + SameSite=None — browsers silently drop the cookie otherwise.
// Force this on in production even if COOKIE_SECURE was left unset on the
// hosting dashboard, so a forgotten env var can't reintroduce logout-on-refresh.
export const env = {
  ...parsed.data,
  COOKIE_SECURE: parsed.data.COOKIE_SECURE || parsed.data.NODE_ENV === "production",
};

export const corsOrigins = env.CORS_ORIGINS.split(",")
  .map((o) => o.trim())
  .filter(Boolean);

/**
 * Production guard rails — refuse to boot with settings that would silently weaken security.
 * Checked at startup so a bad deploy fails fast (and the previous release keeps serving).
 */
export function findProductionConfigProblems(e: typeof env): string[] {
  if (e.NODE_ENV !== "production") return [];
  const problems: string[] = [];

  const secrets: Array<[string, string]> = [
    ["JWT_ACCESS_SECRET", e.JWT_ACCESS_SECRET],
    ["JWT_REFRESH_SECRET", e.JWT_REFRESH_SECRET],
    ["JWT_CUSTOMER_ACCESS_SECRET", e.JWT_CUSTOMER_ACCESS_SECRET],
  ];
  for (const [name, value] of secrets) {
    if (/change[-_ ]?me|example|placeholder|your[-_ ]?secret/i.test(value)) problems.push(`${name} looks like a placeholder`);
  }
  if (new Set(secrets.map(([, v]) => v)).size !== secrets.length) {
    problems.push("JWT secrets must all be different from each other");
  }
  const origins = e.CORS_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean);
  if (origins.some((o) => /localhost|127\.0\.0\.1/.test(o) || !o.startsWith("https://"))) {
    problems.push("CORS_ORIGINS must be exact https:// production origins (no localhost / http)");
  }
  if (e.ALLOW_VERCEL_PREVIEWS) problems.push("ALLOW_VERCEL_PREVIEWS must be false in production");
  if (!e.FRONTEND_URL.startsWith("https://")) problems.push("FRONTEND_URL must be https:// in production");
  if (e.RAZORPAY_MODE === "live" && e.RAZORPAY_KEY_ID?.startsWith("rzp_test_")) {
    problems.push("RAZORPAY_MODE=live but RAZORPAY_KEY_ID is a test key");
  }
  if (e.RAZORPAY_KEY_ID && !e.RAZORPAY_WEBHOOK_SECRET) {
    problems.push("RAZORPAY_WEBHOOK_SECRET is required so payment webhooks can be verified");
  }
  if (e.WHATSAPP_PROVIDER === "meta" && (!e.WHATSAPP_APP_SECRET || !e.WHATSAPP_WEBHOOK_VERIFY_TOKEN)) {
    problems.push("WHATSAPP_APP_SECRET and WHATSAPP_WEBHOOK_VERIFY_TOKEN are required when WHATSAPP_PROVIDER=meta");
  }
  return problems;
}

const productionProblems = findProductionConfigProblems(env);
if (productionProblems.length) {
  const report = `Unsafe production configuration:\n - ${productionProblems.join("\n - ")}`;
  if (env.ENFORCE_PRODUCTION_CHECKS) {
    console.error(`Refusing to start. ${report}`);
    process.exit(1);
  }
  // Not enforced (e.g. a developer running NODE_ENV=production locally) - warn loudly instead.
  console.warn(`[security] ${report}\n[security] Set ENFORCE_PRODUCTION_CHECKS=true on real deployments to make this fatal.`);
}
