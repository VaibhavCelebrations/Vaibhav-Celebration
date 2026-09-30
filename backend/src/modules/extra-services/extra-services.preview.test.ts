import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Preview vs Customize rules for a package service, and per-theme previews.
 * Prisma and the caches are mocked: this file never touches a database.
 */
const tx = vi.hoisted(() => ({
  extraService: { create: vi.fn(), update: vi.fn(), findFirst: vi.fn(), findUniqueOrThrow: vi.fn() },
  extraServiceMedia: { deleteMany: vi.fn(), createMany: vi.fn(), groupBy: vi.fn() },
  mediaAsset: { count: vi.fn() },
  theme: { count: vi.fn(), findMany: vi.fn() },
  package: { findMany: vi.fn() },
  packageServiceItem: { createMany: vi.fn() },
}));

vi.mock("../../db/prisma", () => ({
  prisma: {
    $transaction: (fn: (client: typeof tx) => unknown) => fn(tx),
    extraService: { findUniqueOrThrow: vi.fn(async () => ({ id: "svc1" })) },
  },
}));
vi.mock("../../lib/redis", () => ({ delPattern: vi.fn() }));
vi.mock("../builder/builder.service", () => ({ invalidateBuilderCaches: vi.fn() }));

import { createExtraService, updateExtraService } from "./extra-services.service";

const current = { id: "svc1", isProductChoice: false, hasPreview: false, celebrationStage: null as string | null, selectionCount: 1 };
const SPACE = { id: "space", title: "Space" };
const JUNGLE = { id: "jungle", title: "Jungle" };

/** Two active themes; `covered` lists the theme ids that have preview files after the write. */
function givenThemes(covered: string[], stage: string | null = "BEFORE") {
  tx.theme.findMany.mockResolvedValue([SPACE, JUNGLE]);
  tx.extraServiceMedia.groupBy.mockResolvedValue(covered.map((themeId) => ({ themeId, _count: { _all: 1 } })));
  tx.extraService.findUniqueOrThrow.mockResolvedValue({ celebrationStage: stage });
}

beforeEach(() => {
  vi.clearAllMocks();
  tx.package.findMany.mockResolvedValue([]);
  tx.extraService.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: "svc1", selectionCount: 1, ...data }));
  tx.extraService.findFirst.mockResolvedValue({ ...current });
  // By default every referenced theme and file exists.
  tx.theme.count.mockImplementation(async ({ where }: { where: { id: { in: string[] } } }) => where.id.in.length);
  tx.mediaAsset.count.mockImplementation(async ({ where }: { where: { id: { in: string[] } } }) => where.id.in.length);
});

describe("service preview rules", () => {
  it("rejects a service that is both Preview and Customize", async () => {
    await expect(createExtraService({ label: "Invite", hasPreview: true, isProductChoice: true })).rejects.toThrow(/not both/);
    expect(tx.extraService.create).not.toHaveBeenCalled();
  });

  it("turning Preview on turns Customize off and clears choice pricing", async () => {
    tx.extraService.findFirst.mockResolvedValue({ ...current, isProductChoice: true });
    givenThemes(["space", "jungle"]);

    await updateExtraService("svc1", {
      hasPreview: true,
      celebrationStage: "BEFORE",
      themePreviews: [
        { themeId: "space", mediaIds: ["s1"] },
        { themeId: "jungle", mediaIds: ["j1"] },
      ],
    });

    expect(tx.extraService.update).toHaveBeenCalledWith({
      where: { id: "svc1" },
      data: { hasPreview: true, isProductChoice: false, celebrationStage: "BEFORE", pricingMode: null },
    });
  });

  it("stores each theme's files separately, in the order given, without duplicates", async () => {
    givenThemes(["space", "jungle"]);

    await createExtraService({
      label: "Invite",
      hasPreview: true,
      celebrationStage: "BEFORE",
      themePreviews: [
        { themeId: "space", mediaIds: ["s2", "s1", "s2"] },
        { themeId: "jungle", mediaIds: ["j1"] },
      ],
    });

    expect(tx.extraServiceMedia.createMany).toHaveBeenCalledWith({
      data: [
        { extraServiceId: "svc1", themeId: "space", mediaId: "s2", displayOrder: 0 },
        { extraServiceId: "svc1", themeId: "space", mediaId: "s1", displayOrder: 1 },
        { extraServiceId: "svc1", themeId: "jungle", mediaId: "j1", displayOrder: 0 },
      ],
    });
  });

  it("requires a preview for every active theme and names the ones missing", async () => {
    givenThemes(["space"]);
    await expect(
      createExtraService({ label: "Invite", hasPreview: true, celebrationStage: "BEFORE", themePreviews: [{ themeId: "space", mediaIds: ["s1"] }] }),
    ).rejects.toThrow(/every theme\. Missing: Jungle/);
  });

  it("requires a stage for a preview", async () => {
    givenThemes(["space", "jungle"], null);
    await expect(
      createExtraService({ label: "Invite", hasPreview: true, themePreviews: [{ themeId: "space", mediaIds: ["s1"] }] }),
    ).rejects.toThrow(/Before, During or After/);
  });

  it("rejects preview files that are no longer in the media library", async () => {
    tx.mediaAsset.count.mockResolvedValue(1);
    await expect(
      createExtraService({ label: "Invite", hasPreview: true, celebrationStage: "BEFORE", themePreviews: [{ themeId: "space", mediaIds: ["s1", "gone"] }] }),
    ).rejects.toThrow(/no longer exist in the media library/);
  });

  it("rejects a theme that no longer exists", async () => {
    tx.theme.count.mockResolvedValue(0);
    await expect(
      createExtraService({ label: "Invite", hasPreview: true, celebrationStage: "BEFORE", themePreviews: [{ themeId: "deleted", mediaIds: ["s1"] }] }),
    ).rejects.toThrow(/themes no longer exist/);
  });

  it("does not block an unrelated edit on a service whose preview is incomplete", async () => {
    tx.extraService.findFirst.mockResolvedValue({ ...current, hasPreview: true });
    await updateExtraService("svc1", { label: "Renamed" });
    expect(tx.theme.findMany).not.toHaveBeenCalled();
    expect(tx.extraService.update).toHaveBeenCalledWith({ where: { id: "svc1" }, data: { label: "Renamed" } });
  });
});
