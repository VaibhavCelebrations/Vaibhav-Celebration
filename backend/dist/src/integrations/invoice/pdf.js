"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateInvoicePdf = generateInvoicePdf;
exports.fetchInvoicePdfBuffer = fetchInvoicePdfBuffer;
exports.renderInvoicePdfBuffer = renderInvoicePdfBuffer;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const pdf_lib_1 = require("pdf-lib");
const storage_1 = require("../media/storage");
const layout_1 = require("./layout");
function paiseToInr(paise) {
    return `INR ${(paise / 100).toFixed(2)}`;
}
function letterheadPath() {
    return path_1.default.resolve(process.cwd(), "assets/vc-letterhead.pdf");
}
async function loadLetterheadTemplate() {
    const bytes = await promises_1.default.readFile(letterheadPath());
    return pdf_lib_1.PDFDocument.load(bytes);
}
async function generateInvoicePdf(input) {
    const buffer = await renderInvoicePdfBuffer(input);
    const stored = await (0, storage_1.storeMediaBuffer)({
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
async function fetchInvoicePdfBuffer(pdfUrl) {
    if (!pdfUrl?.trim())
        return null;
    const key = (0, storage_1.cdnKeyFromPublicUrl)(pdfUrl);
    if (key) {
        try {
            const localPath = path_1.default.resolve(process.cwd(), "uploads", key);
            return await promises_1.default.readFile(localPath);
        }
        catch {
            /* fall through to HTTP */
        }
    }
    try {
        const res = await fetch(pdfUrl);
        if (!res.ok)
            return null;
        return Buffer.from(await res.arrayBuffer());
    }
    catch {
        return null;
    }
}
/** Render invoice PDF bytes (also used by tests). */
async function renderInvoicePdfBuffer(input) {
    const template = await loadLetterheadTemplate();
    const out = await pdf_lib_1.PDFDocument.create();
    const font = await out.embedFont(pdf_lib_1.StandardFonts.TimesRoman);
    const fontBold = await out.embedFont(pdf_lib_1.StandardFonts.TimesRomanBold);
    const mocha = (0, pdf_lib_1.rgb)(0.545, 0.271, 0.075);
    const ink = (0, pdf_lib_1.rgb)(0.17, 0.09, 0.06);
    const muted = (0, pdf_lib_1.rgb)(0.33, 0.27, 0.24);
    const shippingInPaise = input.shippingInPaise ?? 0;
    const shippingWaived = input.shippingWaived ?? shippingInPaise === 0;
    const gstPercent = input.gstPercent ?? 18;
    const pagesNeeded = Math.max(1, Math.ceil(input.lineItems.length / 18));
    for (let i = 0; i < pagesNeeded; i++) {
        const [copied] = await out.copyPages(template, [0]);
        out.addPage(copied);
    }
    const pages = out.getPages();
    const first = pages[0];
    let y = layout_1.LETTERHEAD_LAYOUT.contentTop;
    const draw = (text, x, yy, size = 10, bold = false, color = ink) => {
        first.drawText(text, { x, y: yy, size, font: bold ? fontBold : font, color });
    };
    draw("TAX INVOICE", layout_1.LETTERHEAD_LAYOUT.left, y, 14, true, mocha);
    y -= 22;
    draw(`Invoice: ${input.invoiceNumber}`, layout_1.LETTERHEAD_LAYOUT.left, y, 11, true);
    if (input.orderCode)
        draw(`Order: ${input.orderCode}`, 320, y, 11);
    y -= layout_1.LETTERHEAD_LAYOUT.lineGap;
    draw(`Date: ${input.issuedAt.toISOString().slice(0, 10)}`, layout_1.LETTERHEAD_LAYOUT.left, y, 10, false, muted);
    draw(`Payment: ${input.paymentStatus ?? "PAID"} · ${input.paymentMethod ?? "Razorpay"}`, 320, y, 10, false, muted);
    y -= 22;
    draw("Bill To", layout_1.LETTERHEAD_LAYOUT.left, y, 10, true, mocha);
    y -= layout_1.LETTERHEAD_LAYOUT.lineGap;
    draw(input.guestName, layout_1.LETTERHEAD_LAYOUT.left, y, 12, true);
    y -= layout_1.LETTERHEAD_LAYOUT.lineGap;
    draw(`${input.guestEmail}  ·  ${input.guestPhone}`, layout_1.LETTERHEAD_LAYOUT.left, y, 9, false, muted);
    y -= 24;
    first.drawLine({
        start: { x: layout_1.LETTERHEAD_LAYOUT.left, y },
        end: { x: layout_1.LETTERHEAD_LAYOUT.right, y },
        thickness: 0.6,
        color: (0, pdf_lib_1.rgb)(0.83, 0.77, 0.69),
    });
    y -= 18;
    draw("Description", layout_1.LETTERHEAD_LAYOUT.left, y, 10, true, mocha);
    draw("Amount", layout_1.LETTERHEAD_LAYOUT.right - 70, y, 10, true, mocha);
    y -= 14;
    let pageIndex = 0;
    let current = first;
    let rowY = y;
    const startContinuation = () => {
        pageIndex += 1;
        current = pages[pageIndex] ?? first;
        rowY = layout_1.LETTERHEAD_LAYOUT.contentTop;
        current.drawText("TAX INVOICE (continued)", {
            x: layout_1.LETTERHEAD_LAYOUT.left,
            y: rowY,
            size: 12,
            font: fontBold,
            color: mocha,
        });
        rowY -= 22;
    };
    for (const item of input.lineItems) {
        if (rowY < layout_1.LETTERHEAD_LAYOUT.footerY + layout_1.LETTERHEAD_LAYOUT.totalsReserve) {
            startContinuation();
        }
        const label = item.label.slice(0, 90);
        current.drawText(label, { x: layout_1.LETTERHEAD_LAYOUT.left, y: rowY, size: 10, font, color: ink });
        current.drawText(paiseToInr(item.amountInPaise), {
            x: layout_1.LETTERHEAD_LAYOUT.right - 90,
            y: rowY,
            size: 10,
            font,
            color: ink,
        });
        rowY -= layout_1.LETTERHEAD_LAYOUT.tableRow;
    }
    if (rowY < layout_1.LETTERHEAD_LAYOUT.footerY + layout_1.LETTERHEAD_LAYOUT.totalsReserve) {
        startContinuation();
    }
    rowY -= 8;
    current.drawLine({
        start: { x: layout_1.LETTERHEAD_LAYOUT.left, y: rowY },
        end: { x: layout_1.LETTERHEAD_LAYOUT.right, y: rowY },
        thickness: 0.6,
        color: (0, pdf_lib_1.rgb)(0.83, 0.77, 0.69),
    });
    rowY -= 20;
    current.drawText(`Subtotal: ${paiseToInr(input.subtotalInPaise)}`, {
        x: layout_1.LETTERHEAD_LAYOUT.right - 200,
        y: rowY,
        size: 10,
        font,
        color: muted,
    });
    rowY -= 16;
    current.drawText(shippingWaived || shippingInPaise === 0
        ? "Shipping: FREE"
        : `Shipping: ${paiseToInr(shippingInPaise)}`, {
        x: layout_1.LETTERHEAD_LAYOUT.right - 200,
        y: rowY,
        size: 10,
        font,
        color: muted,
    });
    rowY -= 16;
    current.drawText(`GST (${gstPercent}%): ${paiseToInr(input.gstInPaise)}`, {
        x: layout_1.LETTERHEAD_LAYOUT.right - 200,
        y: rowY,
        size: 10,
        font,
        color: muted,
    });
    rowY -= 20;
    current.drawText(`Total: ${paiseToInr(input.totalInPaise)}`, {
        x: layout_1.LETTERHEAD_LAYOUT.right - 200,
        y: rowY,
        size: 13,
        font: fontBold,
        color: mocha,
    });
    current.drawText("This is a computer-generated invoice. For support write to support@vaibhavcelebrations.in.", {
        x: layout_1.LETTERHEAD_LAYOUT.left,
        y: layout_1.LETTERHEAD_LAYOUT.footerY,
        size: 8,
        font,
        color: muted,
    });
    return Buffer.from(await out.save());
}
//# sourceMappingURL=pdf.js.map