import pino from "pino";
import { env } from "../config/env";

/**
 * P1/P6 — Credential redaction.
 *
 * These paths are stripped from every log statement before it is written.
 * `fast-redact` (used internally by pino) supports dot-notation and wildcards.
 * Adding a path here is the ONLY way to guarantee a field never appears in logs;
 * relying on callers to "not log secrets" is not sufficient.
 */
const REDACTED_PATHS = [
  // ── HTTP layer ─────────────────────────────────────────────────────────────
  "req.headers.authorization", // Bearer JWT access token
  "req.headers.cookie", // Refresh-token cookie + any other cookies
  "headers.authorization",
  "headers.cookie",

  // ── Auth credential fields ──────────────────────────────────────────────────
  "password",
  "newPassword",
  "currentPassword",
  "passwordHash", // never log hashes either
  "token",
  "accessToken",
  "refreshToken",
  "otp",
  "otpHash",
  "secret",
];

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: REDACTED_PATHS,
    censor: "[REDACTED]",
  },
  transport:
    env.NODE_ENV === "development"
      ? { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:standard" } }
      : undefined,
});

