import { Router, type Request } from "express";
import { prisma } from "../../db/prisma";
import { ok } from "../../lib/response";
import { env } from "../../config/env";
import { parseMetaStatusUpdates, verifyMetaWebhookSignature } from "../../integrations/whatsapp/client";
import { logger } from "../../lib/logger";

export const whatsappWebhookRouter = Router();

whatsappWebhookRouter.get("/", (req, res) => {
  const mode = String(req.query["hub.mode"] ?? "");
  const token = String(req.query["hub.verify_token"] ?? "");
  const challenge = String(req.query["hub.challenge"] ?? "");
  if (mode === "subscribe" && env.WHATSAPP_WEBHOOK_VERIFY_TOKEN && token === env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  return res.status(403).send("Forbidden");
});

whatsappWebhookRouter.post("/", async (req, res, next) => {
  try {
    const rawBody = (req as Request & { rawBody?: string }).rawBody ?? JSON.stringify(req.body ?? {});
    const signature = req.header("x-hub-signature-256") ?? undefined;
    if (!verifyMetaWebhookSignature(rawBody, signature)) {
      return res.status(401).json({ success: false, error: { code: "INVALID_SIGNATURE", message: "Invalid Meta signature" } });
    }
    const updates = parseMetaStatusUpdates(JSON.parse(rawBody));
    for (const update of updates) {
      await prisma.invoice.updateMany({
        where: { whatsappMessageId: update.providerMessageId },
        data: { whatsappSendStatus: update.status },
      });
      await prisma.order.updateMany({
        where: { whatsappMessageId: update.providerMessageId },
        data: { whatsappSendStatus: update.status },
      });
    }
    if (updates.length) logger.info({ count: updates.length }, "WhatsApp status updates applied");
    return ok(res, { handled: true, updates: updates.length });
  } catch (err) {
    return next(err);
  }
});
