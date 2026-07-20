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
