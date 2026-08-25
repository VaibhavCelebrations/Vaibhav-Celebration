/** A4 letterhead overlay coordinates (pdf-lib origin = bottom-left, points). */
export declare const LETTERHEAD_LAYOUT: {
    readonly pageWidth: 595.28;
    readonly pageHeight: 841.89;
    /** First content baseline below the printed header artwork */
    readonly contentTop: 575;
    readonly left: 54;
    readonly right: 541;
    readonly lineGap: 16;
    readonly tableRow: 18;
    readonly totalsReserve: 110;
    /** Lower on the page so the computer-generated note sits below the totals, near the letterhead footer. */
    readonly footerY: 36;
};
