"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminChatbotRouter = exports.chatbotRouter = void 0;
const client_1 = require("@prisma/client");
const express_1 = require("express");
const zod_1 = require("zod");
const response_1 = require("../../lib/response");
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const chatbot_service_1 = require("./chatbot.service");
exports.chatbotRouter = (0, express_1.Router)();
exports.chatbotRouter.get("/flow", async (_req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, chatbot_service_1.getChatbotFlow)());
    }
    catch (err) {
        return next(err);
    }
});
exports.chatbotRouter.post("/session", (0, validate_1.validate)(zod_1.z.object({
    path: zod_1.z.unknown(),
    resultTag: zod_1.z.string().optional(),
    createLead: zod_1.z.boolean().optional(),
    lead: zod_1.z
        .object({
        name: zod_1.z.string().min(1),
        email: zod_1.z.string().email().optional(),
        phone: zod_1.z.string().optional(),
        interestArea: zod_1.z.string().optional(),
    })
        .optional(),
})), async (req, res, next) => {
    try {
        return (0, response_1.created)(res, await (0, chatbot_service_1.saveChatbotSession)(req.body));
    }
    catch (err) {
        return next(err);
    }
});
exports.adminChatbotRouter = (0, express_1.Router)();
exports.adminChatbotRouter.use(auth_1.requireAdmin, (0, auth_1.requireRoles)(client_1.AdminRole.SUPER_ADMIN, client_1.AdminRole.CONTENT_EDITOR));
exports.adminChatbotRouter.put("/flow", (0, validate_1.validate)(zod_1.z.object({ flow: zod_1.z.unknown() })), async (req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, chatbot_service_1.updateChatbotFlow)(req.body.flow));
    }
    catch (err) {
        return next(err);
    }
});
//# sourceMappingURL=chatbot.routes.js.map