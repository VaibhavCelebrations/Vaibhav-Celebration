"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicSettingsRouter = void 0;
const express_1 = require("express");
const response_1 = require("../../lib/response");
const public_settings_service_1 = require("./public-settings.service");
exports.publicSettingsRouter = (0, express_1.Router)();
exports.publicSettingsRouter.get("/public", async (_req, res, next) => {
    try {
        return (0, response_1.ok)(res, await (0, public_settings_service_1.getPublicSettings)());
    }
    catch (error) {
        return next(error);
    }
});
//# sourceMappingURL=public-settings.routes.js.map