import { param } from "../../lib/params";
import { AdminRole, EventPageTemplate } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { created, ok } from "../../lib/response";
import { requireAdmin, requireRoles } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { triggerRevalidate } from "../../integrations/revalidate/client";
import {
  createEvent,
  deleteEvent,
  EVENT_PAGE_TEMPLATES,
  getEvent,
  listEvents,
  listRegistrations,
  registerEvent,
  updateEvent,
} from "./events.service";

const roles = [
  requireAdmin,
  requireRoles(AdminRole.CONTENT_EDITOR, AdminRole.OPERATIONS, AdminRole.SUPER_ADMIN),
];

const eventSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  bannerMediaId: z.string().optional().nullable(),
  description: z.string().min(1),
  activities: z.unknown().optional().nullable(),
  ageGroup: z.string().optional().nullable(),
  venue: z.string().optional().nullable(),
  scheduleStartAt: z.coerce.date().optional().nullable(),
  scheduleEndAt: z.coerce.date().optional().nullable(),
  isRegistrationOpen: z.boolean().optional(),
  registrationFeeInPaise: z.number().int().min(0).optional().nullable(),
  themeId: z.string().optional().nullable(),
  pageTemplate: z.nativeEnum(EventPageTemplate).optional(),
  galleryMediaIds: z.array(z.string()).optional().nullable(),
  faqItems: z
    .array(z.object({ question: z.string(), answer: z.string() }))
    .optional()
    .nullable(),
  ctaLabel: z.string().optional().nullable(),
  ctaUrl: z.string().optional().nullable(),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const eventsRouter = Router();

eventsRouter.get("/templates", (_req, res) => ok(res, EVENT_PAGE_TEMPLATES));

eventsRouter.get(
  "/",
  validate(z.object({ upcoming: z.coerce.boolean().optional() }), "query"),
  async (req, res, next) => {
    try {
      const q = req.query as unknown as { upcoming?: boolean };
      return ok(res, await listEvents(q.upcoming));
    } catch (e) {
      return next(e);
    }
  },
);

eventsRouter.get("/:slug", async (req, res, next) => {
  try {
    return ok(res, await getEvent(param(req, "slug")));
  } catch (e) {
    return next(e);
  }
});

eventsRouter.post(
  "/:slug/register",
  validate(
    z.object({
      name: z.string().min(1),
      email: z.string().email(),
      phone: z.string().min(1),
      guestCount: z.number().int().min(1).optional(),
      notes: z.string().optional(),
    }),
  ),
  async (req, res, next) => {
    try {
      return created(res, await registerEvent(param(req, "slug"), req.body));
    } catch (e) {
      return next(e);
    }
  },
);

export const adminEventsRouter = Router();
adminEventsRouter.use(...roles);

adminEventsRouter.get("/templates", (_req, res) => ok(res, EVENT_PAGE_TEMPLATES));

adminEventsRouter.get("/", async (req, res, next) => {
  try {
    const { prisma } = await import("../../db/prisma");
    const { parsePagination, paginationMeta } = await import("../../lib/response");
    const q = req.query as { page?: string; pageSize?: string; search?: string };
    const { page, pageSize, skip, take } = parsePagination({
      page: q.page ? Number(q.page) : undefined,
      pageSize: q.pageSize ? Number(q.pageSize) : undefined,
    });
    const where = {
      deletedAt: null as null,
      ...(q.search
        ? {
            OR: [
              { title: { contains: q.search, mode: "insensitive" as const } },
              { slug: { contains: q.search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      prisma.event.findMany({
        where,
        skip,
        take,
        orderBy: { scheduleStartAt: "desc" },
        include: { theme: true },
      }),
      prisma.event.count({ where }),
    ]);
    return ok(res, { items, total, page, pageSize }, { pagination: paginationMeta(page, pageSize, total) });
  } catch (e) {
    return next(e);
  }
});

adminEventsRouter.post("/", validate(eventSchema), async (req, res, next) => {
  try {
    const item = await createEvent(req.body);
    void triggerRevalidate(["/events", `/events/${item.slug}`]);
    return created(res, item);
  } catch (e) {
    return next(e);
  }
});

adminEventsRouter.get("/:id/registrations", async (req, res, next) => {
  try {
    return ok(res, await listRegistrations(param(req, "id")));
  } catch (e) {
    return next(e);
  }
});

adminEventsRouter.put(
  "/:id",
  validate(z.object({ id: z.string().min(1) }), "params"),
  validate(eventSchema.partial()),
  async (req, res, next) => {
    try {
      const item = await updateEvent(param(req, "id"), req.body);
      void triggerRevalidate(["/events", `/events/${item.slug}`]);
      return ok(res, item);
    } catch (e) {
      return next(e);
    }
  },
);

adminEventsRouter.delete("/:id", async (req, res, next) => {
  try {
    await deleteEvent(param(req, "id"));
    void triggerRevalidate(["/events"]);
    return ok(res, { deleted: true });
  } catch (e) {
    return next(e);
  }
});
