"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff } from "lucide-react";
import { AdminApiError } from "@/lib/admin-api-client";
import { login } from "@/lib/data/session";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      router.replace("/");
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="grid min-h-dvh grid-cols-1 md:grid-cols-[1fr_480px]"
    >
      {/* ── Left decorative panel (hidden below md — no room to breathe on mobile) ── */}
      <div
        className="hidden md:flex"
        style={{
          background: "linear-gradient(160deg, var(--color-cream) 0%, var(--color-blush-light) 40%, var(--color-blush) 100%)",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "3rem",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Brand mark */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
          <Image
            src="/logo2.png"
            alt="Vaibhav Celebrations"
            width={1264}
            height={843}
            priority
            style={{ height: 56, width: "auto", objectFit: "contain" }}
          />
          <div style={{ borderLeft: "1px solid var(--color-blush)", paddingLeft: "0.875rem" }}>
            <div style={{ fontSize: "0.6875rem", color: "var(--color-text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 500 }}>
              Admin Panel
            </div>
          </div>
        </div>

        {/* Center copy */}
        <div>
          <div className="ornament" style={{ marginBottom: "1.5rem" }}>Premium Events</div>
          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "clamp(2rem, 4vw, 3rem)",
              fontWeight: 600,
              color: "var(--color-charcoal)",
              lineHeight: 1.2,
              marginBottom: "1rem",
            }}
          >
            Manage Every<br />
            <em style={{ color: "var(--color-mocha)", fontStyle: "italic" }}>Magical Moment</em>
          </h1>
          <p style={{ fontSize: "1rem", color: "var(--color-text-secondary)", maxWidth: 380, lineHeight: 1.7 }}>
            Your central command for orders, content, and customer relationships — all in one warm, efficient space.
          </p>

          {/* Feature tags */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.625rem", marginTop: "1.75rem" }}>
            {["CMS", "CRM", "Orders", "Events", "Gallery", "Invoices"].map((tag) => (
              <span
                key={tag}
                style={{
                  background: "rgba(255,255,255,0.6)",
                  border: "1px solid var(--color-blush)",
                  borderRadius: "999px",
                  padding: "0.3125rem 0.875rem",
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  color: "var(--color-mocha-dark)",
                  backdropFilter: "blur(8px)",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Decorative circles */}
        <div aria-hidden="true">
          <div style={{ position: "absolute", bottom: -80, right: -80, width: 320, height: 320, borderRadius: "50%", background: "rgba(117, 88, 70, 0.06)" }} />
          <div style={{ position: "absolute", bottom: 80, right: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(232, 213, 207, 0.5)" }} />
        </div>

        <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", margin: 0 }}>
          © 2026 Vaibhav Celebrations. Built by Affor Technologies.
        </p>
      </div>

      {/* ── Right login form panel ── */}
      <div
        style={{
          background: "#fff",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "3rem 2.5rem",
          borderLeft: "1px solid var(--color-border-soft)",
        }}
      >
        <div style={{ maxWidth: 360, width: "100%", margin: "0 auto" }}>
          <div style={{ marginBottom: "2rem" }}>
            <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "1.75rem", fontWeight: 600, color: "var(--color-charcoal)", margin: "0 0 0.375rem" }}>
              Welcome back
            </h2>
            <p style={{ fontSize: "0.9375rem", color: "var(--color-text-muted)", margin: 0 }}>
              Sign in to the admin dashboard
            </p>
          </div>

          <form
            onSubmit={onSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "1.125rem" }}
            aria-label="Admin login form"
          >
            {/* Email */}
            <div>
              <label
                htmlFor="login-email"
                style={{ display: "block", fontSize: "0.8125rem", fontWeight: 500, color: "var(--color-charcoal)", marginBottom: "0.375rem" }}
              >
                Email address
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="admin@vaibhav.in"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="login-password"
                style={{ display: "block", fontSize: "0.8125rem", fontWeight: 500, color: "var(--color-charcoal)", marginBottom: "0.375rem" }}
              >
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  minLength={8}
                  placeholder="••••••••"
                  className="input"
                  style={{ paddingRight: "2.75rem" }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  title={showPassword ? "Hide password" : "Show password"}
                  style={{
                    position: "absolute",
                    right: 4,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 38,
                    height: 38,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "none",
                    background: "transparent",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--color-text-muted)",
                    cursor: "pointer",
                    transition: "color 150ms ease",
                  }}
                >
                  {showPassword ? <EyeOff size={18} strokeWidth={1.75} aria-hidden="true" /> : <Eye size={18} strokeWidth={1.75} aria-hidden="true" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <p
                style={{
                  background: "var(--color-error-bg)",
                  color: "var(--color-error)",
                  border: "1px solid var(--color-error)",
                  borderRadius: "var(--radius-md)",
                  padding: "0.625rem 0.875rem",
                  fontSize: "0.8125rem",
                  margin: 0,
                }}
                role="alert"
              >
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ marginTop: "0.5rem", width: "100%", height: 48, fontSize: "0.9375rem" }}
            >
              {loading ? "Signing in…" : "Sign in to Admin"}
            </button>
          </form>

          {/* Divider */}
          <div className="ornament" style={{ margin: "1.75rem 0" }}>
            Secure Access
          </div>

          {/* Security note */}
          <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", textAlign: "center", lineHeight: 1.6 }}>
            This panel is restricted to authorised Affor Technologies staff only.
            Unauthorized access attempts are logged.
          </p>
        </div>
      </div>
    </div>
  );
}
