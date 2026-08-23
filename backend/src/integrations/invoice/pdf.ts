import fs from "fs/promises";
import path from "path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
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

const ink = rgb(0, 0, 0);

function paiseToInr(paise: number) {
  return `INR ${(paise / 100).toFixed(2)}`;
}

function templatePngPath() {
  return path.resolve(process.cwd(), "assets/invoice-template-bw-vc.png");
}

function fitText(font: PDFFont, text: string, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 1 && font.widthOfTextAtSize(`${truncated}…`, size) > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return `${truncated}…`;
}

function drawRight(
  page: PDFPage,
  font: PDFFont,
  text: string,
  rightX: number,
  y: number,
  size: number,
  boldFont?: PDFFont,
) {
  const f = boldFont ?? font;
  const width = f.widthOfTextAtSize(text, size);
  page.drawText(text, { x: rightX - width, y, size, font: f, color: ink });
}

async function loadTemplateBytes(): Promise<Buffer> {
  return fs.readFile(templatePngPath());
}

async function addBackgroundPage(out: PDFDocument, pngBytes: Buffer): Promise<PDFPage> {
  const png = await out.embedPng(pngBytes);
  const page = out.addPage([L.pageWidth, L.pageHeight]);
  page.drawImage(png, {
    x: 0,
    y: 0,
    width: L.pageWidth,
    height: L.pageHeight,
  });
  return page;
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
  const pngBytes = await loadTemplateBytes();
  const out = await PDFDocument.create();
  const font = await out.embedFont(StandardFonts.Helvetica);
  const fontBold = await out.embedFont(StandardFonts.HelveticaBold);

  const shippingInPaise = input.shippingInPaise ?? 0;
  const shippingWaived = input.shippingWaived ?? shippingInPaise === 0;
  const gstPercent = input.gstPercent ?? 18;

  const displayLines = [...input.lineItems];
  if (shippingWaived) {
    displayLines.push({ label: "Shipping — Free delivery", amountInPaise: 0 });
  } else if (shippingInPaise > 0) {
    displayLines.push({ label: "Shipping", amountInPaise: shippingInPaise });
  }

  const firstPageCapacity = L.table.maxRowsFirstPage;
  const contCapacity = L.table.maxRowsContPage;
  const pagesNeeded =
    displayLines.length <= firstPageCapacity
      ? 1
      : 1 + Math.ceil((displayLines.length - firstPageCapacity) / contCapacity);

  const pages: PDFPage[] = [];
  for (let i = 0; i < pagesNeeded; i++) {
    pages.push(await addBackgroundPage(out, pngBytes));
  }

  const first = pages[0]!;

  // Metadata (values only — labels are on the template)
  const metaVal = (text: string, y: number) => {
    const fitted = fitText(font, text, 9, L.meta.valueMaxWidth);
    first.drawText(fitted, { x: L.meta.valueX, y, size: 9, font, color: ink });
  };
  metaVal(input.invoiceNumber, L.meta.invoiceY);
  if (input.orderCode) metaVal(input.orderCode, L.meta.orderY);
  metaVal(input.issuedAt.toISOString().slice(0, 10), L.meta.dateY);
  metaVal(
    `${input.paymentStatus ?? "PAID"} · ${input.paymentMethod ?? "Razorpay"}`,
    L.meta.paymentY,
  );

  // Bill To
  const name = fitText(fontBold, input.guestName, 11, L.billTo.maxWidth);
  first.drawText(name, { x: L.billTo.x, y: L.billTo.nameY, size: 11, font: fontBold, color: ink });
  first.drawText(fitText(font, input.guestEmail, 9, L.billTo.maxWidth), {
    x: L.billTo.x,
    y: L.billTo.emailY,
    size: 9,
    font,
    color: ink,
  });
  first.drawText(fitText(font, input.guestPhone, 9, L.billTo.maxWidth), {
    x: L.billTo.x,
    y: L.billTo.phoneY,
    size: 9,
    font,
    color: ink,
  });

  // Line items
  let pageIndex = 0;
  let rowY: number = L.table.startY;
  let rowsOnPage = 0;
  let capacity: number = firstPageCapacity;

  const drawRow = (label: string, amountInPaise: number) => {
    const page = pages[pageIndex]!;
    const desc = fitText(font, label, 9, L.table.descMaxWidth);
    page.drawText(desc, { x: L.table.descX, y: rowY, size: 9, font, color: ink });
    drawRight(page, font, paiseToInr(amountInPaise), L.table.amountRight, rowY, 9);
    rowY -= L.table.rowGap;
    rowsOnPage += 1;
  };

  for (const item of displayLines) {
    if (rowsOnPage >= capacity) {
      pageIndex += 1;
      rowY = L.contentTopCont;
      rowsOnPage = 0;
      capacity = contCapacity;
      const cont = pages[pageIndex];
      if (cont) {
        cont.drawText("TAX INVOICE (continued)", {
          x: L.table.descX,
          y: rowY + 24,
          size: 11,
          font: fontBold,
          color: ink,
        });
        cont.drawText("DESCRIPTION", { x: L.table.descX, y: rowY + 6, size: 8, font: fontBold, color: ink });
        drawRight(cont, fontBold, "AMOUNT (INR)", L.table.amountRight, rowY + 6, 8);
      }
    }
    drawRow(item.label, item.amountInPaise);
  }

  // Totals on last content page that has room — prefer first page
  const totalsPage = pages[0]!;
  drawRight(totalsPage, font, paiseToInr(input.subtotalInPaise), L.totals.valueRight, L.totals.subtotalY, 10);

  totalsPage.drawText("SHIPPING", {
    x: L.totals.labelX,
    y: L.totals.shippingY,
    size: 9,
    font,
    color: ink,
  });
  drawRight(
    totalsPage,
    font,
    shippingWaived || shippingInPaise === 0 ? "FREE" : paiseToInr(shippingInPaise),
    L.totals.valueRight,
    L.totals.shippingY,
    10,
  );

  totalsPage.drawText(`GST (${gstPercent}%)`, {
    x: L.totals.labelX,
    y: L.totals.gstY,
    size: 9,
    font,
    color: ink,
  });
  drawRight(totalsPage, font, paiseToInr(input.gstInPaise), L.totals.valueRight, L.totals.gstY, 10);
  drawRight(totalsPage, fontBold, paiseToInr(input.totalInPaise), L.totals.valueRight, L.totals.totalY, 12, fontBold);

  return Buffer.from(await out.save());
}
