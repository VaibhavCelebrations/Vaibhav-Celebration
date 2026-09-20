import { Resend } from "resend";
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

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;
let transporter: nodemailer.Transporter | null = null;

export function isEmailConfigured(): boolean {
  return Boolean(resend || (env.SMTP_HOST && env.EMAIL_FROM_ADDRESS && env.SMTP_USER && env.SMTP_PASS));
}

function getTransporter() {
  if (transporter) return transporter;
  if (!env.SMTP_HOST || !env.EMAIL_FROM_ADDRESS || !env.SMTP_USER || !env.SMTP_PASS) return null;
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
  if (!isEmailConfigured() || !env.EMAIL_FROM_ADDRESS) {
    logger.warn({ to: payload.to, subject: payload.subject }, "Email skipped — email provider not configured");
    return { channel: "email", sent: false, skipped: true, status: "SKIPPED" };
  }

  try {
    if (resend) {
      // Convert nodemailer attachments to resend format
      const resendAttachments = payload.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        path: a.path,
      }));

      const { error } = await resend.emails.send({
        from: `${env.EMAIL_FROM_NAME} <${env.EMAIL_FROM_ADDRESS}>`,
        replyTo: env.EMAIL_REPLY_TO ?? env.EMAIL_FROM_ADDRESS,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        attachments: resendAttachments,
      });
      
      if (error) {
        logger.error({ err: error, to: payload.to }, "Resend API returned an error");
        return {
          channel: "email",
          sent: false,
          status: "FAILED",
          error: error.message,
        };
      }
      return { channel: "email", sent: true, status: "SENT" };
    } else {
      // Fallback to SMTP
      const tx = getTransporter();
      if (!tx) throw new Error("SMTP not configured properly");
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
    }
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

function baseEmailLayout(contentHtml: string) {
  return `
  <div style="background-color:#fdfbf9;padding:40px 20px;font-family:system-ui,-apple-system,sans-serif;color:#2c1810;line-height:1.6;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(139,69,19,0.08);">
      <div style="text-align:center;padding:32px 20px;border-bottom:1px solid #f4ede8;background-color:#ffffff;">
        <img src="https://cdn.vaibhavcelebrations.in/logo-v2.png" alt="Vaibhav Celebrations" style="height:70px;width:auto;" />
      </div>
      <div style="padding:40px 32px;">
        ${contentHtml}
      </div>
      <div style="background-color:#faf7f5;padding:24px 32px;text-align:center;border-top:1px solid #f4ede8;">
        <p style="color:#888;font-size:12px;margin:0;">
          This is an automated system-generated email. Please do not reply directly to this address. <br/>
          Need help? Contact us at <a href="mailto:${env.EMAIL_FROM_ADDRESS ?? "support@vaibhavcelebrations.in"}" style="color:#8B4513;text-decoration:underline;">${env.EMAIL_FROM_ADDRESS ?? "support@vaibhavcelebrations.in"}</a>.
        </p>
        <p style="color:#b0a8a3;font-size:11px;margin-top:16px;">
          &copy; ${new Date().getFullYear()} Vaibhav Celebrations. All rights reserved.
        </p>
      </div>
    </div>
  </div>`;
}

export function otpEmailHtml(otp: string, referenceCode: string) {
  return baseEmailLayout(`
    <h1 style="font-size:20px;color:#8B4513;margin-top:0;font-family:Georgia,serif;">Sign in to Vaibhav Celebrations</h1>
    <p>Your secure verification code for request <strong>${referenceCode}</strong> is:</p>
    <div style="background:#f4ede8;padding:16px;text-align:center;border-radius:8px;margin:24px 0;">
      <span style="font-size:36px;letter-spacing:8px;font-weight:700;color:#2c1810;font-family:monospace;">${otp}</span>
    </div>
    <p style="font-size:13px;color:#666;">This code expires in ${env.OTP_EXPIRES_MINUTES} minutes. If you didn't request this code, you can safely ignore this email.</p>
  `);
}

export function invoiceEmailHtml(input: {
  invoiceNumber: string;
  guestName: string;
  totalInPaise: number;
}) {
  const total = (input.totalInPaise / 100).toFixed(2);
  return baseEmailLayout(`
    <h1 style="font-size:22px;color:#8B4513;margin-top:0;font-family:Georgia,serif;">Invoice ${input.invoiceNumber}</h1>
    <p>Dear ${input.guestName},</p>
    <p>Thank you for choosing Vaibhav Celebrations! Your total comes to <strong>₹${total}</strong>.</p>
    <p>For your records, we have attached your official tax invoice to this email as a PDF document.</p>
  `);
}

