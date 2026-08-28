import { describe, expect, it, vi, beforeAll, afterAll } from "vitest";

const sendPhoneVerificationWhatsapp = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ sent: true, status: "SIMULATED_SENT", providerMessageId: "mock_1" }),
);

vi.mock("../whatsapp/whatsapp.service", () => ({ sendPhoneVerificationWhatsapp }));

import { prisma } from "../../db/prisma";
import { RateLimitedError, AppError } from "../../lib/errors";
import { confirmPhoneVerification, requestPhoneVerification } from "./customer-auth.service";

const suffix = `phone_verify_test_${Date.now()}`;
let userId: string;

function extractTokenFromVerifyUrl(verifyUrl: string): string {
  const url = new URL(verifyUrl);
  return url.searchParams.get("t")!;
}

beforeAll(async () => {
  const user = await prisma.user.create({
    data: { name: "Phone Verify Test User", email: `${suffix}@example.com`, passwordHash: "not_a_real_hash" },
  });
  userId = user.id;
});

afterAll(async () => {
  await prisma.phoneVerificationToken.deleteMany({ where: { userId } });
  await prisma.user.deleteMany({ where: { id: userId } });
});

describe("requestPhoneVerification / confirmPhoneVerification", () => {
  it("creates a hashed, single-use token and sends a WhatsApp message with a PII-free verify URL", async () => {
    sendPhoneVerificationWhatsapp.mockClear();
    await requestPhoneVerification(userId, "9876543210", "127.0.0.1");

    expect(sendPhoneVerificationWhatsapp).toHaveBeenCalledTimes(1);
    const call = sendPhoneVerificationWhatsapp.mock.calls[0]![0];
    expect(call.userId).toBe(userId);
    expect(call.phone).toBe("9876543210");
    expect(call.verifyUrl).not.toContain("9876543210");
    expect(call.verifyUrl).not.toContain(userId);

    const stored = await prisma.phoneVerificationToken.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } });
    expect(stored).toBeTruthy();
    // Raw token is never persisted — only its hash.
    expect(stored!.tokenHash).not.toBe(extractTokenFromVerifyUrl(call.verifyUrl));
  });

  it("enforces a resend cooldown to prevent send-quota abuse via repeated requests", async () => {
    await expect(requestPhoneVerification(userId, "9876543210", "127.0.0.1")).rejects.toBeInstanceOf(RateLimitedError);
  });

  it("confirms a valid token and marks the user's phone verified", async () => {
    sendPhoneVerificationWhatsapp.mockClear();
    // Directly craft a fresh token bypassing the cooldown check, to isolate the confirm path.
    const rawToken = "test-raw-token-" + Date.now();
    const crypto = await import("node:crypto");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    await prisma.phoneVerificationToken.create({
      data: { userId, phoneNumber: "9876543211", tokenHash, expiresAt: new Date(Date.now() + 60_000) },
    });

    await confirmPhoneVerification(rawToken);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.phoneVerifiedAt).not.toBeNull();
    expect(user.phone).toBe("9876543211");
  });

  it("is idempotent on a re-confirm of the same (now-used) token", async () => {
    const rawToken = "test-raw-token-reused-" + Date.now();
    const crypto = await import("node:crypto");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    await prisma.phoneVerificationToken.create({
      data: { userId, phoneNumber: "9876543212", tokenHash, expiresAt: new Date(Date.now() + 60_000), usedAt: new Date() },
    });
    await expect(confirmPhoneVerification(rawToken)).resolves.toBeUndefined();
  });

  it("rejects an expired token", async () => {
    const rawToken = "test-raw-token-expired-" + Date.now();
    const crypto = await import("node:crypto");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    await prisma.phoneVerificationToken.create({
      data: { userId, phoneNumber: "9876543213", tokenHash, expiresAt: new Date(Date.now() - 1000) },
    });
    await expect(confirmPhoneVerification(rawToken)).rejects.toBeInstanceOf(AppError);
  });

  it("rejects an unknown token", async () => {
    await expect(confirmPhoneVerification("this-token-does-not-exist")).rejects.toBeInstanceOf(AppError);
  });
});
