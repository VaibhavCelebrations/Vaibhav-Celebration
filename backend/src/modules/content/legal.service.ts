import type { LegalPageType } from "@prisma/client";
import { prisma } from "../../db/prisma";

export type LegalPageInput = {
  title?: string;
  bodyHtml?: string;
  publishedAt?: Date | null;
};

/**
 * The one way a legal page is written. When the title or body changes the version is bumped and
 * the new text is copied into LegalPageVersion, so no earlier version is ever lost.
 * A change to the published date alone does not create a version.
 */
export async function saveLegalPage(type: LegalPageType, input: LegalPageInput) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.legalPage.findUnique({ where: { type } });

    if (!existing) {
      if (!input.title || !input.bodyHtml) throw new Error(`Legal page ${type} needs a title and body`);
      const page = await tx.legalPage.create({
        data: { type, title: input.title, bodyHtml: input.bodyHtml, publishedAt: input.publishedAt ?? null, version: 1 },
      });
      await tx.legalPageVersion.create({
        data: { type, version: 1, title: page.title, bodyHtml: page.bodyHtml, publishedAt: page.publishedAt },
      });
      return page;
    }

    const title = input.title ?? existing.title;
    const bodyHtml = input.bodyHtml ?? existing.bodyHtml;
    const publishedAt = input.publishedAt === undefined ? existing.publishedAt : input.publishedAt;
    const textChanged = title !== existing.title || bodyHtml !== existing.bodyHtml;

    if (!textChanged) {
      return tx.legalPage.update({ where: { type }, data: { publishedAt } });
    }

    // A page written before versions existed may have no snapshot of its current text yet.
    await tx.legalPageVersion.upsert({
      where: { type_version: { type, version: existing.version } },
      create: {
        type,
        version: existing.version,
        title: existing.title,
        bodyHtml: existing.bodyHtml,
        publishedAt: existing.publishedAt,
        createdAt: existing.updatedAt,
      },
      update: {},
    });

    const version = existing.version + 1;
    const page = await tx.legalPage.update({ where: { type }, data: { title, bodyHtml, publishedAt, version } });
    await tx.legalPageVersion.create({ data: { type, version, title, bodyHtml, publishedAt } });
    return page;
  });
}

/** Version history of one page, newest first. The body is left out of the list. */
export async function listLegalPageVersions(type: LegalPageType) {
  return prisma.legalPageVersion.findMany({
    where: { type },
    orderBy: { version: "desc" },
    select: { id: true, type: true, version: true, title: true, publishedAt: true, createdAt: true },
  });
}

export async function getLegalPageVersion(type: LegalPageType, version: number) {
  return prisma.legalPageVersion.findUnique({ where: { type_version: { type, version } } });
}

/** The version of every legal page in force right now, e.g. { TERMS_OF_SERVICE: 2 }. */
export async function currentPolicyVersions(): Promise<Record<string, number>> {
  const pages = await prisma.legalPage.findMany({ select: { type: true, version: true } });
  return Object.fromEntries(pages.map((p) => [p.type, p.version]));
}
