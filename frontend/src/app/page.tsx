import { Badge, Button, Card, CardTitle } from "@/components/ui";
import { getApiBaseUrl } from "@/lib/api-client";

async function getBackendHealth(): Promise<{ ok: boolean; message: string }> {
  try {
    const base = getApiBaseUrl().replace(/\/api\/v1$/, "");
    const res = await fetch(`${base}/health`, { cache: "no-store" });
    if (!res.ok) return { ok: false, message: `API returned ${res.status}` };
    const json = (await res.json()) as { success?: boolean };
    return json.success
      ? { ok: true, message: "Backend connected" }
      : { ok: false, message: "Backend unhealthy" };
  } catch {
    return { ok: false, message: "Backend unreachable — start `npm run dev` in /backend" };
  }
}

export default async function HomePage() {
  const health = await getBackendHealth();

  return (
    <main className="relative flex flex-1 flex-col overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(196,163,90,0.18),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_rgba(196,92,74,0.12),_transparent_45%)]"
      />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <p className="font-display text-2xl tracking-tight">Vaibhav Celebrations</p>
        <Badge tone={health.ok ? "success" : "blush"}>{health.message}</Badge>
      </header>

      <section className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center gap-10 px-6 pb-20 pt-8">
        <div className="max-w-3xl">
          <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-[var(--color-gold)]">
            Phase 1.0 Foundation Ready
          </p>
          <h1 className="font-display text-5xl leading-[1.05] text-[var(--color-ink)] sm:text-6xl">
            Luxury Theme-Based Birthday Experiences for Kids
          </h1>
          <p className="mt-5 max-w-xl text-lg text-[var(--color-ink-muted)]">
            Adding Shaan to your celebrations with beautifully curated birthday experiences
            designed with love. Design system, API wiring, and environment setup are live —
            Sub-Phase 1.1 Go-Live Shell comes next.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button>Explore Themes</Button>
            <Button variant="ghost">Book Free Consultation</Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardTitle>Frontend</CardTitle>
            <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
              Design tokens + UI kit (Button, Card, Badge, Modal, Tabs, Stepper, Toast)
            </p>
          </Card>
          <Card>
            <CardTitle>Backend</CardTitle>
            <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
              Express + Prisma + JWT auth + health endpoint at {getApiBaseUrl().replace("/api/v1", "")}
            </p>
          </Card>
          <Card>
            <CardTitle>Admin</CardTitle>
            <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
              Dashboard shell on port 3001 — CMS / CRM / Settings navigation ready
            </p>
          </Card>
        </div>
      </section>
    </main>
  );
}
