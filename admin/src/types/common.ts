/** Integer, always paise (1/100 INR) — never render directly, use formatPaise(). */
export type Paise = number;

/** ISO 8601 string, as returned by the API / stored by the mock layer. */
export type ISODate = string;

export type MediaRef = {
  id: string;
  url: string;
  altText?: string | null;
  /** MIME type (image/*, video/*, application/pdf) — present on everything the API returns. */
  type?: string;
};

export type SoftDeletable = {
  deletedAt: ISODate | null;
};

export type Timestamped = {
  createdAt: ISODate;
  updatedAt: ISODate;
};
