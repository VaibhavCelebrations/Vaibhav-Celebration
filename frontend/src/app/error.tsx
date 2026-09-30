"use client";

import { useEffect } from "react";
import Link from "next/link";

/** Shown when a page fails to render. The rest of the site (and the cart) is unaffected. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-[70vh] bg-cream pt-36 pb-24 px-5 text-center" role="alert">
      <h1 className="font-display text-3xl md:text-4xl font-semibold text-charcoal">Something went wrong on this page</h1>
      <p className="mt-4 text-text-muted max-w-md mx-auto">
        Your cart and anything you&apos;ve selected are safe. Please try again, and if it keeps happening, message us on WhatsApp.
      </p>
      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
        <button type="button" onClick={reset} className="btn-primary px-8 py-3 text-sm">
          Try again
        </button>
        <Link href="/" className="btn-outline px-8 py-3 text-sm">
          Go to Home
        </Link>
      </div>
      {error.digest && <p className="mt-6 text-xs text-text-light">Reference: {error.digest}</p>}
    </main>
  );
}
