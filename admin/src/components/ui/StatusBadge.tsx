import type { LucideIcon } from "lucide-react";
import type { StatusTone } from "@/lib/status";

export function StatusBadge({
  label,
  tone,
  icon: Icon,
  size = "md",
}: {
  label: string;
  tone: StatusTone;
  icon?: LucideIcon;
  size?: "sm" | "md";
}) {
  return (
    <span className={`badge badge-${tone} inline-flex items-center gap-1 ${size === "sm" ? "text-[0.6875rem]" : ""}`}>
      {Icon && <Icon size={12} strokeWidth={2} aria-hidden="true" />}
      {label}
    </span>
  );
}
