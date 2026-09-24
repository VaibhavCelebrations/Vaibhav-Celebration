import { describe, expect, it, vi, beforeAll, afterAll } from "vitest";

const sendEmail = vi.hoisted(() => vi.fn().mockResolvedValue({ id: "mock_email_1" }));

vi.mock("../../integrations/email/mailer", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../integrations/email/mailer")>();
  return {
    ...actual,
    sendEmail,
  };
});

import { prisma } from "../../db/prisma";
import { ConflictError, RateLimitedError, ValidationError } from "../../lib/errors";
import {
  requestEmailVerificationOtp,
  verifyEmailOtp,
  requestEmailChangeOtp,
  verifyEmailChangeOtp,
} from "./customer-auth.service";
import bcrypt from "bcryptjs";

const suffix = `email_otp_test_${Date.now()}`;
let unverifiedUserId: string;
let verifiedUserId: string;
let otherUserId: string;

beforeAll(async () => {
  const u1 = await prisma.user.create({
    data: {
      name: "Unverified User",
      email: `unverified_${suffix}@example.com`,
      passwordHash: "not_a_real_hash",
      emailVerifiedAt: null,
    },
  });
  unverifiedUserId = u1.id;

  const u2 = await prisma.user.create({
    data: {
      name: "Verified User",
      email: `verified_${suffix}@example.com`,
      passwordHash: "not_a_real_hash",
      emailVerifiedAt: new Date(),
    },
  });
  verifiedUserId = u2.id;

  const u3 = await prisma.user.create({
    data: {
      name: "Other Existing User",
      email: `existing_${suffix}@example.com`,
      passwordHash: "not_a_real_hash",
      emailVerifiedAt: new Date(),
    },
  });
  otherUserId = u3.id;
});

afterAll(async () => {
  const userIds = [unverifiedUserId, verifiedUserId, otherUserId];
  await prisma.emailVerificationToken.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
});

describe("Email Verification OTP Flow", () => {
  it("generates 6-digit OTP and sends email for unverified user", async () => {
    sendEmail.mockClear();
    const res = await requestEmailVerificationOtp(unverifiedUserId);

    expect(res.success).toBe(true);
    expect(res.devOtp).toMatch(/^\d{6}$/);

    expect(sendEmail).toHaveBeenCalledTimes(1);
    const emailCall = sendEmail.mock.calls[0]![0];
    expect(emailCall.to).toBe(`unverified_${suffix}@example.com`);
    expect(emailCall.html).toContain(res.devOtp);

    const token = await prisma.emailVerificationToken.findFirst({
      where: { userId: unverifiedUserId, email: null },
      orderBy: { createdAt: "desc" },
    });
    expect(token).toBeTruthy();
    expect(token!.otpHash).toBeDefined();
    expect(await bcrypt.compare(res.devOtp!, token!.otpHash!)).toBe(true);
  });

  it("prevents requesting email OTP if email is already verified", async () => {
    await expect(requestEmailVerificationOtp(verifiedUserId)).rejects.toBeInstanceOf(ValidationError);
  });

  it("enforces a 60-second cooldown on repeated email OTP requests", async () => {
    await expect(requestEmailVerificationOtp(unverifiedUserId)).rejects.toBeInstanceOf(RateLimitedError);
  });

  it("verifies unverified email with correct OTP", async () => {
    const otp = "543210";
    const otpHash = await bcrypt.hash(otp, 10);
    await prisma.emailVerificationToken.create({
      data: {
        userId: unverifiedUserId,
        email: null,
        otpHash,
        attemptCount: 0,
        expiresAt: new Date(Date.now() + 10 * 60_000),
      },
    });

    const verifyRes = await verifyEmailOtp(unverifiedUserId, otp);
    expect(verifyRes.success).toBe(true);
    expect(verifyRes.user.emailVerified).toBe(true);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: unverifiedUserId } });
    expect(user.emailVerifiedAt).not.toBeNull();
  });
});

describe("Email Change OTP Flow", () => {
  it("rejects invalid email formats", async () => {
    await expect(requestEmailChangeOtp(verifiedUserId, "not-an-email")).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects when new email is identical to current email", async () => {
    await expect(
      requestEmailChangeOtp(verifiedUserId, `verified_${suffix}@example.com`),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects when another account already uses the new email", async () => {
    await expect(
      requestEmailChangeOtp(verifiedUserId, `existing_${suffix}@example.com`),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("requests OTP to new email address", async () => {
    sendEmail.mockClear();
    const newEmail = `brand_new_${suffix}@example.com`;
    const res = await requestEmailChangeOtp(verifiedUserId, newEmail);

    expect(res.success).toBe(true);
    expect(res.devOtp).toMatch(/^\d{6}$/);

    expect(sendEmail).toHaveBeenCalledTimes(1);
    const emailCall = sendEmail.mock.calls[0]![0];
    expect(emailCall.to).toBe(newEmail);
    expect(emailCall.html).toContain(res.devOtp);

    const token = await prisma.emailVerificationToken.findFirst({
      where: { userId: verifiedUserId, email: newEmail },
      orderBy: { createdAt: "desc" },
    });
    expect(token).toBeTruthy();
    expect(await bcrypt.compare(res.devOtp!, token!.otpHash!)).toBe(true);
  });

  it("verifies OTP and updates user's email address safely", async () => {
    const updatedEmail = `final_email_${suffix}@example.com`;
    const otp = "998877";
    const otpHash = await bcrypt.hash(otp, 10);

    await prisma.emailVerificationToken.create({
      data: {
        userId: verifiedUserId,
        email: updatedEmail,
        otpHash,
        attemptCount: 0,
        expiresAt: new Date(Date.now() + 10 * 60_000),
      },
    });

    const verifyRes = await verifyEmailChangeOtp(verifiedUserId, updatedEmail, otp);
    expect(verifyRes.success).toBe(true);
    expect(verifyRes.user.email).toBe(updatedEmail);
    expect(verifyRes.user.emailVerified).toBe(true);

    const dbUser = await prisma.user.findUniqueOrThrow({ where: { id: verifiedUserId } });
    expect(dbUser.email).toBe(updatedEmail);
    expect(dbUser.emailVerifiedAt).not.toBeNull();
  });
});