export function consultationAckHtml(name: string) {
  return baseEmailLayout(`
    <h1 style="font-size:22px;color:#8B4513;margin-top:0;font-family:Georgia,serif;">Consultation Request Received</h1>
    <p>Dear ${name},</p>
    <p>Thank you for reaching out! We've received your consultation request and our team is currently reviewing your details.</p>
    <p>One of our celebration experts will get back to you shortly to discuss your upcoming event.</p>
  `);
}

export function welcomeEmailHtml(name: string) {
  return baseEmailLayout(`
    <h1 style="font-size:22px;color:#8B4513;margin-top:0;font-family:Georgia,serif;">Welcome to Vaibhav Celebrations! 🎉</h1>
    <p>Hi ${name},</p>
    <p>We are absolutely thrilled to have you here. Your account has been successfully created.</p>
    <p>You can now save your favourite items, easily track your orders, and manage personalized gift registries anytime you sign in.</p>
    <p>Let's make every moment a celebration!</p>
  `);
}

export function guestWelcomeEmailHtml(name: string, generatedPassword: string) {
  const loginUrl = `${env.FRONTEND_URL}/login`;
  return baseEmailLayout(`
    <h1 style="font-size:22px;color:#8B4513;margin-top:0;font-family:Georgia,serif;">Welcome to Vaibhav Celebrations! 🎉</h1>
    <p>Hi ${name},</p>
    <p>Thank you for choosing to check out with us! We've automatically created a secure account for you so you can easily track your order and manage any personalized gift registries.</p>
    <div style="background-color:#fff7eb;border-left:4px solid #8B4513;padding:16px;margin:24px 0;border-radius:4px;">
      <p style="margin:0 0 12px 0;"><strong>Your Login Details:</strong></p>
      <p style="margin:0;font-family:monospace;font-size:16px;">Password: <strong>${generatedPassword}</strong></p>
    </div>
    <p>You can sign in anytime at <a href="${loginUrl}" style="color:#8B4513;text-decoration:underline;">${loginUrl}</a>. We recommend changing your password after your first login.</p>
    <p>Let's make every moment a celebration!</p>
  `);
}

export function verifyEmailHtml(name: string, verifyUrl: string) {
  return baseEmailLayout(`
    <h1 style="font-size:22px;color:#8B4513;margin-top:0;font-family:Georgia,serif;">Verify your email address</h1>
    <p>Hi ${name},</p>
    <p>Welcome! Before we get started, please confirm that this is your email address by clicking the button below.</p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${verifyUrl}" style="display:inline-block;background-color:#8B4513;color:#ffffff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">Verify Email Address</a>
    </div>
    <p style="font-size:13px;color:#888;">If the button doesn't work, copy and paste this link into your browser:<br/>
    <a href="${verifyUrl}" style="color:#8B4513;word-break:break-all;">${verifyUrl}</a></p>
  `);
}

/** Reset link validity is enforced server-side by PASSWORD_RESET_TOKEN_TTL_MINUTES (default 10 min). */
export function passwordResetEmailHtml(name: string, resetUrl: string, ttlMinutes: number) {
  return baseEmailLayout(`
    <h1 style="font-size:22px;color:#8B4513;margin-top:0;font-family:Georgia,serif;">Reset your password</h1>
    <p>Hi ${name},</p>
    <p>We received a request to reset the password for your account. This link expires in <strong>${ttlMinutes} minutes</strong> and can only be used once.</p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${resetUrl}" style="display:inline-block;background-color:#8B4513;color:#ffffff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">Reset Password</a>
    </div>
    <p style="font-size:13px;color:#888;">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
  `);
}

export function passwordChangedEmailHtml(name: string) {
  return baseEmailLayout(`
    <h1 style="font-size:22px;color:#8B4513;margin-top:0;font-family:Georgia,serif;">Password Changed</h1>
    <p>Hi ${name},</p>
    <p>This is a confirmation that the password for your Vaibhav Celebrations account was just changed.</p>
    <p>For your security, we have signed you out of all other active sessions.</p>
    <p style="font-size:13px;color:#888;margin-top:24px;">If you did not make this change, please contact us immediately to secure your account.</p>
  `);
}

