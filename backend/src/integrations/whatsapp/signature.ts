import crypto from "crypto";
import { env } from "../../config/env";

/**
 * Verifies Meta's `X-Hub-Signature-256` header (HMAC-SHA256 of the raw
 * request body, keyed by the App Secret) using a constant-time comparison.
 *
 * Dev-only bypass: if WHATSAPP_APP_SECRET is unset AND NODE_ENV is not
 * "production", requests are accepted unsigned so local webhook testing
 * works before an App Secret is issued. This bypass is never available in
 * production regardless of configuration.
 */
export function verifyMetaWebhookSignature(rawBody: string, signatureHeader: string | undefined): boolean {
  if (!env.WHATSAPP_APP_SECRET) {
    return env.NODE_ENV !== "production";
  }
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const expected = crypto.createHmac("sha256", env.WHATSAPP_APP_SECRET).update(rawBody).digest("hex");
  const received = signatureHeader.slice("sha256=".length);
  const expectedBuf = Buffer.from(expected, "hex");
  const receivedBuf = Buffer.from(received, "hex");
  if (expectedBuf.length !== receivedBuf.length) return false;
  try {
    return crypto.timingSafeEqual(expectedBuf, receivedBuf);
  } catch {
    return false;
  }
}
