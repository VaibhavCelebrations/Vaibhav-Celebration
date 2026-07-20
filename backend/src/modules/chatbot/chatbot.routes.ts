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

chatbotRouter.post(
  "/session",
  validate(
    z.object({
      path: z.unknown(),
      resultTag: z.string().optional(),
      createLead: z.boolean().optional(),
      lead: z
        .object({
          name: z.string().min(1),
          email: z.string().email().optional(),
          phone: z.string().optional(),
          interestArea: z.string().optional(),
        })
        .optional(),
    }),
  ),
  async (req, res, next) => {
    try {
      return created(res, await saveChatbotSession(req.body));
    } catch (err) {
      return next(err);
    }
  },
);

export const adminChatbotRouter = Router();
adminChatbotRouter.use(requireAdmin, requireRoles(AdminRole.SUPER_ADMIN, AdminRole.CONTENT_EDITOR));

adminChatbotRouter.put("/flow", validate(z.object({ flow: z.unknown() })), async (req, res, next) => {
  try {
    return ok(res, await updateChatbotFlow(req.body.flow));
  } catch (err) {
    return next(err);
  }
});
