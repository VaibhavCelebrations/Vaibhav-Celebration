import fs from "fs/promises";
import path from "path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { storeMediaBuffer, cdnKeyFromPublicUrl } from "../media/storage";
import { LETTERHEAD_LAYOUT as L } from "./layout";

export type InvoicePdfInput = {
  invoiceNumber: string;
  orderCode?: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  lineItems: Array<{ label: string; amountInPaise: number }>;
  subtotalInPaise: number;
  shippingInPaise?: number;
  shippingWaived?: boolean;
  gstPercent?: number;
  gstInPaise: number;
  totalInPaise: number;
  issuedAt: Date;
  paymentStatus?: string;
  paymentMethod?: string;
};

function paiseToInr(paise: number) {
  return `INR ${(paise / 100).toFixed(2)}`;
}

function letterheadPath() {
  return path.resolve(process.cwd(), "assets/vc-letterhead.pdf");
}

async function loadLetterheadTemplate(): Promise<PDFDocument> {
  const bytes = await fs.readFile(letterheadPath());
  return PDFDocument.load(bytes);
}

export async function generateInvoicePdf(input: InvoicePdfInput): Promise<{ url: string; cdnKey: string }> {
  const buffer = await renderInvoicePdfBuffer(input);
  const stored = await storeMediaBuffer({
    buffer,
    originalName: `${input.invoiceNumber}.pdf`,
    mimeType: "application/pdf",
    kind: "invoices",
    scope: String(new Date().getFullYear()),
    role: input.invoiceNumber.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
  });
  return { url: stored.url, cdnKey: stored.cdnKey };
}

/** Fetch previously stored invoice PDF bytes for email attachment. */
export async function fetchInvoicePdfBuffer(pdfUrl: string | null | undefined): Promise<Buffer | null> {
  if (!pdfUrl?.trim()) return null;

  const key = cdnKeyFromPublicUrl(pdfUrl);
  if (key) {
    try {
      const localPath = path.resolve(process.cwd(), "uploads", key);
      return await fs.readFile(localPath);
    } catch {
      /* fall through to HTTP */
    }
  }

  try {
    const res = await fetch(pdfUrl);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

/** Render invoice PDF bytes (also used by tests). */
export async function renderInvoicePdfBuffer(input: InvoicePdfInput): Promise<Buffer> {
  const template = await loadLetterheadTemplate();
  const out = await PDFDocument.create();
  const font = await out.embedFont(StandardFonts.TimesRoman);
  const fontBold = await out.embedFont(StandardFonts.TimesRomanBold);
  const mocha = rgb(0.545, 0.271, 0.075);
  const ink = rgb(0.17, 0.09, 0.06);
  const muted = rgb(0.33, 0.27, 0.24);

  const shippingInPaise = input.shippingInPaise ?? 0;
  const shippingWaived = input.shippingWaived ?? shippingInPaise === 0;
  const gstPercent = input.gstPercent ?? 18;

  const pagesNeeded = Math.max(1, Math.ceil(input.lineItems.length / 18));
  for (let i = 0; i < pagesNeeded; i++) {
    const [copied] = await out.copyPages(template, [0]);
    out.addPage(copied);
  }

  const pages = out.getPages();
  const first = pages[0]!;
  let y = L.contentTop;

  const draw = (text: string, x: number, yy: number, size = 10, bold = false, color = ink) => {
    first.drawText(text, { x, y: yy, size, font: bold ? fontBold : font, color });
  };

  draw("TAX INVOICE", L.left, y, 14, true, mocha);
  y -= 22;
  draw(`Invoice: ${input.invoiceNumber}`, L.left, y, 11, true);
  if (input.orderCode) draw(`Order: ${input.orderCode}`, 320, y, 11);
  y -= L.lineGap;
  draw(`Date: ${input.issuedAt.toISOString().slice(0, 10)}`, L.left, y, 10, false, muted);
  draw(
    `Payment: ${input.paymentStatus ?? "PAID"} · ${input.paymentMethod ?? "Razorpay"}`,
    320,
    y,
    10,
    false,
    muted,
  );
  y -= 22;
  draw("Bill To", L.left, y, 10, true, mocha);
  y -= L.lineGap;
  draw(input.guestName, L.left, y, 12, true);
  y -= L.lineGap;
  draw(`${input.guestEmail}  ·  ${input.guestPhone}`, L.left, y, 9, false, muted);
  y -= 24;

  first.drawLine({
    start: { x: L.left, y },
    end: { x: L.right, y },
    thickness: 0.6,
    color: rgb(0.83, 0.77, 0.69),
  });
  y -= 18;
  draw("Description", L.left, y, 10, true, mocha);
  draw("Amount", L.right - 70, y, 10, true, mocha);
  y -= 14;

  let pageIndex = 0;
  let current = first;
  let rowY = y;

  const startContinuation = () => {
    pageIndex += 1;
    current = pages[pageIndex] ?? first;
    rowY = L.contentTop;
    current.drawText("TAX INVOICE (continued)", {
      x: L.left,
      y: rowY,
      size: 12,
      font: fontBold,
      color: mocha,
    });
    rowY -= 22;
  };

  for (const item of input.lineItems) {
    if (rowY < L.footerY + L.totalsReserve) {
      startContinuation();
    }
    const label = item.label.slice(0, 90);
    current.drawText(label, { x: L.left, y: rowY, size: 10, font, color: ink });
    current.drawText(paiseToInr(item.amountInPaise), {
      x: L.right - 90,
      y: rowY,
      size: 10,
      font,
      color: ink,
    });
    rowY -= L.tableRow;
  }

  if (rowY < L.footerY + L.totalsReserve) {
    startContinuation();
  }
  rowY -= 8;
  current.drawLine({
    start: { x: L.left, y: rowY },
    end: { x: L.right, y: rowY },
    thickness: 0.6,
    color: rgb(0.83, 0.77, 0.69),
  });
  rowY -= 20;
  current.drawText(`Subtotal: ${paiseToInr(input.subtotalInPaise)}`, {
    x: L.right - 200,
    y: rowY,
    size: 10,
    font,
    color: muted,
  });
  rowY -= 16;
  current.drawText(
    shippingWaived || shippingInPaise === 0
      ? "Shipping: FREE"
      : `Shipping: ${paiseToInr(shippingInPaise)}`,
    {
      x: L.right - 200,
      y: rowY,
      size: 10,
      font,
      color: muted,
    },
  );
  rowY -= 16;
  current.drawText(`GST (${gstPercent}%): ${paiseToInr(input.gstInPaise)}`, {
    x: L.right - 200,
    y: rowY,
    size: 10,
    font,
    color: muted,
  });
  rowY -= 20;
  current.drawText(`Total: ${paiseToInr(input.totalInPaise)}`, {
    x: L.right - 200,
    y: rowY,
    size: 13,
    font: fontBold,
    color: mocha,
  });
  current.drawText("This is a computer-generated invoice. For support write to support@vaibhavcelebrations.in.", {
    x: L.left,
    y: L.footerY,
    size: 8,
    font,
    color: muted,
  });

  return Buffer.from(await out.save());
}