export function orderConfirmationHtml(input: {
  name: string;
  orderCode: string;
  totalInPaise: number;
  items: Array<{ title: string; quantity: number }>;
  invoiceNumber?: string | null;
  customizationFollowUp?: boolean;
  includeGiftRegistrySetup?: boolean;
  /** Present only for guest checkouts — the auto-generated password for the new account. */
  guestPassword?: string;
  /** The email address used to create the guest account (same as contactEmail). */
  guestEmail?: string;
  guestLoginUrl?: string;
  guestPasswordResetUrl?: string;
}) {
  const total = (input.totalInPaise / 100).toFixed(2);
  const itemsHtml = input.items
    .map(
      (i) =>
        `<tr>
          <td style="padding:12px 0;border-bottom:1px solid #f4ede8;">${i.title}</td>
          <td style="padding:12px 0;border-bottom:1px solid #f4ede8;text-align:right;"><strong>× ${i.quantity}</strong></td>
        </tr>`,
    )
    .join("");

  const guestCredentialsHtml = input.guestPassword
    ? `
    <div style="background-color:#fef9f0;border:2px solid #8B4513;border-radius:8px;padding:20px;margin:28px 0;">
      <h3 style="margin:0 0 12px 0;color:#8B4513;font-family:Georgia,serif;font-size:18px;">🔐 Your Account Has Been Created</h3>
      <p style="margin:0 0 12px 0;color:#444;font-size:14px;">
        We've automatically created a Vaibhav Celebrations account so you can track your order, manage returns, and set up your Gift Registry.
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:16px;">
        <tr>
          <td style="padding:8px 0;color:#888;font-weight:600;width:40%;">Login Email</td>
          <td style="padding:8px 0;font-family:monospace;font-size:15px;color:#2c1810;">${input.guestEmail ?? ""}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#888;font-weight:600;">Temporary Password</td>
          <td style="padding:8px 0;font-family:monospace;font-size:16px;font-weight:700;color:#8B4513;letter-spacing:1px;">${input.guestPassword}</td>
        </tr>
      </table>
      <div style="background-color:#fff7eb;border-radius:6px;padding:12px;margin-bottom:16px;">
        <p style="margin:0;font-size:13px;color:#92400e;">
          <strong>Steps to secure your account:</strong><br/>
          1. Visit <a href="${input.guestLoginUrl}" style="color:#8B4513;">${input.guestLoginUrl}</a> and sign in with the credentials above.<br/>
          2. Go to <strong>Account → Security</strong> and change your password to something only you know.<br/>
          3. From your dashboard you can track this order, view invoices, and manage your Gift Registry.
        </p>
      </div>
      <p style="margin:0;font-size:12px;color:#aaa;">
        Forgot your password later? Use the
        <a href="${input.guestPasswordResetUrl}" style="color:#8B4513;text-decoration:underline;">Forgot Password</a>
        link to reset it via email.
      </p>
    </div>`
    : "";

  const registrySetupHtml = input.includeGiftRegistrySetup
    ? `
    <div style="background-color:#eef2ff;border-left:4px solid #4f46e5;padding:16px;margin:24px 0;border-radius:4px;">
      <h3 style="margin:0 0 10px 0;color:#3730a3;font-size:16px;">🎁 Gift Registry Included in Your Package</h3>
      <p style="margin:0 0 8px 0;color:#312e81;font-size:14px;">
        Your package includes a <strong>Gift Registry</strong> — a beautiful digital wishlist you can share with family and friends so they can gift exactly what your child loves.
      </p>
      <p style="margin:0 0 8px 0;font-size:14px;color:#312e81;">
        <strong>To set it up:</strong><br/>
        1. Log in to your account at <a href="${input.guestLoginUrl ?? `${env.FRONTEND_URL}/login`}" style="color:#4f46e5;">${env.FRONTEND_URL}/login</a><br/>
        2. Go to <strong>Account → Gift Registry</strong><br/>
        3. Complete your registry profile and share the link with guests
      </p>
      <p style="margin:0;font-size:12px;color:#6366f1;">There is no time pressure — your registry stays active for you to set up whenever you're ready.</p>
    </div>`
    : "";

  return baseEmailLayout(`
    <h1 style="font-size:24px;color:#8B4513;margin-top:0;font-family:Georgia,serif;">Order Confirmed! 🎊</h1>
    <p>Hi ${input.name},</p>
    <p>Thank you for your purchase! We've received your order <strong>${input.orderCode}</strong> and payment of <strong>₹${total}</strong>.</p>
    
    <div style="margin:32px 0;">
      <h3 style="font-size:14px;text-transform:uppercase;color:#888;letter-spacing:1px;margin-bottom:16px;">Order Summary</h3>
      <table style="width:100%;border-collapse:collapse;font-size:15px;">
        ${itemsHtml}
      </table>
    </div>

    ${guestCredentialsHtml}
    ${registrySetupHtml}

    ${input.customizationFollowUp ? `<div style="background-color:#fff7eb;border-left:4px solid #f59e0b;padding:16px;margin:24px 0;border-radius:4px;"><p style="margin:0;color:#92400e;"><strong>Personalization Required:</strong> This order includes custom items. Our team will contact you shortly to confirm details before we start production.</p></div>` : ""}
    ${input.invoiceNumber ? `<p>Your official tax invoice (<strong>${input.invoiceNumber}</strong>) is attached to this email as a PDF.</p>` : ""}
    <p style="margin-top:24px;">You can track the status of this order anytime from your account dashboard.</p>
  `);
}
