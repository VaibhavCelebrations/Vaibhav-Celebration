"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = sendEmail;
exports.otpEmailHtml = otpEmailHtml;
exports.bookingConfirmationHtml = bookingConfirmationHtml;
exports.invoiceEmailHtml = invoiceEmailHtml;
exports.consultationAckHtml = consultationAckHtml;
const nodemailer_1 = __importDefault(require("nodemailer"));
const env_1 = require("../../config/env");
const logger_1 = require("../../lib/logger");
let transporter = null;
function getTransporter() {
    if (transporter)
        return transporter;
    if (!env_1.env.SMTP_HOST || !env_1.env.EMAIL_FROM_ADDRESS) {
        return null;
    }
    transporter = nodemailer_1.default.createTransport({
        host: env_1.env.SMTP_HOST,
        port: env_1.env.SMTP_PORT ?? 587,
        secure: env_1.env.SMTP_SECURE ?? false,
        auth: env_1.env.SMTP_USER
            ? {
                user: env_1.env.SMTP_USER,
                pass: env_1.env.SMTP_PASS,
            }
            : undefined,
    });
    return transporter;
}
async function sendEmail(payload) {
    const tx = getTransporter();
    if (!tx || !env_1.env.EMAIL_FROM_ADDRESS) {
        logger_1.logger.warn({ to: payload.to, subject: payload.subject }, "Email skipped — SMTP not configured");
        return { sent: false, skipped: true };
    }
    await tx.sendMail({
        from: `"${env_1.env.EMAIL_FROM_NAME}" <${env_1.env.EMAIL_FROM_ADDRESS}>`,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
    });
    return { sent: true };
}
function otpEmailHtml(otp, referenceCode) {
    return `
  <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;color:#2c1810;">
    <h1 style="font-size:22px;color:#8B4513;">Vaibhav Celebrations</h1>
    <p>Your verification code for <strong>${referenceCode}</strong> is:</p>
    <p style="font-size:32px;letter-spacing:6px;font-weight:bold;">${otp}</p>
    <p style="color:#666;font-size:13px;">This code expires in ${env_1.env.OTP_EXPIRES_MINUTES} minutes. If you did not request this, ignore this email.</p>
  </div>`;
}
function bookingConfirmationHtml(input) {
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
function invoiceEmailHtml(input) {
    const total = (input.totalInPaise / 100).toFixed(2);
    return `
  <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;color:#2c1810;">
    <h1 style="color:#8B4513;">Invoice ${input.invoiceNumber}</h1>
    <p>Dear ${input.guestName},</p>
    <p>Thank you for choosing Vaibhav Celebrations. Your invoice total is <strong>₹${total}</strong>.</p>
    ${input.pdfUrl ? `<p><a href="${input.pdfUrl}">Download PDF invoice</a></p>` : ""}
  </div>`;
}
function consultationAckHtml(name) {
    return `
  <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;color:#2c1810;">
    <h1 style="color:#8B4513;">Consultation received</h1>
    <p>Dear ${name},</p>
    <p>We've received your consultation request. Our team will reach out shortly.</p>
  </div>`;
}
//# sourceMappingURL=mailer.js.map