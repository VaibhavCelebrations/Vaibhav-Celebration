# Meta WhatsApp Cloud API Setup — Vaibhav Celebrations

**Audience:** Project lead after the WhatsApp Business Account is created
**Used by:** Order confirmation, invoice delivery, and phone-verification templates
**Backend env file:** `backend/.env`
**Frontend click-to-chat:** `frontend/.env` → `NEXT_PUBLIC_WHATSAPP_NUMBER`
**Do not commit access tokens or app secrets.**

This product uses **Meta Cloud API only** (no Twilio), behind a provider abstraction that also
ships a **mock provider** for local development, CI, and tests — no real message is ever sent
unless `WHATSAPP_PROVIDER=meta` **and** `WHATSAPP_ENABLED=true` **and** Meta credentials are
present.

---

## 1. Architecture

```text
Business modules (orders, payments, customer-auth)
        ↓
modules/whatsapp/whatsapp.service.ts   (idempotent send wrappers, status merge, webhook logic)
        ↓
integrations/whatsapp/templates.ts     (centralized template registry — business code never
                                         references a raw Meta template name)
        ↓
integrations/whatsapp/provider-factory.ts → WhatsAppProvider interface
        ↓
providers/meta.provider.ts   |   providers/mock.provider.ts
        ↓
Meta Graph API
```

- `WHATSAPP_PROVIDER=mock` (default) — every send is simulated by `MockWhatsAppProvider`. No
  network call is made. The recorded status is `SIMULATED_SENT` (never confused with a real Meta
  status) and the message id is prefixed `mock_`.
- `WHATSAPP_PROVIDER=meta` — sends go through `MetaWhatsAppProvider` to the real Graph API. If
  Meta credentials are incomplete, the factory logs a warning and **silently falls back to the
  mock provider** rather than crashing — the app always boots and functions.
- Failures are classified `retryable` vs non-retryable (`integrations/whatsapp/errors.ts`); the
  service layer retries once on transient failures (timeout, network error, Meta 5xx / 429).
- WhatsApp status is a strict, non-regressing state machine (`integrations/whatsapp/status.ts`):
  `PENDING → SENDING → SENT/SIMULATED_SENT → DELIVERED → READ`, with `FAILED`/`SKIPPED` as
  terminal-but-early states. A late/duplicate webhook can never overwrite a more advanced status.

---

## 2. What you need from Meta (production only)

| Item | Env var |
|---|---|
| Permanent / system-user access token | `WHATSAPP_META_ACCESS_TOKEN` |
| Phone number ID (Graph API sending endpoint) | `WHATSAPP_META_PHONE_NUMBER_ID` |
| WhatsApp Business Account ID | `WHATSAPP_META_BUSINESS_ACCOUNT_ID` |
| App secret (webhook signatures) | `WHATSAPP_APP_SECRET` |
| Verify token you invent | `WHATSAPP_WEBHOOK_VERIFY_TOKEN` |
| Display number (digits, India-first, **display only** — never used to send) | `WHATSAPP_BUSINESS_NUMBER` |

Create a Meta app with **WhatsApp** product, attach a WABA, and add a business phone number.
Docs: [Cloud API getting started](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started)

`WHATSAPP_META_PHONE_NUMBER_ID` and `WHATSAPP_BUSINESS_NUMBER` are **not the same value** — the
Phone Number ID is a Meta-issued identifier used in the Graph API URL; the business number is the
human-readable digits used only for the frontend click-to-chat link and template display.

---

## 3. Message templates (English)

Outbound business-initiated messages require **approved templates**, defined once in the
registry (`backend/src/integrations/whatsapp/templates.ts`) and never referenced by raw name
elsewhere in the codebase. Create these in WhatsApp Manager (English `en`):

| Template name | When we send | Body parameters | Document header |
|---|---|---|---|
| `order_confirmation` | Order marked `PAID` | Order code, amount | Invoice PDF (optional) |
| `invoice_delivery` | Invoice email/resend | Invoice number, amount | Invoice PDF (optional) |
| `phone_verification` | Customer requests phone verification | Verification link (opaque token only — no PII) | — |
| `welcome_message` | New signup, **only if `WHATSAPP_WELCOME_ENABLED=true`** | Customer name | — |

Until a template is **Approved**, real sends against it fail even with a valid token — the mock
provider is unaffected since it never calls Meta.

---

## 4. Environment variables

### Backend — `backend/.env`

```env
WHATSAPP_ENABLED=false
WHATSAPP_PROVIDER=mock
WHATSAPP_BUSINESS_NUMBER=91XXXXXXXXXX
WHATSAPP_META_ACCESS_TOKEN=
WHATSAPP_META_PHONE_NUMBER_ID=
WHATSAPP_META_BUSINESS_ACCOUNT_ID=
WHATSAPP_META_API_VERSION=v21.0
WHATSAPP_WEBHOOK_VERIFY_TOKEN=change_me_whatsapp_verify_token
WHATSAPP_APP_SECRET=
PHONE_VERIFICATION_TOKEN_TTL_MINUTES=30
TEST_WHATSAPP_SEND=false
WHATSAPP_WELCOME_ENABLED=false
```

| Flag | Meaning |
|---|---|
| `WHATSAPP_ENABLED=false` | Every send is short-circuited to `SKIPPED` before any provider is touched — safest default. |
| `WHATSAPP_PROVIDER=mock` (default) | Simulated sends only, no network call — safe for local dev/CI. |
| `WHATSAPP_PROVIDER=meta` | Real Graph API sends, **only** once `WHATSAPP_ENABLED=true` and credentials are complete. |
| `TEST_WHATSAPP_SEND=true` | Explicit opt-in required for `npm run test:whatsapp` to attempt one **real** Meta send. Never set this in a shared/CI environment. |
| `WHATSAPP_WELCOME_ENABLED=true` | Enables the best-effort WhatsApp welcome message on signup, once `welcome_message` is Meta-approved. |

