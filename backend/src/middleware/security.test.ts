import { describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";

vi.mock("../config/env", () => ({
  env: { FRONTEND_URL: "https://www.example.com", ALLOW_VERCEL_PREVIEWS: false },
  corsOrigins: ["https://admin.example.com"],
}));

import { originGuard } from "./origin-guard";
import { assertAllowedMediaType } from "../modules/media/media-policy";

function run(method: string, headers: Record<string, string>) {
  const req = { method, get: (h: string) => headers[h.toLowerCase()] } as unknown as Request;
  const json = vi.fn();
  const res = { status: vi.fn(() => ({ json })) } as unknown as Response;
  const next = vi.fn() as unknown as NextFunction;
  originGuard(req, res, next);
  return { next, status: (res.status as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as number | undefined };
}

describe("originGuard (CSRF)", () => {
  it("allows safe methods regardless of origin", () => {
    expect(run("GET", { origin: "https://evil.com" }).next).toHaveBeenCalled();
  });

  it("blocks state-changing requests from untrusted origins", () => {
    const r = run("POST", { origin: "https://evil.com" });
    expect(r.status).toBe(403);
    expect(r.next).not.toHaveBeenCalled();
  });

  it("allows configured origins and the public site URL", () => {
    expect(run("POST", { origin: "https://admin.example.com" }).next).toHaveBeenCalled();
    expect(run("DELETE", { origin: "https://www.example.com" }).next).toHaveBeenCalled();
  });

  it("falls back to Referer when Origin is absent", () => {
    expect(run("PUT", { referer: "https://evil.com/page" }).status).toBe(403);
    expect(run("PUT", { referer: "https://www.example.com/checkout" }).next).toHaveBeenCalled();
  });

  it("lets server-to-server calls (no Origin/Referer) through — webhooks, SSR", () => {
    expect(run("POST", {}).next).toHaveBeenCalled();
  });

  it("does not trust look-alike vercel preview origins unless explicitly enabled", () => {
    expect(run("POST", { origin: "https://vaibhav-celebration-evil.vercel.app" }).status).toBe(403);
  });
});

describe("media type allowlist", () => {
  it("accepts raster images, video and pdf", () => {
    expect(assertAllowedMediaType("image/png")).toBe("image/png");
    expect(assertAllowedMediaType("video/mp4; codecs=avc1")).toBe("video/mp4");
    expect(assertAllowedMediaType("application/pdf")).toBe("application/pdf");
  });

  it("rejects SVG, HTML and unknown types", () => {
    for (const t of ["image/svg+xml", "text/html", "application/javascript", "application/octet-stream", ""]) {
      expect(() => assertAllowedMediaType(t)).toThrow();
    }
  });
});
