import type { MediaPrefixKind } from "./UploadDialog";

type CategoryStyle = { bg: string; text: string; label: string };

export const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  gallery:  { bg: "bg-[var(--color-blush-light)]", text: "text-[var(--color-mocha-dark)]",   label: "Gallery"  },
  themes:   { bg: "bg-amber-100",                   text: "text-amber-800",                   label: "Themes"   },
  blog:     { bg: "bg-sky-100",                     text: "text-sky-800",                     label: "Blog"     },
  events:   { bg: "bg-violet-100",                  text: "text-violet-800",                  label: "Events"   },
  products: { bg: "bg-emerald-100",                 text: "text-emerald-800",                 label: "Products" },
  popups:   { bg: "bg-orange-100",                  text: "text-orange-800",                  label: "Popups"   },
  media:    { bg: "bg-gray-100",                    text: "text-gray-700",                    label: "General"  },
  users:    { bg: "bg-indigo-100",                  text: "text-indigo-800",                  label: "Users"    },
  invoices: { bg: "bg-red-100",                     text: "text-red-800",                     label: "Invoices" },
};

type Props = {
  category?: string | null;
  className?: string;
};

export function MediaCategoryBadge({ category, className = "" }: Props) {
  const key = (category ?? "media") as MediaPrefixKind;
  const style: CategoryStyle = CATEGORY_STYLES[key] ?? CATEGORY_STYLES["media"]!;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${style.bg} ${style.text} ${className}`}
    >
      {style.label}
    </span>
  );
}
