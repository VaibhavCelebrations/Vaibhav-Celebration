import { describe, expect, it, vi, beforeAll, afterAll } from "vitest";

const sendPhoneOtpWhatsapp = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ sent: true, status: "SIMULATED_SENT", providerMessageId: "mock_1" }),
);

vi.mock("../whatsapp/whatsapp.service", () => ({ sendPhoneOtpWhatsapp }));

import { prisma } from "../../db/prisma";
import { RateLimitedError, ValidationError } from "../../lib/errors";
import { requestPhoneVerificationOtp, verifyPhoneOtp } from "./customer-auth.service";
import bcrypt from "bcryptjs";

const suffix = `phone_otp_test_${Date.now()}`;
let userId: string;

beforeAll(async () => {
  const user = await prisma.user.create({
    data: { name: "Phone OTP Test User", email: `${suffix}@example.com`, passwordHash: "not_a_real_hash" },
  });
  userId = user.id;
});

afterAll(async () => {
  await prisma.phoneVerificationToken.deleteMany({ where: { userId } });
  await prisma.user.deleteMany({ where: { id: userId } });
});

describe("requestPhoneVerificationOtp / verifyPhoneOtp", () => {
  it("generates a 6-digit OTP, stores its hash, and dispatches via WhatsApp authentication template", async () => {
    sendPhoneOtpWhatsapp.mockClear();
    const res = await requestPhoneVerificationOtp(userId, "9876543210", "127.0.0.1");

    expect(res.success).toBe(true);
    expect(res.devOtp).toBeDefined();
    expect(res.devOtp).toMatch(/^\d{6}$/);

    expect(sendPhoneOtpWhatsapp).toHaveBeenCalledTimes(1);
    const call = sendPhoneOtpWhatsapp.mock.calls[0]![0];
    expect(call.userId).toBe(userId);
    expect(call.phone).toBe("9876543210");
    expect(call.otp).toBe(res.devOtp);

    const stored = await prisma.phoneVerificationToken.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } });
    expect(stored).toBeTruthy();
    expect(stored!.otpHash).toBeDefined();
    // Raw OTP is never stored directly
    expect(stored!.otpHash).not.toBe(res.devOtp);
    // Verifying that bcrypt matches
    const matches = await bcrypt.compare(res.devOtp!, stored!.otpHash!);
    expect(matches).toBe(true);
  });

  it("enforces a 60-second cooldown on repeated OTP requests", async () => {
    await expect(requestPhoneVerificationOtp(userId, "9876543210", "127.0.0.1")).rejects.toBeInstanceOf(RateLimitedError);
  });

  it("successfully verifies phone with correct 6-digit OTP and marks user verified", async () => {
    // Manually insert a fresh token bypassing the cooldown for this specific test
    const otp = "849201";
    const otpHash = await bcrypt.hash(otp, 10);
    await prisma.phoneVerificationToken.create({
      data: {
        userId,
        phoneNumber: "9876543211",
        otpHash,
        attemptCount: 0,
        expiresAt: new Date(Date.now() + 10 * 60_000),
      },
    });

    const verifyRes = await verifyPhoneOtp(userId, "9876543211", otp);
    expect(verifyRes.success).toBe(true);
    expect(verifyRes.user.phoneVerified).toBe(true);
    expect(verifyRes.user.phone).toBe("9876543211");

    const dbUser = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(dbUser.phoneVerifiedAt).not.toBeNull();
    expect(dbUser.phone).toBe("9876543211");
  });

  it("rejects an incorrect OTP and tracks attempt count", async () => {
    const otp = "654321";
    const otpHash = await bcrypt.hash(otp, 10);
    const token = await prisma.phoneVerificationToken.create({
      data: {
        userId,
        phoneNumber: "9876543212",
        otpHash,
        attemptCount: 0,
        expiresAt: new Date(Date.now() + 10 * 60_000),
      },
    });

    await expect(verifyPhoneOtp(userId, "9876543212", "000000")).rejects.toBeInstanceOf(ValidationError);

    const updated = await prisma.phoneVerificationToken.findUniqueOrThrow({ where: { id: token.id } });
    expect(updated.attemptCount).toBe(1);
  });

  it("locks out after max failed attempts (5)", async () => {
    const otp = "123456";
    const otpHash = await bcrypt.hash(otp, 10);
    await prisma.phoneVerificationToken.create({
      data: {
        userId,
        phoneNumber: "9876543213",
        otpHash,
        attemptCount: 5, // already reached max
        expiresAt: new Date(Date.now() + 10 * 60_000),
      },
    });

    await expect(verifyPhoneOtp(userId, "9876543213", otp)).rejects.toBeInstanceOf(RateLimitedError);
  });

  it("rejects an expired OTP", async () => {
    const otp = "789012";
    const otpHash = await bcrypt.hash(otp, 10);
    await prisma.phoneVerificationToken.create({
      data: {
        userId,
        phoneNumber: "9876543214",
        otpHash,
        attemptCount: 0,
        expiresAt: new Date(Date.now() - 1000), // expired
      },
    });

    await expect(verifyPhoneOtp(userId, "9876543214", otp)).rejects.toBeInstanceOf(ValidationError);
  });
});
