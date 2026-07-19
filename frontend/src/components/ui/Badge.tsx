import type { ReactNode } from "react";

type Tone = "default" | "gold" | "success" | "blush";

const tones: Record<Tone, string> = {
  default: "bg-[var(--color-ivory)] text-[var(--color-ink-muted)] border-[var(--color-border)]",
  gold: "bg-[var(--color-gold-soft)] text-[#5c4718] border-[var(--color-gold)]/30",
  success: "bg-[#e7f4ec] text-[var(--color-success)] border-[#b7d9c4]",
  blush: "bg-[#f8e8e4] text-[var(--color-blush-deep)] border-[#efc7bf]",
};

export function Badge({
  children,
  tone = "default",
  className = "",
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
