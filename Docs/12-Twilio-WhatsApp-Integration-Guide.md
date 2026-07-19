# 12 — Twilio WhatsApp Integration Guide

**Project:** Vaibhav Celebrations
**Purpose:** Client guide for setting up Twilio to enable WhatsApp automated messaging.

---

## 1. Why Do We Need Twilio?

To automatically send invoices, gift registry links, and passwords via WhatsApp to your customers, we need to integrate your platform's backend with the **WhatsApp Business API**. 

**Twilio** acts as the official bridge (Business Solution Provider) between our backend system and WhatsApp/Meta. It allows our system to programmatically send template messages securely.

## 2. Prerequisites Before Starting

Before you begin the registration process on Twilio, please ensure you have the following ready:

1. **A Dedicated Phone Number:** You need a phone number that is **not currently registered** with any WhatsApp or WhatsApp Business mobile app. (If you prefer, you can purchase a new virtual number directly within Twilio during setup).
2. **Meta Business Manager Account:** You must have Admin access to your company's Facebook/Meta Business Manager account.
3. **Business Verification Documents:** Meta requires you to verify your business. Have documents like your GST certificate, Certificate of Incorporation, or utility bills matching your legal business name and address ready.
4. **Credit Card:** For adding billing details to your Twilio account to upgrade it from a trial to a paid account.

## 3. Step-by-Step Registration Process

### Step 1: Create a Twilio Account
1. Go to [Twilio's Website](https://www.twilio.com/) and sign up for a free account.
2. Verify your email address and personal phone number (used for account security, not for the WhatsApp API).
3. Once logged in, you will be in the **Twilio Console**.

### Step 2: Upgrade Your Account
By default, new Twilio accounts are in "Trial" mode, which restricts sending messages to unverified numbers.
1. In the Twilio Console, click **Upgrade** at the top of the screen.
2. Provide your billing address and add a credit card.
3. Add an initial fund balance (e.g., $20) to activate the account.

### Step 3: Get a Twilio Phone Number
If you don't have a dedicated number, you can buy one from Twilio.
1. Go to **Phone Numbers > Manage > Buy a number**.
2. Search for a number in your preferred country/region (e.g., India).
3. Ensure the number has **SMS** capabilities (this is required for WhatsApp as well).
4. Purchase the number.

### Step 4: Submit Your WhatsApp Sender Request
1. In the Twilio Console, navigate to **Messaging > Senders > WhatsApp Senders**.
2. Click on **New WhatsApp Sender**.
3. Accept the Terms of Service.
4. You will be prompted to connect your Meta Business Manager account.
5. A pop-up will appear (Embedded Signup flow). Log in with your Facebook account that has Admin access to your Meta Business Manager.
6. Follow the prompts to:
   - Select or create a Meta Business Account.
   - Create a WhatsApp Business Account (WABA).
   - Create a WhatsApp Business Profile (Set your display name, category, and business description).
   - Verify the phone number you purchased in Step 3 (Twilio will automatically route the SMS/voice OTP to verify the number).

### Step 5: Meta Business Verification
To unlock full messaging limits and become an official business on WhatsApp, Meta requires business verification.
1. Go to the [Meta Business Settings](https://business.facebook.com/settings).
2. Navigate to **Security Center** and click **Start Verification**.
3. Upload the required legal documents (e.g., GST certificate) and submit.
4. Verification typically takes 1-3 business days.

## 4. Information Required by the Development Team

Once your Twilio account is upgraded and the WhatsApp Sender is approved, we need three pieces of information to connect it to the backend system.

**Where to find them:**
Go to the Twilio Console homepage (Dashboard). Scroll down to the **Account Info** section.

Please securely share the following with us:

1. **Account SID:** (Starts with "AC...")
2. **Auth Token:** (Click the 'copy' or 'view' button to reveal it)
3. **WhatsApp Sender Phone Number:** The verified phone number from Step 4. (Formatted as `whatsapp:+91XXXXXXXXXX`).

> [!CAUTION]
> **Security Warning:** Your **Account SID** and **Auth Token** give full control over your Twilio account and billing. Please share them securely (e.g., via a secure password sharing tool or a 1-time view link) and do not post them in public chats.

---

## 5. Next Steps
Once you provide the credentials, the development team will:
1. Integrate the credentials into the backend environment variables securely.
2. Create and submit the required WhatsApp Message Templates for approval (e.g., Invoice template, Gift Registry Password template).
3. Test the automated messaging flow before going live.
