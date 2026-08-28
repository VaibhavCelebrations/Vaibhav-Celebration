/**
 * WhatsApp integration debug script (mirrors scripts/test-emails.ts).
 *
 * Usage:
 *   npm run test:whatsapp                    -- validates config, exercises the mock provider only
 *   npm run test:whatsapp -- 919876543210     -- also target this phone number for the mock send
 *   TEST_WHATSAPP_SEND=true npm run test:whatsapp -- 919876543210
 *                                              -- ALSO attempts one REAL Meta send (requires full
 *                                                 Meta config + explicit opt-in; never runs by accident)
 *
 * Never prints secret values (access token, app secret, verify token) — only
 * whether each is configured. Exits non-zero on any hard failure so it is
 * CI/cron-safe.
 */
import { env } from "../src/config/env";
import { isMetaConfigured } from "../src/integrations/whatsapp/provider-factory";
import { MockWhatsAppProvider } from "../src/integrations/whatsapp/providers/mock.provider";
import { MetaWhatsAppProvider } from "../src/integrations/whatsapp/providers/meta.provider";
import { WhatsAppSendError } from "../src/integrations/whatsapp/errors";
import { buildOrderConfirmationMessage } from "../src/integrations/whatsapp/templates";
import { normalizeWhatsAppPhone } from "../src/integrations/whatsapp/phone";

const targetPhoneRaw = process.argv[2] || env.WHATSAPP_BUSINESS_NUMBER || "";

function printConfigSummary() {
  console.log("── WhatsApp configuration ──────────────────────────────────");
  console.log(`WHATSAPP_ENABLED:              ${env.WHATSAPP_ENABLED}`);
  console.log(`WHATSAPP_PROVIDER:             ${env.WHATSAPP_PROVIDER}`);
  console.log(`WHATSAPP_META_API_VERSION:     ${env.WHATSAPP_META_API_VERSION}`);
  console.log(`Access token configured:      ${Boolean(env.WHATSAPP_META_ACCESS_TOKEN)}`);
  console.log(`Phone Number ID configured:   ${Boolean(env.WHATSAPP_META_PHONE_NUMBER_ID)}`);
  console.log(`WABA ID configured:           ${Boolean(env.WHATSAPP_META_BUSINESS_ACCOUNT_ID)}`);
  console.log(`App Secret configured:        ${Boolean(env.WHATSAPP_APP_SECRET)}`);
  console.log(`Webhook verify token set:     ${Boolean(env.WHATSAPP_WEBHOOK_VERIFY_TOKEN)}`);
  console.log(`Meta fully configured:        ${isMetaConfigured()}`);
  console.log(`TEST_WHATSAPP_SEND:            ${env.TEST_WHATSAPP_SEND}`);
  console.log("──────────────────────────────────────────────────────────────\n");
}

async function testMockProvider(toPhoneE164: string) {
  console.log("── Mock provider (always safe, no network call) ───────────");
  const provider = new MockWhatsAppProvider();
  const message = buildOrderConfirmationMessage({ orderCode: "VBC-DEBUG-TEST", amountFormatted: "1234.00" });
  const outcome = await provider.sendTemplateMessage({ toPhoneE164, ...message });
  console.log(`Simulated send OK — status=${outcome.status} providerMessageId=${outcome.providerMessageId}`);
  console.log("──────────────────────────────────────────────────────────────\n");
}

async function testRealMetaSend(toPhoneE164: string): Promise<boolean> {
  console.log("── REAL Meta send (TEST_WHATSAPP_SEND=true) ───────────────");
  if (!isMetaConfigured()) {
    console.error("BLOCKED (config failure) — WHATSAPP_META_ACCESS_TOKEN and/or WHATSAPP_META_PHONE_NUMBER_ID are not set.");
    console.error("Fill these in backend/.env, set WHATSAPP_PROVIDER=meta and WHATSAPP_ENABLED=true, then retry.");
    return false;
  }
  if (env.WHATSAPP_PROVIDER !== "meta" || !env.WHATSAPP_ENABLED) {
    console.error(`BLOCKED (config failure) — WHATSAPP_PROVIDER=${env.WHATSAPP_PROVIDER}, WHATSAPP_ENABLED=${env.WHATSAPP_ENABLED}. Both must be "meta"/true to send a real message.`);
    return false;
  }

  const provider = new MetaWhatsAppProvider();
  const message = buildOrderConfirmationMessage({ orderCode: "VBC-DEBUG-TEST", amountFormatted: "1234.00" });
  try {
    const outcome = await provider.sendTemplateMessage({ toPhoneE164, ...message });
    console.log(`REAL send succeeded — providerMessageId=${outcome.providerMessageId}`);
    console.log("Check the recipient's WhatsApp and the Meta App dashboard to confirm delivery.");
    return true;
  } catch (err) {
    if (err instanceof WhatsAppSendError) {
      console.error(`REAL send failed (Meta API failure) — code=${err.code} retryable=${err.retryable} message=${err.message}`);
    } else {
      console.error("REAL send failed (unexpected error):", err);
    }
    return false;
  } finally {
    console.log("──────────────────────────────────────────────────────────────\n");
  }
}

async function main() {
  console.log("Starting WhatsApp integration checks...\n");
  printConfigSummary();

  const toPhoneE164 = normalizeWhatsAppPhone(targetPhoneRaw);
  if (!toPhoneE164) {
    console.error(`No valid target phone number available (got "${targetPhoneRaw}"). Pass one as an argument or set WHATSAPP_BUSINESS_NUMBER.`);
    process.exit(1);
  }
  console.log(`Target phone (normalized): ${toPhoneE164}\n`);

  await testMockProvider(toPhoneE164);

  if (!env.TEST_WHATSAPP_SEND) {
    console.log("TEST_WHATSAPP_SEND is not set — skipping the real Meta send. Mock-path checks passed.");
    process.exit(0);
  }

  const realSendOk = await testRealMetaSend(toPhoneE164);
  process.exit(realSendOk ? 0 : 1);
}

main().catch((err) => {
  console.error("WhatsApp debug script crashed unexpectedly:", err);
  process.exit(1);
});
