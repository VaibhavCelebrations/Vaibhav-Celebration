"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CDN_CACHE_CONTROL = void 0;
exports.publicUrlForKey = publicUrlForKey;
exports.buildCdnKey = buildCdnKey;
exports.isR2Enabled = isR2Enabled;
exports.storeMediaBuffer = storeMediaBuffer;
exports.createPresignedUpload = createPresignedUpload;
exports.deleteObjectByKey = deleteObjectByKey;
exports.deleteByPrefix = deleteByPrefix;
exports.getUploadDir = getUploadDir;
exports.getMediaHealth = getMediaHealth;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const crypto_1 = __importDefault(require("crypto"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const env_1 = require("../../config/env");
const logger_1 = require("../../lib/logger");
const UPLOAD_DIR = path_1.default.resolve(process.cwd(), "uploads");
/** Immutable long-cache for hashed/unique CDN keys (Document 02 §6.4). */
exports.CDN_CACHE_CONTROL = "public, max-age=31536000, immutable";
function r2Configured() {
    return Boolean(env_1.env.CLOUDFLARE_R2_ACCESS_KEY_ID &&
        env_1.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY &&
        env_1.env.CLOUDFLARE_ACCOUNT_ID &&
        env_1.env.CLOUDFLARE_R2_BUCKET);
}
let s3 = null;
function getS3() {
    if (!r2Configured())
        return null;
    if (s3)
        return s3;
    s3 = new client_s3_1.S3Client({
        region: "auto",
        endpoint: `https://${env_1.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: env_1.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
            secretAccessKey: env_1.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
        },
    });
    return s3;
}
function publicBaseUrl() {
    return (env_1.env.CLOUDFLARE_R2_PUBLIC_BASE_URL ?? `http://localhost:${env_1.env.PORT}/uploads`).replace(/\/$/, "");
}
function publicUrlForKey(cdnKey) {
    return `${publicBaseUrl()}/${cdnKey.replace(/^\//, "")}`;
}
function mimeExt(mime, originalName) {
    const fromName = originalName ? path_1.default.extname(originalName).toLowerCase() : "";
    if (fromName)
        return fromName;
    if (mime.includes("png"))
        return ".png";
    if (mime.includes("jpeg") || mime.includes("jpg"))
        return ".jpg";
    if (mime.includes("webp"))
        return ".webp";
    if (mime.includes("gif"))
        return ".gif";
    if (mime.includes("pdf"))
        return ".pdf";
    if (mime.includes("mp4"))
        return ".mp4";
    if (mime.includes("webm"))
        return ".webm";
    return "";
}
/**
 * Builds R2 object keys with logical folder prefixes.
 * Examples:
 *   themes/royal-mandap/cover-a1b2c3.jpg
 *   events/clxyz123/highlight-reel.mp4
 *   users/cladmin1/avatar-d4e5f6.png
 */
function buildCdnKey(input) {
    const ext = mimeExt(input.mimeType, input.originalName);
    const id = crypto_1.default.randomBytes(6).toString("hex");
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
function isR2Enabled() {
    return r2Configured();
}
async function storeMediaBuffer(input) {
    const kind = input.kind ?? inferKindFromFolder(input.folder);
    const cdnKey = input.fixedCdnKey ??
        buildCdnKey({
            kind,
            scope: input.scope ?? input.folder?.split("/")[1],
            role: input.role ?? input.folder?.split("/").pop() ?? "file",
            originalName: input.originalName,
            mimeType: input.mimeType,
        });
    const client = getS3();
    if (client && env_1.env.CLOUDFLARE_R2_BUCKET) {
        await client.send(new client_s3_1.PutObjectCommand({
            Bucket: env_1.env.CLOUDFLARE_R2_BUCKET,
            Key: cdnKey,
            Body: input.buffer,
            ContentType: input.mimeType,
            CacheControl: exports.CDN_CACHE_CONTROL,
        }));
        logger_1.logger.info({ cdnKey, size: input.buffer.length }, "Media uploaded to Cloudflare R2");
        return {
            url: publicUrlForKey(cdnKey),
            cdnKey,
            sizeBytes: input.buffer.length,
            storage: "r2",
        };
    }
    // Local fallback for dev without R2 credentials
    const abs = path_1.default.join(UPLOAD_DIR, cdnKey);
    await promises_1.default.mkdir(path_1.default.dirname(abs), { recursive: true });
    await promises_1.default.writeFile(abs, input.buffer);
    const base = process.env.PUBLIC_UPLOAD_BASE_URL ?? `http://localhost:${env_1.env.PORT}/uploads`;
    logger_1.logger.info({ cdnKey, size: input.buffer.length }, "Media stored locally (R2 not configured)");
    return {
        url: `${base.replace(/\/$/, "")}/${cdnKey}`,
        cdnKey,
        sizeBytes: input.buffer.length,
        storage: "local",
    };
}
function inferKindFromFolder(folder) {
    if (!folder)
        return "media";
    const root = folder.split("/")[0]?.toLowerCase();
    if (root === "themes")
        return "themes";
    if (root === "events")
        return "events";
    if (root === "gallery")
        return "gallery";
    if (root === "blog")
        return "blog";
    if (root === "popups")
        return "popups";
    if (root === "invoices")
        return "invoices";
    if (root === "users")
        return "users";
    return "media";
}
/**
 * Presigned PUT URL so the browser uploads directly to R2.
 * Frontend then calls /admin/media/complete to register the MediaAsset.
 * Display always uses the public CDN URL — never proxied through the API.
 */
async function createPresignedUpload(input) {
    const cdnKey = buildCdnKey(input);
    const expiresInSeconds = input.expiresInSeconds ?? 900;
    const client = getS3();
    if (!client || !env_1.env.CLOUDFLARE_R2_BUCKET) {
        // Local: return a backend upload endpoint as the "presigned" target
        return {
            uploadUrl: `http://localhost:${env_1.env.PORT}${env_1.env.API_PREFIX}/admin/media/upload-binary`,
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
    const command = new client_s3_1.PutObjectCommand({
        Bucket: env_1.env.CLOUDFLARE_R2_BUCKET,
        Key: cdnKey,
        ContentType: input.mimeType,
        CacheControl: exports.CDN_CACHE_CONTROL,
    });
    const uploadUrl = await (0, s3_request_presigner_1.getSignedUrl)(client, command, { expiresIn: expiresInSeconds });
    return {
        uploadUrl,
        cdnKey,
        publicUrl: publicUrlForKey(cdnKey),
        headers: {
            "Content-Type": input.mimeType,
            "Cache-Control": exports.CDN_CACHE_CONTROL,
        },
        expiresInSeconds,
        storage: "r2",
    };
}
async function deleteObjectByKey(cdnKey) {
    const client = getS3();
    if (client && env_1.env.CLOUDFLARE_R2_BUCKET) {
        await client.send(new client_s3_1.DeleteObjectCommand({
            Bucket: env_1.env.CLOUDFLARE_R2_BUCKET,
            Key: cdnKey,
        }));
        logger_1.logger.info({ cdnKey }, "R2 object deleted");
        return;
    }
    try {
        await promises_1.default.unlink(path_1.default.join(UPLOAD_DIR, cdnKey));
    }
    catch {
        // ignore missing local file
    }
}
/** Delete all objects under a prefix (e.g. themes/royal-mandap/). */
async function deleteByPrefix(prefix) {
    const normalized = prefix.replace(/^\//, "").replace(/\/*$/, "/");
    const client = getS3();
    if (client && env_1.env.CLOUDFLARE_R2_BUCKET) {
        let deleted = 0;
        let continuationToken;
        do {
            const listed = await client.send(new client_s3_1.ListObjectsV2Command({
                Bucket: env_1.env.CLOUDFLARE_R2_BUCKET,
                Prefix: normalized,
                ContinuationToken: continuationToken,
            }));
            const keys = (listed.Contents ?? [])
                .map((o) => o.Key)
                .filter((k) => Boolean(k));
            if (keys.length > 0) {
                await client.send(new client_s3_1.DeleteObjectsCommand({
                    Bucket: env_1.env.CLOUDFLARE_R2_BUCKET,
                    Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true },
                }));
                deleted += keys.length;
            }
            continuationToken = listed.IsTruncated ? listed.NextContinuationToken : undefined;
        } while (continuationToken);
        logger_1.logger.info({ prefix: normalized, deleted }, "R2 prefix deleted");
        return { deleted };
    }
    // Local recursive delete
    const abs = path_1.default.join(UPLOAD_DIR, normalized);
    try {
        await promises_1.default.rm(abs, { recursive: true, force: true });
        return { deleted: 1 };
    }
    catch {
        return { deleted: 0 };
    }
}
function getUploadDir() {
    return UPLOAD_DIR;
}
function getMediaHealth() {
    return {
        r2Configured: r2Configured(),
        bucket: env_1.env.CLOUDFLARE_R2_BUCKET ?? null,
        publicBaseUrl: publicBaseUrl(),
        cacheControl: exports.CDN_CACHE_CONTROL,
    };
}
//# sourceMappingURL=storage.js.map