import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../../db/prisma";
import { env } from "../../config/env";
import { UnauthorizedError } from "../../lib/errors";
import type { AdminJwtPayload } from "../../middleware/auth";

const REFRESH_COOKIE = "vbc_admin_refresh";

export function getRefreshCookieName() {
  return REFRESH_COOKIE;
}

export async function loginAdmin(email: string, password: string) {
  const admin = await prisma.adminUser.findFirst({
    where: { email: email.toLowerCase(), deletedAt: null, isActive: true },
  });

  if (!admin) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) {
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

  const refreshToken = jwt.sign(
    { sub: admin.id, type: "refresh" },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions["expiresIn"] },
  );

  return {
    accessToken,
    refreshToken,
    admin: {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
    },
  };
}

export async function refreshAccessToken(refreshToken: string) {
  try {
    const payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as {
      sub: string;
      type: string;
    };
    if (payload.type !== "refresh") {
      throw new UnauthorizedError("Invalid refresh token");
    }

    const admin = await prisma.adminUser.findFirst({
      where: { id: payload.sub, deletedAt: null, isActive: true },
    });
    if (!admin) {
      throw new UnauthorizedError("Admin not found");
    }

    const accessToken = signAccessToken({
      sub: admin.id,
      email: admin.email,
      role: admin.role,
      type: "access",
    });

    return {
      accessToken,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    };
  } catch (err) {
    if (err instanceof UnauthorizedError) throw err;
    throw new UnauthorizedError("Invalid or expired refresh token");
  }
}

function signAccessToken(payload: AdminJwtPayload) {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

export async function getAdminById(id: string) {
  const admin = await prisma.adminUser.findFirst({
    where: { id, deletedAt: null, isActive: true },
    select: { id: true, name: true, email: true, role: true, lastLoginAt: true },
  });
  if (!admin) throw new UnauthorizedError();
  return admin;
}
