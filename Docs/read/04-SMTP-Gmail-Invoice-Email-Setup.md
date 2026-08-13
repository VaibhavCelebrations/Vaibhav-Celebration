# SMTP Email Setup — Gmail (`vaibhavcelebration@gmail.com`)

**Audience:** Whoever owns the Vaibhav Celebrations Gmail inbox  
**Used by:** Order confirmation emails, invoice PDF emails, password reset, email verification  
**Backend env file:** `backend/.env`  
**Do not commit real passwords or App Passwords.**

This guide configures Nodemailer so the backend can send invoices and transactional mail from **`vaibhavcelebration@gmail.com`**.

---

## 1. Why Gmail needs an App Password

Google blocks normal account passwords for SMTP apps. You must:

1. Turn on **2-Step Verification** on the Gmail account
2. Create a 16-character **App Password**
3. Put that App Password in `SMTP_PASS` (not the normal Gmail login password)

Official Google help: [Sign in with app passwords](https://support.google.com/accounts/answer/185833)

---

## 2. Step-by-step — create credentials

### 2.1 Sign in

Use: **https://myaccount.google.com** as `vaibhavcelebration@gmail.com`.

### 2.2 Enable 2-Step Verification

1. Google Account → **Security**
2. Under “How you sign in to Google” → **2-Step Verification** → turn **On**
3. Complete phone / authenticator setup

App Passwords only appear after 2-Step Verification is on.

### 2.3 Create an App Password

1. Google Account → **Security** → **2-Step Verification**
2. Scroll to **App passwords** (or open [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords))
3. App name: `Vaibhav Celebrations Backend`
4. Click **Create**
5. Copy the **16-character password** (spaces optional; either works)

Store it in a password manager. Google shows it **once**.

---

## 3. Put values in `backend/.env`

```env
# --- Email / SMTP (Gmail) ---
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=vaibhavcelebration@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx
EMAIL_FROM_NAME=Vaibhav Celebrations
EMAIL_FROM_ADDRESS=vaibhavcelebration@gmail.com
```

| Variable | Value |
|---|---|
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` (STARTTLS) — preferred |
| `SMTP_SECURE` | `false` for port 587 |
| `SMTP_USER` | Full Gmail address |
| `SMTP_PASS` | App Password only |
| `EMAIL_FROM_NAME` | Display name customers see |
| `EMAIL_FROM_ADDRESS` | Must be the same Gmail (or an alias on that account) |

### Alternate: port 465 (SSL)

```env
SMTP_PORT=465
SMTP_SECURE=true
```

Restart the backend after saving `.env`.

---

## 4. What the code does with these vars

File: `backend/src/integrations/email/mailer.ts`

- If `SMTP_HOST` or `EMAIL_FROM_ADDRESS` is missing → emails are **skipped** (logged: `Email skipped — SMTP not configured`)
- On paid shop / package / registry orders → confirmation + invoice HTML (PDF link when generated)
- Admin → Invoices → **Resend** uses the same transporter

Current local status before you finish this setup: SMTP still looks like placeholders (`smtp.example.com`). Fill the Gmail values above before expecting invoice mail.

---

## 5. Quick verification checklist

1. Restart backend after editing `.env`
2. Place a **test Razorpay payment** (Test Mode) for a shop or package order
3. Confirm order becomes `PAID`
4. Check `vaibhavcelebration@gmail.com` Sent folder and the customer inbox
5. Or in Admin → Invoices → open invoice → **Resend**

### Optional Node smoke test (on the server)

```js
// run from backend/ after dotenv is loaded by the app, or paste env first
const nodemailer = require("nodemailer");
const tx = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: { user: "vaibhavcelebration@gmail.com", pass: "YOUR_APP_PASSWORD" },
});
tx.sendMail({
  from: '"Vaibhav Celebrations" <vaibhavcelebration@gmail.com>',
  to: "vaibhavcelebration@gmail.com",
  subject: "SMTP test — Vaibhav Celebrations",
  text: "If you received this, SMTP works.",
}).then(console.log).catch(console.error);
```

---

## 6. Common failures

| Symptom | Fix |
|---|---|
| `Invalid login` / `BadCredentials` | Using normal Gmail password — switch to **App Password** |
| App passwords menu missing | Enable **2-Step Verification** first |
| Emails skipped in logs | `SMTP_HOST` / `EMAIL_FROM_ADDRESS` still unset or placeholder |
| Mail goes to spam | Keep From = real Gmail; later move to Google Workspace / custom domain SPF |
| `Less secure app` errors | Ignore outdated guides — use App Passwords only |

---

## 7. Production recommendations

- Prefer a **Google Workspace** mailbox on `@vaibhavcelebrations.in` with SPF/DKIM/DMARC when going live
- Until then, Gmail App Password on `vaibhavcelebration@gmail.com` is fine for UAT and early live
- Never put `SMTP_PASS` in frontend env or commit it to git
- Rotate the App Password if it was shared in chat

---

## 8. Related docs

- Razorpay keys + webhook: `Docs/read/01-Razorpay-Payment-Setup.md`
- WhatsApp: `Docs/read/02-Twilio-WhatsApp-Setup.md`
