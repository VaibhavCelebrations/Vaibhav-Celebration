import { adminFetch, adminFetchList } from "@/lib/admin-api-client";
import { createMockCollection, genId } from "@/lib/mock/store";
import type { Theme, ThemeInput } from "@/types/cms";
import { USE_MOCK_DATA } from "./config";
import { qs, type Repository } from "./types";

const ENDPOINT = "/admin/themes";

const seed: Theme[] = [
  {
    id: "theme_1",
    title: "Enchanted Garden",
    slug: "enchanted-garden",
    shortDescription: "Lush florals, fairy lights, and a whimsical woodland feel.",
    storyDescription: "A dreamy outdoor-inspired theme built around greenery arches, hanging blooms, and soft golden light.",
    audienceNote: "Best for birthdays and baby showers, ages 1-10.",
    heroImage: { id: "media_1", url: "https://picsum.photos/seed/garden/960/540", altText: "Enchanted Garden theme setup" },
    isActive: true,
    displayOrder: 1,
    seoTitle: "Enchanted Garden Theme | Vaibhav Celebrations",
    seoDescription: "Book the Enchanted Garden theme for your next celebration.",
    ogImage: null,
    createdAt: "2026-01-10T09:00:00.000Z",
    updatedAt: "2026-01-10T09:00:00.000Z",
    deletedAt: null,
    packageCount: 3,
    galleryCount: 12,
  },
  {
    id: "theme_2",
    title: "Royal Carnival",
    slug: "royal-carnival",
    shortDescription: "Bold colors, circus tents, and playful vintage charm.",
    storyDescription: "A festive carnival-meets-royalty mashup with striped tents, popcorn carts, and gold accents.",
    audienceNote: "Great for larger group parties and school-age kids.",
    heroImage: { id: "media_2", url: "https://picsum.photos/seed/carnival/960/540", altText: "Royal Carnival theme setup" },
    isActive: true,
    displayOrder: 2,
    seoTitle: null,
    seoDescription: null,
    ogImage: null,
    createdAt: "2026-01-12T09:00:00.000Z",
    updatedAt: "2026-01-12T09:00:00.000Z",
    deletedAt: null,
    packageCount: 2,
    galleryCount: 8,
  },
  {
    id: "theme_3",
    title: "Galactic Explorer",
    slug: "galactic-explorer",
    shortDescription: "Stars, rockets, and glow-in-the-dark decor.",
    storyDescription: "A space-mission-themed setup with astronaut cutouts, planet balloons, and UV lighting.",
    audienceNote: null,
    heroImage: null,
    isActive: true,
    displayOrder: 3,
    seoTitle: null,
    seoDescription: null,
    ogImage: null,
    createdAt: "2026-02-01T09:00:00.000Z",
    updatedAt: "2026-02-01T09:00:00.000Z",
    deletedAt: null,
    packageCount: 1,
    galleryCount: 5,
  },
  {
    id: "theme_4",
    title: "Pastel Princess",
    slug: "pastel-princess",
    shortDescription: "Soft pinks, tulle, and a fairytale castle backdrop.",
    storyDescription: "A romantic pastel palette with tulle drapes, a castle backdrop, and floral crowns.",
    audienceNote: "Best for younger kids, ages 2-7.",
    heroImage: { id: "media_3", url: "https://picsum.photos/seed/princess/960/540", altText: "Pastel Princess theme setup" },
    isActive: false,
    displayOrder: 4,
    seoTitle: null,
    seoDescription: null,
    ogImage: null,
    createdAt: "2026-02-15T09:00:00.000Z",
    updatedAt: "2026-02-15T09:00:00.000Z",
    deletedAt: null,
    packageCount: 0,
    galleryCount: 3,
  },
];

const mockThemesRepo = createMockCollection<Theme, ThemeInput>({
  idPrefix: "theme",
  seed,
  searchFields: ["title", "slug", "shortDescription"],
  defaultSort: "displayOrder",
  applyFilters: (row, filters) => (filters.isActive ? String(row.isActive) === filters.isActive : true),
  onCreate: (input, id) => {
    const { heroImageId, ogImageId, ...core } = input;
    return {
      id,
      deletedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      heroImage: heroImageId ? { id: genId("media"), url: heroImageId } : null,
      ogImage: ogImageId ? { id: genId("media"), url: ogImageId } : null,
      packageCount: 0,
      galleryCount: 0,
      ...core,
    };
  },
  onUpdate: (row, input) => {
    const { heroImageId, ogImageId, ...core } = input;
    return {
      ...row,
      ...core,
      heroImage: heroImageId !== undefined ? (heroImageId ? { id: row.heroImage?.id ?? genId("media"), url: heroImageId } : null) : row.heroImage,
      ogImage: ogImageId !== undefined ? (ogImageId ? { id: row.ogImage?.id ?? genId("media"), url: ogImageId } : null) : row.ogImage,
      updatedAt: new Date().toISOString(),
    };
  },
  notFoundMessage: () => "This theme no longer exists.",
});

export const themesRepo: Repository<Theme, ThemeInput> = USE_MOCK_DATA
  ? mockThemesRepo
  : {
      list: (query) =>
        adminFetchList<Theme>(`${ENDPOINT}${qs(query)}`, { page: query.page, pageSize: query.pageSize }),
      get: (id) => adminFetch<Theme>(`${ENDPOINT}/${id}`),
      create: (body) => adminFetch<Theme>(ENDPOINT, { method: "POST", body }),
      update: (id, body) => adminFetch<Theme>(`${ENDPOINT}/${id}`, { method: "PATCH", body }),
      archive: (id) => adminFetch<void>(`${ENDPOINT}/${id}`, { method: "DELETE" }),
    };
