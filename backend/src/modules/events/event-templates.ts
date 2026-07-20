/**
 * Design metadata for the 3 fixed event landing-page templates.
 * Frontend renders one of these layouts; admin picks via Event.pageTemplate.
 * This is template-based (SOW 10), not a page-builder.
 */
export const EVENT_PAGE_TEMPLATES = [
  {
    id: "CLASSIC_HERO" as const,
    name: "Classic Hero",
    description:
      "Full-bleed warm hero, traditional celebration storytelling — ideal for open days and family events.",
    previewAccent: "#8B4513",
    previewSecondary: "#F5E6D3",
    typography: { display: "Playfair Display", body: "Source Sans 3" },
    mood: "warm · traditional · trustworthy",
    sections: [
      "hero",
      "story",
      "activities",
      "ageGroup",
      "venue",
      "schedule",
      "gallery",
      "registration",
      "faq",
      "cta",
    ],
  },
  {
    id: "EDITORIAL_SPLIT" as const,
    name: "Editorial Split",
    description:
      "Magazine-style split layout with accent rail — premium editorial feel for bridal/preview evenings.",
    previewAccent: "#1A1A1A",
    previewSecondary: "#E8DFD0",
    typography: { display: "Cormorant Garamond", body: "DM Sans" },
    mood: "editorial · premium · refined",
    sections: [
      "heroSplit",
      "story",
      "schedule",
      "activities",
      "gallery",
      "registration",
      "faq",
      "cta",
    ],
  },
  {
    id: "FESTIVE_IMMERSIVE" as const,
    name: "Festive Immersive",
    description:
      "Immersive full-bleed festive campaign layout built for Google/Facebook ad landings.",
    previewAccent: "#C45C26",
    previewSecondary: "#FFF8F0",
    typography: { display: "Outfit", body: "Nunito Sans" },
    mood: "festive · bold · campaign-ready",
    sections: [
      "immersiveHero",
      "highlights",
      "venue",
      "schedule",
      "gallery",
      "registration",
      "faq",
      "cta",
    ],
  },
] as const;

export type EventPageTemplateId = (typeof EVENT_PAGE_TEMPLATES)[number]["id"];

export function resolveEventTemplate(id: string) {
  return EVENT_PAGE_TEMPLATES.find((t) => t.id === id) ?? EVENT_PAGE_TEMPLATES[0];
}
