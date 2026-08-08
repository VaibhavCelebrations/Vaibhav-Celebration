import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { UserStatus } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { env } from "../../config/env";
import { AppError, ConflictError, UnauthorizedError, ValidationError } from "../../lib/errors";
import {
  passwordChangedEmailHtml,
  passwordResetEmailHtml,
  sendEmail,
  verifyEmailHtml,
  welcomeEmailHtml,
} from "../../integrations/email/mailer";
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

function toPublicUser(user: { id: string; name: string; email: string; phone: string | null; emailVerifiedAt: Date | null; lastLoginAt: Date | null }) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    emailVerified: user.emailVerifiedAt !== null,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
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
  if (!stored || stored.usedAt !== null || stored.expiresAt < new Date()) {
    throw new AppError("VALIDATION_ERROR", "This verification link is invalid or has expired", 400);
  }
  await prisma.$transaction([
    prisma.user.update({ where: { id: stored.userId }, data: { emailVerifiedAt: new Date() } }),
    prisma.emailVerificationToken.update({ where: { id: stored.id }, data: { usedAt: new Date() } }),
  ]);
}

// ─── Profile ──────────────────────────────────────────────────────────────────

export async function updateCustomerProfile(userId: string, data: { name?: string; phone?: string }) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { name: data.name?.trim(), phone: data.phone?.trim() },
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
