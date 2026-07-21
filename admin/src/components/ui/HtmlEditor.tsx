"use client";

import { useState } from "react";

/**
 * HTML textarea + rendered preview. Zero new deps for what's otherwise a
 * five-package WYSIWYG decision — the value/onChange contract here is the
 * exact shape a Tiptap/Lexical swap would take, so upgrading later doesn't
 * touch any form layout. Documented deferral, not an oversight.
 */
export function HtmlEditor({
  id,
  value,
  onChange,
  minHeight = 220,
}: {
  id?: string;
  value: string;
  onChange: (html: string) => void;
  minHeight?: number;
}) {
  const [tab, setTab] = useState<"html" | "preview">("html");

  return (
    <div className="overflow-hidden rounded-(--radius-md) border border-(--color-border)">
      <div role="tablist" aria-label="HTML editor mode" className="flex border-b border-(--color-border-soft)" style={{ background: "var(--color-surface)" }}>
        {(["html", "preview"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className="cursor-pointer px-3.5 py-2 text-xs font-medium capitalize transition-colors"
            style={{
              color: tab === t ? "var(--color-mocha)" : "var(--color-text-muted)",
              borderBottom: tab === t ? "2px solid var(--color-mocha)" : "2px solid transparent",
            }}
          >
            {t === "html" ? "HTML" : "Preview"}
          </button>
        ))}
      </div>
      {tab === "html" ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full resize-y bg-white p-3 font-mono text-xs text-(--color-charcoal) focus:outline-none"
          style={{ minHeight }}
          spellCheck={false}
        />
      ) : (
        <div
          className="prose prose-sm max-w-none overflow-auto bg-white p-3 text-sm text-(--color-charcoal)"
          style={{ minHeight }}
          dangerouslySetInnerHTML={{ __html: value || "<p class='text-(--color-text-muted)'>Nothing to preview yet.</p>" }}
        />
      )}
    </div>
  );
}
