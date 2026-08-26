"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPaymentOrder = createPaymentOrder;
exports.handleRazorpayWebhook = handleRazorpayWebhook;
exports.deliverInvoice = deliverInvoice;
exports.listInvoices = listInvoices;
exports.getInvoiceByNumber = getInvoiceByNumber;
exports.exportInvoicesCsv = exportInvoicesCsv;
exports.listPaymentEvents = listPaymentEvents;
const client_1 = require("@prisma/client");
const prisma_1 = require("../../db/prisma");
const errors_1 = require("../../lib/errors");
const client_2 = require("../../integrations/razorpay/client");
const mailer_1 = require("../../integrations/email/mailer");
const pdf_1 = require("../../integrations/invoice/pdf");
const client_3 = require("../../integrations/whatsapp/client");
const orders_service_1 = require("../orders/orders.service");
const logger_1 = require("../../lib/logger");
const payment_events_1 = require("./payment-events");
async function createPaymentOrder(input) {
    if (input.orderCode) {
        const order = await prisma_1.prisma.order.findFirst({ where: { orderCode: input.orderCode } });
        if (!order)
            throw new errors_1.NotFoundError("Order not found");
        if (order.paymentStatus === client_1.PaymentStatus.PAID) {
            return {
                razorpayOrderId: order.razorpayOrderId,
                amountInPaise: order.totalInPaise,
                razorpayKeyId: (0, client_2.getRazorpayPublicKey)(),
                alreadyPaid: true,
            };
        }
        if (order.razorpayOrderId && order.paymentStatus !== client_1.PaymentStatus.FAILED) {
            return {
                razorpayOrderId: order.razorpayOrderId,
                amountInPaise: order.totalInPaise,
                razorpayKeyId: (0, client_2.getRazorpayPublicKey)(),
                alreadyPaid: false,
            };
        }
        const rz = await (0, client_2.createRazorpayOrder)({
            amountInPaise: order.totalInPaise,
            receipt: order.orderCode,
            notes: { orderCode: order.orderCode, type: "SHOP_ORDER" },
        });
        await prisma_1.prisma.order.update({ where: { id: order.id }, data: { razorpayOrderId: rz.id, paymentStatus: client_1.PaymentStatus.PENDING } });
        return {
            razorpayOrderId: rz.id,
            amountInPaise: order.totalInPaise,
            razorpayKeyId: (0, client_2.getRazorpayPublicKey)(),
            alreadyPaid: false,
        };
    }
    throw new errors_1.AppError("VALIDATION_ERROR", "orderCode is required", 400);
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
    const eventKey = payment?.id ? `${event}:${payment.id}` : `${event}:${orderId}`;
    const shopOrder = await (0, orders_service_1.findOrderByRazorpayOrderId)(orderId);
    if (shopOrder) {
        if (event === "payment.captured" || payment?.status === "captured") {
            if (payment?.amount && payment.amount !== shopOrder.totalInPaise) {
                logger_1.logger.error({ orderId: shopOrder.id, expected: shopOrder.totalInPaise, got: payment.amount }, "Webhook amount mismatch");
                throw new errors_1.AppError("PAYMENT_AMOUNT_MISMATCH", "Payment amount does not match order", 400);
            }
            const claimed = await (0, payment_events_1.claimPaymentEvent)({
                eventKey,
                eventType: event,
                razorpayOrderId: orderId,
                razorpayPaymentId: payment?.id,
                payload,
            });
            await (0, orders_service_1.markOrderPaid)(shopOrder.id, payment?.id);
            return { handled: true, type: "ORDER", id: shopOrder.id, duplicate: !claimed };
        }
        if (event === "payment.failed") {
            const claimed = await (0, payment_events_1.claimPaymentEvent)({
                eventKey,
                eventType: event,
                razorpayOrderId: orderId,
                razorpayPaymentId: payment?.id,
                payload,
            });
            if (!claimed)
                return { handled: true, duplicate: true };
            await (0, orders_service_1.markOrderPaymentFailed)(shopOrder.id);
            return { handled: true, type: "ORDER_FAILED", id: shopOrder.id };
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
async function deliverInvoice(invoiceId) {
    const invoice = await prisma_1.prisma.invoice.findFirst({
        where: { id: invoiceId, deletedAt: null },
        include: { customer: true, order: true },
    });
    if (!invoice)
        throw new errors_1.NotFoundError("Invoice not found");
    const pdfBuffer = await (0, pdf_1.fetchInvoicePdfBuffer)(invoice.pdfUrl);
    const emailResult = await (0, mailer_1.sendEmail)({
        to: invoice.customer.email,
        subject: `Invoice ${invoice.invoiceNumber} — Vaibhav Celebrations`,
        html: (0, mailer_1.invoiceEmailHtml)({
            invoiceNumber: invoice.invoiceNumber,
            guestName: invoice.customer.fullName,
            totalInPaise: invoice.totalInPaise,
        }),
        attachments: pdfBuffer
            ? [{ filename: `Invoice-${invoice.invoiceNumber}.pdf`, content: pdfBuffer, contentType: "application/pdf" }]
            : undefined,
    });
    const wa = await (0, client_3.sendWhatsAppMessage)({
        toPhone: invoice.customer.phone,
        templateName: client_3.WHATSAPP_TEMPLATES.invoiceDelivery,
        body: invoice.invoiceNumber,
        bodyParameters: [invoice.invoiceNumber, (invoice.totalInPaise / 100).toFixed(2)],
        mediaUrl: invoice.pdfUrl ?? undefined,
    });
    return prisma_1.prisma.invoice.update({
        where: { id: invoice.id },
        data: {
            emailSentAt: emailResult.sent ? new Date() : invoice.emailSentAt,
            emailSendStatus: emailResult.status,
            whatsappSentAt: wa.sent ? new Date() : invoice.whatsappSentAt,
            whatsappSendStatus: wa.status,
            whatsappMessageId: wa.providerMessageId ?? invoice.whatsappMessageId,
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
            include: { customer: { select: { fullName: true, email: true, phone: true } }, order: { select: { orderCode: true } } },
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
        include: { customer: true, order: true },
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
async function listPaymentEvents(filters) {
    const where = {};
    if (filters.search) {
        const s = filters.search.trim();
        where.OR = [
            { eventKey: { contains: s, mode: "insensitive" } },
            { razorpayOrderId: { contains: s, mode: "insensitive" } },
            { razorpayPaymentId: { contains: s, mode: "insensitive" } },
            { eventType: { contains: s, mode: "insensitive" } },
        ];
    }
    const [total, items] = await Promise.all([
        prisma_1.prisma.paymentEvent.count({ where }),
        prisma_1.prisma.paymentEvent.findMany({
            where,
            orderBy: { processedAt: "desc" },
            skip: (filters.page - 1) * filters.pageSize,
            take: filters.pageSize,
        }),
    ]);
    return { total, items };
}
//# sourceMappingURL=payments.service.js.map