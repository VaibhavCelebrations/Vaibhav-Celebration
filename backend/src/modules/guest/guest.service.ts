import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import { prisma } from "../../db/prisma";
import { env } from "../../config/env";
import { AppError, NotFoundError, RateLimitedError, UnauthorizedError } from "../../lib/errors";
import { otpEmailHtml, sendEmail } from "../../integrations/email/mailer";
import { signGuestToken } from "../../middleware/guest-auth";
import { getOrderByCode } from "../orders/orders.service";

function generateOtp() {
  return String(randomInt(100000, 999999));
}

async function resolveReference(referenceCode: string, referenceType: string, email: string) {
  const normalized = email.toLowerCase();
  if (referenceType === "ORDER") {
    const order = await prisma.order.findFirst({
      where: { orderCode: referenceCode },
      include: { user: true },
    });
    if (!order) throw new NotFoundError("Order not found");
    if (order.contactEmail.toLowerCase() !== normalized && order.user.email.toLowerCase() !== normalized) {
      throw new UnauthorizedError("Email does not match this order");
    }
    return { email: order.contactEmail };
  }
  if (referenceType === "REGISTRY") {
    const registry = await prisma.giftRegistry.findFirst({
      where: { registryCode: referenceCode },
      include: { ownerUser: true },
    });
    if (!registry) throw new NotFoundError("Registry not found");
    const ownerEmail = registry.contactEmail?.toLowerCase() ?? registry.ownerUser.email.toLowerCase();
    if (ownerEmail !== normalized && registry.ownerUser.email.toLowerCase() !== normalized) {
      throw new UnauthorizedError("Email does not match this registry");
    }
    return { email: ownerEmail };
  }
  throw new AppError("VALIDATION_ERROR", `Unsupported referenceType: ${referenceType}`, 400);
}

export async function requestOtp(input: {
  referenceCode: string;
  referenceType: string;
  email: string;
}) {
  await resolveReference(input.referenceCode, input.referenceType, input.email);

  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 10);
  const otpExpiresAt = new Date(Date.now() + env.OTP_EXPIRES_MINUTES * 60_000);

  await prisma.guestVerificationToken.create({
    data: {
      referenceCode: input.referenceCode,
      referenceType: input.referenceType,
      email: input.email.toLowerCase(),
      otpHash,
      otpExpiresAt,
    },
  });

  await sendEmail({
    to: input.email.toLowerCase(),
    subject: `Your verification code — ${input.referenceCode}`,
    html: otpEmailHtml(otp, input.referenceCode),
    text: `Your OTP is ${otp}`,
  });

  return {
    sent: true,
    expiresInMinutes: env.OTP_EXPIRES_MINUTES,
    ...(env.NODE_ENV !== "production" ? { devOtp: otp } : {}),
  };
}

export async function verifyOtp(input: { referenceCode: string; otp: string }) {
  const token = await prisma.guestVerificationToken.findFirst({
    where: {
      referenceCode: input.referenceCode,
      verifiedAt: null,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!token) throw new UnauthorizedError("No pending verification found");
  if (token.otpExpiresAt < new Date()) {
    throw new AppError("OTP_INVALID_OR_EXPIRED", "OTP expired", 401);
  }
  if (token.attemptCount >= env.OTP_MAX_ATTEMPTS) {
    throw new RateLimitedError("Too many failed OTP attempts", "OTP_ATTEMPTS_EXCEEDED");
  }

  const valid = await bcrypt.compare(input.otp, token.otpHash);
  if (!valid) {
    await prisma.guestVerificationToken.update({
      where: { id: token.id },
      data: { attemptCount: { increment: 1 } },
    });
    throw new AppError("OTP_INVALID_OR_EXPIRED", "Invalid OTP", 401);
  }

  await prisma.guestVerificationToken.update({
    where: { id: token.id },
    data: { verifiedAt: new Date() },
  });

  const guestAccessToken = signGuestToken({
    sub: token.referenceCode,
    referenceType: token.referenceType,
    email: token.email,
  });

  return {
    guestAccessToken,
    referenceCode: token.referenceCode,
    referenceType: token.referenceType,
    expiresInMinutes: env.GUEST_TOKEN_EXPIRES_MINUTES,
  };
}

export async function getGuestOrder(orderCode: string) {
  return getOrderByCode(orderCode);
}
