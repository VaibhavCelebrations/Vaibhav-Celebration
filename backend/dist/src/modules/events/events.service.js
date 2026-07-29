"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVENT_PAGE_TEMPLATES = void 0;
exports.listEvents = listEvents;
exports.getEventById = getEventById;
exports.getEvent = getEvent;
exports.createEvent = createEvent;
exports.updateEvent = updateEvent;
exports.deleteEvent = deleteEvent;
exports.registerEvent = registerEvent;
exports.listRegistrations = listRegistrations;
const client_1 = require("@prisma/client");
const prisma_1 = require("../../db/prisma");
const errors_1 = require("../../lib/errors");
const media_ref_1 = require("../../lib/media-ref");
const client_2 = require("../../integrations/razorpay/client");
const event_templates_1 = require("./event-templates");
Object.defineProperty(exports, "EVENT_PAGE_TEMPLATES", { enumerable: true, get: function () { return event_templates_1.EVENT_PAGE_TEMPLATES; } });
const include = { theme: true };
async function enrichEvent(item) {
    const galleryIds = Array.isArray(item.galleryMediaIds)
        ? item.galleryMediaIds
        : [];
    const gallery = galleryIds.length > 0
        ? await prisma_1.prisma.mediaAsset.findMany({
            where: { id: { in: galleryIds }, deletedAt: null },
        })
        : [];
    const bannerMedia = await (0, media_ref_1.loadMediaById)(item.bannerMediaId);
    return {
        ...item,
        bannerMedia,
        gallery,
        template: (0, event_templates_1.resolveEventTemplate)(item.pageTemplate),
    };
}
async function listEvents(upcoming) {
    const items = await prisma_1.prisma.event.findMany({
        where: {
            deletedAt: null,
            isActive: true,
            ...(upcoming ? { scheduleStartAt: { gte: new Date() } } : {}),
        },
        include,
        orderBy: { scheduleStartAt: "asc" },
    });
    return Promise.all(items.map(enrichEvent));
}
async function getEventById(id) {
    const item = await prisma_1.prisma.event.findFirst({
        where: { id, deletedAt: null },
        include,
    });
    if (!item)
        throw new errors_1.NotFoundError("Event not found");
    return enrichEvent(item);
}
async function getEvent(slug) {
    const item = await prisma_1.prisma.event.findFirst({
        where: { slug, deletedAt: null, isActive: true },
        include,
    });
    if (!item)
        throw new errors_1.NotFoundError("Event not found");
    return enrichEvent(item);
}
function createEvent(data) {
    return prisma_1.prisma.event.create({ data });
}
async function updateEvent(id, data) {
    const result = await prisma_1.prisma.event.updateMany({ where: { id, deletedAt: null }, data });
    if (!result.count)
        throw new errors_1.NotFoundError("Event not found");
    return prisma_1.prisma.event.findUniqueOrThrow({ where: { id } });
}
async function deleteEvent(id) {
    const result = await prisma_1.prisma.event.updateMany({
        where: { id, deletedAt: null },
        data: { deletedAt: new Date(), isActive: false },
    });
    if (!result.count)
        throw new errors_1.NotFoundError("Event not found");
}
async function registerEvent(slug, input) {
    const event = await prisma_1.prisma.event.findFirst({
        where: { slug, deletedAt: null, isActive: true, isRegistrationOpen: true },
    });
    if (!event)
        throw new errors_1.NotFoundError("Event registration unavailable");
    const paid = (event.registrationFeeInPaise ?? 0) > 0;
    const registration = await prisma_1.prisma.eventRegistration.create({
        data: {
            eventId: event.id,
            name: input.name,
            email: input.email.toLowerCase(),
            phone: input.phone,
            guestCount: input.guestCount ?? 1,
            notes: input.notes,
            paymentStatus: paid ? client_1.PaymentStatus.PENDING : client_1.PaymentStatus.NOT_REQUIRED,
            amountPaidInPaise: paid ? event.registrationFeeInPaise : null,
        },
    });
    await prisma_1.prisma.lead.create({
        data: {
            name: input.name,
            email: input.email,
            phone: input.phone,
            source: client_1.LeadSource.EVENT_REGISTRATION,
            interestArea: event.title,
            message: input.notes,
        },
    });
    if (paid && event.registrationFeeInPaise) {
        const order = await (0, client_2.createRazorpayOrder)({
            amountInPaise: event.registrationFeeInPaise,
            receipt: registration.id,
            notes: { eventId: event.id, registrationId: registration.id },
        });
        return {
            registration,
            paymentRequired: true,
            razorpayOrderId: order.id,
            razorpayKeyId: (0, client_2.getRazorpayPublicKey)(),
            amountInPaise: event.registrationFeeInPaise,
        };
    }
    return { registration, paymentRequired: false };
}
function listRegistrations(eventId) {
    return prisma_1.prisma.eventRegistration.findMany({
        where: { eventId, deletedAt: null },
        orderBy: { createdAt: "desc" },
    });
}
//# sourceMappingURL=events.service.js.map