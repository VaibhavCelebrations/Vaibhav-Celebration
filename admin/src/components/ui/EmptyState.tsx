import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
      {Icon && (
        <div
          className="flex h-12 w-12 items-center justify-center rounded-full text-(--color-text-muted)"
          style={{ background: "var(--color-surface-alt)" }}
        >
          <Icon size={22} strokeWidth={1.5} aria-hidden="true" />
        </div>
      )}
      <div>
        <p className="text-sm font-medium text-(--color-charcoal)">{title}</p>
        {description && <p className="mt-1 max-w-sm text-sm text-(--color-text-muted)">{description}</p>}
      </div>
      {action}
    </div>
  );
}
