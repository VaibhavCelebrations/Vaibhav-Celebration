"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AdminApiError, loginAdmin } from "@/lib/admin-api-client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@vaibhavcelebrations.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await loginAdmin(email, password);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-gold)]">
          Vaibhav Celebrations
        </p>
        <h1 className="font-display mt-2 text-3xl">Admin Sign In</h1>
        <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
          Secure CMS + CRM control panel. Not linked from the public website.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <label className="block text-sm">
            <span className="mb-1.5 block text-[var(--color-ink-muted)]">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 w-full rounded-lg border border-[var(--color-border)] px-3 outline-none focus:border-[var(--color-blush)]"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block text-[var(--color-ink-muted)]">Password</span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 w-full rounded-lg border border-[var(--color-border)] px-3 outline-none focus:border-[var(--color-blush)]"
            />
          </label>

          {error ? (
            <p className="rounded-lg bg-[#f8e8e4] px-3 py-2 text-sm text-[var(--color-blush-deep)]">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="h-11 w-full rounded-lg bg-[var(--color-blush)] font-medium text-white transition hover:bg-[var(--color-blush-deep)] disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
