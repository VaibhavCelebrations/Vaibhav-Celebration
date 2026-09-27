import { AdminRole } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { created, ok } from "../../lib/response";
import { requireAdmin, requireRoles } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { getChatbotFlow, saveChatbotSession, updateChatbotFlow } from "./chatbot.service";

export const chatbotRouter = Router();

chatbotRouter.get("/flow", async (_req, res, next) => {
  try {
    return ok(res, await getChatbotFlow());
  } catch (err) {
    return next(err);
  }
});

/** The visitor path is a small decision-tree trail; cap it so this public endpoint cannot be used to store bulk data. */
const MAX_PATH_JSON_BYTES = 8 * 1024;

const sessionSchema = z.object({
  path: z
    .unknown()
    .refine((v) => v !== undefined && v !== null, { message: "path is required" })
    .refine((v) => Buffer.byteLength(JSON.stringify(v)) <= MAX_PATH_JSON_BYTES, { message: "Chat history is too large" }),
  resultTag: z.string().max(100).optional(),
  createLead: z.boolean().optional(),
  lead: z
    .object({
      name: z.string().trim().min(1).max(120),
      email: z.string().trim().email().max(254).optional(),
      phone: z.string().trim().max(20).regex(/^[0-9+()s-]*$/, "Enter a valid phone number").optional(),
      interestArea: z.string().max(200).optional(),
    })
    .optional(),
  /** Honeypot — real visitors never see or fill this. Bots that auto-fill every field trip it. */
  website: z.string().max(200).optional(),
});

chatbotRouter.post("/session", validate(sessionSchema), async (req, res, next) => {
  try {
    const { website, ...input } = req.body as z.infer<typeof sessionSchema>;
    if (website) {
      // Pretend success so the bot learns nothing, but store nothing and create no lead.
      return created(res, { id: "ok" });
    }
    return created(res, await saveChatbotSession({ ...input, path: input.path }));
  } catch (err) {
    return next(err);
  }
});

export const adminChatbotRouter = Router();
adminChatbotRouter.use(requireAdmin, requireRoles(AdminRole.SUPER_ADMIN, AdminRole.CONTENT_EDITOR));

adminChatbotRouter.put("/flow", validate(z.object({ flow: z.unknown() })), async (req, res, next) => {
  try {
    return ok(res, await updateChatbotFlow(req.body.flow));
  } catch (err) {
    return next(err);
  }
});
