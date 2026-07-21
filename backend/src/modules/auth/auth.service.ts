import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { prisma } from "../../db/prisma";
import { env } from "../../config/env";
import { UnauthorizedError } from "../../lib/errors";
import type { AdminJwtPayload } from "../../middleware/auth";

const REFRESH_COOKIE = "vbc_admin_refresh";

export function getRefreshCookieName() {
  return REFRESH_COOKIE;
}

// ─── Token helpers ──────────────────────────────────────────────────────────

/**
 * One-way hash of a raw JWT for safe DB storage.
 * Raw tokens are NEVER stored — only this hex digest.
 */
function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

function signAccessToken(payload: AdminJwtPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

function issueRefreshJwt(adminId: string): string {
  return jwt.sign({ sub: adminId, type: "refresh" }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

/** Convert env string like "7d" / "24h" / "30m" to milliseconds. */
function parseDurationMs(str: string): number {
  const m = /^(\d+)([smhd])$/.exec(str);
  if (!m) return 7 * 24 * 60 * 60 * 1000; // safe fallback: 7 days
  const n = parseInt(m[1]!, 10);
  switch (m[2]) {
    case "s": return n * 1_000;
    case "m": return n * 60_000;
    case "h": return n * 3_600_000;
    case "d": return n * 86_400_000;
    default:  return 7 * 86_400_000;
  }
}

function refreshTokenExpiry(): Date {
  return new Date(Date.now() + parseDurationMs(env.JWT_REFRESH_EXPIRES_IN));
}

// ─── Auth operations ─────────────────────────────────────────────────────────

export async function loginAdmin(
  email: string,
  password: string,
  ipAddress?: string,
  userAgent?: string,
) {
  const admin = await prisma.adminUser.findFirst({
    where: { email: email.toLowerCase(), deletedAt: null, isActive: true },
  });

  // Use constant-time comparison even when admin not found to prevent enumeration
  const hash = admin?.passwordHash ?? "$2b$10$invalidhashusedfortimingnormalization0000000000000000";
  const valid = await bcrypt.compare(password, hash);

  if (!admin || !valid) {
    throw new UnauthorizedError("Invalid email or password");
  }

  await prisma.adminUser.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date() },
  });

  const accessToken = signAccessToken({
    sub: admin.id,
    email: admin.email,
    role: admin.role,
    type: "access",
  });

  const rawRefreshToken = issueRefreshJwt(admin.id);

  // Persist hash only — never the raw token
  await prisma.adminRefreshToken.create({
    data: {
      adminUserId: admin.id,
      tokenHash: hashToken(rawRefreshToken),
      familyId: crypto.randomUUID(),
      expiresAt: refreshTokenExpiry(),
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
    },
  });

  return {
    accessToken,
    refreshToken: rawRefreshToken,
    admin: {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
    },
  };
}

/**
 * P2 — Refresh with rotation + reuse detection.
 *
 * Security model:
 *  1. Verify JWT signature → quick fail on forgery/expiry
 *  2. Look up by SHA-256 hash in DB
 *  3. If not found → unknown token → reject
 *  4. If revokedAt set → already revoked (logout or previous reuse event) → reject
 *  5. If usedAt set → token was already rotated; this is a REPLAY ATTACK
 *     → revoke entire token family immediately so ALL sessions from this
 *       login are invalidated, then reject
 *  6. Mark current token as used, issue + store new token in same family
 *  7. Return new refresh token to be set as a new HttpOnly cookie
 */
export async function refreshAccessToken(
  rawRefreshToken: string,
  ipAddress?: string,
  userAgent?: string,
) {
  // Step 1 — JWT integrity check
  let jwtPayload: { sub: string; type: string };
  try {
    jwtPayload = jwt.verify(rawRefreshToken, env.JWT_REFRESH_SECRET) as {
      sub: string;
      type: string;
    };
  } catch {
    throw new UnauthorizedError("Invalid or expired refresh token");
  }
  if (jwtPayload.type !== "refresh") {
    throw new UnauthorizedError("Invalid token type");
  }

  // Step 2 — DB lookup by hash
  const stored = await prisma.adminRefreshToken.findUnique({
    where: { tokenHash: hashToken(rawRefreshToken) },
  });

  if (!stored) {
    throw new UnauthorizedError("Refresh token not recognised");
  }

  // Step 3 — Already revoked (logout or prior reuse event)
  if (stored.revokedAt !== null) {
    throw new UnauthorizedError("Session has been revoked. Please log in again.");
  }

  // Step 4 — REPLAY DETECTION: token was already used → revoke entire family
  if (stored.usedAt !== null) {
    await prisma.adminRefreshToken.updateMany({
      where: { familyId: stored.familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    throw new UnauthorizedError(
      "Session anomaly detected. All sessions have been revoked for your protection. Please log in again.",
    );
  }

  // Step 5 — DB-level expiry check (belt-and-suspenders beyond JWT exp)
  if (stored.expiresAt < new Date()) {
    throw new UnauthorizedError("Refresh token has expired");
  }

  // Step 6 — Verify admin is still active
  const admin = await prisma.adminUser.findFirst({
    where: { id: stored.adminUserId, deletedAt: null, isActive: true },
  });
  if (!admin) {
    throw new UnauthorizedError("Admin account not found or deactivated");
  }

  // Step 7 — Rotate: mark old as used, issue new token in same family
  const newRawRefreshToken = issueRefreshJwt(admin.id);

  await prisma.$transaction([
    prisma.adminRefreshToken.update({
      where: { id: stored.id },
      data: { usedAt: new Date() },
    }),
    prisma.adminRefreshToken.create({
      data: {
        adminUserId: admin.id,
        tokenHash: hashToken(newRawRefreshToken),
        familyId: stored.familyId, // same session family
        expiresAt: refreshTokenExpiry(),
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
      },
    }),
  ]);

  const accessToken = signAccessToken({
    sub: admin.id,
    email: admin.email,
    role: admin.role,
    type: "access",
  });

  return {
    accessToken,
    newRefreshToken: newRawRefreshToken,
    admin: {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
    },
  };
}

/**
 * Server-side logout: revoke the presented token AND the entire family so
 * concurrent sessions (e.g. other tabs that haven't refreshed yet) also expire.
 */
export async function logoutAdmin(rawRefreshToken: string): Promise<void> {
  try {
    const stored = await prisma.adminRefreshToken.findUnique({
      where: { tokenHash: hashToken(rawRefreshToken) },
    });
    if (stored) {
      await prisma.adminRefreshToken.updateMany({
        where: { familyId: stored.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
  } catch {
    // Never throw on logout — client clears cookie regardless
  }
}

export async function getAdminById(id: string) {
  const admin = await prisma.adminUser.findFirst({
    where: { id, deletedAt: null, isActive: true },
    select: { id: true, name: true, email: true, role: true, lastLoginAt: true },
  });
  if (!admin) throw new UnauthorizedError();
  return admin;
}
