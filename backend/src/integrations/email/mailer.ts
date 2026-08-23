import nodemailer from "nodemailer";
import { env } from "../../config/env";
import { logger } from "../../lib/logger";
import type { NotificationResult } from "../notifications/types";

type MailPayload = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    contentType?: string;
    /** Prefer Buffer content for CDN-hosted PDFs; path is for local files only. */
    content?: Buffer;
    path?: string;
  }>;
};

let transporter: nodemailer.Transporter | null = null;

export function isSmtpConfigured(): boolean {
  return Boolean(env.SMTP_HOST && env.EMAIL_FROM_ADDRESS && env.SMTP_USER && env.SMTP_PASS);
}

function getTransporter() {
  if (transporter) return transporter;
  if (!isSmtpConfigured()) return null;
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT ?? 587,
    secure: env.SMTP_SECURE ?? false,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
  return transporter;
}

export async function sendEmail(payload: MailPayload): Promise<NotificationResult> {
  const tx = getTransporter();
  if (!tx || !env.EMAIL_FROM_ADDRESS) {
    logger.warn({ to: payload.to, subject: payload.subject }, "Email skipped — SMTP not configured");
    return { channel: "email", sent: false, skipped: true, status: "SKIPPED" };
  }

  try {
    await tx.sendMail({
      from: `"${env.EMAIL_FROM_NAME}" <${env.EMAIL_FROM_ADDRESS}>`,
      replyTo: env.EMAIL_REPLY_TO ?? env.EMAIL_FROM_ADDRESS,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      attachments: payload.attachments,
    });
    return { channel: "email", sent: true, status: "SENT" };
  } catch (error) {
    logger.error({ err: error, to: payload.to }, "Failed to send email");
    return {
      channel: "email",
      sent: false,
      status: "FAILED",
      error: error instanceof Error ? error.message : "send_failed",
    };
  }
}

export function otpEmailHtml(otp: string, referenceCode: string) {
  return `
  <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;color:#2c1810;">
    <h1 style="font-size:22px;color:#8B4513;">Vaibhav Celebrations</h1>
    <p>Your verification code for <strong>${referenceCode}</strong> is:</p>
    <p style="font-size:32px;letter-spacing:6px;font-weight:bold;">${otp}</p>
    <p style="color:#666;font-size:13px;">This code expires in ${env.OTP_EXPIRES_MINUTES} minutes. If you did not request this, ignore this email.</p>
    <p style="color:#666;font-size:12px;">Questions? Reply to this email or write to ${env.EMAIL_FROM_ADDRESS ?? "support@vaibhavcelebrations.in"}.</p>
  </div>`;
}

export function invoiceEmailHtml(input: {
  invoiceNumber: string;
  guestName: string;
  totalInPaise: number;
}) {
  const total = (input.totalInPaise / 100).toFixed(2);
  return `
  <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#2c1810;">
    <h1 style="color:#8B4513;">Invoice ${input.invoiceNumber}</h1>
    <p>Dear ${input.guestName},</p>
    <p>Thank you for choosing Vaibhav Celebrations. Your invoice total is <strong>₹${total}</strong>.</p>
    <p>Your tax invoice is attached to this email as a PDF.</p>
    <p style="color:#666;font-size:13px;">Questions? Reply to this email — we read every message at support@vaibhavcelebrations.in.</p>
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
    <p style="color:#666;font-size:13px;">If this wasn't you, contact us immediately at support@vaibhavcelebrations.in.</p>
  </div>`;
}

export function orderConfirmationHtml(input: {
  name: string;
  orderCode: string;
  totalInPaise: number;
  items: Array<{ title: string; quantity: number }>;
  invoiceNumber?: string | null;
  customizationFollowUp?: boolean;
}) {
  const total = (input.totalInPaise / 100).toFixed(2);
  return `
  <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#2c1810;">
    <h1 style="color:#8B4513;">Order Confirmed</h1>
    <p>Hi ${input.name},</p>
    <p>Your order <strong>${input.orderCode}</strong> has been confirmed. Payment of <strong>₹${total}</strong> was received.</p>
    <ul>
      ${input.items.map((i) => `<li>${i.title} × ${i.quantity}</li>`).join("")}
    </ul>
    ${input.invoiceNumber ? `<p>Your tax invoice <strong>${input.invoiceNumber}</strong> is attached as a PDF.</p>` : ""}
    ${input.customizationFollowUp ? `<p>This order includes personalization. Our team will contact you shortly to confirm the details before production.</p>` : ""}
    <p>You can track this order any time from your account's order history.</p>
    <p style="color:#666;font-size:13px;">Questions? Reply to this email or WhatsApp us.</p>
  </div>`;
}
