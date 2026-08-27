import { createApp } from "./app";
import { env } from "./config/env";
import { isEmailConfigured } from "./integrations/email/mailer";
import { logger } from "./lib/logger";
import { getRedisClient, disconnectRedis } from "./lib/redis";
import { ensureGiftRegistryService } from "./modules/upgrades/upgrades.service";

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
  // In production, missing SMTP env vars fail silently per-order (email gets
  // marked SKIPPED) — surface it loudly at boot instead so it's caught before
  // customers start missing order confirmations.
  if (env.NODE_ENV === "production" && !isEmailConfigured()) {
    logger.warn(
      {
        smtpHostSet: Boolean(env.SMTP_HOST),
        smtpUserSet: Boolean(env.SMTP_USER),
        smtpPassSet: Boolean(env.SMTP_PASS),
        emailFromAddressSet: Boolean(env.EMAIL_FROM_ADDRESS),
      },
      "SMTP is not fully configured in production — order confirmation, invoice, and account emails will be skipped",
    );
  }
  void ensureGiftRegistryService().catch((err) => {
    logger.error({ err }, "Failed to ensure Gift Registry package service");
  });
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
