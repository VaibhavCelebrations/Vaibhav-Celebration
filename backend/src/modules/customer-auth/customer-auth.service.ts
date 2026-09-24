import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { UserStatus } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { env } from "../../config/env";
import { AppError, ConflictError, RateLimitedError, UnauthorizedError, ValidationError } from "../../lib/errors";
import {
  passwordChangedEmailHtml,
  passwordResetEmailHtml,
  sendEmail,
  verifyEmailHtml,
  welcomeEmailHtml,
  guestWelcomeEmailHtml,
  guestCheckoutOtpEmailHtml,
  accountVerificationOtpEmailHtml,
} from "../../integrations/email/mailer";
import { sendPhoneOtpWhatsapp } from "../whatsapp/whatsapp.service";
import type { CustomerJwtPayload } from "../../middleware/customer-auth";
import { logger } from "../../lib/logger";

const DAY_MS = 24 * 60 * 60 * 1000;

// ─── Token helpers ────────────────────────────────────────────────────────────

/** One-way hash for safe DB storage — raw tokens are never persisted. */
function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

function generateOpaqueToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function signCustomerAccessToken(userId: string, email: string): string {
  return jwt.sign({ sub: userId, email, type: "customer_access" } satisfies CustomerJwtPayload, env.JWT_CUSTOMER_ACCESS_SECRET, {
    expiresIn: env.JWT_CUSTOMER_ACCESS_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

function slidingExpiry(): Date {
  return new Date(Date.now() + env.CUSTOMER_SESSION_SLIDING_DAYS * DAY_MS);
}

function absoluteExpiry(): Date {
  return new Date(Date.now() + env.CUSTOMER_SESSION_ABSOLUTE_DAYS * DAY_MS);
}

function toPublicUser(user: {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  emailVerifiedAt: Date | null;
  phoneVerifiedAt?: Date | null;
  lastLoginAt: Date | null;
  defaultAddress?: any;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    emailVerified: Boolean(user.emailVerifiedAt),
    phoneVerified: Boolean(user.phoneVerifiedAt),
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    defaultAddress: user.defaultAddress ?? null,
  };
}

// ─── Signup ───────────────────────────────────────────────────────────────────

export async function signupCustomer(input: {
  name: string;
  email: string;
  phone?: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const email = input.email.toLowerCase().trim();
  const existing = await prisma.user.findFirst({ where: { email, deletedAt: null } });
  if (existing) {
    throw new ConflictError("EMAIL_TAKEN", "An account with this email already exists");
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await prisma.user.create({
    data: {
      name: input.name.trim(),
      email,
      phone: input.phone?.trim(),
      passwordHash,
      lastLoginAt: new Date(),
    },
  });

  await prisma.cart.create({ data: { userId: user.id } });

  void sendEmail({
    to: user.email,
    subject: "Welcome to Vaibhav Celebrations",
    html: welcomeEmailHtml(user.name),
  }).catch(() => undefined);

  void issueEmailVerification(user.id, user.email, user.name).catch(() => undefined);

  const session = await createSession(user.id, input.ipAddress, input.userAgent);

  return {
    accessToken: signCustomerAccessToken(user.id, user.email),
    sessionToken: session.rawToken,
    sessionExpiresAt: session.expiresAt,
    user: toPublicUser(user),
  };
}

// ─── Guest Checkout (OTP → account → welcome password → session) ─────────────

const GUEST_CHECKOUT_OTP_TYPE = "GUEST_CHECKOUT_EMAIL";

function generateGuestPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from(crypto.randomBytes(12))
    .map((b) => chars[b % chars.length])
    .join("");
}

function generateOtp(): string {
  return String(crypto.randomInt(100000, 999999));
}

/**
 * Step 1 — send a 6-digit OTP to a new email before guest checkout.
 * Existing accounts must log in instead (no silent reuse).
 */
export async function requestGuestCheckoutEmailOtp(input: {
  email: string;
}): Promise<{ sent: boolean; expiresInMinutes: number; devOtp?: string }> {
  const email = input.email.toLowerCase().trim();

  const existing = await prisma.user.findFirst({ where: { email, deletedAt: null } });
  if (existing) {
    throw new ConflictError(
      "EMAIL_EXISTS",
      "An account with this email already exists. Please log in to continue.",
    );
  }

  // Anti-spam: refuse re-send within 60 seconds
  const recent = await prisma.guestVerificationToken.findFirst({
    where: {
      referenceCode: email,
      referenceType: GUEST_CHECKOUT_OTP_TYPE,
      verifiedAt: null,
      createdAt: { gt: new Date(Date.now() - 60_000) },
    },
  });
  if (recent) {
    throw new RateLimitedError(
      "Please wait at least 60 seconds before requesting another code.",
      "GUEST_OTP_COOLDOWN",
    );
  }

  // Invalidate any prior unused OTPs for this email
  await prisma.guestVerificationToken.updateMany({
    where: {
      referenceCode: email,
      referenceType: GUEST_CHECKOUT_OTP_TYPE,
      verifiedAt: null,
    },
    data: { verifiedAt: new Date() },
  });

  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 10);
  const otpExpiresAt = new Date(Date.now() + env.OTP_EXPIRES_MINUTES * 60_000);

  await prisma.guestVerificationToken.create({
    data: {
      referenceCode: email,
      referenceType: GUEST_CHECKOUT_OTP_TYPE,
      email,
      otpHash,
      otpExpiresAt,
    },
  });

  await sendEmail({
    to: email,
    subject: "Verify your email — Vaibhav Celebrations",
    html: guestCheckoutOtpEmailHtml(otp),
    text: `Your verification code is ${otp}. It expires in ${env.OTP_EXPIRES_MINUTES} minutes.`,
  });

  return {
    sent: true,
    expiresInMinutes: env.OTP_EXPIRES_MINUTES,
    ...(env.NODE_ENV !== "production" ? { devOtp: otp } : {}),
  };
}

/**
 * Step 2 — verify OTP, create the guest account, email the generated password
 * (welcome mail), and establish a real customer session so the user can
 * checkout as authenticated. Cancelled/pending orders then appear in Order History.
 */
export async function verifyGuestCheckoutEmailOtp(input: {
  email: string;
  otp: string;
  name: string;
  phone: string;
  defaultAddress?: {
    fullName: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  ipAddress?: string;
  userAgent?: string;
}) {
  const email = input.email.toLowerCase().trim();

  const token = await prisma.guestVerificationToken.findFirst({
    where: {
      referenceCode: email,
      referenceType: GUEST_CHECKOUT_OTP_TYPE,
      verifiedAt: null,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!token) throw new UnauthorizedError("No pending verification found. Please request a new code.");
  if (token.otpExpiresAt < new Date()) {
    throw new AppError("OTP_INVALID_OR_EXPIRED", "This code has expired. Please request a new one.", 401);
  }
  if (token.attemptCount >= env.OTP_MAX_ATTEMPTS) {
    throw new RateLimitedError("Too many failed attempts. Please request a new code.", "OTP_ATTEMPTS_EXCEEDED");
  }

  const valid = await bcrypt.compare(input.otp.trim(), token.otpHash);
  if (!valid) {
    await prisma.guestVerificationToken.update({
      where: { id: token.id },
      data: { attemptCount: { increment: 1 } },
    });
    throw new AppError("OTP_INVALID_OR_EXPIRED", "Invalid verification code", 401);
  }

  await prisma.guestVerificationToken.update({
    where: { id: token.id },
    data: { verifiedAt: new Date() },
  });

  // Race: email may have been registered between OTP request and verify
  const existing = await prisma.user.findFirst({ where: { email, deletedAt: null } });
  if (existing) {
    throw new ConflictError(
      "EMAIL_EXISTS",
      "An account with this email already exists. Please log in to continue.",
    );
  }

  const generatedPassword = generateGuestPassword();
  const passwordHash = await bcrypt.hash(generatedPassword, 12);
  const name = input.name.trim() || "Guest";
  const phone = input.phone.trim();

  const user = await prisma.user.create({
    data: {
      name,
      email,
      phone,
      passwordHash,
      emailVerifiedAt: new Date(),
      phoneVerifiedAt: phone ? new Date() : null,
      lastLoginAt: new Date(),
      defaultAddress: input.defaultAddress ? (input.defaultAddress as never) : undefined,
    },
  });

  await prisma.cart.create({ data: { userId: user.id } });

  // Welcome + password FIRST (before any order confirmation)
  void sendEmail({
    to: user.email,
    subject: "Welcome to Vaibhav Celebrations — your account details",
    html: guestWelcomeEmailHtml(user.name, generatedPassword),
  }).catch(() => undefined);

  const session = await createSession(user.id, input.ipAddress, input.userAgent);

  return {
    accessToken: signCustomerAccessToken(user.id, user.email),
    sessionToken: session.rawToken,
    sessionExpiresAt: session.expiresAt,
    user: toPublicUser(user),
  };
}

/**
 * Creates a brand-new user account for legacy guest order APIs.
 * Prefer `verifyGuestCheckoutEmailOtp` for the production cart/checkout gate.
 */
export async function createGuestAccount(input: {
  name: string;
  email: string;
  phone: string;
}): Promise<{ userId: string; generatedPassword: string }> {
  const email = input.email.toLowerCase().trim();
  const existing = await prisma.user.findFirst({ where: { email, deletedAt: null } });

  if (existing) {
    throw new ConflictError(
      "EMAIL_EXISTS",
      "An account with this email already exists. Please log in to continue.",
    );
  }

  const generatedPassword = generateGuestPassword();
  const passwordHash = await bcrypt.hash(generatedPassword, 12);

  const user = await prisma.user.create({
    data: {
      name: input.name.trim() || "Guest",
      email,
      phone: input.phone.trim(),
      passwordHash,
      emailVerifiedAt: new Date(),
      phoneVerifiedAt: input.phone ? new Date() : null,
      lastLoginAt: new Date(),
    },
  });

  await prisma.cart.create({ data: { userId: user.id } });

  void sendEmail({
    to: user.email,
    subject: "Welcome to Vaibhav Celebrations — your account details",
    html: guestWelcomeEmailHtml(user.name, generatedPassword),
  }).catch(() => undefined);

  return { userId: user.id, generatedPassword };
}

/** @deprecated Password is now emailed at account creation (welcome mail). Kept for compatibility. */
export async function storeGuestCredential(
  _userId: string,
  orderCode: string,
  plainPassword: string,
): Promise<void> {
  await prisma.guestVerificationToken.create({
    data: {
      referenceCode: orderCode,
      referenceType: "GUEST_ORDER_CREDENTIAL",
      email: "",
      otpHash: plainPassword,
      otpExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });
}

export async function consumeGuestCredential(orderCode: string): Promise<string | null> {
  const token = await prisma.guestVerificationToken.findFirst({
    where: {
      referenceCode: orderCode,
      referenceType: "GUEST_ORDER_CREDENTIAL",
      verifiedAt: null,
      otpExpiresAt: { gt: new Date() },
    },
  });
  if (!token) return null;

  await prisma.guestVerificationToken.update({
    where: { id: token.id },
    data: { verifiedAt: new Date() },
  });

  return token.otpHash;
}

// ─── Login ────────────────────────────────────────────────────────────────────

export async function loginCustomer(input: {
  email: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const email = input.email.toLowerCase().trim();
  const user = await prisma.user.findFirst({ where: { email, deletedAt: null } });

  // Constant-time comparison even when user not found — prevents enumeration.
  const hash = user?.passwordHash ?? "$2b$10$invalidhashusedfortimingnormalization0000000000000000";
  const valid = await bcrypt.compare(input.password, hash);

  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    const minutesLeft = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    throw new UnauthorizedError(`Too many failed attempts. Try again in ${minutesLeft} minute(s).`);
  }

  if (!user || !valid) {
    if (user) {
      const failedCount = user.failedLoginCount + 1;
      const shouldLock = failedCount >= env.CUSTOMER_MAX_FAILED_LOGINS;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount: shouldLock ? 0 : failedCount,
          lockedUntil: shouldLock ? new Date(Date.now() + env.CUSTOMER_LOCKOUT_MINUTES * 60_000) : null,
        },
      });
    }
    throw new UnauthorizedError("Invalid email or password");
  }

  if (user.status !== UserStatus.ACTIVE) {
    throw new UnauthorizedError("This account is disabled. Contact support for help.");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date(), failedLoginCount: 0, lockedUntil: null },
  });

  const session = await createSession(user.id, input.ipAddress, input.userAgent);

  return {
    accessToken: signCustomerAccessToken(user.id, user.email),
    sessionToken: session.rawToken,
    sessionExpiresAt: session.expiresAt,
    user: toPublicUser(user),
  };
}

async function createSession(userId: string, ipAddress?: string, userAgent?: string) {
  const rawToken = generateOpaqueToken();
  const expiresAt = slidingExpiry();
  await prisma.customerSession.create({
    data: {
      userId,
      tokenHash: hashToken(rawToken),
      familyId: crypto.randomUUID(),
      expiresAt,
      absoluteExpiresAt: absoluteExpiry(),
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
    },
  });
  return { rawToken, expiresAt };
}

// ─── Refresh (sliding + rotating, with reuse detection) ─────────────────────
//
// Mirrors the proven AdminRefreshToken algorithm (auth.service.ts) exactly:
// rotate on every use, detect replay of an already-used token, and revoke the
// whole family on suspected theft. The sliding `expiresAt` is pushed forward
// on every legitimate refresh — this is what makes "stay logged in until the
// cookie is removed" work — while `absoluteExpiresAt` is copied forward
// unchanged, forcing a full re-login after CUSTOMER_SESSION_ABSOLUTE_DAYS.

export async function refreshCustomerSession(rawToken: string, ipAddress?: string, userAgent?: string) {
  const stored = await prisma.customerSession.findUnique({ where: { tokenHash: hashToken(rawToken) } });
  if (!stored) {
    throw new UnauthorizedError("Session not recognised. Please sign in again.");
  }

  if (stored.revokedAt !== null) {
    throw new UnauthorizedError("Session has been revoked. Please sign in again.");
  }

  if (stored.usedAt !== null) {
    const msSinceUse = Date.now() - stored.usedAt.getTime();
    if (msSinceUse < 10_000) {
      throw new UnauthorizedError("Session was just refreshed. Please retry.");
    }
    await prisma.customerSession.updateMany({
      where: { familyId: stored.familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw new UnauthorizedError("Session anomaly detected. Please sign in again.");
  }

  if (stored.expiresAt < new Date() || stored.absoluteExpiresAt < new Date()) {
    throw new UnauthorizedError("Session has expired. Please sign in again.");
  }

  const user = await prisma.user.findFirst({ where: { id: stored.userId, deletedAt: null } });
  if (!user || user.status !== UserStatus.ACTIVE) {
    throw new UnauthorizedError("Account not found or disabled");
  }

  const newRawToken = generateOpaqueToken();

  const rotated = await prisma.customerSession.updateMany({
    where: { id: stored.id, usedAt: null, revokedAt: null },
    data: { usedAt: new Date() },
  });
  if (rotated.count === 0) {
    throw new UnauthorizedError("Session was just refreshed. Please retry.");
  }

  await prisma.customerSession.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(newRawToken),
      familyId: stored.familyId,
      expiresAt: slidingExpiry(),
      absoluteExpiresAt: stored.absoluteExpiresAt,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
    },
  });

  return {
    accessToken: signCustomerAccessToken(user.id, user.email),
    sessionToken: newRawToken,
    sessionExpiresAt: slidingExpiry(),
    user: toPublicUser(user),
  };
}

export async function logoutCustomer(rawToken: string | undefined): Promise<void> {
  if (!rawToken) return;
  try {
    const stored = await prisma.customerSession.findUnique({ where: { tokenHash: hashToken(rawToken) } });
    if (stored) {
      await prisma.customerSession.updateMany({
        where: { familyId: stored.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
  } catch {
    // never throw on logout
  }
}

export async function logoutAllSessions(userId: string): Promise<void> {
  await prisma.customerSession.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function getCustomerById(id: string) {
  const user = await prisma.user.findFirst({ where: { id, deletedAt: null } });
  if (!user) throw new UnauthorizedError();
  return toPublicUser(user);
}

// ─── Password reset (nodemailer, 10-minute validity) ────────────────────────

export async function requestPasswordReset(email: string, requestIp?: string): Promise<void> {
  const normalized = email.toLowerCase().trim();
  const user = await prisma.user.findFirst({ where: { email: normalized, deletedAt: null } });
  // Always behave the same way whether or not the account exists — no enumeration.
  if (!user) {
    logger.info({ email: normalized }, "Password reset requested for unknown email");
    return;
  }

  const rawToken = generateOpaqueToken();
  const expiresAt = new Date(Date.now() + env.PASSWORD_RESET_TOKEN_TTL_MINUTES * 60_000);

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(rawToken),
      expiresAt,
      requestIp: requestIp ?? null,
    },
  });

  const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${rawToken}`;
  await sendEmail({
    to: user.email,
    subject: "Reset your Vaibhav Celebrations password",
    html: passwordResetEmailHtml(user.name, resetUrl, env.PASSWORD_RESET_TOKEN_TTL_MINUTES),
  });
}

export async function resetPassword(rawToken: string, newPassword: string): Promise<void> {
  const stored = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(rawToken) } });
  if (!stored || stored.usedAt !== null || stored.expiresAt < new Date()) {
    throw new UnauthorizedError("This reset link is invalid or has expired. Please request a new one.");
  }

  const user = await prisma.user.findFirst({ where: { id: stored.userId, deletedAt: null } });
  if (!user) throw new UnauthorizedError("Account not found");

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { passwordHash, failedLoginCount: 0, lockedUntil: null } }),
    prisma.passwordResetToken.update({ where: { id: stored.id }, data: { usedAt: new Date() } }),
    // Security-critical: force re-login everywhere after a password change.
    prisma.customerSession.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);

  void sendEmail({
    to: user.email,
    subject: "Your password was changed",
    html: passwordChangedEmailHtml(user.name),
  }).catch(() => undefined);
}

// ─── Email verification ──────────────────────────────────────────────────────

export async function issueEmailVerification(userId: string, email: string, name: string): Promise<void> {
  const rawToken = generateOpaqueToken();
  const expiresAt = new Date(Date.now() + env.EMAIL_VERIFICATION_TOKEN_TTL_HOURS * 60 * 60_000);
  await prisma.emailVerificationToken.create({
    data: { userId, tokenHash: hashToken(rawToken), expiresAt },
  });
  const verifyUrl = `${env.FRONTEND_URL}/verify-email?token=${rawToken}`;
  await sendEmail({ to: email, subject: "Verify your email", html: verifyEmailHtml(name, verifyUrl) });
}

export async function verifyEmail(rawToken: string): Promise<void> {
  const stored = await prisma.emailVerificationToken.findUnique({ where: { tokenHash: hashToken(rawToken) } });
  
  if (!stored || stored.expiresAt < new Date()) {
    throw new AppError("VALIDATION_ERROR", "This verification link is invalid or has expired", 400);
  }

  // If already used, just return success so the user sees a confirmation instead of an error
  if (stored.usedAt !== null) {
    return;
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: stored.userId }, data: { emailVerifiedAt: new Date() } }),
    prisma.emailVerificationToken.update({ where: { id: stored.id }, data: { usedAt: new Date() } }),
  ]);
}

// ─── OTP Verification System ──────────────────────────────────────────────────
//
// Meta WhatsApp Cloud API Authentication template OTP for phone numbers and
// transactional email OTP for unverified emails and email changes.
// Protected by:
// - 60s cooldown between requests per user
// - 10-minute time-to-live
// - Max 5 verification attempts per token
// - Bcrypt hashing of OTP codes in the database

const OTP_RESEND_COOLDOWN_SECONDS = 60;
const OTP_TTL_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 5;

// ─── Phone OTP Verification (WhatsApp) ────────────────────────────────────────

export async function requestPhoneVerificationOtp(
  userId: string,
  phone: string,
  requestIp?: string
): Promise<{ success: boolean; message: string; devOtp?: string }> {
  const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
  if (!user) throw new UnauthorizedError();

  const normalizedPhone = phone.trim();
  if (normalizedPhone.length < 6) {
    throw new ValidationError("Enter a valid phone number");
  }

  const recent = await prisma.phoneVerificationToken.findFirst({
    where: {
      userId,
      createdAt: { gt: new Date(Date.now() - OTP_RESEND_COOLDOWN_SECONDS * 1000) },
    },
    orderBy: { createdAt: "desc" },
  });
  if (recent) {
    throw new RateLimitedError("Please wait 60 seconds before requesting another code", "OTP_COOLDOWN");
  }

  // Invalidate any existing unused tokens for this user
  await prisma.phoneVerificationToken.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: new Date() },
  });

  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000);

  await prisma.phoneVerificationToken.create({
    data: {
      userId,
      phoneNumber: normalizedPhone,
      otpHash,
      attemptCount: 0,
      expiresAt,
      requestIp: requestIp ?? null,
    },
  });

  const outcome = await sendPhoneOtpWhatsapp({ userId, phone: normalizedPhone, otp });
  if (!outcome.sent && outcome.status === "FAILED") {
    logger.error({ userId, phone: normalizedPhone, error: outcome.error }, "Failed to send WhatsApp verification OTP");
  }

  const isDev = env.NODE_ENV !== "production";
  return {
    success: true,
    message: "Verification code sent to your WhatsApp number",
    ...(isDev ? { devOtp: otp } : {}),
  };
}

export async function verifyPhoneOtp(
  userId: string,
  phone: string,
  otp: string
): Promise<{ success: boolean; message: string; user: ReturnType<typeof toPublicUser> }> {
  const trimmedOtp = otp.trim();
  if (!/^\d{6}$/.test(trimmedOtp)) {
    throw new ValidationError("Verification code must be 6 digits");
  }

  const normalizedPhone = phone.trim();
  const stored = await prisma.phoneVerificationToken.findFirst({
    where: {
      userId,
      phoneNumber: normalizedPhone,
      usedAt: null,
      otpHash: { not: null },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!stored) {
    throw new ValidationError("No pending verification found. Please request a new code.");
  }

  if (stored.expiresAt < new Date()) {
    throw new ValidationError("Verification code has expired. Please request a new one.");
  }

  if (stored.attemptCount >= MAX_OTP_ATTEMPTS) {
    throw new RateLimitedError("Too many failed attempts. Please request a new code.", "MAX_OTP_ATTEMPTS_EXCEEDED");
  }

  const isValid = await bcrypt.compare(trimmedOtp, stored.otpHash!);
  if (!isValid) {
    const updated = await prisma.phoneVerificationToken.update({
      where: { id: stored.id },
      data: { attemptCount: { increment: 1 } },
    });
    const remaining = MAX_OTP_ATTEMPTS - updated.attemptCount;
    if (remaining <= 0) {
      throw new RateLimitedError("Too many failed attempts. Please request a new code.", "MAX_OTP_ATTEMPTS_EXCEEDED");
    }
    throw new ValidationError(`Incorrect verification code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`);
  }

  const [updatedUser] = await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        phone: normalizedPhone,
        phoneVerifiedAt: new Date(),
      },
    }),
    prisma.phoneVerificationToken.update({
      where: { id: stored.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return {
    success: true,
    message: "Phone number verified successfully",
    user: toPublicUser(updatedUser),
  };
}

// ─── Email OTP Verification ───────────────────────────────────────────────────

export async function requestEmailVerificationOtp(
  userId: string,
  requestIp?: string
): Promise<{ success: boolean; message: string; devOtp?: string }> {
  const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
  if (!user) throw new UnauthorizedError();

  if (user.emailVerifiedAt) {
    throw new ValidationError("Your email is already verified");
  }

  const recent = await prisma.emailVerificationToken.findFirst({
    where: {
      userId,
      createdAt: { gt: new Date(Date.now() - OTP_RESEND_COOLDOWN_SECONDS * 1000) },
    },
    orderBy: { createdAt: "desc" },
  });
  if (recent) {
    throw new RateLimitedError("Please wait 60 seconds before requesting another code", "OTP_COOLDOWN");
  }

  // Invalidate any existing unused tokens for this user (for current email verification)
  await prisma.emailVerificationToken.updateMany({
    where: { userId, usedAt: null, email: null },
    data: { usedAt: new Date() },
  });

  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000);

  await prisma.emailVerificationToken.create({
    data: {
      userId,
      otpHash,
      attemptCount: 0,
      expiresAt,
    },
  });

  await sendEmail({
    to: user.email,
    subject: "Your Email Verification Code - Vaibhav Celebrations",
    html: accountVerificationOtpEmailHtml(otp, false),
  });

  const isDev = env.NODE_ENV !== "production";
  return {
    success: true,
    message: `Verification code sent to ${user.email}`,
    ...(isDev ? { devOtp: otp } : {}),
  };
}

export async function verifyEmailOtp(
  userId: string,
  otp: string
): Promise<{ success: boolean; message: string; user: ReturnType<typeof toPublicUser> }> {
  const trimmedOtp = otp.trim();
  if (!/^\d{6}$/.test(trimmedOtp)) {
    throw new ValidationError("Verification code must be 6 digits");
  }

  const stored = await prisma.emailVerificationToken.findFirst({
    where: {
      userId,
      email: null,
      usedAt: null,
      otpHash: { not: null },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!stored) {
    throw new ValidationError("No pending verification found. Please request a new code.");
  }

  if (stored.expiresAt < new Date()) {
    throw new ValidationError("Verification code has expired. Please request a new one.");
  }

  if (stored.attemptCount >= MAX_OTP_ATTEMPTS) {
    throw new RateLimitedError("Too many failed attempts. Please request a new code.", "MAX_OTP_ATTEMPTS_EXCEEDED");
  }

  const isValid = await bcrypt.compare(trimmedOtp, stored.otpHash!);
  if (!isValid) {
    const updated = await prisma.emailVerificationToken.update({
      where: { id: stored.id },
      data: { attemptCount: { increment: 1 } },
    });
    const remaining = MAX_OTP_ATTEMPTS - updated.attemptCount;
    if (remaining <= 0) {
      throw new RateLimitedError("Too many failed attempts. Please request a new code.", "MAX_OTP_ATTEMPTS_EXCEEDED");
    }
    throw new ValidationError(`Incorrect verification code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`);
  }

  const [updatedUser] = await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date() },
    }),
    prisma.emailVerificationToken.update({
      where: { id: stored.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return {
    success: true,
    message: "Email verified successfully",
    user: toPublicUser(updatedUser),
  };
}

// ─── Email Change OTP Flow ───────────────────────────────────────────────────

export async function requestEmailChangeOtp(
  userId: string,
  newEmail: string,
  requestIp?: string
): Promise<{ success: boolean; message: string; devOtp?: string }> {
  const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
  if (!user) throw new UnauthorizedError();

  const normalizedEmail = newEmail.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new ValidationError("Please enter a valid email address");
  }

  if (normalizedEmail === user.email.toLowerCase()) {
    throw new ValidationError("The new email must be different from your current email");
  }

  const existing = await prisma.user.findFirst({
    where: { email: normalizedEmail, id: { not: userId }, deletedAt: null },
  });
  if (existing) {
    throw new ConflictError("EMAIL_EXISTS", "An account with this email address already exists");
  }

  const recent = await prisma.emailVerificationToken.findFirst({
    where: {
      userId,
      createdAt: { gt: new Date(Date.now() - OTP_RESEND_COOLDOWN_SECONDS * 1000) },
    },
    orderBy: { createdAt: "desc" },
  });
  if (recent) {
    throw new RateLimitedError("Please wait 60 seconds before requesting another code", "OTP_COOLDOWN");
  }

  // Invalidate any previous email-change tokens for this user
  await prisma.emailVerificationToken.updateMany({
    where: { userId, usedAt: null, email: { not: null } },
    data: { usedAt: new Date() },
  });

  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000);

  await prisma.emailVerificationToken.create({
    data: {
      userId,
      email: normalizedEmail,
      otpHash,
      attemptCount: 0,
      expiresAt,
    },
  });

  await sendEmail({
    to: normalizedEmail,
    subject: "Verify Your New Email Address - Vaibhav Celebrations",
    html: accountVerificationOtpEmailHtml(otp, true),
  });

  const isDev = env.NODE_ENV !== "production";
  return {
    success: true,
    message: `Verification code sent to ${normalizedEmail}`,
    ...(isDev ? { devOtp: otp } : {}),
  };
}

export async function verifyEmailChangeOtp(
  userId: string,
  newEmail: string,
  otp: string
): Promise<{ success: boolean; message: string; user: ReturnType<typeof toPublicUser> }> {
  const trimmedOtp = otp.trim();
  if (!/^\d{6}$/.test(trimmedOtp)) {
    throw new ValidationError("Verification code must be 6 digits");
  }

  const normalizedEmail = newEmail.trim().toLowerCase();

  const stored = await prisma.emailVerificationToken.findFirst({
    where: {
      userId,
      email: normalizedEmail,
      usedAt: null,
      otpHash: { not: null },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!stored) {
    throw new ValidationError("No pending verification found for this email. Please request a new code.");
  }

  if (stored.expiresAt < new Date()) {
    throw new ValidationError("Verification code has expired. Please request a new one.");
  }

  if (stored.attemptCount >= MAX_OTP_ATTEMPTS) {
    throw new RateLimitedError("Too many failed attempts. Please request a new code.", "MAX_OTP_ATTEMPTS_EXCEEDED");
  }

  const isValid = await bcrypt.compare(trimmedOtp, stored.otpHash!);
  if (!isValid) {
    const updated = await prisma.emailVerificationToken.update({
      where: { id: stored.id },
      data: { attemptCount: { increment: 1 } },
    });
    const remaining = MAX_OTP_ATTEMPTS - updated.attemptCount;
    if (remaining <= 0) {
      throw new RateLimitedError("Too many failed attempts. Please request a new code.", "MAX_OTP_ATTEMPTS_EXCEEDED");
    }
    throw new ValidationError(`Incorrect verification code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`);
  }

  // Pre-update race check: ensure no other user registered this email in the interim
  const existing = await prisma.user.findFirst({
    where: { email: normalizedEmail, id: { not: userId }, deletedAt: null },
  });
  if (existing) {
    throw new ConflictError("EMAIL_EXISTS", "An account with this email address already exists");
  }

  const [updatedUser] = await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        email: normalizedEmail,
        emailVerifiedAt: new Date(),
      },
    }),
    prisma.emailVerificationToken.update({
      where: { id: stored.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return {
    success: true,
    message: "Email updated and verified successfully",
    user: toPublicUser(updatedUser),
  };
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export async function updateCustomerProfile(userId: string, data: { name?: string; phone?: string; defaultAddress?: any }) {
  const updateData: any = {
    name: data.name?.trim(),
    phone: data.phone?.trim(),
  };
  if (data.defaultAddress !== undefined) {
    updateData.defaultAddress = data.defaultAddress;
  }
  
  const user = await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });
  return toPublicUser(user);
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } });
  if (!user) throw new UnauthorizedError();
  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw new ValidationError("Current password is incorrect");
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
    prisma.customerSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
  ]);
  void sendEmail({ to: user.email, subject: "Your password was changed", html: passwordChangedEmailHtml(user.name) }).catch(() => undefined);
}
