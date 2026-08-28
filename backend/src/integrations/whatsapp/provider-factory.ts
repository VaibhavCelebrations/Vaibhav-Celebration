import { env } from "../../config/env";
import { logger } from "../../lib/logger";
import { MetaWhatsAppProvider } from "./providers/meta.provider";
import { MockWhatsAppProvider } from "./providers/mock.provider";
import type { WhatsAppProvider } from "./provider.types";

/** True only when every credential required to actually call the Graph API is present. */
export function isMetaConfigured(): boolean {
  return Boolean(env.WHATSAPP_META_ACCESS_TOKEN && env.WHATSAPP_META_PHONE_NUMBER_ID);
}

let cached: WhatsAppProvider | undefined;

/**
 * Resolves the active provider from configuration. WHATSAPP_ENABLED=false is
 * handled one layer up (whatsapp.service.ts) as a hard skip before any
 * provider is even constructed — this factory only decides mock vs meta for
 * the case where sending is enabled.
 */
export function getWhatsAppProvider(): WhatsAppProvider {
  if (cached) return cached;

  if (env.WHATSAPP_PROVIDER === "meta") {
    if (!isMetaConfigured()) {
      logger.warn(
        { accessTokenSet: Boolean(env.WHATSAPP_META_ACCESS_TOKEN), phoneNumberIdSet: Boolean(env.WHATSAPP_META_PHONE_NUMBER_ID) },
        "WHATSAPP_PROVIDER=meta but Meta credentials are incomplete — falling back to mock provider",
      );
      cached = new MockWhatsAppProvider();
      return cached;
    }
    cached = new MetaWhatsAppProvider();
    return cached;
  }

  cached = new MockWhatsAppProvider();
  return cached;
}

/** Test-only: clears the cached provider so tests can re-resolve after mutating env/mocks. */
export function resetWhatsAppProviderCache(): void {
  cached = undefined;
}
