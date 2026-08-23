/** A4 letterhead overlay coordinates (pdf-lib origin = bottom-left, points). */
export const LETTERHEAD_LAYOUT = {
  pageWidth: 595.28,
  pageHeight: 841.89,
  /** First content baseline below the printed header artwork */
  contentTop: 575,
  left: 54,
  right: 541,
  lineGap: 16,
  tableRow: 18,
  totalsReserve: 110,
  /** Lower on the page so the computer-generated note sits below the totals, near the letterhead footer. */
  footerY: 36,
} as const;
