"use client";

import { Check, ChevronDown, Plus, X } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

// ─── Basic text fields ──────────────────────────────────────────────────────

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input type="text" className="input" {...props} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className="input" rows={4} {...props} />;
}

// ─── Numbers & money ────────────────────────────────────────────────────────

export function NumberInput({
  value,
  onChange,
  ...rest
}: { value: number; onChange: (n: number) => void } & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type">) {
  return (
    <input
      type="number"
      className="input"
      value={Number.isFinite(value) ? value : ""}
      onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
      {...rest}
    />
  );
}

/** Edits/displays rupees; the value/onChange contract is always paise — schema stores money in paise everywhere. */
export function PriceInput({
  value,
  onChange,
  ...rest
}: { value: number; onChange: (paise: number) => void } & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type">) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-(--color-text-muted)">₹</span>
      <input
        type="number"
        step="0.01"
        min="0"
        className="input pl-7"
        value={value / 100}
        onChange={(e) => onChange(Math.round(Number(e.target.value || 0) * 100))}
        {...rest}
      />
    </div>
  );
}

// ─── Select ─────────────────────────────────────────────────────────────────

export function SelectInput({
  options,
  placeholder,
  ...rest
}: {
  options: { value: string; label: string }[];
  placeholder?: string;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "children">) {
  return (
    <select className="input" {...rest}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// ─── Multi-select with optional create-inline ──────────────────────────────

type Option = { value: string; label: string };

export function MultiSelectInput({
  id,
  value,
  onChange,
  options,
  allowCreate,
  placeholder = "Select…",
}: {
  id?: string;
  value: string[];
  onChange: (next: string[]) => void;
  options: Option[];
  allowCreate?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const selected = value.map((v) => ({ value: v, label: options.find((o) => o.value === v)?.label ?? v }));
  const filtered = options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()));
  const exactMatch = options.some((o) => o.label.toLowerCase() === query.trim().toLowerCase());
  const canCreate = allowCreate && query.trim().length > 0 && !exactMatch;

  function toggle(v: string) {
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  }

  function createAndSelect() {
    const label = query.trim();
    if (!label) return;
    onChange([...value, label]);
    setQuery("");
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        id={id}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="input flex min-h-9 w-full cursor-pointer flex-wrap items-center gap-1 text-left"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {selected.length === 0 ? (
          <span className="text-(--color-text-muted)">{placeholder}</span>
        ) : (
          selected.map((s) => (
            <span key={s.value} className="badge badge-neutral inline-flex items-center gap-1">
              {s.label}
              <X
                size={11}
                strokeWidth={2}
                aria-hidden="true"
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(s.value);
                }}
              />
            </span>
          ))
        )}
        <ChevronDown size={14} strokeWidth={1.75} className="ml-auto shrink-0 text-(--color-text-muted)" aria-hidden="true" />
      </button>
      {open && (
        <div className="card absolute z-10 mt-1 max-h-56 w-full overflow-auto p-1 shadow-(--shadow-elevated)">
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="input mb-1"
          />
          {filtered.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => toggle(o.value)}
              className="nav-item flex w-full items-center justify-between text-left"
            >
              {o.label}
              {value.includes(o.value) && <Check size={14} strokeWidth={2} aria-hidden="true" />}
            </button>
          ))}
          {canCreate && (
            <button
              type="button"
              onClick={createAndSelect}
              className="nav-item flex w-full items-center gap-1.5 text-left text-(--color-mocha)"
            >
              <Plus size={14} strokeWidth={2} aria-hidden="true" />
              Create &ldquo;{query.trim()}&rdquo;
            </button>
          )}
          {filtered.length === 0 && !canCreate && <p className="px-2.5 py-1.5 text-xs text-(--color-text-muted)">No matches</p>}
        </div>
      )}
    </div>
  );
}

// ─── Toggle ─────────────────────────────────────────────────────────────────

export function ToggleSwitch({
  id,
  checked,
  onChange,
  label,
}: {
  id?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative inline-flex shrink-0 cursor-pointer items-center rounded-full transition-colors"
      style={{ width: 40, height: 22, background: checked ? "var(--color-mocha)" : "var(--color-border)" }}
    >
      {label && <span className="sr-only">{label}</span>}
      <span
        aria-hidden="true"
        className="inline-block rounded-full bg-white transition-transform"
        style={{ width: 16, height: 16, transform: checked ? "translateX(21px)" : "translateX(3px)" }}
      />
    </button>
  );
}

// ─── Dates ──────────────────────────────────────────────────────────────────

export function DateInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input type="date" className="input" {...props} />;
}

export function DateTimeInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input type="datetime-local" className="input" {...props} />;
}

// ─── Slug ───────────────────────────────────────────────────────────────────

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Auto-derives from `source` until the user edits the slug directly, then stops following. */
export function SlugInput({
  id,
  value,
  onChange,
  source,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  source: string;
}) {
  const editedRef = useRef(false);

  useEffect(() => {
    if (!editedRef.current) onChange(slugify(source));
    // Only re-derive when the source text changes; onChange identity is not a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  return (
    <input
      id={id}
      type="text"
      className="input font-mono text-sm"
      value={value}
      onChange={(e) => {
        editedRef.current = true;
        onChange(slugify(e.target.value));
      }}
    />
  );
}
