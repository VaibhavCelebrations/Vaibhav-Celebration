import PDFDocument from "pdfkit";
import { storeMediaBuffer } from "../media/storage";

export type InvoicePdfInput = {
  invoiceNumber: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  lineItems: Array<{ label: string; amountInPaise: number }>;
  subtotalInPaise: number;
  gstInPaise: number;
  totalInPaise: number;
  issuedAt: Date;
};

function paiseToInr(paise: number) {
  return `₹${(paise / 100).toFixed(2)}`;
}

export async function generateInvoicePdf(input: InvoicePdfInput): Promise<{ url: string; cdnKey: string }> {
  const buffer = await new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
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

  const stored = await storeMediaBuffer({
    buffer,
    originalName: `${input.invoiceNumber}.pdf`,
    mimeType: "application/pdf",
    folder: "invoices",
  });

  return { url: stored.url, cdnKey: stored.cdnKey };
}
