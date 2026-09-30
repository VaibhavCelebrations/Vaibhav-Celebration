"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CONSENT_NONE,
  CONSENT_PENDING,
  consentServerSnapshot,
  consentSnapshot,
  onOpenCookieSettings,
  parseConsent,
  saveConsent,
  subscribeConsent,
} from "@/lib/cookie-consent";

/**
 * Cookie consent. Shown until the visitor chooses; analytics and marketing scripts stay off until
 * they are allowed (see Analytics.tsx). Rejecting is as easy as accepting, and the choice can be
 * changed any time from "Cookie Settings" in the footer.
 */
export function CookieBanner() {
  const pathname = usePathname();
  const snapshot = useSyncExternalStore(subscribeConsent, consentSnapshot, consentServerSnapshot);
  const consent = parseConsent(snapshot);

  const [reopened, setReopened] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(
    () =>
      onOpenCookieSettings(() => {
        const current = parseConsent(consentSnapshot());
        setAnalytics(current?.analytics ?? false);
        setMarketing(current?.marketing ?? false);
        setCustomizing(true);
        setReopened(true);
      }),
    [],
  );

  if (snapshot === CONSENT_PENDING) return null;
  const undecided = snapshot === CONSENT_NONE || !consent;
  if (!undecided && !reopened) return null;

  const decide = (choice: { analytics: boolean; marketing: boolean }) => {
    setReopened(false);
    setCustomizing(false);
    saveConsent(choice);
  };

  // Same lift as the floating buttons, so the banner never covers a sticky Continue / Pay bar.
  const hasStickyBar = pathname?.startsWith("/build-package") || pathname?.startsWith("/custom-plan");
  const hasMobileStickyBar = pathname?.startsWith("/checkout");
  const bottomClass = hasStickyBar ? "bottom-[100px]" : hasMobileStickyBar ? "bottom-[100px] md:bottom-5" : "bottom-3 md:bottom-5";

  const buttonBase =
    "h-10 rounded-xl px-4 text-sm font-semibold cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mocha focus-visible:ring-offset-2";

  return (
    <section
      role="dialog"
      aria-modal="false"
      aria-labelledby="cookie-banner-title"
      // Above the chat (bottom-left, z-100) and WhatsApp (bottom-right) buttons, below drawers and modals (150+).
      style={{ zIndex: 120 }}
      className={`fixed inset-x-3 mx-auto max-w-2xl rounded-2xl border border-border bg-surface p-4 md:p-5 shadow-xl animate-slide-up ${bottomClass}`}
    >
      <h2 id="cookie-banner-title" className="text-sm font-bold text-charcoal">
        Cookies on this website
      </h2>
      <p className="mt-1.5 text-xs leading-relaxed text-text-muted">
        We use essential cookies to keep you signed in and to run your cart and checkout. With your permission we
        also use analytics and marketing cookies. See our{" "}
        <Link href="/legal/privacy-policy" className="text-mocha underline hover:text-mocha-dark">
          Privacy Policy
        </Link>
        .
      </p>

      {customizing && (
        <ul className="mt-3 space-y-2.5 border-t border-border-light pt-3">
          <li className="flex items-start gap-2.5">
            <input type="checkbox" checked disabled className="mt-0.5 h-4 w-4 shrink-0 rounded border-border-light text-mocha" aria-label="Essential cookies (always on)" />
            <span className="text-xs text-text-muted">
              <strong className="text-charcoal">Essential</strong> — sign-in, cart, checkout and security. Always on.
            </span>
          </li>
          <li>
            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-border-light text-mocha focus:ring-mocha"
              />
              <span className="text-xs text-text-muted">
                <strong className="text-charcoal">Analytics</strong> — helps us see which pages are used so we can improve the site.
              </span>
            </label>
          </li>
          <li>
            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={marketing}
                onChange={(e) => setMarketing(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-border-light text-mocha focus:ring-mocha"
              />
              <span className="text-xs text-text-muted">
                <strong className="text-charcoal">Marketing</strong> — lets us show you relevant offers on other platforms.
              </span>
            </label>
          </li>
        </ul>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {customizing ? (
          <button type="button" onClick={() => decide({ analytics, marketing })} className={`${buttonBase} bg-mocha text-white hover:bg-mocha-dark`}>
            Save choices
          </button>
        ) : (
          <button type="button" onClick={() => decide({ analytics: true, marketing: true })} className={`${buttonBase} bg-mocha text-white hover:bg-mocha-dark`}>
            Accept all
          </button>
        )}
        <button type="button" onClick={() => decide({ analytics: false, marketing: false })} className={`${buttonBase} border border-mocha text-mocha hover:bg-mocha/10`}>
          Essential only
        </button>
        {!customizing && (
          <button type="button" onClick={() => setCustomizing(true)} className={`${buttonBase} px-2 text-text-muted underline underline-offset-2 hover:text-charcoal`}>
            Choose
          </button>
        )}
      </div>
    </section>
  );
}
