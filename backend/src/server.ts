import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./lib/logger";
import { getRedisClient, disconnectRedis } from "./lib/redis";

// Bootstrap Redis connection eagerly (non-blocking — failures are logged internally)
getRedisClient();

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(
    {
      port: env.PORT,
      env: env.NODE_ENV,
      apiPrefix: env.API_PREFIX,
      corsOrigins: env.CORS_ORIGINS,
    },
    "Vaibhav Celebrations API listening",
  );
});

// ── Graceful Shutdown ─────────────────────────────────────────────────────────
async function shutdown(signal: string) {
  logger.info({ signal }, "Shutdown signal received");
  server.close(async () => {
    await disconnectRedis();
    logger.info("Server and Redis closed. Exiting.");
    process.exit(0);
  });
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
