import { env } from "../src/config/env";

const REQUEST_TIMEOUT_MS = 10_000;

function graphUrl(path: string): string {
  const version = env.WHATSAPP_META_API_VERSION || "v21.0";
  return `https://graph.facebook.com/${version}/${path.replace(/^\//, "")}`;
}

async function subscribeApp() {
  if (!env.WHATSAPP_META_BUSINESS_ACCOUNT_ID) {
    console.error("❌ Error: Missing WHATSAPP_META_BUSINESS_ACCOUNT_ID in .env");
    return false;
  }

  console.log(`Subscribing App to WABA: ${env.WHATSAPP_META_BUSINESS_ACCOUNT_ID}...`);
  const endpoint = graphUrl(`${env.WHATSAPP_META_BUSINESS_ACCOUNT_ID}/subscribed_apps`);
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_META_ACCESS_TOKEN}`,
      },
    });

    const json = await res.json();
    clearTimeout(timeout);

    if (!res.ok) {
      console.error("❌ Subscription failed:");
      console.error(JSON.stringify(json, null, 2));
      return false;
    }

    console.log("✅ Subscription succeeded! Response:");
    console.log(JSON.stringify(json, null, 2));
    return true;

  } catch (error) {
    clearTimeout(timeout);
    console.error("❌ Subscription threw an exception:", error);
    return false;
  }
}

async function sendDocumentMessage(toPhone: string, pdfUrl: string) {
  if (!env.WHATSAPP_META_ACCESS_TOKEN || !env.WHATSAPP_META_PHONE_NUMBER_ID) {
    console.error("❌ Error: Missing WHATSAPP_META_ACCESS_TOKEN or WHATSAPP_META_PHONE_NUMBER_ID in .env");
    process.exit(1);
  }

  // The payload for a free-form document message (works if 24h customer window is open)
  // If the window is closed, we would need to send an approved template instead.
  const body = {
    messaging_product: "whatsapp",
    to: toPhone,
    type: "template",
    template: {
      name: "hello_world",
      language: { code: "en_US" }
    }
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    console.log(`Sending PDF to ${toPhone}...`);
    const endpoint = graphUrl(`${env.WHATSAPP_META_PHONE_NUMBER_ID}/messages`);
    
    const res = await fetch(endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_META_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const json = await res.json();
    clearTimeout(timeout);

    if (!res.ok) {
      console.error("❌ WhatsApp Meta send failed:");
      console.error(JSON.stringify(json, null, 2));
      
      if (json.error?.code === 131047) {
        console.error("\n💡 NOTE: This error means more than 24 hours have passed since the recipient last messaged you.");
        console.error("To fix this, send a regular message from your personal WhatsApp to your Business number first, then run this script again.");
      }
      return false;
    }

    console.log("✅ WhatsApp Meta send succeeded!");
    console.log(`Provider Message ID: ${json.messages?.[0]?.id}`);
    return true;

  } catch (error) {
    clearTimeout(timeout);
    console.error("❌ Request threw an exception:", error);
    return false;
  }
}

async function main() {
  // Use argument or default to the business number in .env
  const targetPhone = process.argv[2] || env.WHATSAPP_BUSINESS_NUMBER;
  if (!targetPhone) {
    console.error("❌ No target phone number provided. Pass it as an argument or set WHATSAPP_BUSINESS_NUMBER in .env.");
    process.exit(1);
  }

  console.log("=== Step 1: Subscribe WABA ===");
  const subOk = await subscribeApp();
  
  if (!subOk) {
    console.error("Subscription failed. The token might not have the right permissions or the WABA is incorrect.");
    // We will still try to send the message in case the subscription error was due to already being subscribed.
  }

  console.log("\n=== Step 2: Send WhatsApp Message ===");
  // Sample PDF URL for testing (W3C dummy PDF)
  const samplePdfUrl = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf";

  await sendDocumentMessage(targetPhone.toString(), samplePdfUrl);
}

main();
