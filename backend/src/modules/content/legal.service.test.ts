import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Legal page versioning and the consent stamped on an order at checkout.
 * Prisma is mocked: this file never touches a database.
 */
const mocks = vi.hoisted(() => ({
  pageFindUnique: vi.fn(),
  pageFindMany: vi.fn(),
  pageCreate: vi.fn(),
  pageUpdate: vi.fn(),
  versionCreate: vi.fn(),
  versionUpsert: vi.fn(),
  orderFindUnique: vi.fn(),
  orderUpdate: vi.fn(),
  consentCreate: vi.fn(),
}));

vi.mock("../../db/prisma", () => {
  const client = {
    legalPage: { findUnique: mocks.pageFindUnique, findMany: mocks.pageFindMany, create: mocks.pageCreate, update: mocks.pageUpdate },
    legalPageVersion: { create: mocks.versionCreate, upsert: mocks.versionUpsert },
    order: { findUnique: mocks.orderFindUnique, update: mocks.orderUpdate },
    consentRecord: { create: mocks.consentCreate },
    $transaction: (fn: (tx: unknown) => unknown) => fn(client),
  };
  return { prisma: client };
});

vi.mock("../../lib/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() } }));

import { recordCheckoutConsents } from "../consent/consent.service";
import { saveLegalPage } from "./legal.service";

const existing = {
  id: "p1",
  type: "TERMS_OF_SERVICE",
  title: "Terms & Conditions",
  bodyHtml: "<p>old</p>",
  version: 1,
  publishedAt: new Date("2026-09-16"),
  updatedAt: new Date("2026-09-16"),
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.pageUpdate.mockImplementation(async ({ data }) => ({ ...existing, ...data }));
  mocks.pageCreate.mockImplementation(async ({ data }) => ({ id: "p1", ...data }));
});

describe("saveLegalPage", () => {
  it("bumps the version and keeps both the old and the new text when the body changes", async () => {
    mocks.pageFindUnique.mockResolvedValue(existing);

    const page = await saveLegalPage("TERMS_OF_SERVICE", { bodyHtml: "<p>new</p>" });

    expect(page.version).toBe(2);
    expect(mocks.versionUpsert.mock.calls[0][0]).toMatchObject({
      where: { type_version: { type: "TERMS_OF_SERVICE", version: 1 } },
      create: { version: 1, bodyHtml: "<p>old</p>" },
      update: {},
    });
    expect(mocks.versionCreate.mock.calls[0][0].data).toMatchObject({ version: 2, bodyHtml: "<p>new</p>", title: "Terms & Conditions" });
  });

  it("does not create a version when only the published date changes", async () => {
    mocks.pageFindUnique.mockResolvedValue(existing);

    await saveLegalPage("TERMS_OF_SERVICE", { title: existing.title, bodyHtml: existing.bodyHtml, publishedAt: new Date("2026-10-01") });

    expect(mocks.versionCreate).not.toHaveBeenCalled();
    expect(mocks.versionUpsert).not.toHaveBeenCalled();
    expect(mocks.pageUpdate.mock.calls[0][0].data).toEqual({ publishedAt: new Date("2026-10-01") });
  });

  it("creates a new page at version 1 with its snapshot", async () => {
    mocks.pageFindUnique.mockResolvedValue(null);

    const page = await saveLegalPage("REFUND_POLICY", { title: "Refund", bodyHtml: "<p>r</p>" });

    expect(page.version).toBe(1);
    expect(mocks.versionCreate.mock.calls[0][0].data).toMatchObject({ type: "REFUND_POLICY", version: 1 });
  });
});

describe("recordCheckoutConsents", () => {
  beforeEach(() => {
    mocks.pageFindMany.mockResolvedValue([
      { type: "TERMS_OF_SERVICE", version: 2 },
      { type: "PRIVACY_POLICY", version: 3 },
    ]);
  });

  it("stamps the acceptance time and the policy versions in force on the order", async () => {
    mocks.orderFindUnique.mockResolvedValue({ policiesAcceptedAt: null });

    await recordCheckoutConsents("o1", { policiesAccepted: true, email: "A@Example.com", phone: "99999" });

    const data = mocks.orderUpdate.mock.calls[0][0].data;
    expect(data.policiesAcceptedAt).toBeInstanceOf(Date);
    expect(data.policyVersions).toEqual({ TERMS_OF_SERVICE: 2, PRIVACY_POLICY: 3 });
    expect(mocks.consentCreate).not.toHaveBeenCalled();
  });

  it("keeps the first acceptance when a retried checkout reuses the order", async () => {
    mocks.orderFindUnique.mockResolvedValue({ policiesAcceptedAt: new Date("2026-09-30") });

    await recordCheckoutConsents("o1", { policiesAccepted: true });

    expect(mocks.orderUpdate).not.toHaveBeenCalled();
  });

  it("logs a marketing opt-in against the order, email lower-cased", async () => {
    mocks.orderFindUnique.mockResolvedValue({ policiesAcceptedAt: null });

    await recordCheckoutConsents("o1", { policiesAccepted: true, marketingConsent: true, email: "A@Example.com", userId: "u1" });

    expect(mocks.consentCreate.mock.calls[0][0].data).toMatchObject({
      purpose: "MARKETING",
      granted: true,
      email: "a@example.com",
      userId: "u1",
      source: "checkout",
      orderId: "o1",
    });
  });

  it("never throws: the order is already placed", async () => {
    mocks.orderFindUnique.mockRejectedValue(new Error("db down"));
    await expect(recordCheckoutConsents("o1", { policiesAccepted: true })).resolves.toBeUndefined();
  });
});
