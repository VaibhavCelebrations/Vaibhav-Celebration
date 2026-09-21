# Comprehensive Audit: Meta WhatsApp Cloud API Integration & Message Template Specification

**Project:** Vaibhav Celebrations  
**Workspace:** `e:\Affor Technologies\Projects\Vaibhav Celebrations\Vaibhav Celebrations Website`  
**Provider:** Meta WhatsApp Cloud API (Graph API `v21.0`)  
**Sending Phone Number ID:** `1264329133438472`  
**Business WABA ID:** `1620801422722028`  
**Public Display / Enquiry Number:** `+91 87698 95174` (`918769895174`)  
**Audit Scope:** Full backend integration, controllers, routes, models, database schemas, webhook lifecycle, invoice handling, and template registry.

---

## C. Hardcoded Template Names Across the Codebase

All WhatsApp templates in this application are strictly governed by the centralized registry at [backend/src/integrations/whatsapp/templates.ts](file:///e:/Affor%20Technologies/Projects/Vaibhav%20Celebrations/Vaibhav%20Celebrations%20Website/backend/src/integrations/whatsapp/templates.ts).

| Template Name | File | Function | Trigger / Event | Variables Count | Header Type | Meta Category |
|---|---|---|---|---|---|---|
| `phone_otp_verification` | [templates.ts](file:///e:/Affor%20Technologies/Projects/Vaibhav%20Celebrations/Vaibhav%20Celebrations%20Website/backend/src/integrations/whatsapp/templates.ts#L12) / [customer-auth.service.ts](file:///e:/Affor%20Technologies/Projects/Vaibhav%20Celebrations/Vaibhav%20Celebrations%20Website/backend/src/modules/customer-auth/customer-auth.service.ts) | `buildPhoneOtpMessage` / `sendPhoneOtpWhatsapp` | Customer requests phone verification OTP (`POST /customer/auth/phone/otp/request`) | 1 variable | `NONE` | `AUTHENTICATION` |
| `order_confirmation` | [templates.ts](file:///e:/Affor%20Technologies/Projects/Vaibhav%20Celebrations/Vaibhav%20Celebrations%20Website/backend/src/integrations/whatsapp/templates.ts#L18) / [orders.service.ts](file:///e:/Affor%20Technologies/Projects/Vaibhav%20Celebrations/Vaibhav%20Celebrations%20Website/backend/src/modules/orders/orders.service.ts#L1351) | `buildOrderConfirmationMessage` / `sendOrderConfirmationWhatsapp` / `resendOrderConfirmationWhatsapp` | Order marked `PAID` via Razorpay payment webhook OR Admin triggers resend (`POST /admin/orders/:id/resend-whatsapp`) | 2 or 3 variables *(See Conflict 1)* | `DOCUMENT` (conditional: attached if invoice PDF exists) *(See Conflict 2)* | `UTILITY` |
| `invoice_delivery` | [templates.ts](file:///e:/Affor%20Technologies/Projects/Vaibhav%20Celebrations/Vaibhav%20Celebrations%20Website/backend/src/integrations/whatsapp/templates.ts#L19) / [payments.service.ts](file:///e:/Affor%20Technologies/Projects/Vaibhav%20Celebrations/Vaibhav%20Celebrations%20Website/backend/src/modules/payments/payments.service.ts#L166) | `buildInvoiceDeliveryMessage` / `sendInvoiceDeliveryWhatsapp` | Admin triggers invoice delivery / resend (`POST /admin/payments/invoices/:id/deliver`) | 2 variables | `DOCUMENT` (attached if invoice PDF exists) | `UTILITY` |
| `welcome_message` | [templates.ts](file:///e:/Affor%20Technologies/Projects/Vaibhav%20Celebrations/Vaibhav%20Celebrations%20Website/backend/src/integrations/whatsapp/templates.ts#L20) / [whatsapp.service.ts](file:///e:/Affor%20Technologies/Projects/Vaibhav%20Celebrations/Vaibhav%20Celebrations%20Website/backend/src/modules/whatsapp/whatsapp.service.ts#L230) | `buildWelcomeMessage` / `sendWelcomeWhatsapp` | New user onboarding (gated by `WHATSAPP_WELCOME_ENABLED=true`) | 1 variable | `NONE` | `MARKETING` |
| `order_status_update` | [templates.ts](file:///e:/Affor%20Technologies/Projects/Vaibhav%20Celebrations/Vaibhav%20Celebrations%20Website/backend/src/integrations/whatsapp/templates.ts#L21) / [whatsapp.service.ts](file:///e:/Affor%20Technologies/Projects/Vaibhav%20Celebrations/Vaibhav%20Celebrations%20Website/backend/src/modules/whatsapp/whatsapp.service.ts#L244) | `buildOrderStatusUpdateMessage` / `sendOrderStatusUpdateWhatsapp` | Admin updates order status (Processing, Ready to Ship, Shipped, Delivered, Cancelled, Refunded) | 4 variables | `NONE` | `UTILITY` |

---

## A & B. Detailed WhatsApp Message Template Specifications (Exact Code Alignment)

### 1. Template: `phone_otp_verification`

- **Exact Template Name expected by code:** `phone_otp_verification` (or overridable via `WHATSAPP_PHONE_OTP_TEMPLATE`)
- **Category in Meta:** `AUTHENTICATION`
- **Language expected by code:** `en` (English)
- **Message Purpose:** One-time passcode (OTP) verification for customer phone verification.
- **Header:** `NONE` (Meta Authentication templates do not support media headers)
- **Footer:** Preset by Meta (e.g. security warning or expiration notice)
- **Buttons:** 
  - Option A: None
  - Option B: `Copy code` button (configured via `WHATSAPP_AUTH_HAS_COPY_CODE_BUTTON=true`)
- **Exact Number of Variables:** 1
- **Variable Mapping & Meaning:**
  - `{{1}}`: 6-digit numeric verification OTP code (`otp`).
  - *Example value:* `482910`
- **Expiry in Meta:** 10 minutes (matches backend `PHONE_VERIFICATION_TOKEN_TTL_MINUTES=10`)
- **Meta Authentication Preset Body Text:**
```text
{{1}} is your verification code for Vaibhav Celebrations. For your security, do not share this code.
```

---

### 2. Template: `order_confirmation`

- **Exact Template Name expected by code:** `order_confirmation`
- **Category in Meta:** `UTILITY`
- **Language expected by code:** `en` (English)
- **Message Purpose:** Post-purchase transactional confirmation with order reference, total amount paid, and attached tax invoice PDF.
- **Header Type:** `DOCUMENT` (Code passes `Invoice-${order.orderCode}.pdf` via public HTTPS URL).
- **Footer:** None in code.
- **Buttons:** None in code.
- **Intended Flow:** Order confirmation / payment confirmation / invoice delivery.
- **Number of Variables & Meaning:**
  - Standard / Fixed Code Mapping:
    - `{{1}}`: Order reference code (`input.orderCode`). Code expression: `order.orderCode`. Example: `VBC-2026-8941`
    - `{{2}}`: Formatted order total in INR (`input.amountFormatted`). Code expression: `(order.totalInPaise / 100).toFixed(2)`. Example: `2499.00`
  - *Conditional 3rd Parameter in Code:*
    - `{{3}}`: Account / gift registry access note.
    - *Code expression:*
      - If guest order: `Your account credentials have been emailed to you. Log in to track your order: https://vaibhavcelebrations.in/login`
      - If gift registry setup: `Setup your Gift Registry by logging in: https://vaibhavcelebrations.in/account/registries`
    - *CRITICAL NOTE:* When no guest checkout / registry applies, the code sends only 2 parameters. (See **Section I: Conflict 1** for exact resolution).
- **Exact Body Text for Meta (Recommended 2-Variable Standard Template):**
```text
Thank you for celebrating with us! Your order {{1}} has been confirmed.

Total Amount Paid: ₹{{2}}

Your official tax invoice is attached above. We are now preparing your order.
```
*(If you retain the 3rd variable in code, use the 3-variable template below):*
```text
Thank you for celebrating with us! Your order {{1}} has been confirmed.

Total Amount Paid: ₹{{2}}

{{3}}

Your official tax invoice is attached above.
```

---

### 3. Template: `invoice_delivery`

- **Exact Template Name expected by code:** `invoice_delivery`
- **Category in Meta:** `UTILITY`
- **Language expected by code:** `en` (English)
- **Message Purpose:** Delivery of official GST tax invoice PDF to customer (used by Admin invoice resend action).
- **Header Type:** `DOCUMENT` (Code passes `Invoice-${invoice.invoiceNumber}.pdf`).
- **Footer:** None in code.
- **Buttons:** None in code.
- **Exact Number of Variables:** 2
- **Variable Mapping & Meaning:**
  - `{{1}}`: Invoice Number (`input.invoiceNumber`). Code expression: `invoice.invoiceNumber`. Example: `INV-2026-0042`
  - `{{2}}`: Formatted invoice total in INR (`input.amountFormatted`). Code expression: `(invoice.totalInPaise / 100).toFixed(2)`. Example: `3500.00`
- **Intended Flow:** Invoice delivery.
- **Exact Body Text to create in Meta:**
```text
Dear Customer, please find attached the tax invoice {{1}} for your order with Vaibhav Celebrations.

Total Amount: ₹{{2}}

Thank you for choosing Vaibhav Celebrations!
```

---

### 4. Template: `welcome_message`

- **Exact Template Name expected by code:** `welcome_message`
- **Category in Meta:** `MARKETING` (Meta policy classifies generic onboarding / greetings as Marketing).
- **Language expected by code:** `en` (English)
- **Message Purpose:** Onboarding welcome message sent when a new user account is created.
- **Header:** `NONE`
- **Footer:** None in code.
- **Buttons:** None in code.
- **Exact Number of Variables:** 1
- **Variable Mapping & Meaning:**
  - `{{1}}`: Customer full name or first name (`input.name`). Code expression: `user.name`. Example: `Priya Sharma`
- **Intended Flow:** Customer notification / onboarding.
- **Exact Body Text to create in Meta:**
```text
Hello {{1}}, welcome to Vaibhav Celebrations!

We are delighted to have you with us. Explore our handcrafted celebration packages, decor themes, and gift registries to make your special moments unforgettable.
```

---

### 5. Template: `order_status_update`

- **Exact Template Name expected by code:** `order_status_update`
- **Category in Meta:** `UTILITY`
- **Language expected by code:** `en` (English)
- **Message Purpose:** Lifecycle notification informing the customer about changes to their order status (Processing, Ready to Ship, Shipped, Delivered, Cancelled, Refunded).
- **Header:** `NONE`
- **Footer:** None in code.
- **Buttons:** None in code.
- **Exact Number of Variables:** 4
- **Variable Mapping & Meaning:**
  - `{{1}}`: Customer Name (`input.customerName`). Example: `Priya`
  - `{{2}}`: Order Code (`input.orderCode`). Example: `VBC-2026-1001`
  - `{{3}}`: Status Label (`statusInfo.label`). Generated from `WA_STATUS_LABELS`:
    - `Processing`
    - `Ready to Ship`
    - `Shipped`
    - `Delivered`
    - `Cancelled`
    - `Refunded`
  - `{{4}}`: Status Description Message (`finalMessage`). Generated from `WA_STATUS_LABELS`:
    - *Processing:* `Our team is now preparing your order for dispatch.`
    - *Ready to Ship:* `Your order is packed and will be handed to our courier very soon.`
    - *Shipped:* `Your order is on its way! Keep an eye out for the delivery. Track here: https://...`
    - *Delivered:* `Your order has been successfully delivered. Enjoy!`
    - *Cancelled:* `Your order has been cancelled. Contact us if you need assistance.`
    - *Refunded:* `Your refund has been initiated and may take 3-7 business days.`
- **Intended Flow:** Order status update / shipping / delivery / cancellation / refund.
- **Exact Body Text to create in Meta:**
```text
Dear {{1}}, your order {{2}} is now {{3}}.

{{4}}

Thank you for choosing Vaibhav Celebrations.
```

---

## D. Real Code Parameter Mappings

```text
================================================================================
Template: phone_verification
File: backend/src/integrations/whatsapp/templates.ts (lines 23–30)
================================================================================
Expected Meta Body:
Hello, please use the following link to verify your WhatsApp number with Vaibhav Celebrations: {{1}}

This link will expire in 30 minutes. If you did not request this, please ignore this message.

Code Mapping:
{{1}} = `${env.FRONTEND_URL}/verify-phone?t=${rawToken}`
        (Opaque token generated in customer-auth.service.ts; no PII)
```

```text
================================================================================
Template: order_confirmation
File: backend/src/integrations/whatsapp/templates.ts (lines 32–60)
================================================================================
Expected Meta Body:
Thank you for celebrating with us! Your order {{1}} has been confirmed.

Total Amount Paid: ₹{{2}}

Your official tax invoice is attached above. We are now preparing your order.

Code Mapping:
Header (Document) = {
  link: order.invoicePdfUrl,
  filename: `Invoice-${order.orderCode}.pdf`
}
{{1}} = order.orderCode
{{2}} = (order.totalInPaise / 100).toFixed(2)
{{3}} = [CONDITIONAL]
        - If guest order:
          `Your account credentials have been emailed to you. Log in to track your order: ${input.guestLoginUrl}`
        - If gift registry upgrade:
          `Setup your Gift Registry by logging in: ${process.env.FRONTEND_URL}/account/registries`
        *(Note: {{3}} is omitted when neither condition is met. See Conflict 1).*
```

```text
================================================================================
Template: invoice_delivery
File: backend/src/integrations/whatsapp/templates.ts (lines 62–74)
================================================================================
Expected Meta Body:
Dear Customer, please find attached the tax invoice {{1}} for your order with Vaibhav Celebrations.

Total Amount: ₹{{2}}

Thank you for choosing Vaibhav Celebrations!

Code Mapping:
Header (Document) = {
  link: invoice.pdfUrl,
  filename: `Invoice-${invoice.invoiceNumber}.pdf`
}
{{1}} = invoice.invoiceNumber
{{2}} = (invoice.totalInPaise / 100).toFixed(2)
```

```text
================================================================================
Template: welcome_message
File: backend/src/integrations/whatsapp/templates.ts (lines 76–83)
================================================================================
Expected Meta Body:
Hello {{1}}, welcome to Vaibhav Celebrations!

We are delighted to have you with us. Explore our handcrafted celebration packages, decor themes, and gift registries to make your special moments unforgettable.

Code Mapping:
{{1}} = user.name (Customer's full name from User table)
```

```text
================================================================================
Template: order_status_update
File: backend/src/integrations/whatsapp/templates.ts (lines 121–143)
================================================================================
Expected Meta Body:
Dear {{1}}, your order {{2}} is now {{3}}.

{{4}}

Thank you for choosing Vaibhav Celebrations.

Code Mapping:
{{1}} = input.customerName
{{2}} = input.orderCode
{{3}} = WA_STATUS_LABELS[input.status].label
{{4}} = WA_STATUS_LABELS[input.status].message (+ ` Track here: ${input.trackingUrl}` if shipped)
```

---

## E. Invoice & PDF Document Handling Audit

The invoice generation and storage logic in [backend/src/integrations/invoice/pdf.ts](file:///e:/Affor%20Technologies/Projects/Vaibhav%20Celebrations/Vaibhav%20Celebrations%20Website/backend/src/integrations/invoice/pdf.ts) and [backend/src/integrations/media/storage.ts](file:///e:/Affor%20Technologies/Projects/Vaibhav%20Celebrations/Vaibhav%20Celebrations%20Website/backend/src/integrations/media/storage.ts) operates as follows:

- **Is the invoice sent as a WhatsApp document?**  
  **Yes.** In [meta.provider.ts](file:///e:/Affor%20Technologies/Projects/Vaibhav%20Celebrations/Vaibhav%20Celebrations%20Website/backend/src/integrations/whatsapp/providers/meta.provider.ts#L42-L47):
  ```typescript
  if (input.document) {
    components.unshift({
      type: "header",
      parameters: [{ type: "document", document: { link: input.document.url, filename: input.document.filename } }],
    });
  }
  ```
- **Is a Meta template document header required?**  
  **Yes.** In Meta WhatsApp Manager, templates sending documents must have `Header: Media -> Document`.
- **What filename is used?**  
  - For `order_confirmation`: `Invoice-${order.orderCode}.pdf` (e.g. `Invoice-VBC-1001.pdf`).
  - For `invoice_delivery`: `Invoice-${invoice.invoiceNumber}.pdf` (e.g. `Invoice-INV-2001.pdf`).
- **What MIME type is used?**  
  `application/pdf` (rendered via `pdf-lib` onto `assets/vc-letterhead.pdf`).
- **Is a public URL required?**  
  **Yes.** Meta Cloud API fetches the document using HTTP/HTTPS GET from `link`. Meta servers cannot access `localhost`, RFC 1918 private IPs, or protected/auth-gated URLs. The code utilizes `CLOUDFLARE_R2_PUBLIC_BASE_URL` (`https://cdn.vaibhavcelebrations.in`).
- **Is the document uploaded to Meta first?**  
  **No.** The backend does not use Meta's Graph API `/media` upload endpoint. It supplies the hosted CDN link directly.
- **Is a Media ID used?**  
  **No.** No `id` field is sent to Meta; only `{ link: url, filename: filename }`.
- **Is a document URL used?**  
  **Yes.** `input.document.url` is passed directly in the payload.
- **What body variables are passed with the document?**  
  - `invoice_delivery`: 2 body variables (`invoiceNumber`, `amountFormatted`).
  - `order_confirmation`: 2 body variables (`orderCode`, `amountFormatted`) or 3 if guest login/registry note is appended.

---

## F. Webhook Requirements & Database Mapping

The webhook router is mounted at `/api/v1/whatsapp/webhook` in [backend/src/app.ts](file:///e:/Affor%20Technologies/Projects/Vaibhav%20Celebrations/Vaibhav%20Celebrations%20Website/backend/src/app.ts#L353) and implemented in [backend/src/modules/whatsapp/whatsapp.routes.ts](file:///e:/Affor%20Technologies/Projects/Vaibhav%20Celebrations/Vaibhav%20Celebrations%20Website/backend/src/modules/whatsapp/whatsapp.routes.ts) and [backend/src/modules/whatsapp/whatsapp.service.ts](file:///e:/Affor%20Technologies/Projects/Vaibhav%20Celebrations/Vaibhav%20Celebrations%20Website/backend/src/modules/whatsapp/whatsapp.service.ts#L266-L503).

### Handled Webhook Events

1. **Subscription Handshake (`GET /api/v1/whatsapp/webhook`)**:
   - Query parameters: `hub.mode`, `hub.verify_token`, `hub.challenge`.
   - Checks: `hub.mode === "subscribe"` and `hub.verify_token === env.WHATSAPP_WEBHOOK_VERIFY_TOKEN`.
   - Returns: `hub.challenge` with HTTP 200 (or HTTP 403 Forbidden).
2. **Signature Verification (`POST /api/v1/whatsapp/webhook`)**:
   - Header: `x-hub-signature-256`.
   - Computed with: `crypto.createHmac("sha256", env.WHATSAPP_APP_SECRET).update(rawBody).digest("hex")`.
   - Verified with: `crypto.timingSafeEqual`. (In non-production dev only, bypassed if `WHATSAPP_APP_SECRET` is unset).
3. **Delivery Status Updates (`POST /api/v1/whatsapp/webhook`)**:
   - Meta payload path: `entry[].changes[].value.statuses[]`.
   - Handled statuses:
     - `sent` → `SENT`
     - `delivered` → `DELIVERED`
     - `read` → `READ`
     - `failed` → `FAILED`
   - *Incoming messages (`entry[].changes[].value.messages[]`):* Ignored safely without error (returns `{ handled: false }` and HTTP 200).

### Database Models & Fields Updated by Webhook

#### 1. Deduplication & Audit Table: `WhatsAppWebhookEvent`
- **`eventKey`**: Unique string `status:${providerMessageId}:${status}`. Meta duplicate webhooks throw a unique constraint violation and are safely skipped.
- **`eventType`**: `"STATUS_UPDATE"`
- **`providerMessageId`**: Meta's message ID (`wamid....`).
- **`status`**: Normalized WhatsApp status (`SENT`, `DELIVERED`, `READ`, `FAILED`).
- **`payload`**: JSON snapshot of Meta's raw webhook status object.
- **`processed`**: `true` once status update is applied to `Order` or `Invoice`.
- **`processedAt`**: Timestamp when processing completed.
- **`error`**: Captured error string if processing fails.

#### 2. Target Tables: `Order` and `Invoice`
Indexed lookup: `where: { whatsappMessageId: providerMessageId }`.
Status progression is guarded by `mergeStatus` (`PENDING: 0 < SENDING: 1 < SENT: 2 < DELIVERED: 3 < READ: 4`; terminal `FAILED` never overwrites `DELIVERED` or `READ`):

| Webhook Event | `Order` / `Invoice` Field Updated | Value Set |
|---|---|---|
| `sent` | `whatsappSendStatus` | `"SENT"` |
| | `whatsappSentAt` | Event timestamp from Meta (or current time if not already set) |
| `delivered` | `whatsappSendStatus` | `"DELIVERED"` |
| | `whatsappDeliveredAt` | Event timestamp from Meta |
| `read` | `whatsappSendStatus` | `"READ"` |
| | `whatsappReadAt` | Event timestamp from Meta |
| | `whatsappDeliveredAt` | Backfilled with event timestamp if previously null |
| `failed` | `whatsappSendStatus` | `"FAILED"` |
| | `whatsappError` | Error code & message parsed from Meta payload (e.g. `[131026] Message Undeliverable: ...`) |

---

## G. Configuration Audit: Environment Variables

Extracted from [backend/src/config/env.ts](file:///e:/Affor%20Technologies/Projects/Vaibhav%20Celebrations/Vaibhav%20Celebrations%20Website/backend/src/config/env.ts#L57-L84) and active in [backend/.env](file:///e:/Affor%20Technologies/Projects/Vaibhav%20Celebrations/Vaibhav%20Celebrations%20Website/backend/.env#L53-L62):

| ENV Variable | Required | Used In | Purpose | Secret? | Active Value in `.env` |
|---|---|---|---|---|---|
| `WHATSAPP_ENABLED` | Yes (for active sending) | `whatsapp.service.ts` | Master switch. When `false`, messages are skipped (`SKIPPED`). | No | `true` |
| `WHATSAPP_PROVIDER` | Yes (`"meta"` or `"mock"`) | `provider-factory.ts` | Selects `MetaWhatsAppProvider` vs `MockWhatsAppProvider`. | No | `meta` |
| `WHATSAPP_BUSINESS_NUMBER` | Optional (Display only) | `test-whatsapp.ts`, `seed.ts` | Display digits (`918769895174`). Never used as the Graph API sending endpoint. | No | `918769895174` |
| `WHATSAPP_META_ACCESS_TOKEN` | Yes (for Meta provider) | `meta.provider.ts` | Permanent Meta System User Token passed in `Authorization: Bearer <token>`. | **YES** | Configured |
| `WHATSAPP_META_PHONE_NUMBER_ID` | Yes (for Meta provider) | `meta.provider.ts` | Meta Phone Number ID used in Graph URL: `https://graph.facebook.com/v21.0/{id}/messages`. | No | `1264329133438472` |
| `WHATSAPP_META_BUSINESS_ACCOUNT_ID` | Optional | `env.ts`, `test-whatsapp.ts` | Meta WhatsApp Business Account (WABA) ID for administrative tracking. | No | `1620801422722028` |
| `WHATSAPP_META_API_VERSION` | Optional (defaults to `"v21.0"`) | `meta.provider.ts` | Meta Graph API version string. | No | `v21.0` |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Yes (for Webhook setup) | `whatsapp.service.ts` | Token matching Meta App Dashboard `hub.verify_token` in GET handshake. | **YES** | Configured |
| `WHATSAPP_APP_SECRET` | Yes (in production) | `signature.ts` | Secret key used to verify HMAC-SHA256 signature in `x-hub-signature-256`. | **YES** | Configured |
| `WHATSAPP_WELCOME_ENABLED` | Optional (defaults to `false`) | `whatsapp.service.ts` | Gate for `sendWelcomeWhatsapp`. | No | Unset (defaults to `false`) |
| `PHONE_VERIFICATION_TOKEN_TTL_MINUTES` | Optional (defaults to `30`) | `customer-auth.service.ts` | Expiry duration for phone verification link tokens. | No | `30` |
| `TEST_WHATSAPP_SEND` | Optional (defaults to `false`) | `scripts/test-whatsapp.ts` | Safety opt-in flag required for CLI script to fire a real live Meta message. | No | `false` |
| `CLOUDFLARE_R2_PUBLIC_BASE_URL` | Yes (for invoice PDFs) | `storage.ts` | Base HTTPS URL for PDF documents attached in template headers. | No | `https://cdn.vaibhavcelebrations.in` |
| `FRONTEND_URL` | Yes | `templates.ts`, `customer-auth.service.ts` | Base URL used to construct the phone verification link (`{{1}}`). | No | `https://vaibhavcelebrations.in` |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | Yes (Frontend) | Frontend `settings.ts`, `WhatsAppFAB.tsx` | Target phone number for click-to-chat floating action button (`wa.me`). | No | Configured |
| `NEXT_PUBLIC_WHATSAPP_PREFILL_MESSAGE` | Optional (Frontend) | Frontend `settings.ts`, `WhatsAppFAB.tsx` | Default greeting text populated in click-to-chat. | No | Configured |

---

## I. Detected Inconsistencies & Conflicts in the Codebase

### CONFLICT 1: `order_confirmation` Parameter Count Dynamic Mismatch (2 vs 3 parameters)

**Conflict Found:**  
In [backend/src/integrations/whatsapp/templates.ts (lines 41–53)](file:///e:/Affor%20Technologies/Projects/Vaibhav%20Celebrations/Vaibhav%20Celebrations%20Website/backend/src/integrations/whatsapp/templates.ts#L41-L53):
```typescript
const params = [input.orderCode, input.amountFormatted];

if (input.guestLoginUrl) {
  const loginNote = input.includeGiftRegistrySetup
    ? `Your account & Gift Registry setup instructions have been emailed to you. Log in: ${input.guestLoginUrl}`
    : `Your account credentials have been emailed to you. Log in to track your order: ${input.guestLoginUrl}`;
  params.push(loginNote);
} else if (input.includeGiftRegistrySetup) {
  params.push(`Setup your Gift Registry by logging in: ${process.env.FRONTEND_URL}/account/registries`);
}
```

**Expected by file A (Standard orders, Resend, and Smoke Test):**
- [backend/src/modules/whatsapp/whatsapp.service.ts line 548](file:///e:/Affor%20Technologies/Projects/Vaibhav%20Celebrations/Vaibhav%20Celebrations%20Website/backend/src/modules/whatsapp/whatsapp.service.ts#L548) (`resendOrderConfirmationWhatsapp`): Passes only `orderCode` and `amountFormatted` (2 parameters).
- [backend/scripts/test-whatsapp.ts line 43 & 62](file:///e:/Affor%20Technologies/Projects/Vaibhav%20Celebrations/Vaibhav%20Celebrations%20Website/backend/scripts/test-whatsapp.ts#L43): Passes only `orderCode` and `amountFormatted` (2 parameters).
- [backend/src/integrations/whatsapp/templates.test.ts line 18](file:///e:/Affor%20Technologies/Projects/Vaibhav%20Celebrations/Vaibhav%20Celebrations%20Website/backend/src/integrations/whatsapp/templates.test.ts#L18): Expects `["VBC-1001", "1500.00"]` (2 parameters).

**Expected by file B (Guest checkouts and Gift Registry orders):**
- [backend/src/integrations/whatsapp/templates.ts line 49 & 51](file:///e:/Affor%20Technologies/Projects/Vaibhav%20Celebrations/Vaibhav%20Celebrations%20Website/backend/src/integrations/whatsapp/templates.ts#L49): Pushes a 3rd parameter (`params.push(...)`).

**Meta Cloud API Rule:**  
In Meta WhatsApp Manager, templates require an **exact and fixed** number of positional parameters.
- If Meta template is created with 2 variables (`{{1}}` and `{{2}}`), sending 3 parameters results in Meta API Error `132000` (`Number of parameters does not match template`).
- If Meta template is created with 3 variables (`{{1}}`, `{{2}}`, `{{3}}`), sending 2 parameters results in Meta API Error `132000`.

**Recommended Resolution:**
1. In Meta WhatsApp Manager, create `order_confirmation` with **2 variables**:
   ```text
   Thank you for celebrating with us! Your order {{1}} has been confirmed.
   Total Amount Paid: ₹{{2}}
   Your official tax invoice is attached above.
   ```
2. In the backend, separate account credentials / registry setup instructions into an optional follow-up message or include them in the confirmation email (which already occurs in `sendOrderConfirmationEmailNow` in `orders.service.ts` line 1346).

---

### CONFLICT 2: `order_confirmation` Conditional Document Header vs Fixed Meta Template Schema

**Conflict Found:**  
In [backend/src/modules/whatsapp/whatsapp.service.ts (lines 144–150)](file:///e:/Affor%20Technologies/Projects/Vaibhav%20Celebrations/Vaibhav%20Celebrations%20Website/backend/src/modules/whatsapp/whatsapp.service.ts#L144-L150):
```typescript
const document: WhatsAppDocument | undefined = order.invoicePdfUrl
  ? { url: order.invoicePdfUrl, filename: `Invoice-${order.orderCode}.pdf` }
  : undefined;
```
And in [meta.provider.ts (lines 42–47)](file:///e:/Affor%20Technologies/Projects/Vaibhav%20Celebrations/Vaibhav%20Celebrations%20Website/backend/src/integrations/whatsapp/providers/meta.provider.ts#L42-L47):
```typescript
const components: unknown[] = [{ type: "body", parameters }];
if (input.document) {
  components.unshift({
    type: "header",
    parameters: [{ type: "document", document: { link: input.document.url, filename: input.document.filename } }],
  });
}
```

**Conflict Description:**
- If `order.invoicePdfUrl` is present, `meta.provider.ts` attaches a Document Header component.
- If `order.invoicePdfUrl` is null (e.g. PDF generation failed or pending) or in `test-whatsapp.ts`, NO header component is attached.
- In Meta WhatsApp Manager: If a template is configured with `Header: Document`, Meta rejects any call where `components` lacks the header document parameter. Conversely, if configured with `Header: None`, Meta rejects any call that passes a header component.

**Recommended Resolution:**
- Create `order_confirmation` in Meta WhatsApp Manager with **Header: Document (PDF)**.
- Ensure that in code, `sendOrderConfirmationWhatsapp` is only triggered after `invoicePdfUrl` has successfully generated and been saved to the database.

---

### CONFLICT 3: Template Language Code (`en` vs `en_US`)

**Conflict Found:**  
- [backend/src/integrations/whatsapp/templates.ts](file:///e:/Affor%20Technologies/Projects/Vaibhav%20Celebrations/Vaibhav%20Celebrations%20Website/backend/src/integrations/whatsapp/templates.ts#L11-L15) specifies `languageCode: "en"`.
- [meta.provider.ts (line 55)](file:///e:/Affor%20Technologies/Projects/Vaibhav%20Celebrations/Vaibhav%20Celebrations%20Website/backend/src/integrations/whatsapp/providers/meta.provider.ts#L55) sends `language: { code: input.languageCode ?? "en" }`.
- In Meta WhatsApp Manager, selecting "English" often defaults to "English (US)" (`en_US`).

**Recommended Resolution:**  
When creating templates in Meta WhatsApp Manager, select **English** (`en`) or **English (US)** (`en_US`). The code strictly transmits `"en"`. If Meta WhatsApp Manager forces `en_US`, Meta will reject requests with `Template does not exist in the specified language`. You must choose **English** (`en`) in Meta Manager.

---

### CONFLICT 4: `order_status_update` is Implemented in WhatsApp Service but Unwired in Order Service

**Conflict Found:**  
- [backend/src/integrations/whatsapp/templates.ts](file:///e:/Affor%20Technologies/Projects/Vaibhav%20Celebrations/Vaibhav%20Celebrations%20Website/backend/src/integrations/whatsapp/templates.ts#L121) defines `order_status_update` and [backend/src/modules/whatsapp/whatsapp.service.ts](file:///e:/Affor%20Technologies/Projects/Vaibhav%20Celebrations/Vaibhav%20Celebrations%20Website/backend/src/modules/whatsapp/whatsapp.service.ts#L244) provides `sendOrderStatusUpdateWhatsapp`.
- In [backend/src/modules/orders/orders.routes.ts (line 447)](file:///e:/Affor%20Technologies/Projects/Vaibhav%20Celebrations/Vaibhav%20Celebrations%20Website/backend/src/modules/orders/orders.routes.ts#L447):
  ```typescript
  return ok(res, await adminUpdateOrderStatus(param(req, "id"), req.body.status, req.body.trackingUrl));
  ```
- However, in [backend/src/modules/orders/orders.service.ts (lines 1756–1769)](file:///e:/Affor%20Technologies/Projects/Vaibhav%20Celebrations/Vaibhav%20Celebrations%20Website/backend/src/modules/orders/orders.service.ts#L1756-L1769), `adminUpdateOrderStatus` updates the database status but never invokes `sendOrderStatusUpdateWhatsapp`.

**Recommended Resolution:**  
Create the `order_status_update` template in Meta now so it is approved and ready. In a future task, wire `sendOrderStatusUpdateWhatsapp` inside `adminUpdateOrderStatus`.

---

## H. Meta WhatsApp Manager Template Creation Checklist

Create these templates in [Meta Business Suite → WhatsApp Manager → Message Templates](https://business.facebook.com/wa/manage/message-templates/):

---

### Checklist Item 1: `order_confirmation`

1. **Template Name:** `order_confirmation`
2. **Category:** `UTILITY`
3. **Language:** `English` (`en`)
4. **Header Configuration:**
   - Type: `Media` -> `Document`
   - Sample Document: Upload any standard sample PDF (e.g. sample invoice).
5. **Body Text:**
```text
Thank you for celebrating with us! Your order {{1}} has been confirmed.

Total Amount Paid: ₹{{2}}

Your official tax invoice is attached above. We are now preparing your order.
```
6. **Variables Count:** 2
7. **Sample Values:**
   - `{{1}}`: `VBC-2026-1001`
   - `{{2}}`: `2499.00`
8. **Footer:** None (`Leave blank`)
9. **Buttons:** None (`None`)

---

### Checklist Item 2: `invoice_delivery`

1. **Template Name:** `invoice_delivery`
2. **Category:** `UTILITY`
3. **Language:** `English` (`en`)
4. **Header Configuration:**
   - Type: `Media` -> `Document`
   - Sample Document: Upload any sample invoice PDF.
5. **Body Text:**
```text
Dear Customer, please find attached the tax invoice {{1}} for your order with Vaibhav Celebrations.

Total Amount: ₹{{2}}

Thank you for choosing Vaibhav Celebrations!
```
6. **Variables Count:** 2
7. **Sample Values:**
   - `{{1}}`: `INV-2026-0042`
   - `{{2}}`: `3500.00`
8. **Footer:** None (`Leave blank`)
9. **Buttons:** None (`None`)

---

### Checklist Item 3: `phone_verification`

1. **Template Name:** `phone_verification`
2. **Category:** `UTILITY`
3. **Language:** `English` (`en`)
4. **Header Configuration:** `None`
5. **Body Text:**
```text
Hello, please use the following link to verify your WhatsApp number with Vaibhav Celebrations: {{1}}

This link will expire in 30 minutes. If you did not request this, please ignore this message.
```
6. **Variables Count:** 1
7. **Sample Values:**
   - `{{1}}`: `https://vaibhavcelebrations.in/verify-phone?t=8b9c0d1e2f3a4b5c`
8. **Footer:** None (`Leave blank`)
9. **Buttons:** None (`None`)

---

### Checklist Item 4: `welcome_message`

1. **Template Name:** `welcome_message`
2. **Category:** `MARKETING`
3. **Language:** `English` (`en`)
4. **Header Configuration:** `None`
5. **Body Text:**
```text
Hello {{1}}, welcome to Vaibhav Celebrations!

We are delighted to have you with us. Explore our handcrafted celebration packages, decor themes, and gift registries to make your special moments unforgettable.
```
6. **Variables Count:** 1
7. **Sample Values:**
   - `{{1}}`: `Priya`
8. **Footer:** None (`Leave blank`)
9. **Buttons:** None (`None`)

---

### Checklist Item 5: `order_status_update`

1. **Template Name:** `order_status_update`
2. **Category:** `UTILITY`
3. **Language:** `English` (`en`)
4. **Header Configuration:** `None`
5. **Body Text:**
```text
Dear {{1}}, your order {{2}} is now {{3}}.

{{4}}

Thank you for choosing Vaibhav Celebrations.
```
6. **Variables Count:** 4
7. **Sample Values:**
   - `{{1}}`: `Priya`
   - `{{2}}`: `VBC-2026-1001`
   - `{{3}}`: `Shipped`
   - `{{4}}`: `Your order is on its way! Keep an eye out for the delivery. Track here: https://track.example.com/123`
8. **Footer:** None (`Leave blank`)
9. **Buttons:** None (`None`)

---

## J. WhatsApp Template Production Readiness

### Ready to Create in Meta
- **`invoice_delivery`**: Perfectly consistent. Code always supplies `[invoiceNumber, amountFormatted]` and attaches a public CDN invoice PDF.
- **`phone_verification`**: Perfectly consistent. Code passes single variable `[verifyUrl]`, no header, no buttons.
- **`welcome_message`**: Fully defined. 1 variable `[customerName]`, no header. Ready to create under `MARKETING`.
- **`order_status_update`**: Fully defined. 4 variables `[customerName, orderCode, statusLabel, statusMessage]`, no header.

### Requires Clarification / Decision
- **`order_confirmation` Variable Count**: Choose between:
  1. Standard 2-variable template (`orderCode`, `amountFormatted`), keeping guest credentials and registry setup inside the confirmation email.
  2. 3-variable template, which requires updating `templates.ts` to always pass a fallback string (e.g. `"Enjoy your celebration!"`) when there is no guest login URL or registry setup.

### Code / Template Mismatches
- **`order_confirmation` Document Header**: If `invoicePdfUrl` is null when `sendOrderConfirmationWhatsapp` runs, the Meta API call will fail if the Meta template requires a Document header.
- **`order_status_update` Trigger**: The template helper is defined in `whatsapp.service.ts`, but `adminUpdateOrderStatus` in `orders.service.ts` does not yet call it.
- **`welcome_message` Trigger**: Gated behind `WHATSAPP_WELCOME_ENABLED=false` and not yet called in customer registration.

### Missing Meta Configuration in Dashboard
- Configure Webhook URL in Meta App Dashboard: `https://api.vaibhavcelebrations.in/api/v1/whatsapp/webhook`
- Enter the verify token from `.env`: `CpQkNGLC6ie-eNiz2mv1XSEnknYuZg8mArgxgXLT_50`
- Subscribe to the **`messages`** webhook field.

### Potential Production Issues
1. **Language Code**: Meta Manager templates must be created in `English` with code `en`, not `en_US`.
2. **Cloudflare CDN Public Accessibility**: Invoice PDFs must resolve over public HTTPS on `https://cdn.vaibhavcelebrations.in`. If a PDF is inaccessible or hosted on localhost, Meta will fail to deliver the document header.
3. **Meta Message Quality & Template Approvals**: `welcome_message` must be submitted as `MARKETING`; submitting it as `UTILITY` may cause Meta to reject it.