### Webhook URL

| Environment | URL |
|---|---|
| Local (tunnel) | `https://<tunnel>/api/v1/whatsapp/webhook` |
| Production | `https://<API_HOST>/api/v1/whatsapp/webhook` |

In Meta App → WhatsApp → Configuration:

1. Callback URL = webhook URL above
2. Verify token = `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
3. Subscribe to **messages** (status updates)
4. App secret must match `WHATSAPP_APP_SECRET` — every POST is verified against
   `X-Hub-Signature-256` (HMAC-SHA256, constant-time compare). Invalid/missing signatures get
   `401`. Once the signature is valid, malformed or unrecognized payloads are logged and answered
   `200` (never `500`) so Meta does not retry-storm.

GET is the hub challenge (`hub.mode=subscribe` + matching `hub.verify_token`, echoes
`hub.challenge`). POST updates `Order.whatsappSendStatus` / `Invoice.whatsappSendStatus` by an
indexed lookup on `whatsappMessageId` (`@@index([whatsappMessageId])` on both tables), and never
regresses an already-advanced status.

> **Dev-only bypass:** if `WHATSAPP_APP_SECRET` is unset and `NODE_ENV !== "production"`, the
> webhook accepts unsigned requests so local testing works before an App Secret exists. This
> bypass is never available when `NODE_ENV=production`, regardless of configuration.

### Frontend click-to-chat (not Cloud API)

```env
NEXT_PUBLIC_WHATSAPP_NUMBER=91XXXXXXXXXX
NEXT_PUBLIC_WHATSAPP_PREFILL_MESSAGE=Hi Vaibhav Celebrations! I would like to know more about your birthday packages.
```

Both are wired into every `wa.me` link on the site (floating WhatsApp button, homepage CTA band,
FAQ page, custom-plan builder) via the shared `whatsappHref()` helper — no page hardcodes a phone
number or message.

---

## 5. Phone verification (WhatsApp link, new)

Mirrors the existing email-verification flow:

1. Logged-in customer calls `POST /customer/auth/phone/verify/request` with `{ phone }`.
2. Backend creates a single-use, SHA-256-hashed, expiring token (`PhoneVerificationToken`,
   TTL = `PHONE_VERIFICATION_TOKEN_TTL_MINUTES`, default 30) and sends the `phone_verification`
   template with a link `https://<frontend>/verify-phone?t=<opaque token>` — **no phone number,
   user id, or other PII in the URL**.
3. Customer taps the link → frontend `/verify-phone` page calls
   `POST /customer/auth/phone/verify/confirm` with `{ token }`.
4. Backend validates (not expired, not already used), marks the token used, and sets
   `User.phone` + `User.phoneVerifiedAt`.

A 60-second server-side cooldown prevents repeated "resend" taps from exhausting the WhatsApp send
quota; the route also sits behind the existing `customerAuthLimiter` (20 requests / 15 min).

---

## 6. Smoke test

### Mock provider (no Meta account required)

```bash
cd backend
npm run test:whatsapp -- 919876543210
```

Validates config, prints a redacted configuration summary, and performs one simulated
(`SIMULATED_SENT`) send — safe to run anytime, including CI.

### Real Meta send (requires full config + explicit opt-in)

```bash
cd backend
TEST_WHATSAPP_SEND=true npm run test:whatsapp -- 919876543210
```

Requires `WHATSAPP_ENABLED=true`, `WHATSAPP_PROVIDER=meta`, and both
`WHATSAPP_META_ACCESS_TOKEN` / `WHATSAPP_META_PHONE_NUMBER_ID` set — otherwise the script reports
`BLOCKED (config failure)` and exits non-zero without attempting a network call.

### End-to-end (order flow)

1. Set `WHATSAPP_ENABLED=true` and `WHATSAPP_PROVIDER=meta` with real IDs.
2. Place a **test** shop or package order (Razorpay Test Mode).
3. After `PAID`, check:
   - `Order.whatsappSendStatus` (`SENT` / `SKIPPED` / `FAILED`)
   - `Order.whatsappMessageId`
   - WhatsApp on the test phone
   - Meta webhook deliveries for `delivered` / `read`
4. If skipped, env is incomplete, `WHATSAPP_ENABLED=false`, or `WHATSAPP_PROVIDER=mock`.

---

## 7. Go-live checklist

- [ ] WABA and phone number live (not sandbox-only)
- [ ] Templates `order_confirmation`, `invoice_delivery`, and `phone_verification` **Approved** in English
- [ ] `welcome_message` approved too, if `WHATSAPP_WELCOME_ENABLED` will be turned on
- [ ] Permanent token on the server only — never sent to the frontend, never logged
- [ ] `WHATSAPP_PROVIDER=meta` and `WHATSAPP_ENABLED=true` set in the production environment
- [ ] Webhook verified (GET challenge) and `WHATSAPP_APP_SECRET` set (disables the dev-only unsigned bypass)
- [ ] `NEXT_PUBLIC_WHATSAPP_NUMBER` is the public enquiry number
- [ ] Rotate the access token if it was ever pasted in chat, a PR, or a log
- [ ] `npm run test:whatsapp` (mock) passes; `TEST_WHATSAPP_SEND=true npm run test:whatsapp` (real) succeeds against a real test phone

---

## 8. Related docs

- Email: `Docs/read/04-SMTP-Titan-Support-Email-Setup.md`
- Razorpay: `Docs/read/01-Razorpay-Payment-Setup.md`
- Checkout UAT: `Docs/read/05-Checkout-Communications-UAT.md`
