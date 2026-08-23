import nodemailer from "nodemailer";
import { orderConfirmationHtml, invoiceEmailHtml } from "../src/integrations/email/mailer";
import { env } from "../src/config/env";

async function testEmail() {
  console.log("Starting email test...");
  
  if (!env.SMTP_HOST) {
    console.warn("SMTP_HOST is not configured in .env!");
    return;
  }

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: 465,
    secure: true,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });

  const orderCode = "VBC-OR-2026-000003";
  const name = "Shubham";
  const email = "shubhamdeshmukh3251@gmail.com";
  const totalAmount = 111756.62;
  const totalInPaise = Math.round(totalAmount * 100);
  const packageTitle = "Space Theme Celebration — Signature";
  
  const orderConfirmationContent = orderConfirmationHtml({
    name,
    orderCode,
    totalInPaise,
    items: [{ title: packageTitle, quantity: 1 }],
    customizationFollowUp: true,
  });

  const invoiceContent = invoiceEmailHtml({
    invoiceNumber: orderCode,
    guestName: name,
    totalInPaise,
  });

  try {
    console.log(`Sending Order Confirmation to ${email}...`);
    const orderResult = await transporter.sendMail({
      from: `"${env.EMAIL_FROM_NAME}" <${env.EMAIL_FROM_ADDRESS}>`,
      replyTo: env.EMAIL_REPLY_TO ?? env.EMAIL_FROM_ADDRESS,
      to: email,
      subject: `Order Confirmation - ${orderCode} - Vaibhav Celebrations`,
      html: orderConfirmationContent,
    });
    console.log("Order Confirmation Email Result:", orderResult.messageId);
  } catch (error) {
    console.error("Order Confirmation Error:", error);
  }

  try {
    console.log(`Sending Invoice to ${email}...`);
    const invoiceResult = await transporter.sendMail({
      from: `"${env.EMAIL_FROM_NAME}" <${env.EMAIL_FROM_ADDRESS}>`,
      replyTo: env.EMAIL_REPLY_TO ?? env.EMAIL_FROM_ADDRESS,
      to: email,
      subject: `Invoice for Order ${orderCode} - Vaibhav Celebrations`,
      html: invoiceContent,
    });
    console.log("Invoice Email Result:", invoiceResult.messageId);
  } catch (error) {
    console.error("Invoice Error:", error);
  }

  console.log("Email test completed.");
}

testEmail().catch(console.error);
