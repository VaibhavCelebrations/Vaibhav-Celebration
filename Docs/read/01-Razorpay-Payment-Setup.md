# Razorpay Payment Setup — Vaibhav Celebrations

**Audience:** Project Lead / whoever owns the Razorpay merchant account  
**Used by:** Shop checkout, Gift Registry (Vaibhav Celebrations products), Package celebration orders  
**Backend env file:** `backend/.env`  
**Do not commit real keys.**

This document is the working setup for **live/test payments** on this codebase. If keys are missing or still look like `rzp_test_xxxx…`, the backend creates a **mock** Razorpay order and Checkout will not charge a real card.

---

## 1. What this project needs from Razorpay

| Item | Where it is used | Env var |
|---|---|---|
| Key ID (public) | Checkout.js widget + API | `RAZORPAY_KEY_ID` in `backend/.env` |
| Key Secret (private) | Create orders + verify payment signature | `RAZORPAY_KEY_SECRET` in `backend/.env` |
| Webhook secret | `POST /api/v1/payments/webhook` | `RAZORPAY_WEBHOOK_SECRET` in `backend/.env` |
| Mode | `test` or `live` | `RAZORPAY_MODE` |

**Checkout types (all are Orders — there is no customer Booking checkout anymore):**

| Flow | API | Razorpay notes `type` |
|---|---|---|
| Shop products | `POST /shop/orders` | `SHOP_ORDER` |
| Gift registry products | same, with registry lines | `REGISTRY_GIFT` / `SHOP_ORDER` |
| Celebration packages | `POST /shop/orders/package` | `PACKAGE_ORDER` |

Optional (frontend): `NEXT_PUBLIC_RAZORPAY_KEY_ID` in `frontend/.env` — the storefront checkout **prefers the Key ID returned by the backend** on order create. Keep it in sync anyway.

---

## 2. Create / open the Razorpay account

1. Sign in at [https://dashboard.razorpay.com](https://dashboard.razorpay.com).
2. Confirm the business is **Vaibhav Celebrations** (or the legal entity that will receive settlements).
3. Complete KYC / activation if the account is still in Limited Access.
4. Use the **Test Mode** toggle (top of dashboard) until UAT is signed off. Switch to **Live Mode** only for production.

---

## 3. Generate API keys

1. Dashboard → **Account & Settings** → **API Keys** (or **Developers** → **API Keys**).
2. Generate **Test** keys first (`rzp_test_…`).
3. Copy:
   - **Key Id**
   - **Key Secret** (shown only once — store in a password manager)
4. When going live, generate **Live** keys (`rzp_live_…`) in Live Mode. Never mix test keys on production.

Put them in `backend/.env`:

```env
RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxx
RAZORPAY_MODE=test
```

Restart the backend after changing env.

**How you know keys are real:** backend logs will **not** say `Razorpay mock order — keys not configured`. Placeholder values containing `xxxx` are treated as unset.

---

## 4. Webhook (required for Gift Registry + shop)

Payments are confirmed in two ways:

1. Checkout.js success handler → shop verify endpoint  
2. Razorpay **webhook** `payment.captured` → `markOrderPaid`

Gift Registry purchased quantities update **only after verified payment**. The webhook is the reliable path if the buyer closes the browser after paying.

### 4.1 Webhook URL

| Environment | URL |
|---|---|
| Local (via tunnel) | `https://<ngrok-or-cloudflare-tunnel>/api/v1/payments/webhook` |
| Staging / production | `https://<API_HOST>/api/v1/payments/webhook` |

Example production shape: `https://api.vaibhavcelebrations.in/api/v1/payments/webhook`

The backend reads the **raw JSON body** and header `X-Razorpay-Signature`. Do not put this URL behind a cache that rewrites the body.

### 4.2 Create the webhook in Razorpay

1. Dashboard → **Account & Settings** → **Webhooks**.
2. **Add New Webhook**.
3. URL: the webhook URL above.
4. Active: **Yes**.
5. Secret: generate a long random string (or let Razorpay generate one). Copy it to:

```env
RAZORPAY_WEBHOOK_SECRET=whsec_your_secret_here
```

6. Subscribe at least to:
   - `payment.captured` — mark shop / registry order **PAID**
   - `payment.failed` — mark payment **FAILED** (does **not** increment registry purchased qty)
   - `order.paid` — optional backup

7. Save. Razorpay will show recent deliveries — use **Send Test Event** after the API is reachable.

### 4.3 Local webhook testing

Razorpay cannot call `localhost`. Use a tunnel:

```bash
# example
ngrok http 4000
```

Point the webhook at `https://<ngrok-id>.ngrok-free.app/api/v1/payments/webhook`.  
Update the webhook URL whenever the tunnel URL changes.

---

## 5. Test cards (Test Mode only)

Use Razorpay’s official test cards: [https://razorpay.com/docs/payments/payments/test-card-details/](https://razorpay.com/docs/payments/payments/test-card-details/)

Typical UAT cases:

| Case | What to do | Expected in this app |
|---|---|---|
| Success | Test card that succeeds | Order `PAID`; registry gift **Purchased** qty increases |
| Failure | Test card that fails | Order not PAID; registry remaining qty restored / not incremented |
| Dismiss Checkout | Close the Razorpay modal | Toast “Payment was not completed”; gift stays available |
| Pending | Slow confirmation | UI polls order status; webhook should still mark PAID |

Never use live cards against Test keys (or test cards against Live keys).

---

## 6. Settlement / go-live checklist

- [ ] Test Mode: shop checkout success + failure + dismiss
- [ ] Test Mode: Gift Registry internal product → pay → quantity updates
- [ ] Webhook deliveries show **OK** (2xx) in Razorpay dashboard
- [ ] Live keys generated only after KYC
- [ ] `RAZORPAY_MODE=live` and `rzp_live_…` keys on production only
- [ ] Production webhook URL uses HTTPS and the **live** webhook secret
- [ ] `COOKIE_SECURE=true` and production `FRONTEND_URL` / CORS already set

---

## 7. Admin checks after a payment

- Admin → **CRM → Orders** — payment status `PAID`, optional `registryCode`
- Admin → **CRM → Gift Registries** — gift quantities and linked orders
- Admin → **CRM → Payments** — webhook/verify events

---

## 8. Common failures

| Symptom | Likely cause |
|---|---|
| Checkout says payment is not configured | `RAZORPAY_KEY_ID` empty / placeholder; backend returned `razorpayKeyId: null` |
| Order created but never PAID | Webhook URL wrong, secret mismatch, or tunnel down |
| `PAYMENT_SIGNATURE_INVALID` | Webhook secret in dashboard ≠ `RAZORPAY_WEBHOOK_SECRET` |
| Registry qty did not change after pay | Payment not verified PAID yet; or you bought an **external** gift (those are not charged on Razorpay) |
| Mock `order_mock_…` IDs | Keys still placeholders — Checkout is not hitting Razorpay |

---

## 9. Security

- Key Secret and Webhook Secret are **server-only**. Never put them in `NEXT_PUBLIC_*`.
- Rotate keys if they were pasted in chat/email. Update `.env` and restart.
- Share credentials via a password manager, not WhatsApp/Slack plaintext.
