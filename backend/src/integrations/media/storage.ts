import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { env } from "../../config/env";
import { logger } from "../../lib/logger";

const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");

/** Immutable long-cache for hashed/unique CDN keys (Document 02 §6.4). */
export const CDN_CACHE_CONTROL = "public, max-age=31536000, immutable";

export type MediaPrefixKind =
  | "themes"
  | "events"
  | "gallery"
  | "blog"
  | "popups"
  | "invoices"
  | "users"
  | "media"
  | "products";

/** All valid category keys — used for sidebar counts and validation */
export const MEDIA_CATEGORIES: MediaPrefixKind[] = [
  "gallery",
  "themes",
  "blog",
  "events",
  "products",
  "popups",
  "media",
  "users",
  "invoices",
];

/** Human-readable labels for each category */
export const MEDIA_CATEGORY_LABELS: Record<MediaPrefixKind, string> = {
  gallery:  "Gallery",
  themes:   "Themes",
  blog:     "Blog",
  events:   "Events",
  products: "Products",
  popups:   "Popups",
  media:    "General Media",
  users:    "Users",
  invoices: "Invoices",
};

export type StoredObject = {
  url: string;
  cdnKey: string;
  sizeBytes: number;
  storage: "r2" | "local";
};

function r2Configured(): boolean {
  return Boolean(
    env.CLOUDFLARE_R2_ACCESS_KEY_ID &&
      env.CLOUDFLARE_R2_SECRET_ACCESS_KEY &&
      env.CLOUDFLARE_ACCOUNT_ID &&
      env.CLOUDFLARE_R2_BUCKET,
  );
}

let s3: S3Client | null = null;

function getS3(): S3Client | null {
  if (!r2Configured()) return null;
  if (s3) return s3;
  s3 = new S3Client({
    region: "auto",
    endpoint: `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
      secretAccessKey: env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
    },
  });
  return s3;
}

function publicBaseUrl() {
  return (env.CLOUDFLARE_R2_PUBLIC_BASE_URL ?? `http://localhost:${env.PORT}/uploads`).replace(
    /\/$/,
    "",
  );
}

export function publicUrlForKey(cdnKey: string) {
  return `${publicBaseUrl()}/${cdnKey.replace(/^\//, "")}`;
}

function mimeExt(mime: string, originalName?: string) {
  const fromName = originalName ? path.extname(originalName).toLowerCase() : "";
  if (fromName) return fromName;
  if (mime.includes("png")) return ".png";
  if (mime.includes("jpeg") || mime.includes("jpg")) return ".jpg";
  if (mime.includes("webp")) return ".webp";
  if (mime.includes("gif")) return ".gif";
  if (mime.includes("pdf")) return ".pdf";
  if (mime.includes("mp4")) return ".mp4";
  if (mime.includes("webm")) return ".webm";
  return "";
}

/**
 * Builds R2 object keys with logical folder prefixes.
 * Examples:
 *   themes/royal-mandap/cover-a1b2c3.jpg
 *   events/clxyz123/highlight-reel.mp4
 *   users/cladmin1/avatar-d4e5f6.png
 */
export function buildCdnKey(input: {
  kind: MediaPrefixKind;
  /** theme slug, event id, user id, blog slug, etc. */
  scope?: string;
  /** cover | gallery | sample | avatar | highlight | misc */
  role?: string;
  originalName?: string;
  mimeType: string;
}): string {
  const ext = mimeExt(input.mimeType, input.originalName);
  const id = crypto.randomBytes(6).toString("hex");
  const role = (input.role ?? "file").replace(/[^a-z0-9-_]/gi, "-").toLowerCase();
  const scope = (input.scope ?? "general")
    .replace(/[^a-z0-9-_]/gi, "-")
    .toLowerCase()
    .slice(0, 80);

  switch (input.kind) {
    case "themes":
      return `themes/${scope}/${role}-${id}${ext}`;
    case "events":
      return `events/${scope}/${role}-${id}${ext}`;
    case "users":
      return `users/${scope}/${role}-${id}${ext}`;
    case "blog":
      return `blog/${scope}/${role}-${id}${ext}`;
    case "gallery":
      return `gallery/${scope}/${role}-${id}${ext}`;
    case "popups":
      return `popups/${scope}/${role}-${id}${ext}`;
    case "invoices":
      return `invoices/${scope}/${role}-${id}${ext}`;
    default:
      return `media/${scope}/${role}-${id}${ext}`;
  }
}

export function isR2Enabled() {
  return r2Configured();
}

export async function storeMediaBuffer(input: {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  kind?: MediaPrefixKind;
  scope?: string;
  role?: string;
  /** When set, uses this exact object key instead of a random suffix. */
  fixedCdnKey?: string;
  /** @deprecated prefer kind/scope/role */
  folder?: string;
}): Promise<StoredObject> {
  const kind = input.kind ?? inferKindFromFolder(input.folder);
  const cdnKey =
    input.fixedCdnKey ??
    buildCdnKey({
      kind,
      scope: input.scope ?? input.folder?.split("/")[1],
      role: input.role ?? input.folder?.split("/").pop() ?? "file",
      originalName: input.originalName,
      mimeType: input.mimeType,
    });

  const client = getS3();
  if (client && env.CLOUDFLARE_R2_BUCKET) {
    await client.send(
      new PutObjectCommand({
        Bucket: env.CLOUDFLARE_R2_BUCKET,
        Key: cdnKey,
        Body: input.buffer,
        ContentType: input.mimeType,
        CacheControl: CDN_CACHE_CONTROL,
      }),
    );
    logger.info({ cdnKey, size: input.buffer.length }, "Media uploaded to Cloudflare R2");
    return {
      url: publicUrlForKey(cdnKey),
      cdnKey,
      sizeBytes: input.buffer.length,
      storage: "r2",
    };
  }

  // Local fallback for dev without R2 credentials
  const abs = path.join(UPLOAD_DIR, cdnKey);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, input.buffer);
  const base = process.env.PUBLIC_UPLOAD_BASE_URL ?? `http://localhost:${env.PORT}/uploads`;
  logger.info({ cdnKey, size: input.buffer.length }, "Media stored locally (R2 not configured)");
  return {
    url: `${base.replace(/\/$/, "")}/${cdnKey}`,
    cdnKey,
    sizeBytes: input.buffer.length,
    storage: "local",
  };
}

