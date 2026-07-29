"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminPagesRouter = exports.pagesRouter = void 0;
const client_1 = require("@prisma/client");
const express_1 = require("express");
const zod_1 = require("zod");
const errors_1 = require("../../lib/errors");
const params_1 = require("../../lib/params");
const response_1 = require("../../lib/response");
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const client_2 = require("../../integrations/revalidate/client");
const pages_service_1 = require("./pages.service");
const roles = [
    auth_1.requireAdmin,
    (0, auth_1.requireRoles)(client_1.AdminRole.CONTENT_EDITOR, client_1.AdminRole.OPERATIONS, client_1.AdminRole.SUPER_ADMIN),
];
const pageKeySchema = zod_1.z.object({ pageKey: zod_1.z.enum(["home", "about", "contact"]) });
const sectionsSchema = zod_1.z.object({ sections: zod_1.z.record(zod_1.z.unknown()) });
const revalidatePaths = {
    home: ["/"],
    about: ["/about"],
    contact: ["/contact"],
};
const revalidateTags = {
    home: ["cms:pages:home"],
    about: ["cms:pages:about"],
    contact: ["cms:pages:contact"],
};
exports.pagesRouter = (0, express_1.Router)();
exports.pagesRouter.get("/:pageKey", (0, validate_1.validate)(pageKeySchema, "params"), async (req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, pages_service_1.getPageContent)((0, params_1.param)(req, "pageKey")));
    }
    catch (error) {
        return next(error);
    }
});
exports.adminPagesRouter = (0, express_1.Router)();
exports.adminPagesRouter.use(...roles);
exports.adminPagesRouter.get("/", async (_req, res, next) => {
    try {
        const items = await (0, pages_service_1.listPageContent)();
        return (0, response_1.ok)(res, { items, total: items.length, page: 1, pageSize: items.length || 3 });
    }
    catch (error) {
        return next(error);
    }
});
exports.adminPagesRouter.get("/:pageKey", (0, validate_1.validate)(pageKeySchema, "params"), async (req, res, next) => {
    try {
        const pageKey = (0, params_1.param)(req, "pageKey");
        if (!(0, pages_service_1.isValidPageKey)(pageKey))
            throw new errors_1.NotFoundError("Page not found");
        return (0, response_1.ok)(res, await (0, pages_service_1.getPageContent)(pageKey));
    }
    catch (error) {
        return next(error);
    }
});
exports.adminPagesRouter.put("/:pageKey", (0, validate_1.validate)(pageKeySchema, "params"), (0, validate_1.validate)(sectionsSchema), async (req, res, next) => {
    try {
        const pageKey = (0, params_1.param)(req, "pageKey");
        const item = await (0, pages_service_1.upsertPageContent)(pageKey, req.body.sections);
        void (0, client_2.triggerRevalidate)(revalidatePaths[pageKey] ?? ["/"], revalidateTags[pageKey] ?? []);
        return (0, response_1.ok)(res, item);
    }
    catch (error) {
        return next(error);
    }
});
exports.adminPagesRouter.post("/", (0, validate_1.validate)(pageKeySchema.extend({ sections: zod_1.z.record(zod_1.z.unknown()) })), async (req, res, next) => {
    try {
        const { pageKey, sections } = req.body;
        const item = await (0, pages_service_1.upsertPageContent)(pageKey, sections);
        void (0, client_2.triggerRevalidate)(revalidatePaths[pageKey] ?? ["/"], revalidateTags[pageKey] ?? []);
        return (0, response_1.created)(res, item);
    }
    catch (error) {
        return next(error);
    }
});
//# sourceMappingURL=pages.routes.js.map