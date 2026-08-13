"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBooking = createBooking;
exports.getBookingByCode = getBookingByCode;
exports.getCheckoutSummary = getCheckoutSummary;
exports.cancelBooking = cancelBooking;
exports.adminUpdateBookingStatus = adminUpdateBookingStatus;
exports.listAdminBookings = listAdminBookings;
exports.getCalendarBookings = getCalendarBookings;
exports.notifyBookingConfirmed = notifyBookingConfirmed;
const client_1 = require("@prisma/client");
const prisma_1 = require("../../db/prisma");
const errors_1 = require("../../lib/errors");
const sequences_1 = require("../../lib/sequences");
const client_2 = require("../../integrations/razorpay/client");
const pricing_service_1 = require("../pricing/pricing.service");
const builder_service_1 = require("../builder/builder.service");
const availability_service_1 = require("../availability/availability.service");
const validators_1 = require("../../lib/validators");
const mailer_1 = require("../../integrations/email/mailer");
async function findOrCreateCustomer(input) {
    const existing = await prisma_1.prisma.customer.findFirst({
        where: {
            deletedAt: null,
            OR: [{ email: input.email.toLowerCase() }, { phone: input.phone }],
        },
    });
    if (existing) {
        return prisma_1.prisma.customer.update({
            where: { id: existing.id },
            data: {
                fullName: input.fullName,
                email: input.email.toLowerCase(),
                phone: input.phone,
            },
        });
    }
    return prisma_1.prisma.customer.create({
        data: {
            fullName: input.fullName,
            email: input.email.toLowerCase(),
            phone: input.phone,
        },
    });
}
async function createBooking(input) {
    const eventDate = (0, validators_1.toDateOnly)(input.eventDate);
    let themeId;
    let packageId;
    let basePriceInPaise;
    let customizationTotalInPaise;
    let gstInPaise;
    let totalInPaise;
    let themeTitle;
    let packageTitle;
    let customizationCreates = [];
    let quotePayload;
    if (input.builder) {
        const bq = await (0, builder_service_1.computeBuilderQuote)(input.builder);
        themeId = bq.themeId;
        packageId = bq.packageId;
        basePriceInPaise = bq.basePriceInPaise;
        customizationTotalInPaise = bq.customizationTotalInPaise;
        gstInPaise = bq.gstInPaise;
        totalInPaise = bq.totalInPaise;
        themeTitle = bq.themeTitle;
        packageTitle = bq.packageTitle;
        quotePayload = bq;
        customizationCreates = bq.lineItems
            .filter((l) => l.packageServiceItemId)
            .map((l) => ({
            packageServiceItemId: l.packageServiceItemId,
            quantity: l.quantity,
            unitPriceInPaise: l.unitPriceInPaise,
        }));
    }
    else {
        if (!input.packageId || !input.themeId) {
            throw new errors_1.ValidationError("packageId and themeId are required without builder state");
        }
        const quote = await (0, pricing_service_1.computeQuote)({
            packageId: input.packageId,
            themeId: input.themeId,
            selectedOptions: input.selectedOptions,
        });
        themeId = input.themeId;
        packageId = input.packageId;
        basePriceInPaise = quote.basePriceInPaise;
        customizationTotalInPaise = quote.customizationTotalInPaise;
        gstInPaise = quote.gstInPaise;
        totalInPaise = quote.totalInPaise;
        themeTitle = quote.themeTitle;
        packageTitle = quote.packageTitle;
        quotePayload = quote;
        customizationCreates = quote.options.map((o) => ({
            packageServiceItemId: o.optionId,
            quantity: o.quantity,
            unitPriceInPaise: o.unitPriceInPaise,
        }));
    }
    const booking = await (0, availability_service_1.withDateAdvisoryLock)(eventDate, async (tx) => {
        const { max, isBlocked } = await (0, availability_service_1.resolveCapacity)(eventDate);
        if (isBlocked) {
            throw new errors_1.ConflictError("BOOKING_DATE_BLOCKED", "Selected date is blocked by admin.");
        }
        const booked = await (0, availability_service_1.countActiveBookings)(eventDate);
        if (booked >= max) {
            throw new errors_1.ConflictError("BOOKING_DATE_FULL", "Selected date has reached maximum bookings.");
        }
        const customer = await findOrCreateCustomer({
            fullName: input.guestName,
            email: input.guestEmail,
            phone: input.guestPhone,
        });
        const guestNote = input.builder
            ? ` | guests=${input.builder.guestCount} loc=${input.builder.location}`
            : "";
        await prisma_1.prisma.lead.create({
            data: {
                customerId: customer.id,
                name: input.guestName,
                email: input.guestEmail.toLowerCase(),
                phone: input.guestPhone,
                source: client_1.LeadSource.OTHER,
                status: client_1.LeadStatus.QUALIFIED,
                interestArea: "BOOKING",
                message: `Booking started for ${themeTitle} / ${packageTitle}${guestNote}`,
            },
        });
        const bookingCode = await (0, sequences_1.nextBookingCode)();
        const created = await tx.booking.create({
            data: {
                bookingCode,
                customerId: customer.id,
                themeId,
                packageId,
                eventDate,
                status: client_1.BookingStatus.SCHEDULED,
                paymentStatus: client_1.PaymentStatus.PENDING,
                basePriceInPaise,
                customizationTotalInPaise,
                gstInPaise,
                totalPriceInPaise: totalInPaise,
                guestEmail: input.guestEmail.toLowerCase(),
                guestPhone: input.guestPhone,
                customizations: {
                    create: customizationCreates,
                },
            },
            include: {
                theme: { select: { title: true, slug: true } },
                package: { select: { title: true, slug: true } },
                customizations: true,
                customer: { select: { id: true, fullName: true } },
            },
        });
        return created;
    });
    const order = await (0, client_2.createRazorpayOrder)({
        amountInPaise: booking.totalPriceInPaise,
        receipt: booking.bookingCode,
        notes: { bookingCode: booking.bookingCode, type: "BOOKING" },
    });
    const updated = await prisma_1.prisma.booking.update({
        where: { id: booking.id },
        data: { razorpayOrderId: order.id },
        include: {
            theme: { select: { title: true, slug: true } },
            package: { select: { title: true, slug: true } },
            customizations: true,
            customer: { select: { id: true, fullName: true } },
        },
    });
    return {
        bookingCode: updated.bookingCode,
        razorpayOrderId: order.id,
        razorpayKeyId: (0, client_2.getRazorpayPublicKey)(),
        amountInPaise: updated.totalPriceInPaise,
        currency: "INR",
        booking: updated,
        quote: quotePayload,
    };
}
async function getBookingByCode(bookingCode) {
    const booking = await prisma_1.prisma.booking.findFirst({
        where: { bookingCode, deletedAt: null },
        include: {
            theme: true,
            package: {
                include: {
                    serviceItems: {
                        orderBy: { displayOrder: "asc" },
                        include: { extraService: true },
                    },
                },
            },
            customizations: {
                include: {
                    packageServiceItem: { include: { extraService: true } },
                },
            },
            customer: true,
            invoice: true,
        },
    });
    if (!booking)
        throw new errors_1.NotFoundError("Booking not found");
    return booking;
}
async function getCheckoutSummary(bookingCode) {
    const booking = await getBookingByCode(bookingCode);
    return {
        bookingCode: booking.bookingCode,
        status: booking.status,
        paymentStatus: booking.paymentStatus,
        eventDate: booking.eventDate,
        theme: { id: booking.themeId, title: booking.theme.title, slug: booking.theme.slug },
        package: {
            id: booking.packageId,
            title: booking.package.title,
            slug: booking.package.slug,
            includedServices: booking.package.serviceItems
                .filter((s) => s.isIncluded)
                .map((s) => ({ label: s.extraService.label })),
        },
        customizations: booking.customizations.map((c) => ({
            label: c.packageServiceItem.extraService.label,
            quantity: c.quantity,
            unitPriceInPaise: c.unitPriceInPaise,
            lineTotalInPaise: c.unitPriceInPaise * c.quantity,
        })),
        pricing: {
            basePriceInPaise: booking.basePriceInPaise,
            customizationTotalInPaise: booking.customizationTotalInPaise,
            gstInPaise: booking.gstInPaise,
            totalPriceInPaise: booking.totalPriceInPaise,
        },
        guest: {
            name: booking.customer.fullName,
            email: booking.guestEmail,
            phone: booking.guestPhone,
        },
        razorpayOrderId: booking.razorpayOrderId,
    };
}
async function cancelBooking(bookingCode) {
    const booking = await getBookingByCode(bookingCode);
    if (booking.status === client_1.BookingStatus.CANCELLED)
        return booking;
    if (booking.paymentStatus === client_1.PaymentStatus.PAID) {
        throw new errors_1.ConflictError("BOOKING_ALREADY_PAID", "Paid bookings require an admin refund before cancellation.");
    }
    return prisma_1.prisma.booking.update({
        where: { id: booking.id },
        data: { status: client_1.BookingStatus.CANCELLED },
    });
}
const ADMIN_STATUS_TRANSITIONS = {
    SCHEDULED: [client_1.BookingStatus.CONFIRMED, client_1.BookingStatus.CANCELLED, client_1.BookingStatus.IN_PROGRESS],
    CONFIRMED: [client_1.BookingStatus.IN_PROGRESS, client_1.BookingStatus.CANCELLED, client_1.BookingStatus.COMPLETED],
    IN_PROGRESS: [client_1.BookingStatus.COMPLETED, client_1.BookingStatus.CANCELLED],
    COMPLETED: [],
    CANCELLED: [],
};
async function adminUpdateBookingStatus(id, status) {
    const booking = await prisma_1.prisma.booking.findFirst({ where: { id, deletedAt: null } });
    if (!booking)
        throw new errors_1.NotFoundError("Booking not found");
    const allowed = ADMIN_STATUS_TRANSITIONS[booking.status];
    if (!allowed.includes(status)) {
        throw new errors_1.ConflictError("INVALID_STATUS_TRANSITION", `Cannot transition from ${booking.status} to ${status}`);
    }
    return prisma_1.prisma.booking.update({
        where: { id },
        data: { status },
        include: { theme: true, package: true, customer: true },
    });
}
async function listAdminBookings(filters) {
    const where = { deletedAt: null };
    if (filters.status)
        where.status = filters.status;
    if (filters.paymentStatus)
        where.paymentStatus = filters.paymentStatus;
    if (filters.themeId)
        where.themeId = filters.themeId;
    if (filters.packageId)
        where.packageId = filters.packageId;
    if (filters.from || filters.to) {
        where.eventDate = {};
        if (filters.from)
            where.eventDate.gte = (0, validators_1.toDateOnly)(filters.from);
        if (filters.to)
            where.eventDate.lte = (0, validators_1.toDateOnly)(filters.to);
    }
    if (filters.search) {
        where.OR = [
            { bookingCode: { contains: filters.search, mode: "insensitive" } },
            { guestEmail: { contains: filters.search, mode: "insensitive" } },
            { guestPhone: { contains: filters.search } },
            { customer: { fullName: { contains: filters.search, mode: "insensitive" } } },
            { customer: { email: { contains: filters.search, mode: "insensitive" } } },
            { customer: { phone: { contains: filters.search } } },
        ];
    }
    const [total, items] = await Promise.all([
        prisma_1.prisma.booking.count({ where }),
        prisma_1.prisma.booking.findMany({
            where,
            include: {
                theme: { select: { title: true, slug: true } },
                package: { select: { title: true, slug: true } },
                customer: { select: { fullName: true, email: true, phone: true } },
            },
            orderBy: { eventDate: "asc" },
            skip: (filters.page - 1) * filters.pageSize,
            take: filters.pageSize,
        }),
    ]);
    return { total, items };
}
async function getCalendarBookings(view, date) {
    const anchor = (0, validators_1.toDateOnly)(date);
    let from = new Date(anchor);
    let to = new Date(anchor);
    if (view === "day") {
        // same day
    }
    else if (view === "week") {
        const day = anchor.getUTCDay();
        from.setUTCDate(anchor.getUTCDate() - day);
        to = new Date(from);
        to.setUTCDate(from.getUTCDate() + 6);
    }
    else {
        from = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1));
        to = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0));
    }
    const items = await prisma_1.prisma.booking.findMany({
        where: {
            deletedAt: null,
            eventDate: { gte: from, lte: to },
        },
        include: {
            theme: { select: { title: true } },
            package: { select: { title: true } },
            customer: { select: { fullName: true, phone: true } },
        },
        orderBy: { eventDate: "asc" },
    });
    return { view, from, to, items };
}
async function notifyBookingConfirmed(bookingCode) {
    const booking = await getBookingByCode(bookingCode);
    await (0, mailer_1.sendEmail)({
        to: booking.guestEmail,
        subject: `Booking confirmed — ${booking.bookingCode}`,
        html: (0, mailer_1.bookingConfirmationHtml)({
            bookingCode: booking.bookingCode,
            guestName: booking.customer.fullName,
            eventDate: booking.eventDate.toISOString().slice(0, 10),
            themeTitle: booking.theme.title,
            packageTitle: booking.package.title,
            totalInPaise: booking.totalPriceInPaise,
        }),
    });
}
//# sourceMappingURL=bookings.service.js.map