import { ValidationError } from "../../lib/errors";

/**
 * Explicit allowlist — NOT "anything starting with image/". `image/svg+xml` can carry <script> and
 * would execute when opened directly from the media origin (stored XSS), so SVG (and HTML, JS,
 * executables…) are rejected. Raster images, mp4/webm video and PDF cover every CMS use case.
 */
export const ALLOWED_MEDIA_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "video/mp4",
  "video/webm",
  "application/pdf",
]);

export function assertAllowedMediaType(mimeType: string): string {
  const base = mimeType.split(";")[0]?.trim().toLowerCase() ?? "";
  if (!ALLOWED_MEDIA_MIME_TYPES.has(base)) {
    throw new ValidationError("Unsupported file type. Allowed: JPEG, PNG, WebP, GIF, AVIF, MP4, WebM and PDF.");
  }
  return base;
}
