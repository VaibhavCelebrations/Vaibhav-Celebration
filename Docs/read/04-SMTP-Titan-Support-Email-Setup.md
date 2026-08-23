# SMTP Email Setup — Titan Mail (`support@vaibhavcelebrations.in`)

**Audience:** Whoever owns the Vaibhav Celebrations Titan mailbox  
**Used by:** Order confirmation emails, invoice PDF emails, guest OTP, password reset, email verification  
**Backend env file:** `backend/.env`  
**Do not commit the mailbox password.**

This guide configures Nodemailer so the backend sends transactional mail from **`support@vaibhavcelebrations.in`** on Titan Mail (GoDaddy domain).

---

## 1. Mailbox

1. Confirm the mailbox **`support@vaibhavcelebrations.in`** exists in Titan / GoDaddy.
2. Sign in once at [https://app.titan.email](https://app.titan.email) and finish first-login if prompted.
3. Keep the mailbox password in a password manager. Use that password as `SMTP_PASS` (Titan does not use Gmail App Passwords).

Official Titan SMTP: [Titan email client settings](https://support.titan.email/hc/en-us/articles/360057466313)

---

## 2. Put values in `backend/.env`

```env
SMTP_HOST=smtp.titan.email
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=support@vaibhavcelebrations.in
SMTP_PASS=your_titan_mailbox_password
EMAIL_FROM_NAME=Vaibhav Celebrations
EMAIL_FROM_ADDRESS=support@vaibhavcelebrations.in
EMAIL_REPLY_TO=support@vaibhavcelebrations.in
```

| Variable | Value |
|---|---|
| `SMTP_HOST` | `smtp.titan.email` |
| `SMTP_PORT` | `587` (STARTTLS) |
| `SMTP_SECURE` | `false` for port 587 |
| `SMTP_USER` | Full mailbox address |
| `SMTP_PASS` | Titan mailbox password |
| `EMAIL_FROM_ADDRESS` | Must match the Titan mailbox |
| `EMAIL_REPLY_TO` | Same support inbox (optional; defaults to From) |

### Alternate: port 465 (SSL)

```env
SMTP_PORT=465
SMTP_SECURE=true
```

Restart the backend after saving `.env`.

---

## 3. What the code does

File: `backend/src/integrations/email/mailer.ts`

- If SMTP is incomplete → emails are **skipped** (`status: SKIPPED`, logged)
- Paid shop / package / registry Orders send **one confirmation** and **one invoice** email (idempotent via `Order.emailSendStatus`)
- Admin → Invoices → **Resend** uses the same transporter

---

## 4. Verification checklist

1. Restart backend after editing `.env`
2. Place a **test Razorpay payment** (Test Mode) for a shop or package order
3. Confirm order becomes `PAID` and `emailSendStatus` is `SENT` (or `SKIPPED` if SMTP still unset)
4. Check Sent in Titan and the customer inbox
5. Or Admin → Invoices → **Resend**

---

## 5. Common failures

| Symptom | Fix |
|---|---|
| Auth failed | Wrong mailbox password; confirm login at app.titan.email |
| Emails skipped in logs | `SMTP_HOST` / `EMAIL_FROM_ADDRESS` / `SMTP_USER` / `SMTP_PASS` incomplete |
| Mail goes to spam | Add SPF/DKIM/DMARC for `vaibhavcelebrations.in` in DNS |
| From rejected | `EMAIL_FROM_ADDRESS` must be the Titan mailbox, not Gmail |

---

## 6. Related docs

- Razorpay: `Docs/read/01-Razorpay-Payment-Setup.md`
- WhatsApp: `Docs/read/02-Meta-WhatsApp-Cloud-API-Setup.md`
- Checkout UAT: `Docs/read/05-Checkout-Communications-UAT.md`
