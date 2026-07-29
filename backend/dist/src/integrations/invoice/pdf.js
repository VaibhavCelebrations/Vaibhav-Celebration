"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateInvoicePdf = generateInvoicePdf;
const pdfkit_1 = __importDefault(require("pdfkit"));
const storage_1 = require("../media/storage");
function paiseToInr(paise) {
    return `₹${(paise / 100).toFixed(2)}`;
}
async function generateInvoicePdf(input) {
    const buffer = await new Promise((resolve, reject) => {
        const doc = new pdfkit_1.default({ margin: 50, size: "A4" });
        const chunks = [];
        doc.on("data", (c) => chunks.push(c));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);
        doc.fillColor("#8B4513").fontSize(22).text("Vaibhav Celebrations", { align: "left" });
        doc.fillColor("#333").fontSize(10).text("Tax Invoice", { align: "left" });
        doc.moveDown();
        doc.fontSize(12).text(`Invoice: ${input.invoiceNumber}`);
        doc.text(`Date: ${input.issuedAt.toISOString().slice(0, 10)}`);
        doc.moveDown();
        doc.text(`Bill To: ${input.guestName}`);
        doc.text(`${input.guestEmail} · ${input.guestPhone}`);
        doc.moveDown();
        doc.fontSize(11).fillColor("#000");
        for (const item of input.lineItems) {
            doc.text(`${item.label}`, { continued: true });
            doc.text(paiseToInr(item.amountInPaise), { align: "right" });
        }
        doc.moveDown();
        doc.text(`Subtotal: ${paiseToInr(input.subtotalInPaise)}`, { align: "right" });
        doc.text(`GST: ${paiseToInr(input.gstInPaise)}`, { align: "right" });
        doc.fontSize(13).fillColor("#8B4513").text(`Total: ${paiseToInr(input.totalInPaise)}`, {
            align: "right",
        });
        doc.moveDown(2);
        doc.fontSize(9).fillColor("#666").text("Thank you for celebrating with Vaibhav Celebrations.");
        doc.end();
    });
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
//# sourceMappingURL=pdf.js.map