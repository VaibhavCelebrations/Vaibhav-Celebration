import { sendEmail, welcomeEmailHtml, verifyEmailHtml, invoiceEmailHtml, orderConfirmationHtml, otpEmailHtml } from "../src/integrations/email/mailer";
import { logger } from "../src/lib/logger";

const targetEmail = "shubhamdeshmukh3251@gmail.com";

async function testAllEmails() {
  logger.info("Starting email tests...");

  // 1. Welcome Email
  logger.info("Sending Welcome Email...");
  await sendEmail({
    to: targetEmail,
    subject: "Welcome to Vaibhav Celebrations",
    html: welcomeEmailHtml("Shubham"),
  });

  // 2. Verify Email
  logger.info("Sending Verify Email...");
  await sendEmail({
    to: targetEmail,
    subject: "Verify your email",
    html: verifyEmailHtml("Shubham", "http://localhost:3000/verify?token=test-token-123"),
  });

  // 3. OTP Email
  logger.info("Sending OTP Email...");
  await sendEmail({
    to: targetEmail,
    subject: "Your OTP for Login",
    html: otpEmailHtml("123456", "REF-789"),
  });

  // 4. Invoice Email
  logger.info("Sending Invoice Email...");
  await sendEmail({
    to: targetEmail,
    subject: "Invoice INV-001 — Vaibhav Celebrations",
    html: invoiceEmailHtml({
      invoiceNumber: "INV-001",
      guestName: "Shubham",
      totalInPaise: 450000,
    }),
  });

  // 5. Order Confirmation Email
  logger.info("Sending Order Confirmation Email...");
  await sendEmail({
    to: targetEmail,
    subject: "Order Confirmed — ORD-999",
    html: orderConfirmationHtml({
      name: "Shubham",
      orderCode: "ORD-999",
      totalInPaise: 450000,
      items: [
        { title: "Premium Theme Package", quantity: 1 },
        { title: "Personalized Gift Box", quantity: 2 },
      ],
      invoiceNumber: "INV-001",
    }),
  });

  logger.info("All test emails dispatched successfully!");
}

testAllEmails().catch(console.error);
