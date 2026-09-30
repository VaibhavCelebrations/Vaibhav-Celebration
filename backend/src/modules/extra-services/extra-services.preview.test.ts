import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Preview vs Customize rules for a package service. Prisma and the caches are mocked:
 * this file never touches a database.
 */
const tx = vi.hoisted(() => ({
  extraService: { create: vi.fn(), update: vi.fn(), findFirst: vi.fn(), findUniqueOrThrow: vi.fn() },
  extraServiceMedia: { deleteMany: vi.fn(), createMany: vi.fn() },
  mediaAsset: { count: vi.fn() },
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

const current = {
  id: "svc1",
  isProductChoice: false,
  hasPreview: false,
  celebrationStage: null as string | null,
  selectionCount: 1,
};

beforeEach(() => {
  vi.clearAllMocks();
  tx.package.findMany.mockResolvedValue([]);
  tx.extraService.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({ id: "svc1", selectionCount: 1, ...data }));
  tx.extraService.findFirst.mockResolvedValue({ ...current });
});

describe("service preview rules", () => {
  it("rejects a service that is both Preview and Customize", async () => {
    await expect(createExtraService({ label: "Invite", hasPreview: true, isProductChoice: true })).rejects.toThrow(/not both/);
    expect(tx.extraService.create).not.toHaveBeenCalled();
  });

  it("turning Preview on turns Customize off and clears choice pricing", async () => {
    tx.extraService.findFirst.mockResolvedValue({ ...current, isProductChoice: true });
    tx.mediaAsset.count.mockResolvedValue(1);
    tx.extraService.findUniqueOrThrow.mockResolvedValue({ celebrationStage: "BEFORE", _count: { previewMedia: 1 } });

    await updateExtraService("svc1", { hasPreview: true, celebrationStage: "BEFORE", previewMediaIds: ["m1"] });

    expect(tx.extraService.update).toHaveBeenCalledWith({
      where: { id: "svc1" },
      data: { hasPreview: true, isProductChoice: false, celebrationStage: "BEFORE", pricingMode: null },
    });
    expect(tx.extraServiceMedia.createMany).toHaveBeenCalledWith({
      data: [{ extraServiceId: "svc1", mediaId: "m1", displayOrder: 0 }],
    });
  });

  it("requires a stage for a preview", async () => {
    tx.mediaAsset.count.mockResolvedValue(1);
    tx.extraService.findUniqueOrThrow.mockResolvedValue({ celebrationStage: null, _count: { previewMedia: 1 } });
    await expect(createExtraService({ label: "Invite", hasPreview: true, previewMediaIds: ["m1"] })).rejects.toThrow(/Before, During or After/);
  });

  it("requires at least one image or video for a preview", async () => {
    tx.extraService.findUniqueOrThrow.mockResolvedValue({ celebrationStage: "BEFORE", _count: { previewMedia: 0 } });
    await expect(createExtraService({ label: "Invite", hasPreview: true, celebrationStage: "BEFORE" })).rejects.toThrow(/at least one image or video/);
  });

  it("rejects preview files that are no longer in the media library", async () => {
    tx.mediaAsset.count.mockResolvedValue(1);
    await expect(
      createExtraService({ label: "Invite", hasPreview: true, celebrationStage: "BEFORE", previewMediaIds: ["m1", "gone"] }),
    ).rejects.toThrow(/no longer exist/);
  });

  it("keeps the order given and drops duplicate files", async () => {
    tx.mediaAsset.count.mockResolvedValue(2);
    tx.extraService.findUniqueOrThrow.mockResolvedValue({ celebrationStage: "AFTER", _count: { previewMedia: 2 } });

    await createExtraService({ label: "Keepsake", hasPreview: true, celebrationStage: "AFTER", previewMediaIds: ["b", "a", "b"] });

    expect(tx.extraServiceMedia.createMany).toHaveBeenCalledWith({
      data: [
        { extraServiceId: "svc1", mediaId: "b", displayOrder: 0 },
        { extraServiceId: "svc1", mediaId: "a", displayOrder: 1 },
      ],
    });
  });

  it("does not block an unrelated edit on a service whose preview is incomplete", async () => {
    tx.extraService.findFirst.mockResolvedValue({ ...current, hasPreview: true });
    await updateExtraService("svc1", { label: "Renamed" });
    expect(tx.extraService.findUniqueOrThrow).not.toHaveBeenCalled();
    expect(tx.extraService.update).toHaveBeenCalledWith({ where: { id: "svc1" }, data: { label: "Renamed" } });
  });
});
