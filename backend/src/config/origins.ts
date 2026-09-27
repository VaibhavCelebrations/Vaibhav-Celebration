import { corsOrigins, env } from "./env";

/**
 * Vercel preview deployments get a unique subdomain per branch/PR. ANY Vercel user can
 * register a project whose name matches this pattern, so it must never be trusted with
 * credentialed requests in production — it is opt-in via ALLOW_VERCEL_PREVIEWS (dev/staging only).
 */
const vercelPreviewOriginPattern = /^https:\/\/vaibhav-celebration[a-z0-9-]*\.vercel\.app$/;

function originOf(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

const trustedOrigins = new Set<string>([...corsOrigins, originOf(env.FRONTEND_URL)].filter((o): o is string => Boolean(o)));

/** Single source of truth for "may this browser origin talk to the API with credentials?" (CORS + CSRF guard). */
export function isAllowedOrigin(origin: string): boolean {
  if (trustedOrigins.has(origin)) return true;
  return env.ALLOW_VERCEL_PREVIEWS && vercelPreviewOriginPattern.test(origin);
}