function inferKindFromFolder(folder?: string): MediaPrefixKind {
  if (!folder) return "media";
  const root = folder.split("/")[0]?.toLowerCase();
  if (root === "themes") return "themes";
  if (root === "events") return "events";
  if (root === "gallery") return "gallery";
  if (root === "blog") return "blog";
  if (root === "popups") return "popups";
  if (root === "invoices") return "invoices";
  if (root === "users") return "users";
  return "media";
}

/**
 * Presigned PUT URL so the browser uploads directly to R2.
 * Frontend then calls /admin/media/complete to register the MediaAsset.
 * Display always uses the public CDN URL — never proxied through the API.
 */
export async function createPresignedUpload(input: {
  kind: MediaPrefixKind;
  scope?: string;
  role?: string;
  originalName: string;
  mimeType: string;
  expiresInSeconds?: number;
}): Promise<{
  uploadUrl: string;
  cdnKey: string;
  publicUrl: string;
  headers: Record<string, string>;
  expiresInSeconds: number;
  storage: "r2" | "local";
}> {
  const cdnKey = buildCdnKey(input);
  const expiresInSeconds = input.expiresInSeconds ?? 900;
  const client = getS3();

  if (!client || !env.CLOUDFLARE_R2_BUCKET) {
    // Local: return a backend upload endpoint as the "presigned" target
    return {
      uploadUrl: `http://localhost:${env.PORT}${env.API_PREFIX}/admin/media/upload-binary`,
      cdnKey,
      publicUrl: publicUrlForKey(cdnKey),
      headers: {
        "Content-Type": input.mimeType,
        "x-cdn-key": cdnKey,
      },
      expiresInSeconds,
      storage: "local",
    };
  }

  const command = new PutObjectCommand({
    Bucket: env.CLOUDFLARE_R2_BUCKET,
    Key: cdnKey,
    ContentType: input.mimeType,
    CacheControl: CDN_CACHE_CONTROL,
  });

  const uploadUrl = await getSignedUrl(client, command, { expiresIn: expiresInSeconds });

  return {
    uploadUrl,
    cdnKey,
    publicUrl: publicUrlForKey(cdnKey),
    headers: {
      "Content-Type": input.mimeType,
      "Cache-Control": CDN_CACHE_CONTROL,
    },
    expiresInSeconds,
    storage: "r2",
  };
}

export async function deleteObjectByKey(cdnKey: string): Promise<void> {
  const client = getS3();
  if (client && env.CLOUDFLARE_R2_BUCKET) {
    await client.send(
      new DeleteObjectCommand({
        Bucket: env.CLOUDFLARE_R2_BUCKET,
        Key: cdnKey,
      }),
    );
    logger.info({ cdnKey }, "R2 object deleted");
    return;
  }
  try {
    await fs.unlink(path.join(UPLOAD_DIR, cdnKey));
  } catch {
    // ignore missing local file
  }
}

/** Delete all objects under a prefix (e.g. themes/royal-mandap/). */
export async function deleteByPrefix(prefix: string): Promise<{ deleted: number }> {
  const normalized = prefix.replace(/^\//, "").replace(/\/*$/, "/") ;
  const client = getS3();

  if (client && env.CLOUDFLARE_R2_BUCKET) {
    let deleted = 0;
    let continuationToken: string | undefined;
    do {
      const listed = await client.send(
        new ListObjectsV2Command({
          Bucket: env.CLOUDFLARE_R2_BUCKET,
          Prefix: normalized,
          ContinuationToken: continuationToken,
        }),
      );
      const keys = (listed.Contents ?? [])
        .map((o) => o.Key)
        .filter((k): k is string => Boolean(k));
      if (keys.length > 0) {
        await client.send(
          new DeleteObjectsCommand({
            Bucket: env.CLOUDFLARE_R2_BUCKET,
            Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true },
          }),
        );
        deleted += keys.length;
      }
      continuationToken = listed.IsTruncated ? listed.NextContinuationToken : undefined;
    } while (continuationToken);
    logger.info({ prefix: normalized, deleted }, "R2 prefix deleted");
    return { deleted };
  }

  // Local recursive delete
  const abs = path.join(UPLOAD_DIR, normalized);
  try {
    await fs.rm(abs, { recursive: true, force: true });
    return { deleted: 1 };
  } catch {
    return { deleted: 0 };
  }
}

export function getUploadDir() {
  return UPLOAD_DIR;
}

export function getMediaHealth() {
  return {
    r2Configured: r2Configured(),
    bucket: env.CLOUDFLARE_R2_BUCKET ?? null,
    publicBaseUrl: publicBaseUrl(),
    cacheControl: CDN_CACHE_CONTROL,
  };
}
