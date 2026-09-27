import { createApp } from "./app";
import { env } from "./config/env";
import { isEmailConfigured } from "./integrations/email/mailer";
import { logger } from "./lib/logger";
import { prisma } from "./db/prisma";
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

// Behind a load balancer / reverse proxy the proxy closes idle connections first. Node must keep
// them open longer than the proxy does, otherwise the proxy reuses a socket Node just closed and
// the client sees a spurious 502. (AWS ALB idle timeout = 60s, nginx keepalive_timeout = 65s.)
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;
server.requestTimeout = 60_000;

// Behind a load balancer / reverse proxy the proxy closes idle connections first. Node must keep
// them open longer than the proxy does, otherwise the proxy reuses a socket Node just closed and
// the client sees a spurious 502. (AWS ALB idle timeout = 60s, nginx keepalive_timeout = 65s.)
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;
server.requestTimeout = 60_000;

// ── Graceful Shutdown ─────────────────────────────────────────────────────────
// On SIGTERM (deploy / scale-down) stop taking new connections, let in-flight requests finish
// (payments must not be cut mid-verification), then release DB + Redis. A hard timer guarantees
// the process still exits if a connection hangs.
let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, "Shutdown signal received");
  const forceExit = setTimeout(() => {
    logger.error("Graceful shutdown timed out — forcing exit");
    process.exit(1);
  }, 25_000);
  forceExit.unref();

  server.close(async () => {
    try {
      await Promise.allSettled([disconnectRedis(), prisma.$disconnect()]);
    } finally {
      logger.info("Server, Redis and database closed. Exiting.");
      process.exit(0);
    }
  });
  // Idle keep-alive sockets would otherwise hold server.close() open until they time out.
  server.closeIdleConnections();
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

// A stray rejection is logged (the request that caused it already failed); an uncaught exception
// leaves the process in an undefined state, so log it and exit for the orchestrator to restart.
process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "Unhandled promise rejection");
});
process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "Uncaught exception — exiting");
  void shutdown("uncaughtException");
});
