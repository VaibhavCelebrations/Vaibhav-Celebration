import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../db/prisma";
import {
  createExtraService,
  deleteExtraService,
  getExtraService,
  listExtraServices,
  updateExtraService,
} from "../extra-services/extra-services.service";
import {
  getPackageMatrix,
  savePackageMatrix,
} from "./packages.service";

const testLabel = `Vitest Extra Service ${Date.now()}`;
let createdServiceId: string | null = null;

describe("extra services CRUD", () => {
  it("creates an extra service with matrix rows for all packages", async () => {
    const item = await createExtraService({
      label: testLabel,
      description: "Test service",
      customizationPriceInPaise: 99000,
      displayOrder: 999,
      isActive: true,
    });
    createdServiceId = item.id;

    expect(item.label).toBe(testLabel);
    expect(item.customizationPriceInPaise).toBe(99000);

    const packageCount = await prisma.package.count({ where: { deletedAt: null, isActive: true } });
    const itemCount = await prisma.packageServiceItem.count({
      where: { extraServiceId: item.id },
    });
    expect(itemCount).toBe(packageCount);
  });

  it("reads the created extra service", async () => {
    expect(createdServiceId).toBeTruthy();
    const item = await getExtraService(createdServiceId!);
    expect(item.label).toBe(testLabel);
  });

  it("updates the extra service price", async () => {
    expect(createdServiceId).toBeTruthy();
    const updated = await updateExtraService(createdServiceId!, {
      customizationPriceInPaise: 149000,
      description: "Updated description",
    });
    expect(updated.customizationPriceInPaise).toBe(149000);
    expect(updated.description).toBe("Updated description");
  });

  it("lists extra services including inactive", async () => {
    const items = await listExtraServices(true);
    expect(items.some((item) => item.id === createdServiceId)).toBe(true);
  });

  it("archives the extra service", async () => {
    expect(createdServiceId).toBeTruthy();
    await deleteExtraService(createdServiceId!);
    const archived = await prisma.extraService.findUnique({ where: { id: createdServiceId! } });
    expect(archived?.deletedAt).not.toBeNull();
    expect(archived?.isActive).toBe(false);
  });
});

describe("package matrix save", () => {
  let premiumPkgId: string;
  let videoServiceId: string;
  let originalPrice: number;
  let originalIncluded: boolean;
  let originalVideoPrice: number;

  beforeAll(async () => {
    const matrix = await getPackageMatrix();
    const premium = matrix.packages.find((p) => p.slug === "premium");
    const videoSvc = matrix.extraServices.find((s) => s.label === "Video invites");
    if (!premium || !videoSvc) {
      throw new Error("Seed data missing premium package or Video invites service");
    }
    premiumPkgId = premium.id;
    videoServiceId = videoSvc.id;
    originalPrice = premium.priceInPaise;
    originalVideoPrice = videoSvc.customizationPriceInPaise;

    const cell = premium.serviceItems.find((i) => i.extraServiceId === videoSvc.id);
    originalIncluded = cell?.isIncluded ?? false;
  });

  it("loads the package matrix", async () => {
    const matrix = await getPackageMatrix();
    expect(matrix.packages.length).toBeGreaterThanOrEqual(3);
    expect(matrix.extraServices.length).toBeGreaterThan(0);
  });

  it("updates package pricing without breaking order package line references", async () => {
    const matrix = await getPackageMatrix();
    const packages = matrix.packages.map((pkg) => ({
      packageId: pkg.id,
      title: pkg.title,
      description: pkg.description,
      priceInPaise: pkg.id === premiumPkgId ? originalPrice + 10000 : pkg.priceInPaise,
      isRecommended: pkg.isRecommended,
      isActive: pkg.isActive,
      isCustomizable: pkg.isCustomizable,
      items: matrix.extraServices.map((svc, index) => {
        const existing = pkg.serviceItems.find((i) => i.extraServiceId === svc.id);
        return {
          extraServiceId: svc.id,
          isIncluded: existing?.isIncluded ?? false,
          displayOrder: index,
        };
      }),
    }));

    const beforeCount = await prisma.orderPackageLine.count({
      where: {
        packageServiceItem: { packageId: premiumPkgId, extraServiceId: videoServiceId },
      },
    });

    const saved = await savePackageMatrix({
      packages,
      extraServices: matrix.extraServices.map((svc) => ({
        id: svc.id,
        customizationPriceInPaise: svc.customizationPriceInPaise,
      })),
    });

    const updatedPremium = saved.find((p) => p.id === premiumPkgId);
    expect(updatedPremium?.priceInPaise).toBe(originalPrice + 10000);

    const afterCount = await prisma.orderPackageLine.count({
      where: {
        packageServiceItem: { packageId: premiumPkgId, extraServiceId: videoServiceId },
      },
    });
    expect(afterCount).toBe(beforeCount);
  });

  it("updates inclusion flags and service customization prices", async () => {
    const matrix = await getPackageMatrix();
    const toggledIncluded = !originalIncluded;

    await savePackageMatrix({
      packages: matrix.packages.map((pkg) => ({
        packageId: pkg.id,
        items: matrix.extraServices.map((svc, index) => {
          const existing = pkg.serviceItems.find((i) => i.extraServiceId === svc.id);
          const isIncluded =
            pkg.id === premiumPkgId && svc.id === videoServiceId
              ? toggledIncluded
              : (existing?.isIncluded ?? false);
          return {
            extraServiceId: svc.id,
            isIncluded,
            displayOrder: index,
          };
        }),
      })),
      extraServices: matrix.extraServices.map((svc) => ({
        id: svc.id,
        customizationPriceInPaise:
          svc.id === videoServiceId ? svc.customizationPriceInPaise + 5000 : svc.customizationPriceInPaise,
      })),
    });

    const refreshed = await getPackageMatrix();
    const premium = refreshed.packages.find((p) => p.id === premiumPkgId)!;
    const cell = premium.serviceItems.find((i) => i.extraServiceId === videoServiceId)!;
    expect(cell.isIncluded).toBe(toggledIncluded);

    const videoSvc = refreshed.extraServices.find((s) => s.id === videoServiceId)!;
    expect(videoSvc.customizationPriceInPaise).toBe(
      matrix.extraServices.find((s) => s.id === videoServiceId)!.customizationPriceInPaise + 5000,
    );
  });

  afterAll(async () => {
    const matrix = await getPackageMatrix();
    await savePackageMatrix({
      packages: matrix.packages.map((pkg) => ({
        packageId: pkg.id,
        priceInPaise: pkg.id === premiumPkgId ? originalPrice : pkg.priceInPaise,
        items: matrix.extraServices.map((svc, index) => {
          const existing = pkg.serviceItems.find((i) => i.extraServiceId === svc.id);
          const isIncluded =
            pkg.id === premiumPkgId && svc.id === videoServiceId
              ? originalIncluded
              : (existing?.isIncluded ?? false);
          return {
            extraServiceId: svc.id,
            isIncluded,
            displayOrder: index,
          };
        }),
      })),
      extraServices: matrix.extraServices.map((svc) => ({
        id: svc.id,
        customizationPriceInPaise:
          svc.id === videoServiceId ? originalVideoPrice : svc.customizationPriceInPaise,
      })),
    });
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});
