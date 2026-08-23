# Meta WhatsApp Cloud API Setup — Vaibhav Celebrations

**Audience:** Project lead after the WhatsApp Business Account is created  
**Used by:** Order confirmation and invoice delivery templates  
**Backend env file:** `backend/.env`  
**Frontend click-to-chat:** `frontend/.env` → `NEXT_PUBLIC_WHATSAPP_NUMBER`  
**Do not commit access tokens or app secrets.**

This product uses **Meta Cloud API only** (no Twilio).

---

## 1. What you need from Meta

| Item | Env var |
|---|---|
| Permanent / system-user access token | `WHATSAPP_META_ACCESS_TOKEN` |
| Phone number ID | `WHATSAPP_META_PHONE_NUMBER_ID` |
| WhatsApp Business Account ID | `WHATSAPP_META_BUSINESS_ACCOUNT_ID` |
| App secret (webhook signatures) | `WHATSAPP_APP_SECRET` |
| Verify token you invent | `WHATSAPP_WEBHOOK_VERIFY_TOKEN` |
| Display number (digits, India-first) | `WHATSAPP_BUSINESS_NUMBER` |

Create a Meta app with **WhatsApp** product, attach a WABA, and add a business phone number.  
Docs: [Cloud API getting started](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started)

---

## 2. Message templates (English)

Outbound business-initiated messages require **approved templates**. Create these in WhatsApp Manager (English `en`):

| Template name | When we send | Body parameters |
|---|---|---|
| `order_confirmation` | Order marked `PAID` | Order code, amount |
| `invoice_delivery` | Invoice email/resend | Invoice number, amount |

Optional document header on `invoice_delivery` / `order_confirmation` uses the public invoice PDF URL.

Until templates are **Approved**, sends fail even with a valid token.

---

## 3. Environment variables

### Backend — `backend/.env`

```env
WHATSAPP_ENABLED=true
WHATSAPP_PROVIDER=meta
WHATSAPP_BUSINESS_NUMBER=91XXXXXXXXXX
WHATSAPP_META_ACCESS_TOKEN=
WHATSAPP_META_PHONE_NUMBER_ID=
WHATSAPP_META_BUSINESS_ACCOUNT_ID=
WHATSAPP_META_API_VERSION=v21.0
WHATSAPP_WEBHOOK_VERIFY_TOKEN=change_me_whatsapp_verify_token
WHATSAPP_APP_SECRET=
```

| Flag | Meaning |
|---|---|
| `WHATSAPP_ENABLED=false` or `WHATSAPP_PROVIDER=none` | Sends skipped (`SKIPPED`) |
| `WHATSAPP_PROVIDER=meta` | Graph API path |

### Webhook URL

| Environment | URL |
|---|---|
| Local (tunnel) | `https://<tunnel>/api/v1/whatsapp/webhook` |
| Production | `https://<API_HOST>/api/v1/whatsapp/webhook` |

In Meta App → WhatsApp → Configuration:

1. Callback URL = webhook URL above  
2. Verify token = `WHATSAPP_WEBHOOK_VERIFY_TOKEN`  
3. Subscribe to **messages** (status updates)  
4. App secret must match `WHATSAPP_APP_SECRET` — the API verifies `X-Hub-Signature-256`

GET is the hub challenge. POST updates `Order.whatsappSendStatus` / `Invoice.whatsappSendStatus` by `whatsappMessageId`.

### Frontend click-to-chat (not Cloud API)

```env
NEXT_PUBLIC_WHATSAPP_NUMBER=91XXXXXXXXXX
NEXT_PUBLIC_WHATSAPP_PREFILL_MESSAGE=Hi Vaibhav Celebrations! I would like to know more about your birthday packages.
```

---

## 4. Smoke test

1. Set `WHATSAPP_ENABLED=true` and `WHATSAPP_PROVIDER=meta` with real IDs.
2. Place a **test** shop or package order (Razorpay Test Mode).
3. After `PAID`, check:
   - `Order.whatsappSendStatus` (`SENT` / `SKIPPED` / `FAILED`)
   - `Order.whatsappMessageId`
   - WhatsApp on the test phone
   - Meta webhook deliveries for `delivered` / `read`
4. If skipped, env is incomplete or provider is `none`.

---

## 5. Go-live checklist

- [ ] WABA and phone number live (not sandbox-only)
- [ ] Templates `order_confirmation` and `invoice_delivery` **Approved** in English
- [ ] Permanent token on the server only
- [ ] Webhook verified (GET challenge) and signature secret set
- [ ] `NEXT_PUBLIC_WHATSAPP_NUMBER` is the public enquiry number
- [ ] Rotate the access token if it was ever pasted in chat

---

## 6. Related docs

- Email: `Docs/read/04-SMTP-Titan-Support-Email-Setup.md`
- Razorpay: `Docs/read/01-Razorpay-Payment-Setup.md`
- Checkout UAT: `Docs/read/05-Checkout-Communications-UAT.md`
