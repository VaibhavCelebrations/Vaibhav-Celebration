"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const env_1 = require("./config/env");
const logger_1 = require("./lib/logger");
const redis_1 = require("./lib/redis");
const upgrades_service_1 = require("./modules/upgrades/upgrades.service");
// Bootstrap Redis connection eagerly (non-blocking — failures are logged internally)
(0, redis_1.getRedisClient)();
const app = (0, app_1.createApp)();
const server = app.listen(env_1.env.PORT, () => {
    logger_1.logger.info({
        port: env_1.env.PORT,
        env: env_1.env.NODE_ENV,
        apiPrefix: env_1.env.API_PREFIX,
        corsOrigins: env_1.env.CORS_ORIGINS,
    }, "Vaibhav Celebrations API listening");
    void (0, upgrades_service_1.ensureGiftRegistryService)().catch((err) => {
        logger_1.logger.error({ err }, "Failed to ensure Gift Registry package service");
    });
});
// ── Graceful Shutdown ─────────────────────────────────────────────────────────
async function shutdown(signal) {
    logger_1.logger.info({ signal }, "Shutdown signal received");
    server.close(async () => {
        await (0, redis_1.disconnectRedis)();
        logger_1.logger.info("Server and Redis closed. Exiting.");
        process.exit(0);
    });
}
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
//# sourceMappingURL=server.js.map