"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createConsultation = createConsultation;
exports.listConsultations = listConsultations;
exports.updateConsultationStatus = updateConsultationStatus;
const client_1 = require("@prisma/client");
const prisma_1 = require("../../db/prisma");
const errors_1 = require("../../lib/errors");
const settings_1 = require("../../lib/settings");
const mailer_1 = require("../../integrations/email/mailer");
const validators_1 = require("../../lib/validators");
function daysBetween(from, to) {
    const ms = (0, validators_1.toDateOnly)(to).getTime() - (0, validators_1.toDateOnly)(from).getTime();
    return Math.floor(ms / (24 * 60 * 60 * 1000));
}
async function createConsultation(input) {
    const eventDate = (0, validators_1.toDateOnly)(input.eventDate);
    const advanceNoticeDays = daysBetween(new Date(), eventDate);
    const minDays = await (0, settings_1.getMinConsultationAdvanceDays)();
    const belowMinimumNotice = advanceNoticeDays < minDays;
    const customer = await prisma_1.prisma.customer.findFirst({
        where: {
            deletedAt: null,
            OR: [{ email: input.email.toLowerCase() }, { phone: input.phone }],
        },
    });
    const consultation = await prisma_1.prisma.consultationRequest.create({
        data: {
            customerId: customer?.id,
            name: input.name,
            email: input.email.toLowerCase(),
            phone: input.phone,
            eventDate,
            childOrEventDetails: input.childOrEventDetails,
            customRequirements: input.customRequirements,
            advanceNoticeDays,
            belowMinimumNotice,
            status: client_1.ConsultationStatus.PENDING,
        },
    });
    await prisma_1.prisma.lead.create({
        data: {
            customerId: customer?.id,
            name: input.name,
            email: input.email.toLowerCase(),
            phone: input.phone,
            source: client_1.LeadSource.CONSULTATION,
            status: client_1.LeadStatus.NEW,
            interestArea: "CONSULTATION",
            message: input.customRequirements ?? input.childOrEventDetails,
        },
    });
    void (0, mailer_1.sendEmail)({
        to: input.email.toLowerCase(),
        subject: "We received your consultation request",
        html: (0, mailer_1.consultationAckHtml)(input.name),
    });
    return {
        consultation,
        warning: belowMinimumNotice
            ? `Your event is in ${advanceNoticeDays} day(s). We recommend booking consultations at least ${minDays} days in advance.`
            : null,
        belowMinimumNotice,
        advanceNoticeDays,
        minimumAdvanceDays: minDays,
    };
}
async function listConsultations(filters) {
    const where = { deletedAt: null };
    if (filters.status)
        where.status = filters.status;
    if (filters.search) {
        // Check if the search looks like a date (yyyy-mm-dd)
        const isDate = /^\d{4}-\d{2}-\d{2}$/.test(filters.search.trim());
        where.OR = [
            { name: { contains: filters.search, mode: "insensitive" } },
            { email: { contains: filters.search, mode: "insensitive" } },
            { phone: { contains: filters.search } },
            ...(isDate ? [{ eventDate: new Date(filters.search.trim()) }] : []),
        ];
    }
    const [total, items] = await Promise.all([
        prisma_1.prisma.consultationRequest.count({ where }),
        prisma_1.prisma.consultationRequest.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip: (filters.page - 1) * filters.pageSize,
            take: filters.pageSize,
        }),
    ]);
    return { total, items };
}
async function updateConsultationStatus(id, status) {
    const row = await prisma_1.prisma.consultationRequest.findFirst({ where: { id, deletedAt: null } });
    if (!row)
        throw new errors_1.NotFoundError("Consultation not found");
    return prisma_1.prisma.consultationRequest.update({ where: { id }, data: { status } });
}
//# sourceMappingURL=consultations.service.js.map