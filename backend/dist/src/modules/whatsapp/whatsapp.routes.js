"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.whatsappWebhookRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../../db/prisma");
const response_1 = require("../../lib/response");
const env_1 = require("../../config/env");
const client_1 = require("../../integrations/whatsapp/client");
const logger_1 = require("../../lib/logger");
exports.whatsappWebhookRouter = (0, express_1.Router)();
exports.whatsappWebhookRouter.get("/", (req, res) => {
    const mode = String(req.query["hub.mode"] ?? "");
    const token = String(req.query["hub.verify_token"] ?? "");
    const challenge = String(req.query["hub.challenge"] ?? "");
    if (mode === "subscribe" && env_1.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN && token === env_1.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
        return res.status(200).send(challenge);
    }
    return res.status(403).send("Forbidden");
});
exports.whatsappWebhookRouter.post("/", async (req, res, next) => {
    try {
        const rawBody = req.rawBody ?? JSON.stringify(req.body ?? {});
        const signature = req.header("x-hub-signature-256") ?? undefined;
        if (!(0, client_1.verifyMetaWebhookSignature)(rawBody, signature)) {
            return res.status(401).json({ success: false, error: { code: "INVALID_SIGNATURE", message: "Invalid Meta signature" } });
        }
        const updates = (0, client_1.parseMetaStatusUpdates)(JSON.parse(rawBody));
        for (const update of updates) {
            await prisma_1.prisma.invoice.updateMany({
                where: { whatsappMessageId: update.providerMessageId },
                data: { whatsappSendStatus: update.status },
            });
            await prisma_1.prisma.order.updateMany({
                where: { whatsappMessageId: update.providerMessageId },
                data: { whatsappSendStatus: update.status },
            });
        }
        if (updates.length)
            logger_1.logger.info({ count: updates.length }, "WhatsApp status updates applied");
        return (0, response_1.ok)(res, { handled: true, updates: updates.length });
    }
    catch (err) {
        return next(err);
    }
});
//# sourceMappingURL=whatsapp.routes.js.map