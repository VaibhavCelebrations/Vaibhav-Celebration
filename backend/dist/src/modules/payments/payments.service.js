"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPaymentOrder = createPaymentOrder;
exports.handleRazorpayWebhook = handleRazorpayWebhook;
exports.enqueueInvoiceForBooking = enqueueInvoiceForBooking;
exports.deliverInvoice = deliverInvoice;
exports.listInvoices = listInvoices;
exports.getInvoiceByNumber = getInvoiceByNumber;
exports.exportInvoicesCsv = exportInvoicesCsv;
const client_1 = require("@prisma/client");
const prisma_1 = require("../../db/prisma");
const errors_1 = require("../../lib/errors");
const sequences_1 = require("../../lib/sequences");
const client_2 = require("../../integrations/razorpay/client");
const pdf_1 = require("../../integrations/invoice/pdf");
const mailer_1 = require("../../integrations/email/mailer");
const client_3 = require("../../integrations/whatsapp/client");
const bookings_service_1 = require("../bookings/bookings.service");
const orders_service_1 = require("../orders/orders.service");
const logger_1 = require("../../lib/logger");
async function createPaymentOrder(input) {
    if (input.bookingCode) {
        const booking = await prisma_1.prisma.booking.findFirst({
            where: { bookingCode: input.bookingCode, deletedAt: null },
        });
        if (!booking)
            throw new errors_1.NotFoundError("Booking not found");
        if (booking.paymentStatus === client_1.PaymentStatus.PAID) {
            return {
                razorpayOrderId: booking.razorpayOrderId,
                amountInPaise: booking.totalPriceInPaise,
                razorpayKeyId: (0, client_2.getRazorpayPublicKey)(),
                alreadyPaid: true,
            };
        }
        if (booking.razorpayOrderId) {
            return {
                razorpayOrderId: booking.razorpayOrderId,
                amountInPaise: booking.totalPriceInPaise,
                razorpayKeyId: (0, client_2.getRazorpayPublicKey)(),
                alreadyPaid: false,
            };
        }
        const order = await (0, client_2.createRazorpayOrder)({
            amountInPaise: booking.totalPriceInPaise,
            receipt: booking.bookingCode,
            notes: { bookingCode: booking.bookingCode, type: "BOOKING" },
        });
        await prisma_1.prisma.booking.update({
            where: { id: booking.id },
            data: { razorpayOrderId: order.id },
        });
        return {
            razorpayOrderId: order.id,
            amountInPaise: booking.totalPriceInPaise,
            razorpayKeyId: (0, client_2.getRazorpayPublicKey)(),
            alreadyPaid: false,
        };
    }
    throw new errors_1.AppError("VALIDATION_ERROR", "bookingCode is required", 400);
}
async function handleRazorpayWebhook(rawBody, signature) {
    if (!(0, client_2.verifyWebhookSignature)(rawBody, signature)) {
        throw new errors_1.AppError("PAYMENT_SIGNATURE_INVALID", "Invalid Razorpay webhook signature", 400);
    }
    const payload = JSON.parse(rawBody);
    const event = payload.event;
    const payment = payload.payload.payment?.entity;
    const orderId = payment?.order_id ?? payload.payload.order?.entity.id;
    if (!orderId) {
        logger_1.logger.warn({ event }, "Webhook without order id — ignored");
        return { handled: false };
    }
    const booking = await prisma_1.prisma.booking.findFirst({
        where: { razorpayOrderId: orderId, deletedAt: null },
        include: { customer: true, theme: true, package: true },
    });
    if (booking) {
        if (event === "payment.captured" || payment?.status === "captured") {
            if (booking.paymentStatus !== client_1.PaymentStatus.PAID) {
                await prisma_1.prisma.booking.update({
                    where: { id: booking.id },
                    data: {
                        paymentStatus: client_1.PaymentStatus.PAID,
                        status: client_1.BookingStatus.CONFIRMED,
                        razorpayPaymentId: payment?.id,
                    },
                });
                await enqueueInvoiceForBooking(booking.id);
                void (0, bookings_service_1.notifyBookingConfirmed)(booking.bookingCode);
            }
            return { handled: true, type: "BOOKING", id: booking.id };
        }
        if (event === "payment.failed") {
            await prisma_1.prisma.booking.update({
                where: { id: booking.id },
                data: { paymentStatus: client_1.PaymentStatus.FAILED },
            });
            return { handled: true, type: "BOOKING_FAILED", id: booking.id };
        }
    }
    const shopOrder = await (0, orders_service_1.findOrderByRazorpayOrderId)(orderId);
    if (shopOrder) {
        if (event === "payment.captured" || payment?.status === "captured") {
            await (0, orders_service_1.markOrderPaid)(shopOrder.id, payment?.id);
            return { handled: true, type: "SHOP_ORDER", id: shopOrder.id };
        }
        if (event === "payment.failed") {
            await (0, orders_service_1.cancelOrderAndRestock)(shopOrder.id, "Payment failed");
            return { handled: true, type: "SHOP_ORDER_FAILED", id: shopOrder.id };
        }
    }
    const registration = await prisma_1.prisma.eventRegistration.findFirst({
        where: { razorpayOrderId: orderId, deletedAt: null },
    });
    if (registration) {
        if (event === "payment.captured" || payment?.status === "captured") {
            await prisma_1.prisma.eventRegistration.update({
                where: { id: registration.id },
                data: {
                    paymentStatus: client_1.PaymentStatus.PAID,
                    amountPaidInPaise: payment?.amount,
                    razorpayPaymentId: payment?.id,
                },
            });
            return { handled: true, type: "EVENT_REGISTRATION", id: registration.id };
        }
        if (event === "payment.failed") {
            await prisma_1.prisma.eventRegistration.update({
                where: { id: registration.id },
                data: { paymentStatus: client_1.PaymentStatus.FAILED },
            });
            return { handled: true, type: "EVENT_REGISTRATION_FAILED", id: registration.id };
        }
    }
    logger_1.logger.info({ event, orderId }, "Webhook matched no entity");
    return { handled: false };
}
async function enqueueInvoiceForBooking(bookingId) {
    const booking = await prisma_1.prisma.booking.findFirst({
        where: { id: bookingId, deletedAt: null },
        include: {
            customer: true,
            theme: true,
            package: true,
            customizations: { include: { packageServiceItem: { include: { extraService: true } } } },
            invoice: true,
        },
    });
    if (!booking)
        throw new errors_1.NotFoundError("Booking not found");
    if (booking.invoice)
        return booking.invoice;
    const invoiceNumber = await (0, sequences_1.nextInvoiceNumber)();
    const lineItems = [
        { label: `${booking.theme.title} — ${booking.package.title}`, amountInPaise: booking.basePriceInPaise },
        ...booking.customizations.map((c) => ({
            label: `${c.packageServiceItem.extraService.label} × ${c.quantity}`,
            amountInPaise: c.unitPriceInPaise * c.quantity,
        })),
    ];
    const pdf = await (0, pdf_1.generateInvoicePdf)({
        invoiceNumber,
        guestName: booking.customer.fullName,
        guestEmail: booking.guestEmail,
        guestPhone: booking.guestPhone,
        lineItems,
        subtotalInPaise: booking.basePriceInPaise + booking.customizationTotalInPaise,
        gstInPaise: booking.gstInPaise,
        totalInPaise: booking.totalPriceInPaise,
        issuedAt: new Date(),
    });
    const invoice = await prisma_1.prisma.invoice.create({
        data: {
            invoiceNumber,
            linkedType: client_1.InvoiceLinkedType.BOOKING,
            bookingId: booking.id,
            customerId: booking.customerId,
            subtotalInPaise: booking.basePriceInPaise + booking.customizationTotalInPaise,
            gstInPaise: booking.gstInPaise,
            totalInPaise: booking.totalPriceInPaise,
            pdfUrl: pdf.url,
        },
    });
    await deliverInvoice(invoice.id);
    return invoice;
}
async function deliverInvoice(invoiceId) {
    const invoice = await prisma_1.prisma.invoice.findFirst({
        where: { id: invoiceId, deletedAt: null },
        include: { customer: true, booking: true },
    });
    if (!invoice)
        throw new errors_1.NotFoundError("Invoice not found");
    const emailResult = await (0, mailer_1.sendEmail)({
        to: invoice.customer.email,
        subject: `Invoice ${invoice.invoiceNumber} — Vaibhav Celebrations`,
        html: (0, mailer_1.invoiceEmailHtml)({
            invoiceNumber: invoice.invoiceNumber,
            guestName: invoice.customer.fullName,
            totalInPaise: invoice.totalInPaise,
            pdfUrl: invoice.pdfUrl,
        }),
    });
    const wa = await (0, client_3.sendWhatsAppMessage)({
        toPhone: invoice.customer.phone,
        templateName: "invoice_delivery",
        body: `Your invoice ${invoice.invoiceNumber} for ₹${(invoice.totalInPaise / 100).toFixed(2)} is ready.`,
        mediaUrl: invoice.pdfUrl ?? undefined,
    });
    return prisma_1.prisma.invoice.update({
        where: { id: invoice.id },
        data: {
            emailSentAt: emailResult.sent ? new Date() : invoice.emailSentAt,
            whatsappSentAt: wa.sent ? new Date() : invoice.whatsappSentAt,
            whatsappSendStatus: wa.status ?? (wa.skipped ? "SKIPPED" : wa.sent ? "SENT" : "FAILED"),
        },
    });
}
async function listInvoices(filters) {
    const where = { deletedAt: null };
    if (filters.customerId)
        where.customerId = filters.customerId;
    if (filters.from || filters.to) {
        where.issuedAt = {};
        if (filters.from)
            where.issuedAt.gte = new Date(filters.from);
        if (filters.to)
            where.issuedAt.lte = new Date(filters.to);
    }
    if (filters.search) {
        where.OR = [
            { invoiceNumber: { contains: filters.search, mode: "insensitive" } },
            { customer: { fullName: { contains: filters.search, mode: "insensitive" } } },
            { customer: { email: { contains: filters.search, mode: "insensitive" } } },
            { customer: { phone: { contains: filters.search } } },
        ];
    }
    const [total, items] = await Promise.all([
        prisma_1.prisma.invoice.count({ where }),
        prisma_1.prisma.invoice.findMany({
            where,
            include: { customer: { select: { fullName: true, email: true, phone: true } }, booking: true },
            orderBy: { issuedAt: "desc" },
            skip: (filters.page - 1) * filters.pageSize,
            take: filters.pageSize,
        }),
    ]);
    return { total, items };
}
async function getInvoiceByNumber(invoiceNumber) {
    const invoice = await prisma_1.prisma.invoice.findFirst({
        where: { invoiceNumber, deletedAt: null },
        include: { customer: true, booking: true },
    });
    if (!invoice)
        throw new errors_1.NotFoundError("Invoice not found");
    return invoice;
}
async function exportInvoicesCsv(from, to) {
    const { items } = await listInvoices({ from, to, page: 1, pageSize: 10_000 });
    const header = "invoiceNumber,customer,email,phone,subtotal,gst,total,issuedAt,pdfUrl";
    const rows = items.map((i) => [
        i.invoiceNumber,
        JSON.stringify(i.customer.fullName),
        i.customer.email,
        i.customer.phone,
        (i.subtotalInPaise / 100).toFixed(2),
        (i.gstInPaise / 100).toFixed(2),
        (i.totalInPaise / 100).toFixed(2),
        i.issuedAt.toISOString(),
        i.pdfUrl ?? "",
    ].join(","));
    return [header, ...rows].join("\n");
}
//# sourceMappingURL=payments.service.js.map