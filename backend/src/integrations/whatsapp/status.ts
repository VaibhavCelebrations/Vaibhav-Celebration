/**
 * Canonical WhatsApp delivery lifecycle for this application. Mirrors
 * NotificationDeliveryStatus (integrations/notifications/types.ts) plus the
 * two send-initiation states (PENDING/SENDING) that only WhatsApp needs
 * because Meta returns delivery updates asynchronously via webhook.
 */
export const WHATSAPP_STATUSES = [
  "PENDING",
  "SENDING",
  "SENT",
  /** Mock-provider-only status — a simulated send that never touched Meta. Never returned by the real Meta provider. */
  "SIMULATED_SENT",
  "DELIVERED",
  "READ",
  "FAILED",
  "SKIPPED",
] as const;

export type WhatsAppStatus = (typeof WHATSAPP_STATUSES)[number];

/**
 * Relative rank used to prevent a late/out-of-order webhook event from
 * regressing a more advanced status (e.g. a delayed "sent" callback must not
 * overwrite an already-recorded "read"). FAILED/SKIPPED are terminal and are
 * only ranked below the "in-flight" progression — they can still be recorded
 * from PENDING/SENDING, but never overwrite a status that already proves the
 * message reached Meta or the recipient.
 */
const STATUS_RANK: Record<WhatsAppStatus, number> = {
  PENDING: 0,
  SENDING: 1,
  SKIPPED: 1,
  FAILED: 1,
  SENT: 2,
  SIMULATED_SENT: 2,
  DELIVERED: 3,
  READ: 4,
};

/**
 * Merges a newly observed status with the currently stored one, always
 * keeping the higher-ranked (more advanced) status. Returns `incoming` when
 * there is no current status yet, or when `incoming` is at least as advanced
 * as `current`; otherwise returns `current` unchanged.
 */
export function mergeStatus(
  current: string | null | undefined,
  incoming: WhatsAppStatus,
): WhatsAppStatus {
  const currentRank = current && current in STATUS_RANK ? STATUS_RANK[current as WhatsAppStatus] : -1;
  const incomingRank = STATUS_RANK[incoming];
  return incomingRank >= currentRank ? incoming : (current as WhatsAppStatus);
}

/** Maps a raw Meta webhook status string to our canonical status, defaulting unknown values to SENT (safe, non-regressing). */
export function mapMetaWebhookStatus(rawStatus: string): WhatsAppStatus {
  switch (rawStatus) {
    case "delivered":
      return "DELIVERED";
    case "read":
      return "READ";
    case "failed":
      return "FAILED";
    case "sent":
    default:
      return "SENT";
  }
}
