/** One image or video, as the media components consume it. API `MediaRef`s satisfy this directly. */
export type MediaItem = {
  url: string;
  /** MIME type when known (image/*, video/*). */
  type?: string | null;
  altText?: string | null;
  /** Shown under the media in the viewer. */
  caption?: string | null;
  /** Optional call-to-action shown with this item in the viewer (e.g. "Explore Theme"). */
  link?: { href: string; label: string };
};

const VIDEO_EXTENSION = /\.(mp4|webm|mov|m4v)(?:[?#]|$)/i;

export function isVideo(item: Pick<MediaItem, "url" | "type">): boolean {
  if (item.type) return item.type.startsWith("video/");
  return VIDEO_EXTENSION.test(item.url);
}

/** Only images can go through `next/image`; PDFs and other files are skipped by galleries. */
export function isImage(item: Pick<MediaItem, "url" | "type">): boolean {
  if (item.type) return item.type.startsWith("image/");
  return !VIDEO_EXTENSION.test(item.url) && !/\.pdf(?:[?#]|$)/i.test(item.url);
}

export function isViewable(item: Pick<MediaItem, "url" | "type">): boolean {
  return isImage(item) || isVideo(item);
}
