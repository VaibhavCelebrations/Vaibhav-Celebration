import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { env } from "../../config/env";
import { logger } from "../../lib/logger";

const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");

export type StoredObject = {
  url: string;
  cdnKey: string;
  sizeBytes: number;
};

/**
 * Media storage adapter. Uses local `uploads/` when Cloudflare R2 is not configured.
 * Swap to R2 by setting CLOUDFLARE_* env vars (wired in env later).
 */
export async function storeMediaBuffer(input: {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  folder?: string;
}): Promise<StoredObject> {
  const ext = path.extname(input.originalName) || mimeFromType(input.mimeType);
  const folder = input.folder ?? "media";
  const cdnKey = `${folder}/${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`;

  await fs.mkdir(path.join(UPLOAD_DIR, folder), { recursive: true });
  const abs = path.join(UPLOAD_DIR, cdnKey);
  await fs.writeFile(abs, input.buffer);

  const baseUrl = process.env.PUBLIC_UPLOAD_BASE_URL ?? `http://localhost:${env.PORT}/uploads`;
  const url = `${baseUrl.replace(/\/$/, "")}/${cdnKey}`;

  logger.info({ cdnKey, size: input.buffer.length }, "Media stored locally");
  return { url, cdnKey, sizeBytes: input.buffer.length };
}

function mimeFromType(mime: string) {
  if (mime.includes("png")) return ".png";
  if (mime.includes("jpeg") || mime.includes("jpg")) return ".jpg";
  if (mime.includes("webp")) return ".webp";
  if (mime.includes("gif")) return ".gif";
  if (mime.includes("pdf")) return ".pdf";
  if (mime.includes("mp4")) return ".mp4";
  return "";
}

export function getUploadDir() {
  return UPLOAD_DIR;
}
