# Twilio WhatsApp Setup — New Number (Vaibhav Celebrations)

**Audience:** Client / Project Lead after purchasing a Twilio (or Twilio-hosted) number  
**Used by:** Order confirmation, invoice WhatsApp, future Gift Registry share messages  
**Related:** `Docs/12-Twilio-WhatsApp-Integration-Guide.md` (account + Meta signup)  
**Backend env file:** `backend/.env`  
**Frontend click-to-chat:** `frontend/.env` → `NEXT_PUBLIC_WHATSAPP_NUMBER`

You have a **new number purchased**. This document is the checklist to attach that number to WhatsApp Business via Twilio and plug it into this project. Fill in the highlighted fields once the Console values are copied.

---

## 1. Record the new number

Write these down from Twilio Console (never commit the Auth Token).

| Field | Value (fill in) |
|---|---|
| Twilio Account SID | `AC…` |
| Auth Token | (password manager only) |
| Purchased number (E.164) | `+91XXXXXXXXXX` |
| WhatsApp sender (after approval) | `whatsapp:+91XXXXXXXXXX` |
| Messaging Service SID (if used) | `MG…` (optional) |
| Country / capabilities | Voice / SMS / WhatsApp |

The purchased number **must not** already be registered on the WhatsApp or WhatsApp Business mobile app. If it was, Meta will reject sender onboarding.

---

## 2. Twilio Console — confirm the number

1. Open [https://console.twilio.com](https://console.twilio.com).
2. **Phone Numbers → Manage → Active numbers**.
3. Open the new number.
4. Confirm:
   - Status is **Active**
   - SMS is enabled (needed for WhatsApp OTP verification)
   - Geographic / regulatory bundles are approved if Twilio asked for them (common for India)
5. If the account is still **Trial**, upgrade it. Trial can only message verified personal numbers and will block real customers.

---

## 3. Register the number as a WhatsApp Sender

1. Console → **Messaging → Senders → WhatsApp senders**.
2. **Create new sender** / **New WhatsApp Sender**.
3. Connect **Meta Business Manager** (Embedded Signup) with Admin access.
4. Create or select:
   - Meta Business Account
   - WhatsApp Business Account (WABA)
   - WhatsApp Business Profile (display name, category, about)
5. Choose the **purchased number** when asked to verify.
6. Twilio receives the SMS/voice OTP on that number — complete verification in the wizard.
7. Wait until sender status is **Online** / **Approved**.

Meta **business verification** (GST / incorporation docs) is still required for production-quality limits. Start it in [Meta Business Settings → Security Center](https://business.facebook.com/settings) if not already done.

---

## 4. Sandbox vs production sender

| Mode | From number | Use |
|---|---|---|
| Twilio WhatsApp **Sandbox** | `whatsapp:+14155238886` (Twilio default) | Dev only; recipients must join sandbox (`join <code>`) |
| **Your new number** | `whatsapp:+91XXXXXXXXXX` | Staging / production after sender approval |

Do not leave production on the sandbox number.

---

## 5. Message templates (required for outbound)

WhatsApp will not deliver free-form business-initiated messages outside the 24-hour customer-care window. Create templates in Twilio Content / WhatsApp templates (they sync to Meta for approval).

Minimum templates for this product:

| Internal name (suggested) | When we send it | Notes |
|---|---|---|
| `order_confirmation` | Shop / Gift Registry order paid | Include order code + amount. Optional PDF/media URL |
| `invoice_ready` | Invoice generated | Link or attachment |
| `gift_registry_share` (optional) | Owner shares registry | Registry title + public URL |

Until templates are **Approved**, even a correctly configured number will fail sends.

---

## 6. Environment variables

### Backend — `backend/.env`

```env
WHATSAPP_ENABLED=true
WHATSAPP_PROVIDER=twilio
WHATSAPP_BUSINESS_NUMBER=+91XXXXXXXXXX

TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_WHATSAPP_FROM=whatsapp:+91XXXXXXXXXX
```

Restart the API after saving.

| Flag | Meaning in this repo |
|---|---|
| `WHATSAPP_ENABLED=false` or `WHATSAPP_PROVIDER=none` | Sends are skipped (logged, not an error) |
| `WHATSAPP_PROVIDER=twilio` | Use Twilio path |
| `TWILIO_WHATSAPP_FROM` | Must match the approved sender, including `whatsapp:` prefix |

### Frontend — `frontend/.env` (click-to-chat FAB, not Twilio API)

```env
NEXT_PUBLIC_WHATSAPP_NUMBER=91XXXXXXXXXX
NEXT_PUBLIC_WHATSAPP_PREFILL_MESSAGE=Hi Vaibhav Celebrations! I would like to know more about your birthday packages.
```

No `+` on `NEXT_PUBLIC_WHATSAPP_NUMBER` if the site already prefixes `https://wa.me/`.

---

## 7. Smoke test

1. Add your personal WhatsApp as a test recipient (sandbox: send the join code first).
2. Place a **test** shop or Gift Registry order with Razorpay Test Mode.
3. After `PAID`, check:
   - Backend logs for WhatsApp skip vs send
   - Twilio Console → **Monitor → Logs → Messaging**
   - WhatsApp on the test phone
4. If status is `SKIPPED_DISABLED`, env flags are wrong.
5. If Twilio error `63016` / template, the template is not approved or the body does not match.

---

## 8. Gift Registry + WhatsApp

Automated WhatsApp is **not** required for guests to open a registry. Sharing uses:

- Copy link
- WhatsApp share (`wa.me/?text=…`) from the owner dashboard
- Email share
- Native share on mobile

Twilio is for **platform-originated** messages (paid order, invoice). Owner-initiated share to family uses the guest’s own WhatsApp, not your Twilio quota.

---

## 9. Go-live checklist

- [ ] Number active in Twilio, not registered on a personal WhatsApp app
- [ ] WhatsApp Sender **Approved** on the new number
- [ ] Account upgraded (not Trial)
- [ ] Templates approved in Meta
- [ ] `TWILIO_*` and `WHATSAPP_*` set on the **server** only
- [ ] `NEXT_PUBLIC_WHATSAPP_NUMBER` is the public enquiry number (can be the same number)
- [ ] Test message received on a real device
- [ ] Auth Token stored in a secrets manager, not in git

---

## 10. Security

Account SID + Auth Token can send paid messages and change numbers. Share them through a password manager. If leaked, rotate the Auth Token in Twilio Console immediately and update `TWILIO_AUTH_TOKEN`.
