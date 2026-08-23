/** A4 overlay coordinates for Docs/Invoice template b&w VC (pdf-lib origin = bottom-left). */
export const LETTERHEAD_LAYOUT = {
  pageWidth: 595.28,
  pageHeight: 841.89,

  /** Top-right metadata values (after printed labels). */
  meta: {
    valueX: 430,
    valueMaxWidth: 110,
    invoiceY: 742,
    orderY: 726,
    dateY: 710,
    paymentY: 694,
  },

  /** Bill To block (left, below printed BILL TO). */
  billTo: {
    x: 72,
    nameY: 638,
    emailY: 622,
    phoneY: 608,
    maxWidth: 260,
  },

  /** Line-item table body (headers are printed on the template). */
  table: {
    descX: 58,
    amountX: 520,
    amountRight: 541,
    startY: 530,
    rowGap: 16,
    descMaxWidth: 360,
    maxRowsFirstPage: 12,
    maxRowsContPage: 28,
  },

  /** Totals block (right) — values only; labels are printed except Shipping. */
  totals: {
    labelX: 360,
    valueX: 520,
    valueRight: 541,
    subtotalY: 248,
    shippingY: 228,
    gstY: 208,
    totalY: 182,
  },

  footerY: 72,
  contentTopCont: 760,
} as const;
