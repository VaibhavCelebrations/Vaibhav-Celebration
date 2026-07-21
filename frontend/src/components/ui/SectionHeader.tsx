import type { ReactNode } from "react";

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "center" | "left";
  light?: boolean;
  children?: ReactNode;
}

export function SectionHeader({ eyebrow, title, description, align = "center", light = false, children }: SectionHeaderProps) {
  return (
    <div className={align === "center" ? "text-center" : ""}>
      {eyebrow && (
        <div className={`flex items-center gap-4 mb-4 ${align === "center" ? "justify-center" : ""}`}>
          <div className={`h-px w-10 md:w-16 bg-gradient-to-r from-transparent ${light ? "to-white/40" : "to-mocha/60"}`} />
          <p className={`text-sm font-bold uppercase tracking-[0.2em] ${light ? "text-gold-soft" : "text-mocha"}`}>
            {eyebrow}
          </p>
          <div className={`h-px w-10 md:w-16 bg-gradient-to-l from-transparent ${light ? "to-white/40" : "to-mocha/60"}`} />
        </div>
      )}
      <h2 className={`font-display text-3xl md:text-4xl font-semibold ${light ? "text-white" : "text-charcoal"}`}>
        {title}
      </h2>
      {description && (
        <p className={`mt-4 max-w-xl leading-relaxed ${align === "center" ? "mx-auto" : ""} ${light ? "text-white/70" : "text-text-muted"}`}>
          {description}
        </p>
      )}
      {children}
    </div>
  );
}
