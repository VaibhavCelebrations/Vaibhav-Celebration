"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminEventsRouter = exports.eventsRouter = void 0;
const params_1 = require("../../lib/params");
const client_1 = require("@prisma/client");
const express_1 = require("express");
const zod_1 = require("zod");
const response_1 = require("../../lib/response");
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const client_2 = require("../../integrations/revalidate/client");
const events_service_1 = require("./events.service");
const roles = [
    auth_1.requireAdmin,
    (0, auth_1.requireRoles)(client_1.AdminRole.CONTENT_EDITOR, client_1.AdminRole.OPERATIONS, client_1.AdminRole.SUPER_ADMIN),
];
const eventSchema = zod_1.z.object({
    title: zod_1.z.string().min(1),
    slug: zod_1.z.string().min(1),
    bannerMediaId: zod_1.z.string().optional().nullable(),
    description: zod_1.z.string().min(1),
    activities: zod_1.z.unknown().optional().nullable(),
    ageGroup: zod_1.z.string().optional().nullable(),
    venue: zod_1.z.string().optional().nullable(),
    scheduleStartAt: zod_1.z.coerce.date().optional().nullable(),
    scheduleEndAt: zod_1.z.coerce.date().optional().nullable(),
    isRegistrationOpen: zod_1.z.boolean().optional(),
    registrationFeeInPaise: zod_1.z.number().int().min(0).optional().nullable(),
    themeId: zod_1.z.string().optional().nullable(),
    pageTemplate: zod_1.z.nativeEnum(client_1.EventPageTemplate).optional(),
    galleryMediaIds: zod_1.z.array(zod_1.z.string()).optional().nullable(),
    faqItems: zod_1.z
        .array(zod_1.z.object({ question: zod_1.z.string(), answer: zod_1.z.string() }))
        .optional()
        .nullable(),
    ctaLabel: zod_1.z.string().optional().nullable(),
    ctaUrl: zod_1.z.string().optional().nullable(),
    seoTitle: zod_1.z.string().optional().nullable(),
    seoDescription: zod_1.z.string().optional().nullable(),
    isActive: zod_1.z.boolean().optional(),
});
exports.eventsRouter = (0, express_1.Router)();
exports.eventsRouter.get("/templates", (_req, res) => (0, response_1.ok)(res, events_service_1.EVENT_PAGE_TEMPLATES));
exports.eventsRouter.get("/", (0, validate_1.validate)(zod_1.z.object({ upcoming: zod_1.z.coerce.boolean().optional() }), "query"), async (req, res, next) => {
    try {
        const q = req.query;
        return (0, response_1.ok)(res, await (0, events_service_1.listEvents)(q.upcoming));
    }
    catch (e) {
        return next(e);
    }
});
exports.eventsRouter.get("/:slug", async (req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, events_service_1.getEvent)((0, params_1.param)(req, "slug")));
    }
    catch (e) {
        return next(e);
    }
});
exports.eventsRouter.post("/:slug/register", (0, validate_1.validate)(zod_1.z.object({
    name: zod_1.z.string().min(1),
    email: zod_1.z.string().email(),
    phone: zod_1.z.string().min(1),
    guestCount: zod_1.z.number().int().min(1).optional(),
    notes: zod_1.z.string().optional(),
})), async (req, res, next) => {
    try {
        return (0, response_1.created)(res, await (0, events_service_1.registerEvent)((0, params_1.param)(req, "slug"), req.body));
    }
    catch (e) {
        return next(e);
    }
});
exports.adminEventsRouter = (0, express_1.Router)();
exports.adminEventsRouter.use(...roles);
exports.adminEventsRouter.get("/templates", (_req, res) => (0, response_1.ok)(res, events_service_1.EVENT_PAGE_TEMPLATES));
exports.adminEventsRouter.get("/", async (req, res, next) => {
    try {
        const { prisma } = await Promise.resolve().then(() => __importStar(require("../../db/prisma")));
        const { parsePagination, paginationMeta } = await Promise.resolve().then(() => __importStar(require("../../lib/response")));
        const q = req.query;
        const { page, pageSize, skip, take } = parsePagination({
            page: q.page ? Number(q.page) : undefined,
            pageSize: q.pageSize ? Number(q.pageSize) : undefined,
        });
        const where = {
            deletedAt: null,
            ...(q.search
                ? {
                    OR: [
                        { title: { contains: q.search, mode: "insensitive" } },
                        { slug: { contains: q.search, mode: "insensitive" } },
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
        return (0, response_1.ok)(res, { items, total, page, pageSize }, { pagination: paginationMeta(page, pageSize, total) });
    }
    catch (e) {
        return next(e);
    }
});
exports.adminEventsRouter.post("/", (0, validate_1.validate)(eventSchema), async (req, res, next) => {
    try {
        const item = await (0, events_service_1.createEvent)(req.body);
        void (0, client_2.triggerRevalidate)(["/events", `/events/${item.slug}`]);
        return (0, response_1.created)(res, item);
    }
    catch (e) {
        return next(e);
    }
});
exports.adminEventsRouter.get("/:id/registrations", async (req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, events_service_1.listRegistrations)((0, params_1.param)(req, "id")));
    }
    catch (e) {
        return next(e);
    }
});
exports.adminEventsRouter.get("/:id", async (req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, events_service_1.getEventById)((0, params_1.param)(req, "id")));
    }
    catch (e) {
        return next(e);
    }
});
exports.adminEventsRouter.put("/:id", (0, validate_1.validate)(zod_1.z.object({ id: zod_1.z.string().min(1) }), "params"), (0, validate_1.validate)(eventSchema.partial()), async (req, res, next) => {
    try {
        const item = await (0, events_service_1.updateEvent)((0, params_1.param)(req, "id"), req.body);
        void (0, client_2.triggerRevalidate)(["/events", `/events/${item.slug}`]);
        return (0, response_1.ok)(res, item);
    }
    catch (e) {
        return next(e);
    }
});
exports.adminEventsRouter.delete("/:id", async (req, res, next) => {
    try {
        await (0, events_service_1.deleteEvent)((0, params_1.param)(req, "id"));
        void (0, client_2.triggerRevalidate)(["/events"]);
        return (0, response_1.ok)(res, { deleted: true });
    }
    catch (e) {
        return next(e);
    }
});
//# sourceMappingURL=events.routes.js.map