import { Router, type Request } from "express";
import { ok } from "../../lib/response";
import { logger } from "../../lib/logger";
import { applyWebhookStatusUpdate, parseAndVerifyWebhookPost, verifyWebhookChallenge } from "./whatsapp.service";

export const whatsappWebhookRouter = Router();

/**
 * Meta's webhook subscription verification handshake. Only echoes the
 * challenge when hub.mode=subscribe AND hub.verify_token matches
 * WHATSAPP_WEBHOOK_VERIFY_TOKEN exactly — any other combination (wrong
 * token, wrong mode, missing params) is rejected with 403. Never logs the
 * verify token.
 */
whatsappWebhookRouter.get("/", (req, res) => {
  const result = verifyWebhookChallenge({
    mode: typeof req.query["hub.mode"] === "string" ? req.query["hub.mode"] : undefined,
    verifyToken: typeof req.query["hub.verify_token"] === "string" ? req.query["hub.verify_token"] : undefined,
    challenge: typeof req.query["hub.challenge"] === "string" ? req.query["hub.challenge"] : undefined,
  });
  if (!result.ok) {
    return res.status(403).send("Forbidden");
  }
  return res.status(200).send(result.challenge);
});

/**
 * Meta's delivery-status webhook. Signature verification is mandatory —
 * invalid/missing signatures get 401. Once the signature is valid, ANY
 * payload (even malformed JSON or an unrecognized event shape, e.g. a
 * future incoming-message event) is answered with 200 so Meta does not
 * retry-storm; the malformed/unknown case is only logged.
 */
whatsappWebhookRouter.post("/", async (req, res, next) => {
  try {
    const rawBody = (req as Request & { rawBody?: string }).rawBody ?? JSON.stringify(req.body ?? {});
    const signature = req.header("x-hub-signature-256") ?? undefined;

    const result = parseAndVerifyWebhookPost(rawBody, signature);
    if (!result.signatureValid) {
      return res.status(401).json({ success: false, error: { code: "INVALID_SIGNATURE", message: "Invalid Meta signature" } });
    }

    if (result.malformed) {
      logger.warn("WhatsApp webhook payload could not be parsed — accepted and ignored");
      return ok(res, { handled: false, reason: "malformed_payload" });
    }

    for (const update of result.updates) {
      await applyWebhookStatusUpdate(update);
    }

    if (result.updates.length) {
      logger.info({ count: result.updates.length }, "WhatsApp status updates applied");
    }
    return ok(res, { handled: true, updates: result.updates.length });
  } catch (err) {
    return next(err);
  }
});
