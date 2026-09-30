/**
 * The visitor's cookie choice. Essential cookies (sign-in, cart, payment) are always on and are not
 * part of this; analytics and marketing scripts load only after the visitor allows them.
 * The choice lives in this browser only and is asked again after a year.
 */
export type CookieConsent = {
  analytics: boolean;
  marketing: boolean;
  /** ISO time the choice was made. */
  decidedAt: string;
};

const KEY = "vc-cookie-consent";
const CHANGE_EVENT = "vc-cookie-consent-change";
const OPEN_EVENT = "vc-cookie-settings-open";
const MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;

/** Snapshot values for useSyncExternalStore: the stored JSON, "none" (not asked yet) or "pending" (server). */
export const CONSENT_PENDING = "pending";
export const CONSENT_NONE = "none";

export function consentSnapshot(): string {
  try {
    return window.localStorage.getItem(KEY) ?? CONSENT_NONE;
  } catch {
    // Storage blocked (private mode): treat as not decided, non-essential scripts stay off.
    return CONSENT_NONE;
  }
}

export const consentServerSnapshot = () => CONSENT_PENDING;

export function parseConsent(snapshot: string): CookieConsent | null {
  if (snapshot === CONSENT_PENDING || snapshot === CONSENT_NONE) return null;
  try {
    const value = JSON.parse(snapshot) as Partial<CookieConsent>;
    if (typeof value.decidedAt !== "string") return null;
    if (Date.now() - new Date(value.decidedAt).getTime() > MAX_AGE_MS) return null;
    return { analytics: value.analytics === true, marketing: value.marketing === true, decidedAt: value.decidedAt };
  } catch {
    return null;
  }
}

export function subscribeConsent(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function saveConsent(choice: { analytics: boolean; marketing: boolean }) {
  const previous = parseConsent(consentSnapshot());
  const value: CookieConsent = { ...choice, decidedAt: new Date().toISOString() };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    // Nothing to persist to; the banner will simply ask again next visit.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
  // A script that has already loaded cannot be unloaded, so withdrawing a permission reloads the page.
  const withdrawn = Boolean(previous && ((previous.analytics && !choice.analytics) || (previous.marketing && !choice.marketing)));
  if (withdrawn) window.location.reload();
}

/** Reopens the banner on its settings view, e.g. from the footer's "Cookie Settings" link. */
export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function onOpenCookieSettings(handler: () => void) {
  window.addEventListener(OPEN_EVENT, handler);
  return () => window.removeEventListener(OPEN_EVENT, handler);
}
