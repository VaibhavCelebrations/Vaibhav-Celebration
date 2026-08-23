import type { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { NotFoundError } from "../../lib/errors";
import { resolveMediaInJson, toMediaRef } from "../../lib/media-ref";

const PAGE_KEYS = ["home", "about", "contact"] as const;
export type PageKey = (typeof PAGE_KEYS)[number];

export function isValidPageKey(key: string): key is PageKey {
  return (PAGE_KEYS as readonly string[]).includes(key);
}

async function loadMediaById(id: string) {
  const asset = await prisma.mediaAsset.findFirst({
    where: { id, deletedAt: null },
  });
  return toMediaRef(asset);
}

export async function getPageContent(pageKey: string) {
  if (!isValidPageKey(pageKey)) throw new NotFoundError("Page not found");
  let row = await prisma.pageContent.findUnique({ where: { pageKey } });
  if (!row) {
    row = await prisma.pageContent.create({
      data: { pageKey, sections: defaultPageSections[pageKey] },
    });
  }
  const sections = await resolveMediaInJson(row.sections, loadMediaById);
  const normalized = normalizeHomeHero(pageKey, sections);
  if (normalized.changed) {
    await prisma.pageContent.update({
      where: { pageKey },
      data: { sections: normalized.sections as Prisma.InputJsonValue },
    });
  }
  return { pageKey: row.pageKey, sections: normalized.sections, updatedAt: row.updatedAt };
}

export async function listPageContent() {
  const rows = await prisma.pageContent.findMany({
    orderBy: { pageKey: "asc" },
  });
  return rows;
}

export async function upsertPageContent(
  pageKey: string,
  sections: Prisma.InputJsonValue,
) {
  if (!isValidPageKey(pageKey)) throw new NotFoundError("Invalid page key");
  return prisma.pageContent.upsert({
    where: { pageKey },
    create: { pageKey, sections },
    update: { sections },
  });
}

function asPlainText(value: unknown): string | null {
  if (typeof value === "string" && value.trim() && value.trim() !== "[object Object]") {
    return value.trim();
  }
  if (value && typeof value === "object") {
    const rec = value as Record<string, unknown>;
    for (const key of ["text", "value", "label", "html", "title"]) {
      if (typeof rec[key] === "string" && rec[key].trim()) return rec[key].trim();
    }
  }
  return null;
}

function normalizeHomeHero(pageKey: string, sections: unknown): { sections: unknown; changed: boolean } {
  if (pageKey !== "home" || !sections || typeof sections !== "object") {
    return { sections, changed: false };
  }
  const root = sections as { hero?: Record<string, unknown> };
  if (!root.hero || typeof root.hero !== "object") return { sections, changed: false };

  const oldHeadline = asPlainText(root.hero.headline) ?? "";
  const shouldReplace =
    !oldHeadline ||
    oldHeadline.includes("Thoughtfully Curated") ||
    oldHeadline === "[object Object]";
  if (!shouldReplace) return { sections, changed: false };

  const defaults = defaultPageSections.home as { hero: Record<string, unknown> };
  return {
    changed: true,
    sections: {
      ...root,
      hero: {
        ...root.hero,
        eyebrow: asPlainText(root.hero.eyebrow) ?? defaults.hero.eyebrow,
        headline: defaults.hero.headline,
        headlineAccent: defaults.hero.headlineAccent,
        subheadline: asPlainText(root.hero.subheadline)?.includes("Creating customized kids birthday")
          ? defaults.hero.subheadline
          : (asPlainText(root.hero.subheadline) ?? defaults.hero.subheadline),
        primaryCta: defaults.hero.primaryCta,
        secondaryCta: defaults.hero.secondaryCta,
      },
    },
  };
}

export const defaultPageSections: Record<PageKey, Prisma.InputJsonValue> = {
  home: {
    hero: {
      eyebrow: "Your Complete Celebration Ecosystem ✦",
      headline: "One Theme. Every Detail. Beautifully Celebrated",
      headlineAccent: "Beautifully Celebrated",
      subheadline:
        "From the first invite to activities, welcome details, personalized return gifts and keepsakes — Vaibhav Celebrations brings every element together under one thoughtful concept, tailored around the person, milestone or moment being celebrated.",
      primaryCta: { label: "Explore Celebrations", href: "/themes" },
      secondaryCta: { label: "Build Your Celebration", href: "/build-package" },
      backgroundImage: { mediaId: "" },
    },
    deliverables: {
      title: "Everything You Need for a Perfect Celebration",
      subtitle: "From theme to return gifts — we handle every detail.",
    },
    ourStory: {
      title: "Our Story",
      paragraphs: [
        "Vaibhav Celebrations was born from a simple belief: every child deserves a celebration as unique as they are.",
        "We combine creative themes, thoughtful planning, and premium execution to create moments families cherish forever.",
      ],
    },
    ctaBand: {
      headline: "Ready to Plan Something Special?",
      subheadline:
        "Book a free consultation and let's bring your vision to life.",
      ctaLabel: "Book Free Consultation",
      ctaHref: "/consultation",
    },
  },
  about: {
    hero: {
      title: "About Vaibhav Celebrations",
      subtitle:
        "Creating magical moments for families across Delhi NCR since day one.",
    },
    story: {
      title: "Our Journey",
      paragraphs: [
        "What started as a passion for creating beautiful birthday experiences has grown into a full-service celebration studio.",
        "Today, we serve families who want more than a party — they want a story their child will remember forever.",
      ],
    },
    values: {
      title: "What We Stand For",
      items: [
        {
          title: "Personalization",
          description:
            "Every celebration is tailored to your child's personality and interests.",
        },
        {
          title: "Quality",
          description:
            "Premium materials, professional execution, and attention to every detail.",
        },
        {
          title: "Trust",
          description:
            "Transparent pricing, reliable timelines, and a team that cares deeply.",
        },
      ],
    },
  },
  contact: {
    hero: {
      title: "Get in Touch",
      subtitle: "We'd love to hear about your celebration plans.",
    },
    info: {
      phone: "+91 98765 43210",
      email: "hello@vaibhavcelebrations.in",
      address: "Vaibhav Farmhouse, Near Surajkund, Faridabad, Haryana 121009",
      hours: "Mon–Sat, 10 AM – 7 PM",
    },
    formLabels: {
      name: "Your Name",
      email: "Email Address",
      phone: "Phone Number",
      message: "Tell us about your celebration",
      submit: "Send Message",
    },
    mapEmbedUrl: "",
  },
};
