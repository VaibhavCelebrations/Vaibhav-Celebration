import nodemailer from "nodemailer";
import { env } from "../../config/env";
import { logger } from "../../lib/logger";

type MailPayload = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!env.SMTP_HOST || !env.EMAIL_FROM_ADDRESS) {
    return null;
  }
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT ?? 587,
    secure: env.SMTP_SECURE ?? false,
    auth: env.SMTP_USER
      ? {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        }
      : undefined,
  });
  return transporter;
}

export async function sendEmail(payload: MailPayload): Promise<{ sent: boolean; skipped?: boolean }> {
  const tx = getTransporter();
  if (!tx || !env.EMAIL_FROM_ADDRESS) {
    logger.warn({ to: payload.to, subject: payload.subject }, "Email skipped — SMTP not configured");
    return { sent: false, skipped: true };
  }

  await tx.sendMail({
    from: `"${env.EMAIL_FROM_NAME}" <${env.EMAIL_FROM_ADDRESS}>`,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
  });

  return { sent: true };
}

export function otpEmailHtml(otp: string, referenceCode: string) {
  return `
  <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;color:#2c1810;">
    <h1 style="font-size:22px;color:#8B4513;">Vaibhav Celebrations</h1>
    <p>Your verification code for <strong>${referenceCode}</strong> is:</p>
    <p style="font-size:32px;letter-spacing:6px;font-weight:bold;">${otp}</p>
    <p style="color:#666;font-size:13px;">This code expires in ${env.OTP_EXPIRES_MINUTES} minutes. If you did not request this, ignore this email.</p>
  </div>`;
}

export function bookingConfirmationHtml(input: {
  bookingCode: string;
  guestName: string;
  eventDate: string;
  themeTitle: string;
  packageTitle: string;
  totalInPaise: number;
}) {
  const total = (input.totalInPaise / 100).toFixed(2);
  return `
  <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#2c1810;">
    <h1 style="color:#8B4513;">Booking Confirmed</h1>
    <p>Dear ${input.guestName},</p>
    <p>Your celebration booking <strong>${input.bookingCode}</strong> is confirmed.</p>
    <ul>
      <li>Date: ${input.eventDate}</li>
      <li>Theme: ${input.themeTitle}</li>
      <li>Package: ${input.packageTitle}</li>
      <li>Total: ₹${total}</li>
    </ul>
    <p>We look forward to celebrating with you.</p>
  </div>`;
}

export function invoiceEmailHtml(input: {
  invoiceNumber: string;
  guestName: string;
  totalInPaise: number;
  pdfUrl?: string | null;
}) {
  const total = (input.totalInPaise / 100).toFixed(2);
  return `
  <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#2c1810;">
    <h1 style="color:#8B4513;">Invoice ${input.invoiceNumber}</h1>
    <p>Dear ${input.guestName},</p>
    <p>Thank you for choosing Vaibhav Celebrations. Your invoice total is <strong>₹${total}</strong>.</p>
    ${input.pdfUrl ? `<p><a href="${input.pdfUrl}">Download PDF invoice</a></p>` : ""}
  </div>`;
}

export function consultationAckHtml(name: string) {
  return `
  <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;color:#2c1810;">
    <h1 style="color:#8B4513;">Consultation received</h1>
    <p>Dear ${name},</p>
    <p>We've received your consultation request. Our team will reach out shortly.</p>
  </div>`;
}

// ─── Customer account emails ────────────────────────────────────────────────

export function welcomeEmailHtml(name: string) {
  return `
  <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;color:#2c1810;">
    <h1 style="color:#8B4513;">Welcome to Vaibhav Celebrations</h1>
    <p>Hi ${name},</p>
    <p>Your account has been created. You can now save favourites, track orders, and manage gift registries any time you're signed in.</p>
  </div>`;
}

export function verifyEmailHtml(name: string, verifyUrl: string) {
  return `
  <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;color:#2c1810;">
    <h1 style="color:#8B4513;">Verify your email</h1>
    <p>Hi ${name},</p>
    <p>Please confirm this is your email address by clicking the button below.</p>
    <p><a href="${verifyUrl}" style="display:inline-block;background:#8B4513;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">Verify email</a></p>
    <p style="color:#666;font-size:13px;">If the button doesn't work, copy this link: ${verifyUrl}</p>
  </div>`;
}

/** Reset link validity is enforced server-side by PASSWORD_RESET_TOKEN_TTL_MINUTES (default 10 min). */
export function passwordResetEmailHtml(name: string, resetUrl: string, ttlMinutes: number) {
  return `
  <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;color:#2c1810;">
    <h1 style="color:#8B4513;">Reset your password</h1>
    <p>Hi ${name},</p>
    <p>We received a request to reset your password. This link expires in <strong>${ttlMinutes} minutes</strong> and can only be used once.</p>
    <p><a href="${resetUrl}" style="display:inline-block;background:#8B4513;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">Reset password</a></p>
    <p style="color:#666;font-size:13px;">If you didn't request this, you can safely ignore this email — your password will not change.</p>
  </div>`;
}

export function passwordChangedEmailHtml(name: string) {
  return `
  <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;color:#2c1810;">
    <h1 style="color:#8B4513;">Your password was changed</h1>
    <p>Hi ${name},</p>
    <p>This is a confirmation that your password was just changed. All other active sessions have been signed out for your protection.</p>
    <p style="color:#666;font-size:13px;">If this wasn't you, contact us immediately.</p>
  </div>`;
}

export function orderConfirmationHtml(input: {
  name: string;
  orderCode: string;
  totalInPaise: number;
  items: Array<{ title: string; quantity: number }>;
}) {
  const total = (input.totalInPaise / 100).toFixed(2);
  return `
  <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#2c1810;">
    <h1 style="color:#8B4513;">Order Confirmed</h1>
    <p>Hi ${input.name},</p>
    <p>Your order <strong>${input.orderCode}</strong> has been confirmed.</p>
    <ul>
      ${input.items.map((i) => `<li>${i.title} × ${i.quantity}</li>`).join("")}
    </ul>
    <p>Total paid: <strong>₹${total}</strong></p>
    <p>You can track this order any time from your account's order history.</p>
  </div>`;
}
