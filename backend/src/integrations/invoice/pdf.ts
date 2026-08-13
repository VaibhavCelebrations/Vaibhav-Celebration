import PDFDocument from "pdfkit";
import { storeMediaBuffer } from "../media/storage";

export type InvoicePdfInput = {
  invoiceNumber: string;
  orderCode?: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  lineItems: Array<{ label: string; amountInPaise: number }>;
  subtotalInPaise: number;
  gstInPaise: number;
  totalInPaise: number;
  issuedAt: Date;
  paymentStatus?: string;
  paymentMethod?: string;
};

function paiseToInr(paise: number) {
  return `INR ${(paise / 100).toFixed(2)}`;
}

export async function generateInvoicePdf(input: InvoicePdfInput): Promise<{ url: string; cdnKey: string }> {
  const buffer = await new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fillColor("#8B4513").fontSize(22).text("Vaibhav Celebrations");
    doc.fillColor("#555").fontSize(10).text("Tax Invoice");
    doc.moveDown(0.4);
    doc.fillColor("#333").fontSize(11);
    doc.text(`Invoice: ${input.invoiceNumber}`);
    if (input.orderCode) doc.text(`Order ID: ${input.orderCode}`);
    doc.text(`Date: ${input.issuedAt.toISOString().slice(0, 10)}`);
    doc.text(`Payment: ${input.paymentStatus ?? "PAID"} · ${input.paymentMethod ?? "Razorpay"}`);
    doc.moveDown();
    doc.fontSize(11).text("Bill To");
    doc.fontSize(12).fillColor("#000").text(input.guestName);
    doc.fontSize(10).fillColor("#444").text(`${input.guestEmail}  ·  ${input.guestPhone}`);
    doc.moveDown();

    doc.moveTo(48, doc.y).lineTo(547, doc.y).strokeColor("#d4c4b0").stroke();
    doc.moveDown(0.6);

    doc.fontSize(11).fillColor("#000");
    for (const item of input.lineItems) {
      const y = doc.y;
      doc.text(item.label, 48, y, { width: 380 });
      doc.text(paiseToInr(item.amountInPaise), 430, y, { width: 117, align: "right" });
      doc.moveDown(0.4);
    }

    doc.moveDown(0.4);
    doc.moveTo(48, doc.y).lineTo(547, doc.y).strokeColor("#d4c4b0").stroke();
    doc.moveDown(0.6);
    doc.fontSize(11).fillColor("#333");
    doc.text(`Subtotal: ${paiseToInr(input.subtotalInPaise)}`, { align: "right" });
    doc.text(`GST: ${paiseToInr(input.gstInPaise)}`, { align: "right" });
    doc.moveDown(0.2);
    doc.fontSize(14).fillColor("#8B4513").text(`Total: ${paiseToInr(input.totalInPaise)}`, { align: "right" });

    doc.moveDown(2);
    doc.fontSize(9).fillColor("#666").text("Thank you for celebrating with Vaibhav Celebrations.");
    doc.text("This is a computer-generated invoice. For support, reply to your confirmation email.");
    doc.end();
  });

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
